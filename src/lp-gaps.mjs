import { priceAtTick, MIN_TICK, MAX_TICK } from './math.mjs';
import { validateOwnership } from './ownership.mjs';

export function gapPercent(value = 100) {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 1000000) {
    throw new Error('查询范围请输入大于 0、最多 1,000,000 的百分比。');
  }
  return percent;
}

// Union actual, positive-liquidity position ranges across this pair. Never infer
// zero liquidity from rounded order-book cells or from missing pool ownership.
export function ownLiquidityGaps(pools, baseId, reference, value = 100, coverage = {}) {
  const percent = gapPercent(value);
  if (!Number.isFinite(reference) || reference <= 0) throw new Error('参考价格未就绪。');
  if (!pools.length || coverage.failedCount > 0 || (coverage.expectedPoolCount ?? pools.length) !== pools.length) {
    throw new Error('池子数据未读完整，暂不能确认空缺区间。');
  }
  const low = Math.max(0, reference * (1 - percent / 100)), high = reference * (1 + percent / 100);
  if (!Number.isFinite(high)) throw new Error('查询范围过大，请缩小百分比。');
  const ranges = [];
  for (const pool of pools) {
    if (!['v2', 'cl'].includes(pool.kind) || ![pool.token0.id, pool.token1.id].some(id => id.toLowerCase() === baseId.toLowerCase())
      || (pool.kind === 'cl' && (!pool.fullRange || pool.minTick !== MIN_TICK || pool.maxTick !== MAX_TICK))) {
      throw new Error('池子数据未读完整，暂不能确认空缺区间。');
    }
    if (!validateOwnership(pool)) throw new Error('我方 LP 归属待核对，暂不能确认空缺区间。');
    if (pool.kind === 'v2') {
      if (pool.ownership.ownBalance > 0n && pool.reserve0 > 0 && pool.reserve1 > 0) ranges.push({ low, high });
      continue;
    }
    for (const position of pool.ownership.positions) {
      if (position.liquidity === 0n) continue;
      const prices = [position.tickLower, position.tickUpper].map(tick => priceAtTick(pool, baseId, tick)).sort((a, b) => a - b);
      const start = Math.max(low, prices[0]), end = Math.min(high, prices[1]);
      if (end > start) ranges.push({ low: start, high: end });
    }
  }
  ranges.sort((a, b) => a.low - b.low || a.high - b.high);
  const gaps = [];
  let cursor = low;
  for (const range of ranges) {
    if (range.low > cursor) gaps.push({ low: cursor, high: range.low });
    cursor = Math.max(cursor, range.high);
  }
  if (cursor < high) gaps.push({ low: cursor, high });
  return { percent, low, high, gaps };
}
