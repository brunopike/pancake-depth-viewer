# ESIM shared data integration

The authoritative MM application remains `Developer/ESIM市值统计/工程/esim-daily-ledger/web`.
`worker.mjs` is a generated server release artifact, not a second editable implementation.
Regenerate with `node scripts/esim/build-mm-worker.mjs <existing web directory>` after MM collector changes.
The manifest records SHA-256 hashes of source inputs. Never edit the generated bundle.

Both applications use the existing ESIM Neon database. `esim_ledger.address_registry`
merges confirmed chain labels and live MM membership without duplicate addresses.
Mixed ownership, activity reserves and shared vaults keep their original rules.
Membership in the MM accounting cohort remains explicit: treasury/distribution addresses
are visible in the shared registry but do not silently become trading wallets.
Run `scripts/esim/sync-address-registry.mjs` when deploying updated chain labels.
New MM registrations appear through the database view immediately.

The existing RPC cache is keyed by chain 56 + method + exact parameters. Dynamic block
heads bypass persistence; recent log/transfer query results expire in one hour. A chain
reorganization invalidates the shared cache epoch without deleting historical evidence.
A cache outage falls back to RPC on the chain application; it never substitutes zeros.

The VM runs a bounded MM step between chain tasks, serially on the existing 4 GB server.
It reuses ESIM_REALTIME_DATABASE_URL and ALCHEMY_API_KEY. No public VM endpoint or new
credential is needed. Vercel's five-minute job remains a fallback using the same run lease.
Lease generations fence stale publishers. Failed accounting checks preserve prior results.
`esim_ledger.snapshot_history` retains verified closed-day numeric versions, deduplicated
by day and source hash. Today's partial result is maintained in the current ledger,
not archived every minute. MM days retain Beijing 08:00 boundaries; chain reports retain
midnight boundaries. These business aggregates should not be directly equated.
