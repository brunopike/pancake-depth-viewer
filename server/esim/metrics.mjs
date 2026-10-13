import {executionBreakdown} from './execution-categories.mjs';
import {claimFlowWindow} from './claim-flow.mjs';
export const TOKEN = '0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d';
export const SOURCE = '0x67b97c3845438f264965ca154ba13051c6c73416';
export const ORIGIN = Date.parse('2026-10-03T09:59:50+08:00') / 1000;
export const GROUPS = ['source_recipients', 'other_wallet_candidates', 'remaining_unattributed', 'all_pools'];
const DAY = 86400;
export const beijingDayStart = seconds => Math.floor((seconds + 28800) / DAY) * DAY - 28800;
export const beijingDate = seconds => new Date((seconds + 28800) * 1000).toISOString().slice(0, 10);
const sum = (rows, key) => rows.reduce((n, row) => n + BigInt(row[key]), 0n).toString();
const distinct = (rows, key) => new Set(rows.map(row => row[key]).filter(Boolean)).size;

export function aggregateTrades(rows) {
  return Object.fromEntries(GROUPS.map(group => {
    const rr = group === 'all_pools' ? rows : rows.filter(r => r.group === group);
    const result = {};
    for (const [side, field] of [['sell', 'sold_wei'], ['buy', 'bought_wei']]) {
      const ss = rr.filter(r => r.side === side);
      result[field] = sum(ss, 'amount_wei');
      result[`${side}_txs`] = distinct(ss, 'tx');
      result[`${side}_addresses`] = distinct(ss, 'address');
      result[`${side}_addresses_lower_bound`] = ss.some(r => !r.address);
    }
    result.net_sold_wei = (BigInt(result.sold_wei) - BigInt(result.bought_wei)).toString();
    return [group, result];
  }));
}

export function windowMetrics(state, start, end) {
  const within = rows => rows.filter(r => r.timestamp >= start && r.timestamp < end);
  const trades = within(state.trades), distributions = within(state.distributions), calls = within(state.calls), native = within(state.native);
  const paid = calls.filter(r => BigInt(r.value) > 0n);
  const knownFrom = Math.max(start, state.origin), knownTo = Math.min(end, state.cutoff);
  const direct = sum(paid, 'value');
  const internal = sum(native.filter(r => r.side === 'internal'), 'value');
  const outflow = sum(native.filter(r => r.side === 'out'), 'value');
  const firstCaller = new Map();
  for (const c of state.calls) firstCaller.set(c.from, Math.min(firstCaller.get(c.from) ?? Infinity, c.timestamp));
  const recipients = new Set(distributions.map(r => r.recipient));
  const callers = new Set(calls.map(r => r.from));
  const balanceAt = boundary => state.nativeComplete && state.balance != null && boundary <= state.cutoff
    ? (BigInt(state.balance) - state.native.filter(r => r.timestamp >= boundary)
      .reduce((n, r) => n + BigInt(r.value) * (r.side === 'out' ? -1n : 1n), 0n)).toString() : null;
  return {
    start, end, availableThrough: knownTo, complete: state.cutoff >= end,
    available: knownTo > knownFrom, groups: aggregateTrades(trades), executionBreakdown: executionBreakdown(trades),
    claimFlow: claimFlowWindow(state.claimFlow,start,Math.min(end,state.cutoff)),
    distribution: { total_wei: sum(distributions, 'value'), recipients: recipients.size,
      transactions: distinct(distributions, 'tx'), transfer_events: distributions.length,
      new_recipients: [...recipients].filter(a => state.firstRecipient[a]?.timestamp >= start && state.firstRecipient[a]?.timestamp < end).length },
    interaction: { successful_calls: calls.length, successful_addresses: callers.size,
      new_callers: [...callers].filter(a => firstCaller.get(a) >= start && firstCaller.get(a) < end).length },
    bnb: { direct_inflow_wei: direct, direct_inflow_txs: paid.length, direct_inflow_addresses: distinct(paid, 'from'),
      internal_inflow_wei: state.nativeComplete ? internal : null,
      outflow_wei: state.nativeComplete ? outflow : null,
      net_inflow_wei: state.nativeComplete ? (BigInt(direct) + BigInt(internal) - BigInt(outflow)).toString() : null,
      balance_start_wei: balanceAt(Math.max(start, state.origin)), balance_end_wei: balanceAt(Math.min(end, state.cutoff)),
      internal_coverage: state.nativeComplete ? 'complete' : 'partial' },
  };
}

export function buildReport(state, now = Date.now() / 1000) {
  if (state.token !== TOKEN || state.source !== SOURCE || state.version !== 1) throw new Error('Invalid ESIM state');
  const today = beijingDayStart(now), yesterday = today - DAY;
  const end = Math.min(now, state.cutoff);
  const windows = { today: windowMetrics(state, today, now), yesterday: windowMetrics(state, yesterday, today),
    history: windowMetrics(state, state.origin, end) };
  const hourly = {};
  for (const [name, start, finish] of [['today', today, now], ['yesterday', yesterday, today]]) {
    hourly[name] = [];
    for (let h = start; h < finish; h += 3600) {
      const stop = Math.min(h + 3600, finish);
      const rr = state.trades.filter(r => r.timestamp >= h && r.timestamp < stop);
      hourly[name].push({ start: h, end: stop, available: h < state.cutoff,
        ...aggregateTrades(rr).all_pools });
    }
  }
  const history = [];
  for (let start = beijingDayStart(state.origin); start < end; start += DAY) {
    history.push({ date: beijingDate(start), partialFirstDay: start < state.origin,
      ...windowMetrics(state, Math.max(start, state.origin), Math.min(start + DAY, end)) });
  }
  const totals = new Map();
  for (const r of state.trades) if (r.group === 'source_recipients' && r.side === 'sell' && r.address) totals.set(r.address, (totals.get(r.address) || 0n) + BigInt(r.amount_wei));
  const top = [...totals].sort((a, b) => a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0).slice(0, 3).map(([address, amount]) => ({
    address, sold_wei: amount.toString(), received_wei: sum(state.distributions.filter(r => r.recipient === address), 'value'),
    balance_wei: state.topBalances?.[address] ?? null,
  }));
  return { version: 1, token: TOKEN, source: SOURCE, origin: state.origin, cutoff: state.cutoff,
    generatedAt: now, block: state.block, blockHash: state.blockHash,
    coverage: state.coverage, balance_wei: state.balance ?? null, windows, hourly,
    history: history.reverse(), top, warnings: state.warnings || [] };
}
