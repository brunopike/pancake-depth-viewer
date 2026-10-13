import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPools } from '../src/chain.mjs';
import { mergeTicks } from '../src/liquidity-cache.mjs';
import { parseSnapshot, serializeSnapshot } from '../src/snapshot.mjs';
import { OWNERS, V3_POSITION_MANAGER, CL_POSITION_MANAGER, CL_POOL_MANAGER, ownedPoolMeta } from '../src/ownership.mjs';
const base = '0x1111111111111111111111111111111111111111', quote = '0x2222222222222222222222222222222222222222';
const hash = `0x${'a'.repeat(64)}`, L = 10n ** 18n, now = Date.now() - 30000;
const meta = { id: '0x3333333333333333333333333333333333333333', protocol: 'v3', tvlUSD: '10',
  token0: { id: base, decimals: 18, symbol: 'BASE' }, token1: { id: quote, decimals: 18, symbol: 'USDT' } };
const pool = { ...meta, kind: 'cl', sqrtPriceX96: 2n ** 96n, tick: 0, liquidity: L, spacing: 60,
  fullRange: true, minTick: -887272, maxTick: 887272, fullScanTimestamp: now - 60000,
  ticks: [{ index: -60, net: L }, { index: 60, net: -L }] };
const snapshot = () => ({ pools: [structuredClone(pool)], failed: [], blockNumber: 100n, blockHash: hash, timestamp: now - 60000, range: Infinity });
function fakeRpc({ reorg = false, logsFail = false, malformed = false } = {}) {
  const calls = [];
  return { calls, getBlockNumber: async () => 132n,
    getBlock: async ({ blockNumber }) => ({ number: blockNumber, hash: reorg && blockNumber === 100n ? `0x${'b'.repeat(64)}` : hash, timestamp: BigInt(Math.floor(now / 1000)) }),
    getLogs: async () => {
      calls.push('logs'); if (logsFail) throw new Error('unavailable');
      return [malformed ? { blockNumber: 110n, args: {} } : { blockNumber: 110n, args: { tickLower: 600, tickUpper: 660 } }];
    },
    multicall: async ({ contracts }) => contracts.map(c => {
      calls.push(c.functionName);
      const values = { slot0: [2n ** 96n, 0, 0, 0, 0, 0, true], liquidity: L, tickSpacing: 60, token0: base, token1: quote };
      let result = values[c.functionName];
      if (c.functionName === 'tickBitmap') result = c.args[0] === -1 ? 1n << 255n : c.args[0] === 0 ? 2n : 0n;
      if (c.functionName === 'ticks') result = [L, [-60, 600].includes(c.args[0]) ? L : -L, 0n, 0n, 0n, 0n, 0n, true];
      return { status: 'success', result };
    }) };
}
test('Incremental refresh discovers a new balanced position far from current price', async () => {
  const rpc = fakeRpc();
  const live = await loadPools([meta], base, Infinity, () => {}, { client: rpc, previous: snapshot() });
  assert.equal(live.pools.length, 1); assert.equal(live.pools[0].incremental, true);
  assert.deepEqual(live.pools[0].ticks.map(t => t.index), [-60, 60, 600, 660]);
  assert.equal(rpc.calls.includes('tickBitmap'), false);
  assert.equal(live.blockNumber, 120n); assert.equal(live.blockHash, hash);
});
test('A reorg invalidates cached boundaries and triggers a complete bitmap scan', async () => {
  const rpc = fakeRpc({ reorg: true });
  const live = await loadPools([meta], base, Infinity, () => {}, { client: rpc, previous: snapshot() });
  assert.equal(live.pools[0].incremental, false); assert.ok(rpc.calls.includes('tickBitmap'));
  assert.equal(rpc.calls.includes('logs'), false);
  assert.deepEqual(live.pools[0].ticks.map(t => t.index), [-60, 60]);
});
for (const mode of ['logsFail', 'malformed']) test(`${mode} event interval triggers a full scan instead of reusing stale ticks`, async () => {
  const rpc = fakeRpc({ [mode]: true });
  const live = await loadPools([meta], base, Infinity, () => {}, { client: rpc, previous: snapshot() });
  assert.equal(live.pools[0].incremental, false); assert.ok(rpc.calls.includes('tickBitmap'));
});
test('Liquidity removal uses gross liquidity, preserving initialized zero-net ticks', () => {
  const ticks = mergeTicks([{ index: -60, net: L }, { index: 60, net: -L }], [{ index: -60, net: 0n, gross: 0n }, { index: 0, net: 0n, gross: L }]);
  assert.deepEqual(ticks.map(t => t.index), [0, 60]); assert.equal(ticks[0].net, 0n);
});
test('Snapshot round-trip preserves BigInt, source, block identity and maximum range', () => {
  const data = parseSnapshot(serializeSnapshot(snapshot(), base, quote, 'Alchemy'), [meta], base, quote);
  assert.equal(data.range, Infinity); assert.equal(data.blockNumber, 100n); assert.equal(data.source, 'Alchemy');
  assert.equal(data.pools[0].liquidity, L); assert.equal(data.pools[0].ticks[0].net, L);
});

test('A discovered pool used as catalog metadata cannot overwrite newer cached prices or LP state', () => {
  const live = snapshot();
  const olderMeta = { ...meta, ...structuredClone(pool), sqrtPriceX96: 2n ** 97n, liquidity: 2n * L,
    ticks: [{ index: -60, net: 2n * L }, { index: 60, net: -2n * L }], ownership: { status: 'unavailable' } };
  const parsed = parseSnapshot(serializeSnapshot(live, base, quote), [olderMeta], base, quote);
  assert.equal(parsed.pools[0].sqrtPriceX96, live.pools[0].sqrtPriceX96);
  assert.equal(parsed.pools[0].liquidity, L);
  assert.deepEqual(parsed.pools[0].ticks, live.pools[0].ticks);
  assert.equal(parsed.pools[0].ownership, undefined);
});
test('Snapshots reject an omitted/new pool, a mismatched pair and incomplete maximum liquidity', () => {
  const text = serializeSnapshot(snapshot(), base, quote);
  assert.throws(() => parseSnapshot(text, [meta, { ...meta, id: quote }], base, quote));
  assert.throws(() => parseSnapshot(text, [meta], quote, base));
  const broken = snapshot(); broken.pools[0].ticks.pop();
  assert.throws(() => parseSnapshot(serializeSnapshot(broken, base, quote), [meta], base, quote));
});

test('Ownership survives snapshot round-trip and malformed attribution cannot masquerade as external LP', () => {
  const live = snapshot();
  live.pools[0].ownership = { status: 'verified', positions: [{ manager: V3_POSITION_MANAGER, tokenId: '5', owner: OWNERS[0], tickLower: -60, tickUpper: 60, liquidity: L / 2n }] };
  const parsed = parseSnapshot(serializeSnapshot(live, base, quote), [meta], base, quote);
  assert.equal(parsed.pools[0].ownership.positions[0].liquidity, L / 2n);
  live.pools[0].ownership.positions[0].liquidity = L + 1n;
  assert.throws(() => parseSnapshot(serializeSnapshot(live, base, quote), [meta], base, quote), /LP/);
});

test('A wallet-discovered same-pair pool survives caching, but a forged PoolKey does not', () => {
  const key = { currency0: base, currency1: quote, hooks: '0x0000000000000000000000000000000000000000', poolManager: CL_POOL_MANAGER,
    fee: 500, parameters: '0x' + (60n << 16n).toString(16).padStart(64, '0') };
  const live = snapshot(), extra = { ...structuredClone(pool), ...ownedPoolMeta(key, [meta.token0, meta.token1]),
    ownership: { status: 'verified', positions: [{ manager: CL_POSITION_MANAGER, tokenId: '5', owner: OWNERS[0], tickLower: -60, tickUpper: 60, liquidity: L / 2n }] } };
  live.pools.push(extra);
  live.ownershipIndex = { version: 1, chainId: 56, owners: OWNERS, blockNumber: live.blockNumber, blockHash: live.blockHash,
    nfts: [{ manager: CL_POSITION_MANAGER, tokenId: '5', owner: OWNERS[0] }] };
  const parsed = parseSnapshot(serializeSnapshot(live, base, quote), [meta], base, quote);
  assert.equal(parsed.pools.length, 2); assert.equal(parsed.pools[1].discoveredBy, 'ownedLP');
  extra.discoveryKey.fee++;
  assert.throws(() => parseSnapshot(serializeSnapshot(live, base, quote), [meta], base, quote), /LP/);
});

 test('A future full-scan timestamp cannot bypass periodic full scans', async () => {
  const previous = snapshot(); previous.pools[0].fullScanTimestamp = now + 60000;
  const rpc = fakeRpc();
  const live = await loadPools([meta], base, Infinity, () => {}, { client: rpc, previous });
  assert.equal(live.pools[0].incremental, false); assert.ok(rpc.calls.includes('tickBitmap'));
  assert.throws(() => parseSnapshot(serializeSnapshot(previous, base, quote), [meta], base, quote));
});
