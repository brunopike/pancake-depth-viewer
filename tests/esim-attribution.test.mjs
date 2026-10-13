import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { attributionCandidates, attributedRows, decodeLeg, eventKey, V2, V3, V4, before, typedWallet } from '../server/esim/attribution.mjs';
const samples = JSON.parse(await readFile(new URL('./fixtures/esim-receipts.json', import.meta.url)));
for (const sample of samples) test(`existing verified receipt regression ${sample.tx.slice(0, 12)}`, () => {
  const ll = sample.receipt.logs.filter(e => [V2, ...V3, ...V4].includes(e.topics[0])).filter(e => sample.pools[V4.has(e.topics[0]) ? e.topics[1] : e.address.toLowerCase()]).map(e => decodeLeg(e, sample.pools, sample.legs[0].timestamp));
  // Reference exports group legs by pool; receipts are ordered by log index.
  const byLog = (a, b) => a.order[2] - b.order[2];
  assert.deepEqual(ll.toSorted(byLog), sample.legs.toSorted(byLog));
  const candidates = attributionCandidates(ll, { [sample.tx]: sample.receipt }, sample.firstRecipient, sample.pools);
  const codes = Object.fromEntries(candidates.flatMap(c => c.owners.map(o => [o.address, sample.expected.some(r => r.address === o.address && r.group === 'remaining_unattributed') ? '0x1234' : '0x'])));
  assert.deepEqual(attributedRows(candidates, codes), sample.expected);
});
test('claim ordering is strict within a transaction and delegated EOA code is recognized exactly', () => {
  assert.equal(before([1, 2, 3], [1, 2, 4]), true);
  assert.equal(before([1, 2, 3], [1, 2, 3]), false);
  assert.equal(before([1, 2, 5], [1, 2, 4]), false);
  assert.equal(typedWallet('0xef0100' + '12'.repeat(20)), true);
  assert.equal(typedWallet('0xef0100' + '12'.repeat(19)), false);
});
test('failed receipt cannot contribute buys or sells', () => {
  const s = samples[0];
  assert.throws(() => attributionCandidates(s.legs, { [s.tx]: { ...s.receipt, status: '0x0' } }, s.firstRecipient, s.pools), /Unsuccessful/);
});
