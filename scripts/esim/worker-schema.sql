-- Additive migration. Existing snapshots and webhook receipts are untouched.
CREATE TABLE IF NOT EXISTS esim_worker_leases (
 job text PRIMARY KEY,
 owner text NOT NULL,
 fence bigint NOT NULL CHECK (fence > 0),
 expires_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);

-- A publication holds the same row lock used by takeover. A stale process
-- cannot publish after another process acquires the next fencing token.
CREATE OR REPLACE FUNCTION esim_require_worker_lease(p_job text,p_owner text,p_fence bigint)
RETURNS boolean LANGUAGE plpgsql SET search_path=public AS $$
DECLARE valid boolean;
BEGIN
 SELECT owner=p_owner AND fence=p_fence AND expires_at>clock_timestamp()
 INTO valid FROM esim_worker_leases WHERE job=p_job FOR UPDATE;
 IF valid IS DISTINCT FROM true THEN RAISE EXCEPTION 'WORKER_LEASE_LOST'; END IF;
 RETURN true;
END;
$$;
