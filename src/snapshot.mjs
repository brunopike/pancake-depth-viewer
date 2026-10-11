export const DEFAULT_BASE = '0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d';
export const DEFAULT_QUOTE = '0x55d398326f99059ff775485246999027b3197955';
export const SHARED_URL = 'https://raw.githubusercontent.com/starkweng/pancake-depth-viewer/depth-cache/esim-usdt.json';
const address = s => typeof s === 'string' && /^0x[0-9a-f]{40}$/i.test(s);
const poolKey = p => `${p.protocol}:${p.id.toLowerCase()}`;
const bigintKeys = new Set(['blockNumber', 'sqrtPriceX96', 'liquidity', 'net']);

export function serializeSnapshot(live, base, quote, source = '公共节点') {
  const payload = { ...live, version: 1, chainId: 56, base: base.toLowerCase(), quote: quote.toLowerCase(),
    range: live.range === Infinity ? 'max' : live.range, source };
  return JSON.stringify(payload, (key, value) => typeof value === 'bigint' ? value.toString() : value);
}

export function parseSnapshot(text, metas, base, quote) {
  const data = JSON.parse(text, (key, value) => bigintKeys.has(key) && typeof value === 'string' && /^-?\d+$/.test(value) ? BigInt(value) : value);
  if (data.version !== 1 || data.chainId !== 56 || data.base !== base.toLowerCase() || data.quote !== quote.toLowerCase()
    || !address(base) || !address(quote) || typeof data.blockNumber !== 'bigint' || data.blockNumber < 0n
    || !/^0x[0-9a-f]{64}$/i.test(data.blockHash) || !Number.isFinite(data.timestamp) || data.timestamp > Date.now() + 60000
    || !Array.isArray(data.pools) || !Array.isArray(data.failed)
    || !(data.range === 'max' || Number.isFinite(data.range) && data.range > 0)) throw new Error('缓存数据无效');
  const known = new Map(metas.map(p => [poolKey(p), p]));
  const seen = new Set();
  for (const p of [...data.pools, ...data.failed]) {
    const key = poolKey(p), meta = known.get(key);
    if (!meta || seen.has(key) || !['token0', 'token1'].every(k => p[k]?.id.toLowerCase() === meta[k].id.toLowerCase() && p[k].decimals === meta[k].decimals)) throw new Error('缓存池子身份不一致');
    seen.add(key);
    Object.assign(p, meta); // Current catalog supplies identity/labels, never cached display metadata.
  }
  if (seen.size !== known.size) throw new Error('缓存未覆盖当前池子列表');
  for (const p of data.pools) {
    if (p.kind === 'v2') {
      if (p.protocol !== 'v2' || ![p.reserve0, p.reserve1].every(n => Number.isFinite(n) && n > 0)) throw new Error('缓存储备无效');
    } else if (p.kind === 'cl') {
      if (!['v3', 'infinityCl'].includes(p.protocol) || typeof p.sqrtPriceX96 !== 'bigint' || p.sqrtPriceX96 <= 0n
        || typeof p.liquidity !== 'bigint' || p.liquidity < 0n || !Number.isInteger(p.tick) || p.tick < -887272 || p.tick > 887272 || !Number.isInteger(p.minTick) || !Number.isInteger(p.maxTick) || p.minTick < -887272 || p.maxTick > 887272 || p.minTick > p.maxTick || !Number.isInteger(p.spacing) || p.spacing < 1
        || !Array.isArray(p.ticks) || p.ticks.length > 15000 || data.range === 'max' && p.fullRange !== true) throw new Error('缓存价格数据无效');
      let previous = -887273;
      for (const t of p.ticks) {
        if (!Number.isInteger(t.index) || t.index <= previous || t.index < -887272 || t.index > 887272 || t.index % p.spacing !== 0 || typeof t.net !== 'bigint') throw new Error('缓存价格档位无效');
        previous = t.index;
      }
      if (p.fullRange) {
        if (p.minTick !== -887272 || p.maxTick !== 887272 || !Number.isFinite(p.fullScanTimestamp) || p.fullScanTimestamp > data.timestamp) throw new Error('缓存全量读取时间无效');
        let left = p.liquidity, right = p.liquidity;
        for (const t of p.ticks) { if (t.index <= p.tick) left -= t.net; else right += t.net; }
        if (left !== 0n || right !== 0n) throw new Error('缓存全部价格校验失败');
      }
    } else throw new Error('缓存池子类型无效');
  }
  data.range = data.range === 'max' ? Infinity : data.range;
  return data;
}

export function defaultPair(base, quote) {
  return base.toLowerCase() === DEFAULT_BASE && quote.toLowerCase() === DEFAULT_QUOTE;
}
