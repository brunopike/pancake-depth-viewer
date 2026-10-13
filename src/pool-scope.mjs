export const POOL_SCOPES = { all: '全部池子', v4: '全部 V4', v3: '全部 V3' };
export const validPoolScope = value => typeof value === 'string' && Object.hasOwn(POOL_SCOPES, value) ? value : 'all';
export function matchesPoolScope(pool, scope) {
  if (scope === 'all') return true;
  if (scope === 'v3') return pool.protocol === 'v3';
  if (scope === 'v4') return ['infinityCl', 'infinityBin', 'infinityStable'].includes(pool.protocol);
  return false;
}

// Keep the complete cached snapshot intact; missing pools are counted only in
// the selected protocol group. Wallet-discovered pools retain their coverage.
export function scopedSnapshot(snapshot, catalogPools, requested = 'all') {
  const scope = validPoolScope(requested);
  const all = new Map();
  for (const pool of [...catalogPools, ...(snapshot?.pools || []), ...(snapshot?.failed || [])]) {
    all.set(`${pool.protocol}:${pool.id.toLowerCase()}`, pool);
  }
  const available = [...all.values()].filter(pool => matchesPoolScope(pool, scope));
  const pools = (snapshot?.pools || []).filter(pool => matchesPoolScope(pool, scope));
  const failed = (snapshot?.failed || []).filter(pool => matchesPoolScope(pool, scope));
  return { ...snapshot, scope, available, pools, failed, expectedPoolCount: available.length,
    complete: pools.length > 0 && pools.length === available.length && failed.length === 0 };
}
