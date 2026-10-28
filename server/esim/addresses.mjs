import { beijingDayStart, beijingDate } from './metrics.mjs';
import { readFile } from 'node:fs/promises';
import {CONFIRMED_HOLDER_LABELS} from '../../src/holder-labels.mjs';
import {OWN_EXECUTORS,ownTradingInitiators} from './execution-categories.mjs';
const tags = JSON.parse(await readFile(new URL('./address-tags.json', import.meta.url)));
const holderSeed=JSON.parse(await readFile(new URL('./holder-seed.json',import.meta.url)));
const knownLabels=new Proxy(holderSeed.labels,{get:(target,key)=>CONFIRMED_HOLDER_LABELS[key]??target[key]});
const lp = new Set(tags.lpAddresses);
export const OWN_EXECUTOR = tags.ownExecutor;
function ownProgramAddresses(state) { return ownTradingInitiators(state.trades); }
export function addressRanking(state, start, end, mode = 'initiator') {
  const rows = new Map(), ownProgram = ownProgramAddresses(state); let missingSold = 0n, missingBought = 0n;
  const firstSales = new Map();
  const relaySales = new Map();
  for (const t of state.claimFlow?.sales || []) if (BigInt(t.relay_wei)>0n)
    relaySales.set(t.address,Math.min(relaySales.get(t.address)??Infinity,t.timestamp));
  for (const t of state.trades) if (t.group === 'source_recipients' && t.side === 'sell' && t.address)
    firstSales.set(t.address, Math.min(firstSales.get(t.address) ?? Infinity, t.timestamp));
  for (const t of state.trades) {
    if (t.timestamp < start || t.timestamp >= end) continue;
    const address = mode === 'initiator' ? t.initiator : t.address;
    if (!address) { if (t.side === 'sell') missingSold += BigInt(t.amount_wei); else missingBought += BigInt(t.amount_wei); continue; }
    if (!rows.has(address)) rows.set(address, { address, sold: 0n, bought: 0n, sells: new Set(), buys: new Set(), txs: new Set(), days: new Map(), first: t.timestamp, last: t.timestamp });
    const r = rows.get(address), day = beijingDate(t.timestamp);
    r[t.side === 'sell' ? 'sold' : 'bought'] += BigInt(t.amount_wei);
    r[t.side === 'sell' ? 'sells' : 'buys'].add(t.tx); r.txs.add(t.tx);
    if (!r.days.has(day)) r.days.set(day, new Set()); r.days.get(day).add(t.tx);
    r.first = Math.min(r.first, t.timestamp); r.last = Math.max(r.last, t.timestamp);
  }
  const activityRows=[...rows.values()].map(r => {
    const peakDailyTrades = Math.max(...[...r.days.values()].map(s => s.size));
    const ownLP=lp.has(r.address)||knownLabels[r.address]?.kind==='lp';
    const own=knownLabels[r.address]?.kind!=='mixed'&&(ownLP||ownProgram.has(r.address)||OWN_EXECUTORS.has(r.address)||knownLabels[r.address]?.kind==='own');
    return { address: r.address, sold: r.sold.toString(), bought: r.bought.toString(), netSold: (r.sold - r.bought).toString(),
      sellCount: r.sells.size, buyCount: r.buys.size, trades: r.txs.size, peakDailyTrades,
      highFrequency: !own&&knownLabels[r.address]?.kind!=='mixed'&&(peakDailyTrades >= 100||['frequency','arbitrage'].includes(knownLabels[r.address]?.kind)), own,
      ownType: !own?null:ownLP ? 'LP' : ownProgram.has(r.address) || OWN_EXECUTORS.has(r.address) ? '刷量' : '关联',
      received: !!state.firstRecipient[r.address] && state.firstRecipient[r.address].timestamp < end,
      firstReceived: state.firstRecipient[r.address]?.timestamp ?? null,
      firstReceivedSale: firstSales.get(r.address) ?? null,
      receivedSold: (firstSales.get(r.address) ?? Infinity) < end,
      firstRelaySale: relaySales.get(r.address) ?? null,
      relaySold: (relaySales.get(r.address) ?? Infinity) < end,
      first: r.first, last: r.last };
  }).sort((a, b) => BigInt(a.sold) > BigInt(b.sold) ? -1 : BigInt(a.sold) < BigInt(b.sold) ? 1 : a.address.localeCompare(b.address));
  return {missingSold:missingSold.toString(),missingBought:missingBought.toString(),rows:activityRows.filter(r=>BigInt(r.sold)>0n),buyOnlyRows:activityRows.filter(r=>BigInt(r.sold)===0n)};
}
export function buildAddressReport(state, now = Date.now() / 1000) {
  const day = beijingDayStart(now), windows = {};
  for (const [key, start, end] of [['today', day, now], ['yesterday', day - 86400, day], ['history', state.origin, now]]) {
    windows[key] = { start, end: Math.min(end, state.cutoff), available: state.cutoff > start,
      initiator: addressRanking(state, start, end, 'initiator'), funding: addressRanking(state, start, end, 'funding') };
  }
  return { version: 1, generatedAt: now, cutoff: state.cutoff, block: state.block, blockHash: state.blockHash,
    ownProgramCount: ownProgramAddresses(state).size, ownExecutor: OWN_EXECUTOR, ownExecutors:[...OWN_EXECUTORS], highFrequencyThreshold: 100, windows };
}
export function knownTradingAddresses(state) {
  return new Set(state.trades.flatMap(t => [t.address, t.initiator]).filter(a => /^0x[0-9a-f]{40}$/.test(a || '')));
}
export function addressOptions(q = {}) {
  const result = { period: q.period || 'today', mode: q.mode || 'initiator', filter: q.filter || 'all', sort: q.sort || 'sold', page: Number(q.page || 0), search: (q.search || '').toLowerCase() };
  if (!['today','yesterday','history'].includes(result.period) || !['initiator','funding'].includes(result.mode) || !['all','own','received','other','frequency'].includes(result.filter) || !['sold','netSold','trades'].includes(result.sort) || !Number.isInteger(result.page) || result.page < 0 || result.page > 100000 || typeof q.search !== 'undefined' && (typeof q.search !== 'string' || q.search.length > 42)) throw new Error('INVALID_ADDRESS_FILTER');
  return result;
}
export function buildAddressPage(state, options, now = Date.now() / 1000) {
  const o = addressOptions(options), day = beijingDayStart(now);
  const start = o.period === 'today' ? day : o.period === 'yesterday' ? day - 86400 : state.origin;
  const end = Math.min(o.period === 'yesterday' ? day : now, state.cutoff);
  const data = addressRanking(state, start, end, o.mode);
  const rows = data.rows.filter(r => (!o.search || r.address.includes(o.search)) && (o.filter === 'all' || o.filter === 'own' && r.own || o.filter === 'received' && r.received || o.filter === 'other' && !r.own && !r.received || o.filter === 'frequency' && r.highFrequency)).sort((a,b) => {
    const x=BigInt(a[o.sort]), y=BigInt(b[o.sort]); return x===y ? a.address.localeCompare(b.address) : x>y ? -1:1;
  });
  const page = Math.min(o.page, Math.max(0, Math.ceil(rows.length / 25) - 1));
  return { version:1, cutoff:state.cutoff, block:state.block, blockHash:state.blockHash, generatedAt:now,
    ownProgramCount:ownProgramAddresses(state).size, ownExecutor:OWN_EXECUTOR, highFrequencyThreshold:100,
    window:{start,end,available:end>start}, population:data.rows.length, missingSold:data.missingSold,
    total:rows.length, totals:{sold:rows.reduce((n,r)=>n+BigInt(r.sold),0n).toString(),bought:rows.reduce((n,r)=>n+BigInt(r.bought),0n).toString(),own:rows.filter(r=>r.own).length},page, pageSize:25, options:o, rows:rows.slice(page*25,(page+1)*25) };
}

// One period and one attribution mode only; keeps the complete ranking below
// the full three-window snapshot size, without collecting any new chain data.
export function buildAddressDataset(state,options,now=Date.now()/1000){
 const o=addressOptions(options),day=beijingDayStart(now),start=o.period==='today'?day:o.period==='yesterday'?day-86400:state.origin;
 const end=Math.min(o.period==='yesterday'?day:now,state.cutoff),data=addressRanking(state,start,end,o.mode);
 return {version:1,cutoff:state.cutoff,block:state.block,blockHash:state.blockHash,ownProgramCount:ownProgramAddresses(state).size,ownExecutor:OWN_EXECUTOR,ownExecutors:[...OWN_EXECUTORS],
   window:{start,end,available:end>start},population:data.rows.length,missingSold:data.missingSold,missingBought:data.missingBought,rows:data.rows,buyOnlyRows:data.buyOnlyRows};
}
