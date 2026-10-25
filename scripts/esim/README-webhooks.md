# ESIM notification-driven snapshots

Alchemy BNB Mainnet notifications wake the existing canonical collector. Webhook
payloads never increment balances, trade amounts or claims. The collector verifies
confirmed blocks, receipts and ledger reconciliation before publishing snapshots.

## Production components

- `POST /api/alchemy-webhook`: verify raw-body HMAC SHA-256; persist a unique
  `(webhook, event_id)` receipt and monotonic pending block in one SQL statement.
  Respond 503 on persistence failure so the provider can retry.
- Neon tables: `scripts/esim/realtime-schema.sql`. Vercel and Actions share the
  sensitive `ESIM_REALTIME_DATABASE_URL` secret. Vercel additionally has a sensitive
  `ALCHEMY_WEBHOOK_KEYS` JSON map of webhook IDs to signing secrets.
- `scripts/esim/realtime-worker.mjs`: one writer under the existing Actions
  concurrency group. Coalesce notifications for 3 minutes; perform fallback
  collection after 10 minutes without a current snapshot. The collector retains
  its 20-block confirmation delay. Advance processed block only with snapshots.
- `GET /api/esim-snapshot?kind=report|addresses|holders|status`: gzip snapshots and
  lightweight revisions. Pages poll once per minute when visible; unchanged or
  unavailable status still retries independent snapshot sources every 5 minutes.
- Core and holder checkpoints archive independently every hour to the original
  cache branches. Flow attribution runs separately with its own cutoff. The
  existing six-hour recovery schedule and bounded-session handoff remain enabled.
- Notification receipt metadata expires after 7 days. Financial history and
  hourly checkpoints are not deleted by that retention rule.

## Subscription coverage

The production configuration created 2026-10-26 has five subscriptions in app
`2dbncp1ikgrvsp1b`: ESIM token plus six classic pools; 58 Pancake Infinity pools;
two sets of 69 Uniswap V4 pools; distribution-contract address activity. Pool
subscriptions filter Swap topics and exact pool IDs, not the whole shared vault.
Use separate GraphQL queries: the provider rejected the combined aliased query.
New pool discovery remains part of canonical collection; extend subscriptions
when a newly discovered pool requires an independent trigger. Periodic collection
does not depend on webhook coverage or delivery.

Never log signing keys or connection strings. Rotate by provisioning replacement
subscriptions, updating the sensitive key map, deploying and checking real
deliveries, then pausing retired subscriptions. A paused provider subscription
alone does not revoke its key from previously deployed receivers; update the map.

## Verification and recovery

Run `npm test` and `npm run build`. Verify live signed delivery, duplicate replay,
401 on invalid signatures, monotonic snapshot blocks, and matching report/address
cutoffs. Check Actions logs and the status endpoint for collector errors. On a
chain/checkpoint inconsistency the worker fails closed and retries a prior
checkpoint; never publish failed or unreconciled financial totals. Published data
is a confirmed snapshot, not an instantaneous or unconditional completeness claim.

Neon is currently a free project; provider quotas can interrupt the fast path.
The hourly GitHub archive and independent snapshot fallback remain available.
No billing tier upgrade is performed by this integration.
