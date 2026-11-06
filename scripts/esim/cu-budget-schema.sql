CREATE SCHEMA IF NOT EXISTS esim_ledger;

-- Separate O(1) daily admission from idempotent per-attempt evidence.
CREATE TABLE IF NOT EXISTS esim_ledger.rpc_cu_days (
 day date PRIMARY KEY,
 used bigint NOT NULL DEFAULT 0 CHECK (used >= 0),
 daily_limit bigint NOT NULL CHECK (daily_limit > 0),
 core_reserve bigint NOT NULL CHECK (core_reserve >= 0 AND core_reserve <= daily_limit)
);
CREATE TABLE IF NOT EXISTS esim_ledger.rpc_cu_attempts (
 request_id uuid PRIMARY KEY,
 day date NOT NULL REFERENCES esim_ledger.rpc_cu_days(day),
 task text NOT NULL,
 units bigint NOT NULL CHECK (units >= 0),
 calls integer NOT NULL CHECK (calls > 0),
 methods jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS rpc_cu_attempts_day ON esim_ledger.rpc_cu_attempts(day);

CREATE OR REPLACE FUNCTION esim_ledger.reserve_rpc_cu(
 p_id uuid,p_task text,p_units bigint,p_calls integer,p_methods jsonb,
 p_mode text,p_limit bigint,p_reserve bigint
) RETURNS TABLE(admitted boolean,retry_at_ms bigint)
LANGUAGE plpgsql SET search_path=pg_catalog,esim_ledger AS $$
DECLARE
 d date := (clock_timestamp() AT TIME ZONE 'UTC')::date;
 tally esim_ledger.rpc_cu_days%ROWTYPE;
 previous esim_ledger.rpc_cu_attempts%ROWTYPE;
 cap bigint;
BEGIN
 IF p_id IS NULL OR p_task IS NULL OR p_task !~ '^[-a-z0-9_]{1,40}$'
  OR p_units IS NULL OR p_units<0 OR p_calls IS NULL OR p_calls<1
  OR p_methods IS NULL OR jsonb_typeof(p_methods)<>'object'
  OR p_mode IS NULL OR p_mode NOT IN ('observe','enforce')
  OR p_limit IS NULL OR p_limit<1 OR p_reserve IS NULL OR p_reserve<0 OR p_reserve>p_limit
 THEN RAISE EXCEPTION 'CU_INVALID_RESERVATION'; END IF;
 INSERT INTO esim_ledger.rpc_cu_days(day,daily_limit,core_reserve)
 VALUES(d,p_limit,p_reserve) ON CONFLICT(day) DO NOTHING;
 SELECT * INTO tally FROM esim_ledger.rpc_cu_days WHERE day=d FOR UPDATE;
 IF tally.daily_limit<>p_limit OR tally.core_reserve<>p_reserve THEN RAISE EXCEPTION 'CU_POLICY_MISMATCH'; END IF;
 SELECT * INTO previous FROM esim_ledger.rpc_cu_attempts WHERE request_id=p_id;
 IF FOUND THEN
  IF previous.task<>p_task OR previous.units<>p_units OR previous.calls<>p_calls OR previous.methods<>p_methods
  THEN RAISE EXCEPTION 'CU_RESERVATION_CONFLICT'; END IF;
  RETURN QUERY SELECT true,NULL::bigint; RETURN;
 END IF;
 cap := CASE WHEN p_task IN ('core','recovery') THEN p_limit ELSE p_limit-p_reserve END;
 IF p_mode='enforce' AND tally.used+p_units>cap THEN
  RETURN QUERY SELECT false,(extract(epoch FROM ((d+1)::timestamp AT TIME ZONE 'UTC'))*1000)::bigint; RETURN;
 END IF;
 INSERT INTO esim_ledger.rpc_cu_attempts(request_id,day,task,units,calls,methods)
 VALUES(p_id,d,p_task,p_units,p_calls,p_methods);
 UPDATE esim_ledger.rpc_cu_days SET used=used+p_units WHERE day=d;
 RETURN QUERY SELECT true,NULL::bigint;
END;
$$;
