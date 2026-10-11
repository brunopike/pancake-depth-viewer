import { mkdir, writeFile, rename } from 'node:fs/promises';
const source = 'https://explorer.pancakeswap.com/api/cached/pools/list';
const protocols = ['v2', 'v3', 'infinityCl', 'infinityBin', 'stable', 'infinityStable'];
const rows = new Map();
let after = '', complete = false, pages = 0;
const startedAt = new Date().toISOString();
for (; pages < 4000; pages++) {
  const url = new URL(source);
  url.searchParams.set('chains', 'bsc');
  protocols.forEach(p => url.searchParams.append('protocols', p));
  url.searchParams.set('orderBy', 'tvlUSD');
  if (after) url.searchParams.set('after', after);
  let data;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`Explorer HTTP ${r.status}`);
      data = await r.json();
      if (!Array.isArray(data.rows)) throw new Error('Unexpected pool catalog schema');
      break;
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  for (const p of data.rows) {
    if (p.chainId !== 56 || !/^0x[0-9a-f]{40}([0-9a-f]{24})?$/i.test(p.id) || !(Number(p.tvlUSD) > 0)) continue;
    rows.set(`${p.protocol}:${p.id}`, p);
  }
  if (pages % 20 === 0) console.log(`Catalog: ${pages + 1} pages, ${rows.size} pools`);
  // TVL-descending catalog: zero-TVL pools have no indexed liquidity to visualize.
  if (!data.hasNextPage || data.rows.some(p => Number(p.tvlUSD) === 0)) { complete = true; pages++; break; }
  if (!data.endCursor || data.endCursor === after) throw new Error('Catalog pagination stopped advancing');
  after = data.endCursor;
}
const catalog = { source, startedAt, fetchedAt: new Date().toISOString(), chainId: 56, scope: 'positive-tvl', complete, pages,
  pools: [...rows.values()].map(p => ({ id: p.id, protocol: p.protocol, chainId: p.chainId,
    token0: p.token0, token1: p.token1, feeTier: p.feeTier, tvlUSD: p.tvlUSD,
    volumeUSD24h: p.volumeUSD24h, token0Price: p.token0Price, token1Price: p.token1Price })) };
if (!catalog.pools.length) throw new Error('Empty catalog; retaining previous file');
await mkdir('public/data', { recursive: true });
await writeFile('public/data/catalog.tmp', JSON.stringify(catalog));
await rename('public/data/catalog.tmp', 'public/data/catalog.json');
console.log(JSON.stringify({ pools: rows.size, pages, complete, fetchedAt: catalog.fetchedAt }));
