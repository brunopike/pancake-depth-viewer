import { cumulative, settings, MIN_TICK, MAX_TICK } from './math.mjs';
import { ownedCurve } from './ownership.mjs';

export function gapPercent(value = 100) {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 1000000) {
    throw new Error('查询范围请输入大于 0、最多 1,000,000 的百分比。');
  }
  return percent;
}

export function gapSettings(percent = 100, precision = 4, threshold = 50) {
  const config = settings(gapPercent(percent), precision);
  if (threshold === '' || threshold === null || !Number.isFinite(Number(threshold)) || Number(threshold) < 0) {
    throw new Error('每档金额上限请输入大于或等于 0 的数字。');
  }
  return { ...config, threshold: Number(threshold) };
}

// Scan exact decimal bands, without the order book's distant-band compression.
// Limits are explicit: silently merging bands would change a per-band threshold.
export function weakLiquidityRanges(pools, baseId, reference, input = {}, coverage = {}) {
  const config = gapSettings(input.percent, input.precision, input.threshold);
  if (!Number.isFinite(reference) || reference <= 0) throw new Error('参考价格未就绪。');
  if (!pools.length || coverage.failedCount > 0 || (coverage.expectedPoolCount ?? pools.length) !== pools.length) {
    throw new Error('池子数据未读完整，暂不能确认薄弱区间。');
  }
  const low = Math.max(0, reference * (1 - config.range)), high = reference * (1 + config.range);
  const count = Math.ceil((high - low) / config.step);
  if (!Number.isFinite(high) || count > 20000 || high / config.step >= Number.MAX_SAFE_INTEGER) {
    throw new Error('当前设置超过 20,000 档或精度过细，请减少小数位数或缩小查询范围。');
  }
  const curves = pools.map(pool => {
    if (!['v2', 'cl'].includes(pool.kind) || ![pool.token0.id, pool.token1.id].some(id => id.toLowerCase() === baseId.toLowerCase())
      || (pool.kind === 'cl' && (!pool.fullRange || pool.minTick !== MIN_TICK || pool.maxTick !== MAX_TICK))) {
      throw new Error('池子数据未读完整，暂不能确认薄弱区间。');
    }
    const own = ownedCurve(pool);
    if (!own) throw new Error('我方 LP 归属待核对，暂不能确认薄弱区间。');
    return own;
  });
  const bands = [];
  for (const [side, sign, end] of [['bid', -1, low], ['ask', 1, high]]) {
    const units = reference / config.step, nearest = Math.round(units);
    const grid = Math.abs(units - nearest) <= Number.EPSILON * Math.max(1, Math.abs(units)) * 4 ? nearest : units;
    const first = sign > 0 ? Math.floor(grid) + 1 : Math.ceil(grid) - 1;
    const prices = [];
    for (let i = 0; i < Math.ceil(Math.abs(end - reference) / config.step); i++) {
      const p = Number(((first + sign * i) * config.step).toPrecision(15));
      if (sign > 0 ? p >= end : p <= end) break;
      if (p > 0 && (sign > 0 ? p > (prices.at(-1) ?? reference) : p < (prices.at(-1) ?? reference))) prices.push(p);
    }
    if (!prices.length || prices.at(-1) !== end) prices.push(end);
    for (let i = 0; i < prices.length; i++) {
      if (bands.length >= 20000) throw new Error('当前设置超过 20,000 档，请减少小数位数或缩小查询范围。');
      const boundary = prices[i], previous = i ? prices[i - 1] : undefined;
      let quote = 0, quantity = 0;
      for (const own of curves) if (own.scale) {
        const amount = cumulative(own.pool, baseId, boundary, side, previous);
        quote += amount.quote * own.scale;
        quantity += amount.quantity * own.scale;
      }
      if (!Number.isFinite(quote) || quote < 0) throw new Error('每档金额暂时无法计算，请刷新数据。');
      // A V2 bid at zero has unlimited token input, but finite quote funds.
      if (Number.isNaN(quantity) || quantity < 0 || (side === 'ask' && !Number.isFinite(quantity))) throw new Error('每档币量暂时无法计算，请刷新数据。');
      bands.push({ low: Math.min(previous ?? reference, boundary), high: Math.max(previous ?? reference, boundary), side, quote, quantity });
    }
  }
  bands.sort((a, b) => a.low - b.low);
  const ranges = [];
  let matched = 0;
  for (const band of bands) {
    if (band.quote > config.threshold) continue;
    matched++;
    let range = ranges.at(-1);
    if (!range || range.high !== band.low || range.side !== band.side) {
      range = { low: band.low, high: band.low, side: band.side, minQuote: Infinity, maxQuote: 0, totalQuote: 0, minQuantity: Infinity, maxQuantity: 0, totalQuantity: 0, bands: [] };
      ranges.push(range);
    }
    range.high = band.high; range.bands.push(band);
    range.minQuote = Math.min(range.minQuote, band.quote); range.maxQuote = Math.max(range.maxQuote, band.quote); range.totalQuote += band.quote;
    range.minQuantity = Math.min(range.minQuantity, band.quantity); range.maxQuantity = Math.max(range.maxQuantity, band.quantity); range.totalQuantity += band.quantity;
  }
  return { config, low, high, ranges, scanned: bands.length, matched };
}
