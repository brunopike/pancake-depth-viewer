import config from '../public/data/background-markets.json';
import { configuredMarkets, snapshotName } from './background-markets.mjs';
import { parseSnapshot, serializeSnapshot, latestSharedURL } from './snapshot.mjs';
const key = market => `pancake-depth:v1:${market.key}`;
export function readBrowserCache(market) {
  try { return parseSnapshot(localStorage.getItem(key(market)), market.pools, market.base.id, market.quote.id); } catch { return null; }
}
export function saveBrowserCache(market, live) {
  try {
    const text = serializeSnapshot(live, market.base.id, market.quote.id, live.source || '公共节点');
    if (text.length < 1500000) localStorage.setItem(key(market), text);
  } catch { /* Browsing and live refresh still work when storage is unavailable or full. */ }
}
export async function readSharedCache(market, seed = false) {
  if (!configuredMarkets(config).some(m => m.base === market.base.id.toLowerCase() && m.quote === market.quote.id.toLowerCase())) return null;
  try {
    const signal = AbortSignal.timeout(6000);
    const filename = snapshotName(market.base.id, market.quote.id);
    const url = seed ? `./data/${filename}` : await latestSharedURL(signal, filename);
    const response = await fetch(url, { cache: 'no-store', signal });
    if (!response.ok) return null;
    return parseSnapshot(await response.text(), market.pools, market.base.id, market.quote.id);
  } catch { return null; }
}
