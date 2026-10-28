CREATE TABLE IF NOT EXISTS esim_ledger.address_labels (
 address text PRIMARY KEY CHECK(address ~ '^0x[0-9a-f]{40}$'),
 label text NOT NULL,kind text NOT NULL,evidence text NOT NULL DEFAULT '',
 source text NOT NULL DEFAULT 'onchain',updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE VIEW esim_ledger.address_registry AS
 SELECT coalesce(a.address,l.address) address,
 CASE WHEN l.kind IN ('mixed','dex','activity','reserve') THEN l.kind WHEN a.address IS NOT NULL THEN CASE WHEN l.kind='lp' THEN 'lp' ELSE 'own' END ELSE l.kind END kind,
 coalesce(l.label,CASE WHEN a.mode='robot' THEN '我方 · 做市机器人' ELSE '我方 · 做市钱包' END) label,
 concat_ws('；',nullif(l.evidence,''),CASE WHEN a.address IS NOT NULL THEN '做市账本已登记；'||coalesce(a.note,'') END) evidence,
 a.address IS NOT NULL mm_included,a.ordinal,a.mode,a.backfill_pending,
 n.report_number,coalesce(l.source,'mm-ledger') source
 FROM esim_ledger.addresses a FULL JOIN esim_ledger.address_labels l USING(address)
 LEFT JOIN esim_ledger.numbered_addresses n ON n.address=a.address;
ALTER TABLE esim_ledger.sync_runs ADD COLUMN IF NOT EXISTS lease_version bigint NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS esim_ledger.snapshot_history (
 day date NOT NULL,source_hash text NOT NULL,end_block bigint NOT NULL,
 cohort_hash text NOT NULL,summary jsonb NOT NULL,recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(day,source_hash)
);

CREATE TABLE IF NOT EXISTS esim_ledger.rpc_cache_epoch(id int PRIMARY KEY CHECK(id=1),valid_after timestamptz NOT NULL);
INSERT INTO esim_ledger.rpc_cache_epoch VALUES(1,'1970-01-01') ON CONFLICT DO NOTHING;
