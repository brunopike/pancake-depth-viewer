const Q96 = 2 ** 96;
const LOG_TICK = Math.log(1.0001);

export function settings(levels, bps) {
  levels = Number(levels); bps = Number(bps);
  if (!Number.isInteger(levels) || levels < 20 || levels > 500) throw new Error('显示档数请输入 20–500 之间的整数。');
  if (!Number.isFinite(bps) || bps < 0.1 || bps > 1000) throw new Error('价格间隔请输入 0.1–1000 bps（0.001%–10%）。');
  if (levels * bps >= 9900) throw new Error('看到的价格范围太大：上下幅度必须小于 99%。请减少档数或价格间隔。');
  return { levels, bps, range: levels * bps / 10000 };
}

export function priceOf(pool, baseId) {
  const p = pool.kind === 'v2' ? pool.reserve1 / pool.reserve0 : (Number(pool.sqrtPriceX96) / Q96) ** 2;
  const human = p * 10 ** (pool.token0.decimals - pool.token1.decimals);
  return pool.token0.id.toLowerCase() === baseId.toLowerCase() ? human : 1 / human;
}

export function sqrtAtPrice(pool, baseId, price) {
  const direct = pool.token0.id.toLowerCase() === baseId.toLowerCase();
  return Math.sqrt((direct ? price : 1 / price) * 10 ** (pool.token1.decimals - pool.token0.decimals));
}

// Token deltas integrate the AMM curve; quantities are display estimates, not executable quotes.
// Raw chain state and liquidityNet use BigInt. Floating-point conversion occurs only for chart amounts.
export function cumulative(pool, baseId, targetPrice, side) {
  const direct = pool.token0.id.toLowerCase() === baseId.toLowerCase();
  const current = priceOf(pool, baseId);
  if ((side === 'ask' && targetPrice <= current) || (side === 'bid' && targetPrice >= current)) return { quantity: 0, quote: 0 };
  if (pool.kind === 'v2') {
    const x = direct ? pool.reserve0 / 10 ** pool.token0.decimals : pool.reserve1 / 10 ** pool.token1.decimals;
    const y = direct ? pool.reserve1 / 10 ** pool.token1.decimals : pool.reserve0 / 10 ** pool.token0.decimals;
    const k = x * y;
    return { quantity: Math.abs(x - Math.sqrt(k / targetPrice)), quote: Math.abs(y - Math.sqrt(k * targetPrice)) };
  }
  const target = sqrtAtPrice(pool, baseId, targetPrice);
  const targetTick = 2 * Math.log(target) / LOG_TICK;
  if (pool.minTick != null && (targetTick < pool.minTick || targetTick > pool.maxTick)) throw new Error('目标价格超出已读取 tick 范围，请刷新');
  const up = target > Number(pool.sqrtPriceX96) / Q96;
  let s = Number(pool.sqrtPriceX96) / Q96, L = BigInt(pool.liquidity), a0 = 0, a1 = 0;
  const ticks = pool.ticks.filter(t => up ? t.index > pool.tick : t.index <= pool.tick)
    .sort((a, b) => up ? a.index - b.index : b.index - a.index);
  function segment(to) {
    if (L < 0n) throw new Error('负流动性：池数据不一致');
    a0 += Number(L) * Math.abs(1 / s - 1 / to);
    a1 += Number(L) * Math.abs(to - s);
    s = to;
  }
  for (const tick of ticks) {
    const boundary = Math.exp(tick.index * LOG_TICK / 2);
    if (up ? boundary > target : boundary < target) break;
    segment(boundary);
    L += (up ? 1n : -1n) * BigInt(tick.net);
  }
  segment(target);
  const amount0 = a0 / 10 ** pool.token0.decimals, amount1 = a1 / 10 ** pool.token1.decimals;
  const result = { quantity: direct ? amount0 : amount1, quote: direct ? amount1 : amount0 };
  if (!Number.isFinite(result.quantity) || !Number.isFinite(result.quote)) throw new Error('深度超出数值范围');
  return result;
}

export function buildDepth(pools, baseId, input) {
  const config = settings(input.levels, input.bps);
  if (!pools.length) throw new Error('没有可计算深度的池');
  const dominant = [...pools].sort((a, b) => Number(b.tvlUSD) - Number(a.tvlUSD))[0];
  const price = priceOf(dominant, baseId);
  if (!Number.isFinite(price) || price <= 0) throw new Error('池现价无效');
  const side = (name, sign) => {
    let previousQ = 0, previousV = 0;
    return Array.from({ length: config.levels }, (_, i) => {
      const offset = (i + 1) * config.bps * sign;
      const boundary = price * (1 + offset / 10000);
      let q = 0, v = 0;
      for (const pool of pools) {
        const value = cumulative(pool, baseId, boundary, name);
        q += value.quantity; v += value.quote;
      }
      const row = { level: i + 1, price: boundary, offset, quantity: Math.max(0, q - previousQ),
        quote: Math.max(0, v - previousV), cumulativeQuantity: q, cumulativeQuote: v };
      previousQ = q; previousV = v;
      return row;
    });
  };
  return { price, config, bids: side('bid', -1), asks: side('ask', 1) };
}
