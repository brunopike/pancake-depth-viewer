import { cumulative, MIN_TICK, MAX_TICK } from './math.mjs';
import { ownedCurve } from './ownership.mjs';

// Integrate exact endpoints directly, using the same reference and curves as the book.
export function intervalStats(pools, baseId, reference, first, second, coverage = {}) {
  if (first === '' || second === '' || first == null || second == null) throw new Error('请输入两个不同且大于 0 的价格。');
  const prices = [Number(first), Number(second)].sort((a, b) => a - b);
  const [low, high] = prices;
  if (!prices.every(p => Number.isFinite(p) && p > 0) || low === high) throw new Error('请输入两个不同且大于 0 的价格。');
  if (!Number.isFinite(reference) || reference <= 0) throw new Error('参考价格未就绪，请先刷新数据。');
  if (!pools.length || coverage.failedCount > 0 || (coverage.expectedPoolCount ?? pools.length) !== pools.length
    || pools.some(p => !['v2', 'cl'].includes(p.kind)
      || ![p.token0.id, p.token1.id].some(id => id.toLowerCase() === baseId.toLowerCase())
      || (p.kind === 'cl' && (!p.fullRange || p.minTick !== MIN_TICK || p.maxTick !== MAX_TICK)))) {
    throw new Error('池子数据未读完整，暂不能统计区间。');
  }
  let curves;
  try { curves = pools.map(ownedCurve); } catch { curves = []; }
  const verified = curves.length === pools.length && curves.every(Boolean);
  const calculate = (side, from, target, active) => {
    const total = { quantity: 0, quote: 0 }, own = { ...total }, external = { ...total };
    const add = (sum, pool, scale = 1) => {
      if (!scale || !active) return;
      const amount = cumulative(pool, baseId, target, side, from);
      sum.quantity += amount.quantity * scale; sum.quote += amount.quote * scale;
    };
    for (const pool of pools) add(total, pool);
    if (verified) for (const curve of curves) { add(own, curve.pool, curve.scale); add(external, curve.external, curve.externalScale); }
    if (!Object.values(total).every(v => Number.isFinite(v) && v >= 0)) throw new Error('区间金额超出可计算范围，请缩小区间。');
    const matches = key => Number.isFinite(own[key] + external[key])
      && Math.abs(own[key] + external[key] - total[key]) <= Math.max(total[key], 1e-20) * 1e-9;
    const split = verified && matches('quantity') && matches('quote');
    return { total, own: split ? own : null, external: split ? external : null };
  };
  return { low, high, reference,
    bid: calculate('bid', Math.min(high, reference), low, low < reference),
    ask: calculate('ask', Math.max(low, reference), high, high > reference) };
}
