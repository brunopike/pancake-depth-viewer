import { defaultPair, parseSnapshot, serializeSnapshot, SHARED_URL } from './snapshot.mjs';
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
  if (!defaultPair(market.base.id, market.quote.id)) return null;
  try {
    const response = await fetch(seed ? './data/esim-usdt.json' : SHARED_URL, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;
    return parseSnapshot(await response.text(), market.pools, market.base.id, market.quote.id);
  } catch { return null; }
}
