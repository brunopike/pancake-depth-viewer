import test from 'node:test';
import assert from 'node:assert/strict';
import { beijingDayStart, beijingDate, aggregateTrades, buildReport, TOKEN, SOURCE, ORIGIN } from '../server/esim/metrics.mjs';
const ts = v => Date.parse(v) / 1000;
const base = { version: 1, token: TOKEN, source: SOURCE, origin: ORIGIN, cutoff: ts('2026-10-13T12:00:00+08:00'), block: 1,
  trades: [], distributions: [], calls: [], native: [], firstRecipient: {}, nativeComplete: true };
test('Beijing boundaries do not depend on server timezone; yesterday is a closed calendar day', () => {
  const now = ts('2026-10-13T18:20:00+08:00');
  assert.equal(beijingDate(now), '2026-10-13');
  assert.equal(beijingDayStart(now), ts('2026-10-13T00:00:00+08:00'));
  const r = buildReport(base, now);
  assert.equal(r.windows.yesterday.start, ts('2026-10-12T00:00:00+08:00'));
  assert.equal(r.windows.yesterday.end - r.windows.yesterday.start, 86400);
  assert.equal(r.windows.today.availableThrough, base.cutoff);
  assert.equal(r.windows.today.complete, false);
});
test('midnight is assigned once; unknown history is unavailable rather than fabricated zero', () => {
  const midnight = ts('2026-10-13T00:00:00+08:00');
  const state = { ...base, trades: [{ tx: '1', timestamp: midnight, side: 'sell', amount_wei: '10', address: 'a', group: 'source_recipients' }] };
  const r = buildReport(state, base.cutoff);
  assert.equal(r.windows.yesterday.groups.all_pools.sold_wei, '0');
  assert.equal(r.windows.today.groups.all_pools.sold_wei, '10');
  assert.equal(buildReport(state, ts('2026-10-15T01:00:00+08:00')).windows.today.available, false);
});
test('address counts use unions, BigInt remains exact, buys and sells in same transaction remain separate', () => {
  const rows = [
    { tx: 't', address: 'a', side: 'sell', amount_wei: '100000000000000000000001', group: 'source_recipients' },
    { tx: 't', address: 'a', side: 'buy', amount_wei: '100000000000000000000000', group: 'other_wallet_candidates' },
    { tx: 'u', address: null, side: 'sell', amount_wei: '2', group: 'remaining_unattributed' },
  ];
  const result = aggregateTrades(rows);
  assert.equal(result.all_pools.net_sold_wei, '3');
  assert.equal(result.all_pools.sell_addresses, 1);
  assert.equal(result.all_pools.sell_addresses_lower_bound, true);
  assert.equal(result.all_pools.sell_txs, 2);
  assert.equal(result.all_pools.buy_txs, 1);
});
