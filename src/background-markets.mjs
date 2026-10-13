import { DEFAULT_BASE, DEFAULT_QUOTE } from './snapshot.mjs';

export function configuredMarkets(config) {
  if (!Array.isArray(config?.markets)) throw new Error('后台币种配置缺少 markets 列表。');
  const seen = new Set();
  return config.markets.filter(m => m.enabled !== false).map(m => {
    if (m.enabled !== true || ![m.base, m.quote].every(a => /^0x[0-9a-f]{40}$/i.test(a || '')) || m.base.toLowerCase() === m.quote.toLowerCase()) throw new Error('后台币种需要 enabled、base 和 quote。');
    const base = m.base.toLowerCase(), quote = m.quote.toLowerCase(), key = [base, quote].sort().join('/');
    if (seen.has(key)) throw new Error('后台币种重复。');
    seen.add(key);
    return { name: String(m.name || `${base} / ${quote}`), base, quote };
  });
}

export function snapshotName(base, quote) {
  if (![base, quote].every(a => /^0x[0-9a-f]{40}$/i.test(a || ''))) throw new Error('无效币种地址。');
  return base.toLowerCase() === DEFAULT_BASE && quote.toLowerCase() === DEFAULT_QUOTE
    ? 'esim-usdt.json' : `${base.toLowerCase()}-${quote.toLowerCase()}.json`;
}

export function marketPools(catalog, market) {
  const pair = [market.base, market.quote].sort().join('/');
  const pools = catalog.pools.filter(p => [p.token0.id.toLowerCase(), p.token1.id.toLowerCase()].sort().join('/') === pair);
  if (!pools.some(p => ['v2', 'v3', 'infinityCl'].includes(p.protocol))) throw new Error(`目录没有所选币对的可读取池子：${market.name}`);
  return pools;
}

// The published directory follows the same allowlist as paid background reads.
// Missing pairs fail explicitly; they must never trigger a whole-chain crawl.
export function configuredCatalog(catalog, config) {
  if (catalog?.chainId !== 56 || !Array.isArray(catalog.pools)) throw new Error('币对目录格式错误。');
  const markets = configuredMarkets(config);
  const selected = new Set(markets.flatMap(market => marketPools(catalog, market)));
  return { source: catalog.source, fetchedAt: catalog.fetchedAt, chainId: 56,
    scope: 'configured-pairs', complete: catalog.complete,
    markets, pools: catalog.pools.filter(pool => selected.has(pool)) };
}
