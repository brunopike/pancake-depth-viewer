const Q96 = 2 ** 96;
const LOG_TICK = Math.log(1.0001);

export const MIN_TICK = -887272, MAX_TICK = 887272;
export function settings(percent = 10, precision = 4) {
  if (precision === '' || precision === null) throw new Error('请输入每档价格的小数位数。');
  const maximum = percent === 'max';
  percent = maximum ? 'max' : Number(percent); precision = Number(precision);
  if (!maximum && (!Number.isFinite(percent) || percent <= 0 || percent > 1000000)) throw new Error('价格范围请输入大于 0、最多 1,000,000 的百分比，或选择“最大”。');
  if (!Number.isInteger(precision) || precision < 0 || precision > 18) throw new Error('小数位数请输入 0–18 之间的整数。');
  return { percent, precision, maximum, range: maximum ? Infinity : percent / 100, step: 10 ** -precision };
}
export function priceAtTick(pool, baseId, tick) {
  const direct = pool.token0.id.toLowerCase() === baseId.toLowerCase();
  const p = Math.exp(tick * LOG_TICK) * 10 ** (pool.token0.decimals - pool.token1.decimals);
  return direct ? p : 1 / p;
}
export function tickRange(pool, baseId, reference, range) {
  if (range === Infinity) return [MIN_TICK, MAX_TICK];
  const low = Math.max(0, reference * (1 - range)), high = reference * (1 + range);
  const ticks = [low, high].map(p => 2 * Math.log(sqrtAtPrice(pool, baseId, p)) / LOG_TICK);
  return [Math.max(MIN_TICK, Math.floor(Math.min(...ticks, pool.tick)) - pool.spacing),
    Math.min(MAX_TICK, Math.ceil(Math.max(...ticks, pool.tick)) + pool.spacing)];
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
export function cumulative(pool, baseId, targetPrice, side, fromPrice) {
  const direct = pool.token0.id.toLowerCase() === baseId.toLowerCase();
  const current = priceOf(pool, baseId);
  if ((side === 'ask' && targetPrice <= current) || (side === 'bid' && targetPrice >= current)) return { quantity: 0, quote: 0 };
  let startPrice = fromPrice == null ? current : side === 'ask' ? Math.max(current, fromPrice) : Math.min(current, fromPrice);
  if (targetPrice === startPrice) return { quantity: 0, quote: 0 };
  if (pool.kind === 'v2') {
    const x = direct ? pool.reserve0 / 10 ** pool.token0.decimals : pool.reserve1 / 10 ** pool.token1.decimals;
    const y = direct ? pool.reserve1 / 10 ** pool.token1.decimals : pool.reserve0 / 10 ** pool.token0.decimals;
    const k = x * y;
    return { quantity: Math.abs(Math.sqrt(k / startPrice) - Math.sqrt(k / targetPrice)), quote: Math.abs(Math.sqrt(k * startPrice) - Math.sqrt(k * targetPrice)) };
  }
  // CL has finite protocol price bounds; a zero/infinite request stops at that bound.
  const bounds = [priceAtTick(pool, baseId, MIN_TICK), priceAtTick(pool, baseId, MAX_TICK)].sort((a, b) => a - b);
  targetPrice = Math.max(bounds[0], Math.min(bounds[1], targetPrice));
  startPrice = Math.max(bounds[0], Math.min(bounds[1], startPrice));
  if (targetPrice === startPrice) return { quantity: 0, quote: 0 };
  const target = sqrtAtPrice(pool, baseId, targetPrice);
  const start = sqrtAtPrice(pool, baseId, startPrice);
  const targetTick = 2 * Math.log(target) / LOG_TICK;
  if (pool.minTick != null && (targetTick < pool.minTick - 1e-6 || targetTick > pool.maxTick + 1e-6)) throw new Error('目标价格超出已读取 tick 范围，请刷新');
  const up = target > Number(pool.sqrtPriceX96) / Q96;
  let s = start, L = BigInt(pool.liquidity), a0 = 0, a1 = 0;
  const ticks = pool.ticks.filter(t => up ? t.index > pool.tick : t.index <= pool.tick)
    .sort((a, b) => up ? a.index - b.index : b.index - a.index);
  function segment(to) {
    if (L < 0n) throw new Error('负流动性：池数据不一致');
    if (L > 0n) {
      a0 += Number(L) * Math.abs(to - s) / (s * to);
      a1 += Number(L) * Math.abs(to - s);
    }
    s = to;
  }
  for (const tick of ticks) {
    const boundary = Math.exp(tick.index * LOG_TICK / 2);
    if (up ? boundary <= start : boundary >= start) { L += (up ? 1n : -1n) * BigInt(tick.net); continue; }
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

// At most 500 rows: merge adjacent decimal bands, never truncate range totals.
function boundaries(center, endpoint, config, sign) {
  const infinite = endpoint === Infinity;
  const displayEnd = infinite ? center * 100000000 : endpoint;
  const distance = Math.abs(displayEnd - center), count = Math.ceil(distance / config.step);
  const grouped = count > 499;
  const logScale = config.maximum && (displayEnd / center > 100 || displayEnd / center < .01);
  const rows = [];
  if (!grouped) {
    const first = sign > 0 ? Math.floor(center / config.step) + 1 : Math.ceil(center / config.step) - 1;
    for (let i = 0; i < count; i++) {
      const p = Number(((first + sign * i) * config.step).toPrecision(15));
      if (sign > 0 ? p >= displayEnd : p <= displayEnd) break;
      if (p > 0) rows.push(p);
    }
  } else {
    // Keep the nearest 100 price bands intact, then merge the distant bands.
    const first = sign > 0 ? Math.floor(center / config.step) + 1 : Math.ceil(center / config.step) - 1;
    for (let i = 0; i < 100; i++) {
      const p = Number(((first + sign * i) * config.step).toPrecision(15));
      if (p > 0 && (sign > 0 ? p < displayEnd : p > displayEnd)) rows.push(p);
    }
    const start = rows.at(-1) || center, remaining = (infinite ? 499 : 500) - rows.length;
    for (let i = 1; i < remaining; i++) {
      const t = i / remaining;
      const raw = logScale ? start * Math.exp(Math.log(Math.max(displayEnd, center * 1e-12) / start) * t) : start + (displayEnd - start) * t;
      const p = Math.round(raw / config.step) * config.step;
      if (p > 0 && (sign > 0 ? p > center && p < displayEnd : p < center && p > displayEnd)
        && (!rows.length || (sign > 0 ? p > rows.at(-1) : p < rows.at(-1)))) rows.push(p);
    }
  }
  if (!rows.length || rows.at(-1) !== displayEnd) rows.push(displayEnd);
  if (infinite) rows.push(Infinity);
  return { prices: rows, grouped, logScale };
}
export function buildDepth(pools, baseId, input, options = {}) {
  const config = settings(input.percent, input.precision);
  if (!pools.length) throw new Error('没有可计算深度的池');
  const dominant = [...pools].sort((a, b) => Number(b.tvlUSD) - Number(a.tvlUSD))[0];
  const price = priceOf(dominant, baseId);
  if (!Number.isFinite(price) || price <= 0) throw new Error('池现价无效');
  let low = Math.max(0, price * (1 - config.range)), high = price * (1 + config.range);
  // Maximum is a useful viewing window, independent of the full-range chain cache.
  if (config.maximum) { low = price * .5; high = price * 2; }
  const side = (name, sign, endpoint) => {
    const bands = boundaries(price, endpoint, config, sign);
    const focus = options.focusPrice;
    if (Number.isFinite(focus) && (sign > 0 ? focus > price && focus <= endpoint : focus < price && focus >= endpoint)
      && !bands.prices.includes(focus)) {
      // Keep the endpoint and nearest 100 bands; replace one distant display boundary.
      if (bands.prices.length >= 500) bands.prices.splice(bands.prices.length - 2, 1);
      bands.prices.push(focus); bands.prices.sort((a, b) => sign * (a - b));
    }
    let previousQ = 0, previousV = 0;
    const rows = bands.prices.map((boundary, i) => {
      let q = 0, v = 0;
      // Integrate this band directly. Subtracting two large cumulative quantities
      // can erase a tiny token amount at extreme prices while its quote value remains huge.
      for (const pool of pools) { const value = cumulative(pool, baseId, boundary, name, i ? bands.prices[i - 1] : undefined); q += value.quantity; v += value.quote; }
      const row = { level: i + 1, price: boundary, offset: (boundary / price - 1) * 10000,
        quantity: q, quote: v, cumulativeQuantity: previousQ + q, cumulativeQuote: previousV + v,
        focus: boundary === options.focusPrice, endpoint: i === bands.prices.length - 1 };
      previousQ = row.cumulativeQuantity; previousV = row.cumulativeQuote; return row;
    });
    return { rows, grouped: bands.grouped, logScale: bands.logScale };
  };
  const bid = side('bid', -1, low), ask = side('ask', 1, high);
  return { price, config, low, high, bids: bid.rows, asks: ask.rows,
    grouped: bid.grouped || ask.grouped, compressed: bid.logScale || ask.logScale, unbounded: high === Infinity };
}
