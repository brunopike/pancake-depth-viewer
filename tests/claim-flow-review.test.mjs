import test from 'node:test';
import assert from 'node:assert/strict';
import { traceClaimFlow, claimFlowWindow } from '../server/esim/claim-flow.mjs';
import { collectClaimFlow } from '../server/esim/claim-flow-collector.mjs';
import { TOKEN, SOURCE } from '../server/esim/metrics.mjs';
import { TRANSFER, topic, eventKey } from '../server/esim/attribution.mjs';

const edge = (n, from, to, value, tx = `tx${n}`, timestamp = 100) => ({
  id: String(n), tx, order: [n, 0, 0], from, to, value: String(value), timestamp,
});
const sell = (tx, address, amount, timestamp = 100) => ({
  tx, address, side: 'sell', amount_wei: String(amount), timestamp, block: 9,
});
function trace(transfers, trades, extra = {}) {
  return traceClaimFlow({
    source: 'source', marketAddresses: ['pool'],
    openingBalances: { a: '0', b: '0', c: '0', router: '0' },
    transfers, trades, ...extra,
  });
}

test('two funding owners keep their own shares when one owner forwards the combined sale', () => {
  const flow = trace([
    edge(1, 'source', 'a', 40), edge(2, 'source', 'b', 60),
    edge(3, 'a', 'b', 40, 'sell'), edge(4, 'b', 'pool', 100, 'sell'),
  ], [sell('sell', 'a', 40), sell('sell', 'b', 60)]);
  assert.equal(flow.totals.sold_wei, '100');
  assert.equal(flow.totals.unconfirmed_pool_wei, '0');
  assert.deepEqual(flow.sales.map(row => [row.address, row.direct_wei]).sort(), [['a', '40'], ['b', '60']]);
  assert.equal(claimFlowWindow(flow, 0, 101).transactions, 1);
});

test('independent owners sharing one execution router do not count the combined input twice', () => {
  const flow = trace([
    edge(1, 'source', 'a', 40), edge(2, 'source', 'b', 60),
    edge(3, 'a', 'router', 40, 'sell'), edge(4, 'b', 'router', 60, 'sell'),
    edge(5, 'router', 'pool', 100, 'sell'),
  ], [sell('sell', 'a', 40), sell('sell', 'b', 60)]);
  assert.equal(flow.totals.direct_wei, '100');
  assert.equal(flow.totals.relay_wei, '0');
  assert.equal(flow.totals.matched_gross_wei, '100');
  assert.equal(flow.totals.remaining_wei, '0');
});

function feeRetainingRouter(unsafeTransactions = []) {
  return trace([
    edge(1, 'source', 'b', 20), edge(2, 'b', 'router', 20),
    edge(3, 'source', 'a', 120), edge(4, 'a', 'router', 120, 'fee-sale'),
    edge(5, 'router', 'pool', 100, 'fee-sale'),
    edge(6, 'pool', 'vault', 100, 'fee-sale'),
  ], [sell('fee-sale', 'a', 100)], {
    marketAddresses: ['pool', 'vault'],
    openingBalances: { a: '0', b: '0', router: '60' }, unsafeTransactions,
  });
}

test('a fee-retaining router preserves mixed provenance while linking its input to the sole verified sale owner', () => {
  // Router has 60 unrelated + 20 previously distributed tokens. A sends 120,
  // then 100 of the mixed 200 enters the pool: A's share 60, B's 10, unrelated 30.
  const flow = feeRetainingRouter();
  assert.equal(flow.totals.direct_wei, '60');
  assert.equal(flow.totals.relay_wei, '10');
  assert.equal(flow.totals.sold_wei, '70');
  assert.equal(flow.totals.remaining_wei, '70');
  assert.equal(flow.totals.matched_gross_wei, '100');
  assert.equal(flow.totals.unconfirmed_pool_wei, '0');
  assert.equal(flow.closingBalances.router, '100');
  assert.equal(flow.sales.length, 1);
  assert.equal(flow.sales[0].address, 'a');
  assert.deepEqual(flow.sales[0].examples.map(example => example.root).sort(), ['a', 'b']);
});

test('single-owner router reconciliation never overrides an unsafe receipt path', () => {
  const flow = feeRetainingRouter(new Set(['fee-sale']));
  assert.equal(flow.totals.sold_wei, '0');
  assert.equal(flow.totals.matched_gross_wei, '0');
  assert.equal(flow.totals.unconfirmed_pool_wei, '70');
  assert.equal(flow.totals.remaining_wei, '70');
});

test('old router balances are not assigned arbitrarily between multiple verified sale owners', () => {
  const flow = trace([
    edge(1, 'source', 'c', 20), edge(2, 'c', 'router', 20),
    edge(3, 'source', 'a', 60), edge(4, 'source', 'b', 60),
    edge(5, 'a', 'router', 60, 'multi'), edge(6, 'b', 'router', 60, 'multi'),
    edge(7, 'router', 'pool', 120, 'multi'),
  ], [sell('multi', 'a', 60), sell('multi', 'b', 60)], {
    openingBalances: { a: '0', b: '0', c: '0', router: '60' },
  });
  assert.equal(flow.totals.sold_wei, '0');
  assert.equal(flow.totals.unconfirmed_pool_wei, '84');
  assert.equal(flow.totals.remaining_wei, '56');
  assert.equal(flow.totals.issued_wei, '140');
});

test('LP input cannot borrow another address sale fill after pool output in the same transaction', () => {
  // A deposits its claimed tokens; B receives previously pooled tokens and sells those.
  // The original funding attribution can identify A's net outflow as the sale owner.
  const flow = trace([
    edge(1, 'source', 'a', 100), edge(2, 'a', 'pool', 100, 'mixed'),
    edge(3, 'pool', 'b', 100, 'mixed'), edge(4, 'b', 'pool', 100, 'mixed'),
  ], [sell('mixed', 'a', 100)]);
  assert.equal(flow.totals.sold_wei, '0');
  assert.equal(flow.totals.unconfirmed_pool_wei, '100');
  const window = claimFlowWindow(flow, 0, 101);
  assert.equal(window.pending_wei, '100');
  assert.equal(window.pendingTransactions, 1);
  assert.equal(window.complete, false);
});

test('pool output followed by re-entry remains pending even when total market input equals the fill', () => {
  const flow = trace([
    edge(1, 'source', 'a', 100), edge(2, 'pool', 'a', 100, 'mixed'),
    edge(3, 'a', 'pool', 100, 'mixed'),
  ], [sell('mixed', 'a', 100)]);
  assert.equal(flow.totals.sold_wei, '0');
  assert.equal(flow.totals.unconfirmed_pool_wei, '50');
  assert.equal(flow.totals.remaining_wei, '50');
});

test('receipt-marked unsafe transactions cannot be accepted merely because amounts match', () => {
  const flow = trace([
    edge(1, 'source', 'a', 100), edge(2, 'a', 'pool', 100, 'lp-mixed'),
  ], [sell('lp-mixed', 'a', 100)], { unsafeTransactions: new Set(['lp-mixed']) });
  assert.equal(flow.totals.sold_wei, '0');
  assert.equal(flow.totals.unconfirmed_pool_wei, '100');
});

test('mixed buy and sell transactions do not confirm a tracked sell on a partial match', () => {
  const flow = trace([
    edge(1, 'source', 'a', 100), edge(2, 'a', 'pool', 100, 'mixed'),
    edge(3, 'pool', 'b', 10, 'mixed'),
  ], [sell('mixed', 'a', 100), { ...sell('mixed', null, 10), side: 'buy' }]);
  assert.equal(flow.totals.sold_wei, '0');
  assert.equal(flow.totals.unconfirmed_pool_wei, '100');
});

test('pending input has its own time window and does not appear as a complete zero-sale result', () => {
  const flow = trace([
    edge(1, 'source', 'a', 100), edge(2, 'a', 'pool', 100, 'mismatch', 100),
    edge(3, 'source', 'b', 50), edge(4, 'b', 'pool', 50, 'later', 200),
  ], [sell('mismatch', 'a', 60, 100), sell('later', 'b', 50, 200)]);
  flow.cutoff = 201;
  const first = claimFlowWindow(flow, 0, 101);
  assert.equal(first.sold_wei, '0');
  assert.equal(first.pending_wei, '100');
  assert.equal(first.pendingTransactions, 1);
  assert.equal(first.complete, false);
  const later = claimFlowWindow(flow, 101, 201);
  assert.equal(later.sold_wei, '50');
  assert.equal(later.pending_wei, '0');
  assert.equal(later.pendingTransactions, 0);
  assert.equal(later.complete, true);
});

test('an undated pending transfer cannot silently become a known zero for a time window', () => {
  const flow = trace([
    edge(1, 'source', 'a', 100), edge(2, 'a', 'pool', 100, 'undated', null),
  ], []);
  flow.cutoff = 101;
  const window = claimFlowWindow(flow, 1, 101);
  assert.equal(window.sold_wei, '0');
  assert.equal(window.pending_wei, null);
  assert.equal(window.complete, false);
});

const address = n => `0x${n.toString(16).padStart(40, '0')}`;
const hash = n => `0x${n.toString(16).padStart(64, '0')}`;
const hex = n => `0x${n.toString(16)}`;
function log(block, index, from, to, value) {
  return {
    address: TOKEN, topics: [TRANSFER, topic(from), topic(to)], data: hex(value),
    blockNumber: hex(block), blockHash: hash(block), blockTimestamp: hex(block * 10),
    transactionIndex: '0x0', logIndex: hex(index), transactionHash: hash(block * 100), removed: false,
  };
}
function balancedCycleFixture(omitCycle = false) {
  const a = address(1), b = address(2), pool = address(3), receiptRequests = [];
  const full = [
    log(100, 0, SOURCE, a, 100),
    log(102, 0, a, b, 100), log(102, 1, b, a, 100), log(102, 2, a, pool, 100),
  ];
  const returned = omitCycle ? [full[0], full[3]] : full;
  const state = {
    token: TOKEN, source: SOURCE, block: 102, blockHash: hash(102), cutoff: 1020,
    pools: { [pool]: {} }, trades: [sell(full[3].transactionHash, a, 100, 1020)],
    distributions: [{ id: eventKey(full[0]), block: 100, recipient: a, value: '100' }],
  };
  state.trades[0].block = 102;
  const rpc = async (method, params) => {
    if (method === 'eth_chainId') return '0x38';
    if (method === 'eth_getBlockByNumber') {
      const block = Number(BigInt(params[0]));
      return { number: hex(block), hash: hash(block), timestamp: hex(block * 10) };
    }
    if (method === 'eth_getLogs') {
      const query = params[0];
      assert.equal(query.address, TOKEN);
      assert.deepEqual(query.topics, [TRANSFER]);
      return returned.filter(row => BigInt(row.blockNumber) >= BigInt(query.fromBlock)
        && BigInt(row.blockNumber) <= BigInt(query.toBlock));
    }
    if (method === 'eth_getTransactionReceipt') {
      receiptRequests.push(params[0]);
      assert.equal(params[0], full[3].transactionHash);
      return {
        status: '0x1', transactionHash: params[0], blockNumber: '0x66', blockHash: hash(102),
        from: a, to: address(4), logs: full.slice(1),
      };
    }
    throw new Error(`Unexpected fixture method: ${method}`);
  };
  return {
    state, receiptRequests, saleTx: full[3].transactionHash,
    transport: { rpc, batch: calls => Promise.all(calls.map(([method, params]) => rpc(method, params))) },
    // Both complete and omitted log sets have identical real opening/closing balances.
    readBalances: async addresses => addresses.map(a => a === b ? '100' : '0'),
  };
}

test('complete receipt transfer history keeps the mixed-wallet estimate at 50 and limits receipt queries', async () => {
  const fixture = balancedCycleFixture();
  const checkpoint = await collectClaimFlow(fixture.state, fixture.transport, { readBalances: fixture.readBalances });
  assert.equal(checkpoint.report.totals.sold_wei, '50');
  assert.equal(checkpoint.report.totals.remaining_wei, '50');
  assert.deepEqual([...new Set(fixture.receiptRequests)], [fixture.saleTx]);
});

test('missing balanced-cycle logs are rejected against the sale receipt despite matching closing balances', async () => {
  const fixture = balancedCycleFixture(true);
  await assert.rejects(
    () => collectClaimFlow(fixture.state, fixture.transport, { readBalances: fixture.readBalances }),
    error => /^FLOW_/.test(error.message) && /RECEIPT|LOG/i.test(error.message),
    'Receipt/Transfer disagreement must prevent publishing the false 100-token estimate',
  );
  assert.deepEqual([...new Set(fixture.receiptRequests)], [fixture.saleTx]);
});
