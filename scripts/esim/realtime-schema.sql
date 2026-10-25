CREATE TABLE IF NOT EXISTS esim_webhook_receipts (
 webhook text NOT NULL,event_id text NOT NULL,body_hash text NOT NULL,
 block bigint NOT NULL,event_count integer NOT NULL,event_kinds text NOT NULL DEFAULT '',received_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(webhook,event_id)
);
CREATE INDEX IF NOT EXISTS esim_webhook_receipts_time ON esim_webhook_receipts(received_at);
CREATE TABLE IF NOT EXISTS esim_realtime_control (
 id integer PRIMARY KEY CHECK(id=1),pending_block bigint NOT NULL DEFAULT 0,processed_block bigint NOT NULL DEFAULT 0,
 last_delivery timestamptz,last_processed timestamptz,last_error text
);
INSERT INTO esim_realtime_control(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS esim_realtime_snapshots (
 kind text PRIMARY KEY CHECK(kind IN ('report','addresses','holders')),block bigint NOT NULL,cutoff double precision NOT NULL,
 body text NOT NULL,etag text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now()
);
