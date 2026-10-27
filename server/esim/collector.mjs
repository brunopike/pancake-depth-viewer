import { TOKEN, SOURCE } from './metrics.mjs';
import {collectSourceInflow} from './source-inflow-collector.mjs';
import {collectNativeTraces} from './native-traces.mjs';
import { TRANSFER, V2, V3, V4, PCS, UNI, SWAPS, signature, topic, addr, order, before, eventKey,
  decodeLeg, attributionCandidates, attributedRows } from './attribution.mjs';
const hex = n => `0x${n.toString(16)}`;
const unique = rows => [...new Map(rows.map(e => [eventKey(e), e])).values()];
const num = x => Number(BigInt(x));
const timestamp = h => h.milliTimestamp ? num(h.milliTimestamp) / 1000 : num(h.timestamp);
const ensure = (ok, code) => { if (!ok) throw new Error(code); };
function traceFailed(t, traces) {
  return !!t.error || traces.some(p => p.error && p.transactionHash === t.transactionHash && p.traceAddress.length <= t.traceAddress.length && p.traceAddress.every((v, i) => t.traceAddress[i] === v));
}
export function nativeFlow(t) {
  const a = t.action || {}, from = (a.from || a.address)?.toLowerCase();
  const to = (t.type === 'create' ? t.result?.address : a.to || a.refundAddress)?.toLowerCase();
  const value = BigInt(a.value || a.balance || '0x0');
  if (!value || from === to || ![from, to].includes(SOURCE)) return null;
  if (t.type === 'call' && (a.callType || 'call') !== 'call') return null;
  ensure(['call', 'create', 'suicide', 'selfdestruct'].includes(t.type), 'UNSUPPORTED_NATIVE_TRACE');
  return { from, to, value: value.toString(), side: from === SOURCE ? 'out' : t.traceAddress.length ? 'internal' : 'direct' };
}

export async function refreshState(state, transport, { maxBlocks = 24000, targetBlock, progress = () => {} } = {}) {
  const { rpc, batch } = transport;
  const [chain, prior, head] = await batch([['eth_chainId', []], ['eth_getBlockByNumber', [hex(state.block), false]], ['eth_getBlockByNumber', ['latest', false]]], { fresh: true });
  ensure(chain === '0x38' && prior?.hash === state.blockHash, 'CHAIN_OR_CHECKPOINT_CHANGED');
  const end = Math.min(num(head.number) - 20, targetBlock ?? Infinity, state.block + maxBlocks), start = state.block + 1;
  if (end < start) return {...state,sourceInflow:await collectSourceInflow(state,transport,{progress})};
  const [last, excluded, balance, tokenBalance] = await batch([['eth_getBlockByNumber', [hex(end), false]], ['eth_getBlockByNumber', [hex(end + 1), false]], ['eth_getBalance', [SOURCE, hex(end)]],['eth_call',[{to:TOKEN,data:`0x70a08231${SOURCE.slice(2).padStart(64,'0')}`},hex(end)]]]);
  ensure(last && excluded?.parentHash === last.hash, 'BOUNDARY_CHANGED');
  ensure(typeof tokenBalance==='string'&&/^0x[0-9a-f]+$/i.test(tokenBalance)&&BigInt(tokenBalance)<2n**256n,'SOURCE_TOKEN_BALANCE_MISSING');
  progress({ phase: 'collect', start, end });
  const pools = structuredClone(state.pools), warnings = [];
  const logQueries = (address, topics) => {
    const q = []; for (let a = start; a <= end; a += 5000) q.push(['eth_getLogs', [{ address, topics, fromBlock: hex(a), toBlock: hex(Math.min(a + 4999, end)) }]]);
    return q;
  };
  // Fixed ESIM filters, never a chain-wide Transfer or Swap scan.
  const initQueries = [];
  for (const [manager, sig] of [[PCS, signature('Initialize(bytes32,address,address,address,uint24,bytes32,uint160,int24)')], [UNI, signature('Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)')]]) {
    initQueries.push(...logQueries(manager, [sig, null, topic(TOKEN)]), ...logQueries(manager, [sig, null, null, topic(TOKEN)]));
  }
  const initializations = unique((await batch(initQueries)).flat());
  for (const e of initializations) {
    const id = e.topics[1], manager = e.address.toLowerCase();
    if (!pools[id]) pools[id] = { id, manager, token0: addr(e.topics[2]), token1: addr(e.topics[3]), verified: 'Initialize event' };
  }
  // New pool identities are real Initialize events. Nonzero hook economics are
  // not extrapolated from a previous audit; the pool-fill sums remain explicit.
  if (initializations.length) warnings.push('本次发现新增池；复杂交易保留未归因。');
  const queries = logQueries(TOKEN, [TRANSFER, topic(SOURCE)]);
  const classic = Object.keys(pools).filter(id => id.length === 42);
  if (classic.length) queries.push(...logQueries(classic, [[V2, ...V3]]));
  for (const manager of [PCS, UNI]) {
    const ids = Object.keys(pools).filter(id => pools[id].manager === manager);
    if (ids.length) queries.push(...logQueries(manager, [SWAPS[manager], ids]));
  }
  const allEvents = unique((await batch(queries)).flat());
  ensure(allEvents.every(e => !e.removed && num(e.blockNumber) >= start && num(e.blockNumber) <= end), 'EVENT_RANGE');
  const distributionLogs = allEvents.filter(e => e.address.toLowerCase() === TOKEN && e.topics[0] === TRANSFER && BigInt(e.data) > 0n);
  const swaps = allEvents.filter(e => V3.has(e.topics[0]) || V4.has(e.topics[0]) || e.topics[0] === V2);

  const traces = await collectNativeTraces(transport,start,end);
  const indexed = []; let pageKey;
  do {
    const page = await rpc('alchemy_getAssetTransfers', [{ fromBlock: hex(start), toBlock: hex(end), toAddress: SOURCE,
      category: ['external'], withMetadata: true, excludeZeroValue: false, maxCount: '0x3e8', order: 'asc', ...(pageKey ? { pageKey } : {}) }]);
    ensure(Array.isArray(page?.transfers), 'INDEX_INCOMPLETE'); indexed.push(...page.transfers); pageKey = page.pageKey;
    ensure(indexed.length < 50000, 'INDEX_PAGE_LIMIT');
  } while (pageKey);
  const hashes = [...new Set([...allEvents.map(e => e.transactionHash), ...traces.map(t => t.transactionHash), ...indexed.map(t => t.hash)])];
  const receipts = Object.fromEntries(hashes.map((h, i) => [h, null]));
  const fetchedReceipts = await batch(hashes.map(h => ['eth_getTransactionReceipt', [h]]));
  for (const [i, r] of fetchedReceipts.entries()) { ensure(r?.transactionHash === hashes[i] && num(r.blockNumber) >= start && num(r.blockNumber) <= end, 'MISSING_RECEIPT'); receipts[hashes[i]] = r; }
  const blocks = [...new Set(fetchedReceipts.map(r => num(r.blockNumber)))];
  const headers = Object.fromEntries((await batch(blocks.map(b => ['eth_getBlockByNumber', [hex(b), false]]))).map(h => [num(h.number), h]));
  for (const r of fetchedReceipts) { const h = headers[num(r.blockNumber)]; ensure(h?.hash === r.blockHash && h.transactions[num(r.transactionIndex)] === r.transactionHash, 'RECEIPT_CANONICAL'); }
  for (const e of allEvents) { const r = receipts[e.transactionHash]; ensure(r.status === '0x1' && r.blockHash === e.blockHash && r.logs.some(l => eventKey(l) === eventKey(e) && l.data === e.data && l.address === e.address), 'EVENT_RECEIPT_MISMATCH'); }
  // Inspect only receipts already touched by the fixed ESIM scan. If another
  // ESIM classic pool appears, stop rather than publish incomplete totals.
  const unknown = [...new Set(fetchedReceipts.flatMap(r => r.logs).filter(e => (V3.has(e.topics[0]) || e.topics[0] === V2) && !pools[e.address.toLowerCase()]).map(e => e.address.toLowerCase()))];
  if (unknown.length) {
    const currencies = await batch(unknown.flatMap(a => [['eth_call', [{ to: a, data: '0x0dfe1681' }, hex(end)]], ['eth_call', [{ to: a, data: '0xd21220a7' }, hex(end)]]]));
    ensure(!unknown.some((a, i) => [addr(currencies[i * 2]), addr(currencies[i * 2 + 1])].includes(TOKEN)), 'NEW_ESIM_POOL_REQUIRES_SYNC');
  }
  const time = block => timestamp(headers[block]);
  const firstRecipient = structuredClone(state.firstRecipient);
  const distributions = distributionLogs.sort((a, b) => before(order(a), order(b)) ? -1 : 1).map(e => {
    const o = order(e), recipient = addr(e.topics[2]);
    const row = { id: eventKey(e), tx: e.transactionHash, block: o[0], timestamp: time(o[0]), recipient, value: BigInt(e.data).toString(), order: o };
    firstRecipient[recipient] ??= { order: o, timestamp: row.timestamp }; return row;
  });
  const legs = swaps.map(e => decodeLeg(e, pools, time(num(e.blockNumber)))).filter(l => BigInt(l.amount_wei) > 0n);
  const candidates = attributionCandidates(legs, receipts, firstRecipient, pools);
  const owners = [...new Set(candidates.flatMap(c => c.owners.filter(o => !o.claimBefore).map(o => o.address)))];
  const codes = Object.fromEntries(owners.map((a, i) => [a, null]));
  const codeValues = await batch(owners.map(a => ['eth_getCode', [a, hex(end)]]));
  for (let i = 0; i < owners.length; i++) codes[owners[i]] = codeValues[i];
  const trades = attributedRows(candidates, codes).map(t => ({ ...t,
    initiator: receipts[t.tx].from.toLowerCase(), executor: receipts[t.tx].to?.toLowerCase() || null }));
  for (const side of ['sell', 'buy']) ensure(legs.filter(l => l.side === side).reduce((n, l) => n + BigInt(l.amount_wei), 0n) === trades.filter(r => r.side === side).reduce((n, r) => n + BigInt(r.amount_wei), 0n), 'AMOUNTS_DONT_RECONCILE');

  // Expand missing trace ancestors before using internal money movements.
  const expand = new Set();
  for (const t of traces) for (let len = 0; len < (t.traceAddress?.length || 0); len++) if (!traces.some(p => p.transactionHash === t.transactionHash && p.traceAddress.length === len && p.traceAddress.every((v, i) => v === t.traceAddress[i]))) expand.add(t.transactionHash);
  const full = await batch([...expand].map(h => ['trace_transaction', [h]]));
  const ancestry = new Map([...expand].map((h, i) => [h, full[i]]));
  const calls = [], native = [], failedTraces = traces.filter(t => t.error);
  const seen = new Set();
  for (const t of traces) {
    const r = receipts[t.transactionHash];
    if (r.status !== '0x1' || traceFailed(t, ancestry.get(t.transactionHash) || failedTraces)) continue;
    const a = t.action || {}, from = a.from?.toLowerCase(), to = a.to?.toLowerCase();
    ensure(t.blockHash === r.blockHash, 'TRACE_BLOCK_MISMATCH');
    const block = num(r.blockNumber), ts = time(block), id = `${t.transactionHash}:${t.traceAddress.join('.')}:${t.type}`;
    if (seen.has(id)) continue; seen.add(id);
    if (t.type === 'call' && !t.traceAddress.length && to === SOURCE) calls.push({ tx: t.transactionHash, block, timestamp: ts, from, value: BigInt(a.value || '0x0').toString() });
    const flow = nativeFlow(t);
    if (flow) native.push({ id, tx: t.transactionHash, block, timestamp: ts, ...flow });
  }
  const successfulIndexed = new Set(indexed.filter(t => receipts[t.hash].status === '0x1').map(t => t.hash));
  ensure(successfulIndexed.size === calls.length && calls.every(c => successfulIndexed.has(c.tx)), 'DIRECT_CALL_INDEX_MISMATCH');
  ensure(native.filter(n => n.side === 'direct').reduce((n, r) => n + BigInt(r.value), 0n) === calls.reduce((n, r) => n + BigInt(r.value), 0n), 'DIRECT_NATIVE_AMOUNT_MISMATCH');
  const net = native.reduce((n, t) => n + BigInt(t.value) * (t.side === 'out' ? -1n : 1n), 0n);
  ensure(BigInt(state.balance) + net === BigInt(balance), 'BNB_BALANCE_MISMATCH');
  const allTrades = [...state.trades, ...trades], totals = new Map();
  for (const t of allTrades) if (t.group === 'source_recipients' && t.side === 'sell' && t.address) totals.set(t.address, (totals.get(t.address) || 0n) + BigInt(t.amount_wei));
  const top = [...totals].sort((a, b) => a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0).slice(0, 3).map(([a]) => a);
  const topValues = await batch(top.map(a => ['eth_call', [{ to: TOKEN, data: `0x70a08231${a.slice(2).padStart(64, '0')}` }, hex(end)]]));
  const topBalances = Object.fromEntries(top.map((a, i) => [a, BigInt(topValues[i]).toString()]));
  const after = await rpc('eth_getBlockByNumber', [hex(end), false], { fresh: true }); ensure(after.hash === last.hash, 'END_HASH_CHANGED');
  const next = { ...state, block: end, blockHash: last.hash, cutoff: timestamp(excluded), pools, firstRecipient,
    distributions: [...state.distributions, ...distributions], trades: allTrades,
    calls: [...state.calls, ...calls], native: [...state.native, ...native], balance: BigInt(balance).toString(),
    sourceTokenBalance:{block:end,blockHash:last.hash,cutoff:timestamp(excluded),balance_wei:BigInt(tokenBalance).toString()},
    topBalances, nativeComplete: true, coverage: { ...state.coverage, poolCount: Object.keys(pools).length }, warnings };
  return {...next,sourceInflow:await collectSourceInflow(next,transport,{progress})};
}
