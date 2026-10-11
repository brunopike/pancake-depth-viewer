// Position events identify all changed boundaries, including new distant positions.
// Zero net is a valid initialized boundary; gross liquidity determines removal.
export function mergeTicks(previous, updates) {
  const ticks = new Map(previous.map(t => [t.index, { index: t.index, net: BigInt(t.net) }]));
  for (const t of updates) {
    if (BigInt(t.gross) === 0n) ticks.delete(t.index);
    else ticks.set(t.index, { index: t.index, net: BigInt(t.net) });
  }
  return [...ticks.values()].sort((a, b) => a.index - b.index);
}

export function cacheMatchesPool(cached, current) {
  return !!cached && cached.fullRange === true && cached.kind === 'cl'
    && cached.id.toLowerCase() === current.id.toLowerCase() && cached.protocol === current.protocol
    && cached.spacing === current.spacing && Number.isFinite(cached.fullScanTimestamp)
    && ['token0', 'token1'].every(k => cached[k]?.id.toLowerCase() === current[k].id.toLowerCase() && cached[k].decimals === current[k].decimals);
}
