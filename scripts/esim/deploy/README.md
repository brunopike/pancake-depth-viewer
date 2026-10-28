# ESIM Singapore collector

Target: `sdweb3 / asia-southeast1-c / esim-data-worker`, Ubuntu 24.04, 4 GB RAM.
Vercel serves the existing frontend and query APIs. Neon retains snapshots and
the webhook inbox. Alchemy is the existing chain provider. No public VM port is
needed by the application; browsers must not call the VM.

## Prepare and verify

1. Apply `scripts/esim/worker-schema.sql` to the existing ESIM realtime database.
   It is additive; it does not rewrite accounting data. Test lease acquisition,
   stale-owner rejection and snapshot readback before changing writers.
2. Publish the reviewed source revision. Old running Actions sessions use their
   old checkout and remain **unfenced** until stopped; deploying source alone
   does not make those sessions safe to run beside the VM.
3. On the exact target VM, run `sudo bash install-vm.sh <reviewed-commit-sha>`.
   The installer does not start the service. It uses official Node 22 packages
   and validates the release checksum.
4. Install `/etc/esim-worker/worker.env` as `root:root`, mode `0600`, using the
   existing ESIM realtime DB and Alchemy credentials. The shared database also contains the `esim_ledger` schema for the MM
   ledger; the server reuses this connection without another credential. Register a dedicated write-enabled SSH deploy public key
   only on `brunopike/pancake-depth-viewer`. Keep its private key at
   `/etc/esim-worker/github_ed25519` (root:esim-worker, 0640), with GitHub host
   keys from the official HTTPS metadata API in `github_known_hosts`. The VM
   uses `ESIM_GIT_PUBLISH=true`; no personal GitHub token is copied here. The
   installer does not create or authorize this key automatically.
   For browser-only server access, the manual `esim-worker-config.yml` workflow
   can seal the two existing Actions secrets to this VM's pinned RSA public
   key. Its one-day artifact contains only authenticated ciphertext. Keep the
   corresponding private key root-only on the VM, then run
   `worker-config-envelope.mjs open <ciphertext-file> /etc/esim-worker/worker.env`
   as root. This writes a root-only environment file and defaults to dry run;
   neither the workflow nor the decrypt command prints credentials. Do not
   dispatch this workflow or authorize the deploy key without the deployment
   owner's approval for the specific destination.
5. Keep `ESIM_WORKER_DRY_RUN=true` and start the service. This takes separate
   `shadow-core` / `shadow-depth` leases. It reads live source data and builds
   results, but does not publish snapshots, archive commits or inbox cleanup.
6. Observe several cycles, including holders and depth. Check
   `/var/lib/esim-worker/vm/health.json`, `schedule.json`, resource log entries,
   `systemctl status esim-worker`, and `systemctl show esim-worker` memory/CPU
   properties. Compare results at the same block; a recent timestamp alone is
   not proof that all rows or statistics are complete.

## Controlled cutover

1. Stop the shadow worker. Stop the old core and depth Actions sessions and
   ensure no old pending run can start. Keep the new schedules enabled.
2. Confirm the schema is present and all newly started workflows use the lease
   wrapper. Set `ESIM_WORKER_DRY_RUN=false`, then restart the VM service.
3. Verify the `core` and `depth` leases have the VM owner, advance their expiry,
   and that a competing new workflow exits without chain queries. A timed-out
   owner cannot publish DB snapshots after a successor has acquired the lease.
4. Check report and seller blocks advance together, holder trade cutoff covers
   that report, and pending webhook blocks are eventually processed. Compare
   today, yesterday and cumulative buy/sell totals and own-address group totals.
5. Check hourly Git archives and the independent claim-flow job continue. The
   heavy provenance rebuild remains on Actions to avoid starving the 4 GB VM.
6. Measure actual API cold/warm latency, queue lag, RPC calls, CPU, peak RSS and
   recovery behavior. Do not describe target intervals as measured guarantees.

The VM coalesces core updates for at least one minute and independently checks
the chain after five minutes without an event. Holders target three minutes;
depth targets five. These are minimum schedules, not deadlines: tasks run one
at a time and provider/backfill latency can extend them. Complete balance reads
run at least every six hours. Between them, unchanged balances are reused only
for the reviewed token/proxy bytecode and upgrade-free ranges; changed, new or
unknown addresses always use `balanceOf`. An unknown upgrade forces full reads.

## Recovery and rollback

- Keep the core recovery workflow enabled (ten-minute schedule; GitHub can
  delay execution). When the VM stops renewing, its lease expires after two
  minutes. A new workflow can then take over. Never remove the lease guard to
  force simultaneous writers.
- For a release rollback, stop the service, point `current` and its unit's
  `safe.directory` at the last verified release, and restart only after checking
  the expected schema and environment. Shared canonical state is retained.
- For reverting entirely to Actions, stop/disable the VM service and dispatch
  the **new lease-aware** core and depth workflows. Keep webhook and schedules.
- Reorg detection preserves the previous verified core prefix and quarantines
  the RPC cache before replay. If the retained prefix is also invalid, the
  worker stays failed rather than publishing guessed data; rebuild from a
  deeper verified archive. Never lower a production watermark by hand.
- Existing final-number archives and provenance archives are retained. Only
  transient webhook delivery metadata older than seven days is cleaned up.

No VM deployment or production cutover is implied by the presence of these
files. Record the installed commit, dry-run results and production readback in
the task evidence before marking deployment complete.
