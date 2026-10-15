import test from 'node:test';
import assert from 'node:assert/strict';
import { holderCharts } from '../src/holder-charts.mjs';
const row = (id, balance, tags = []) => ({ address: '0x' + id.toString(16).padStart(40, '0'), balance: String(balance), tags });
test('chart counts and balances assign overlapping tags once and exclude zero holdings', () => {
  const rows = [row(1, 60, [{kind:'lp'}, {kind:'own'}]), row(2, 30, [{kind:'dex'}]), row(3, 10, [{kind:'dex'}]), row(4, 0)];
  const model = holderCharts(rows);
  assert.equal(model.total, '100'); assert.equal(model.count, 3);
  assert.equal(model.groups.reduce((sum, group) => sum + group.count, 0), 3);
  assert.equal(model.groups.find(group => group.id === 'dex').count, 2);
  assert.equal(model.groups.find(group => group.id === 'dex').share, 40);
  const manual = {[rows[1].address]: {kind:'own', text:'我方'}};
  assert.equal(holderCharts(rows, manual).groups.find(group => group.id === 'own').count, 1);
});
test('top ten sort exact balances and cumulative share includes the rest in the denominator', () => {
  const rows = Array.from({length: 11}, (_, i) => row(i + 1, BigInt(i + 1) * 10n ** 30n));
  const model = holderCharts(rows);
  assert.equal(model.top.length, 10); assert.equal(model.top[0].balance, rows[10].balance);
  assert.equal(model.top.at(-1).cumulativeShare, 98.484848);
  assert.ok(model.top.every((r, i) => !i || r.cumulativeShare >= model.top[i - 1].cumulativeShare));
  assert.equal(rows[0].balance, String(10n ** 30n));
  assert.equal(holderCharts([rows[0]]).top[0].cumulativeShare, 100);
});
test('empty and zero-only filters produce no chart segments or invalid ratios', () => {
  for (const rows of [[], [row(1, 0)]]) assert.deepEqual(holderCharts(rows), {total:'0', count:0, groups:[], countGroups:[], top:[]});
});
