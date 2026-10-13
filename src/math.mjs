import { ownedCurve } from './ownership.mjs';
const Q96 = 2 ** 96;
// log1p avoids subtractive rounding in the binary representation of 1.0001.
const LOG_TICK = Math.log1p(0.0001);

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

function requireFullPools(pools) {
  if (!pools.length) throw new Error('暂时没有可计算的池子。');
  if (pools.some(p => p.kind === 'cl' && (!p.fullRange || p.minTick !== MIN_TICK || p.maxTick !== MAX_TICK))) {
    throw new Error('全池数据还在读取，请稍后再试。');
  }
}

// Principal available for swaps, across every initialized interval. Accrued CL fees are separate.
export function poolInventory(pools, baseId) {
  requireFullPools(pools);
  let base = 0, quote = 0;
  for (const pool of pools) {
    if (pool.kind === 'v2') {
      const direct = pool.token0.id.toLowerCase() === baseId.toLowerCase();
      base += (direct ? pool.reserve0 : pool.reserve1) / 10 ** (direct ? pool.token0.decimals : pool.token1.decimals);
      quote += (direct ? pool.reserve1 : pool.reserve0) / 10 ** (direct ? pool.token1.decimals : pool.token0.decimals);
    } else {
      base += cumulative(pool, baseId, Infinity, 'ask').quantity;
      quote += cumulative(pool, baseId, 0, 'bid').quote;
    }
  }
  if (![base, quote].every(n => Number.isFinite(n) && n >= 0)) throw new Error('池内币量暂时无法计算。');
  return { base, quote };
}

export function ownedInventory(pools, baseId) {
  requireFullPools(pools);
  let base = 0, quote = 0;
  for (const pool of pools) {
    const own = ownedCurve(pool);
    if (!own) throw new Error('我方 LP 归属待核对。');
    if (!own.scale) continue;
    const inventory = poolInventory([own.pool], baseId);
    base += inventory.base * own.scale;
    quote += inventory.quote * own.scale;
  }
  return { base, quote };
}

export function inventorySplit(pools, baseId) {
  const total = poolInventory(pools, baseId), own = ownedInventory(pools, baseId);
  const external = { base: 0, quote: 0 };
  for (const pool of pools) {
    const curve = ownedCurve(pool);
    if (!curve.externalScale) continue;
    const value = poolInventory([curve.external], baseId);
    external.base += value.base * curve.externalScale;
    external.quote += value.quote * curve.externalScale;
  }
  return { total, own, external };
}

// Static price-impact estimate. Quote is paid on a buy and received on a sell.
export function estimateTarget(pools, baseId, targetPrice, reference) {
  targetPrice = Number(targetPrice);
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) throw new Error('目标价格请输入大于 0 的数字。');
  if (!Number.isFinite(reference) || reference <= 0) throw new Error('参考价格尚未读到，请稍后再试。');
  requireFullPools(pools);
  const side = targetPrice > reference ? 'ask' : targetPrice < reference ? 'bid' : 'same';
  let quantity = 0, quote = 0, emptyPools = 0;
  if (side === 'same') return { side, quantity, quote, emptyPools, targetPrice };
  for (const pool of pools) {
    if (pool.kind === 'cl') {
      const bounds = [priceAtTick(pool, baseId, MIN_TICK), priceAtTick(pool, baseId, MAX_TICK)].sort((a, b) => a - b);
      if (targetPrice < bounds[0] || targetPrice > bounds[1]) throw new Error('目标价格超出池子的合约价格范围。');
      const target = sqrtAtPrice(pool, baseId, targetPrice), current = Number(pool.sqrtPriceX96) / Q96;
      let active = pool.liquidity;
      for (const t of pool.ticks) {
        const boundary = Math.exp(t.index * LOG_TICK / 2);
        if (target > current && t.index > pool.tick && boundary <= target) active += t.net;
        if (target < current && t.index <= pool.tick && boundary >= target) active -= t.net;
      }
      if (active <= 0n) emptyPools++;
    }
    const value = cumulative(pool, baseId, targetPrice, side);
    quantity += value.quantity; quote += value.quote;
  }
  if (![quantity, quote].every(n => Number.isFinite(n) && n >= 0)) throw new Error('目标价估算超出可计算范围。');
  return { side, quantity, quote, emptyPools, targetPrice };
}

// At most 500 rows: merge adjacent decimal bands, never truncate range totals.
function boundaries(center, endpoint, config, sign) {
  const infinite = endpoint === Infinity;
  const displayEnd = infinite ? center * 100000000 : endpoint;
  const distance = Math.abs(displayEnd - center), count = Math.ceil(distance / config.step);
  const grouped = count > 499;
  const logScale = config.maximum && (displayEnd / center > 100 || displayEnd / center < .01);
  const rows = [];
  const units = center / config.step, nearest = Math.round(units);
  // A binary rounding remainder is not a separate price band. Keep the actual
  // spot for integration, but choose the first decimal boundary as aligned.
  const grid = Math.abs(units - nearest) <= Number.EPSILON * Math.max(1, Math.abs(units)) * 4 ? nearest : units;
  const first = sign > 0 ? Math.floor(grid) + 1 : Math.ceil(grid) - 1;
  if (!grouped) {
    for (let i = 0; i < count; i++) {
      const p = Number(((first + sign * i) * config.step).toPrecision(15));
      if (sign > 0 ? p >= displayEnd : p <= displayEnd) break;
      if (p > 0 && (sign > 0 ? p > (rows.at(-1) ?? center) : p < (rows.at(-1) ?? center))) rows.push(p);
    }
  } else {
    // Keep the nearest 100 price bands intact, then merge the distant bands.
    for (let i = 0; i < 100; i++) {
      const p = Number(((first + sign * i) * config.step).toPrecision(15));
      if (p > 0 && (sign > 0 ? p < displayEnd && p > (rows.at(-1) ?? center) : p > displayEnd && p < (rows.at(-1) ?? center))) rows.push(p);
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
  let ownCurves;
  try { ownCurves = pools.map(ownedCurve); } catch { ownCurves = []; }
  const ownershipVerified = ownCurves.length === pools.length && ownCurves.every(Boolean);
  const side = (name, sign, endpoint) => {
    const bands = boundaries(price, endpoint, config, sign);
    const focus = options.focusPrice;
    if (Number.isFinite(focus) && (sign > 0 ? focus > price && focus <= endpoint : focus < price && focus >= endpoint)
      && !bands.prices.includes(focus)) {
      // Keep the endpoint and nearest 100 bands; replace one distant display boundary.
      if (bands.prices.length >= 500) bands.prices.splice(bands.prices.length - 2, 1);
      bands.prices.push(focus); bands.prices.sort((a, b) => sign * (a - b));
    }
    let previousQ = 0, previousV = 0, previousOwnQ = 0, previousOwnV = 0, previousExternalQ = 0, previousExternalV = 0;
    const rows = bands.prices.map((boundary, i) => {
      let q = 0, v = 0, oq = 0, ov = 0, eq = 0, ev = 0;
      // Integrate this band directly. Subtracting two large cumulative quantities
      // can erase a tiny token amount at extreme prices while its quote value remains huge.
      for (const pool of pools) { const value = cumulative(pool, baseId, boundary, name, i ? bands.prices[i - 1] : undefined); q += value.quantity; v += value.quote; }
      if (ownershipVerified) for (const own of ownCurves) {
        for (const [curve, scale, mine] of [[own.pool, own.scale, true], [own.external, own.externalScale, false]]) {
          if (!scale) continue;
          const value = cumulative(curve, baseId, boundary, name, i ? bands.prices[i - 1] : undefined);
          if (mine) { oq += value.quantity * scale; ov += value.quote * scale; }
          else { eq += value.quantity * scale; ev += value.quote * scale; }
        }
      }
      // Only rounding-sized differences may be clamped. Material mismatches remain unknown.
      const matches = (whole, first, second) => whole === Infinity ? first + second === Infinity
        : Number.isFinite(first + second) && Math.abs(first + second - whole) <= Math.max(whole, 1e-20) * 1e-9;
      const splitValid = ownershipVerified && matches(q, oq, eq) && matches(v, ov, ev);
      const row = { level: i + 1, price: boundary, offset: (boundary / price - 1) * 10000,
        quantity: q, quote: v, cumulativeQuantity: previousQ + q, cumulativeQuote: previousV + v,
        own: splitValid ? { quantity: oq, quote: ov, cumulativeQuantity: previousOwnQ + oq, cumulativeQuote: previousOwnV + ov } : null,
        external: splitValid ? { quantity: eq, quote: ev, cumulativeQuantity: previousExternalQ + eq, cumulativeQuote: previousExternalV + ev } : null,
        focus: boundary === options.focusPrice, endpoint: i === bands.prices.length - 1 };
      previousQ = row.cumulativeQuantity; previousV = row.cumulativeQuote;
      previousOwnQ += oq; previousOwnV += ov; previousExternalQ += eq; previousExternalV += ev; return row;
    });
    return { rows, grouped: bands.grouped, logScale: bands.logScale };
  };
  const bid = side('bid', -1, low), ask = side('ask', 1, high);
  return { price, config, low, high, bids: bid.rows, asks: ask.rows,
    grouped: bid.grouped || ask.grouped, compressed: bid.logScale || ask.logScale, unbounded: high === Infinity,
    ownershipVerified: ownershipVerified && [...bid.rows, ...ask.rows].every(r => r.own !== null) };
}
