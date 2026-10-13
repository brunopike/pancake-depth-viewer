import test from 'node:test';
import assert from 'node:assert/strict';
import { POOL_SCOPES, scopedSnapshot, validPoolScope } from '../src/pool-scope.mjs';
import { buildDepth, poolInventory, MIN_TICK, MAX_TICK } from '../src/math.mjs';
const meta = (protocol, id) => ({ protocol, id });

test('Exactly three group choices, default all and invalid URL values recover to all', () => {
  assert.deepEqual(Object.keys(POOL_SCOPES), ['all', 'v4', 'v3']);
  for (const value of [null, '', 'V3', 'v2', '__proto__']) assert.equal(validPoolScope(value), 'all');
  const pools = ['v2', 'v3', 'infinityCl', 'infinityBin', 'stable'].map((p, i) => meta(p, String(i)));
  assert.deepEqual(scopedSnapshot({pools, failed: []}, pools).pools, pools);
  assert.equal(scopedSnapshot({pools, failed: []}, pools, 'v3').pools.length, 1);
  assert.equal(scopedSnapshot({pools, failed: []}, pools, 'v4').pools.length, 2);
});

test('Failed and missing pools affect only their selected protocol group', () => {
  const v3 = meta('v3', '3'), v4 = meta('infinityCl', '4');
  const snapshot = {pools: [v3], failed: [v4], blockNumber: 10, timestamp: 20};
  const all = scopedSnapshot(snapshot, [v3, v4]);
  assert.equal(all.complete, false); assert.equal(all.expectedPoolCount, 2);
  const good = scopedSnapshot(snapshot, [v3, v4], 'v3');
  assert.equal(good.complete, true); assert.equal(good.failed.length, 0);
  const bad = scopedSnapshot(snapshot, [v3, v4], 'v4');
  assert.equal(bad.complete, false); assert.equal(bad.failed.length, 1);
  const missing = scopedSnapshot({...snapshot, failed: []}, [v3, v4], 'v4');
  assert.equal(missing.expectedPoolCount, 1); assert.equal(missing.complete, false);
  const empty = scopedSnapshot({pools: [v3], failed: []}, [v3], 'v4');
  assert.equal(empty.expectedPoolCount, 0); assert.equal(empty.complete, false);
});

test('Wallet-discovered pools and case-insensitive IDs are counted once without mutating the full cache', () => {
  const known = meta('v3', '0xAb'), discovered = {...meta('infinityCl', '0xCd'), discoveredBy: 'ownedLP'};
  const snapshot = {pools: [{...known, id: '0xab'}, discovered], failed: [], blockNumber: 99, timestamp: 100, range: Infinity};
  const before = structuredClone(snapshot);
  const v4 = scopedSnapshot(snapshot, [known], 'v4');
  assert.equal(v4.complete, true); assert.equal(v4.expectedPoolCount, 1);
  assert.equal(v4.blockNumber, 99); assert.equal(v4.timestamp, 100); assert.equal(v4.range, Infinity);
  const all = scopedSnapshot(snapshot, [known], 'all');
  assert.equal(all.expectedPoolCount, 2); assert.deepEqual(all.pools, snapshot.pools);
  assert.deepEqual(snapshot, before);
});

test('Changing protocol changes reference price and inventory; the all-pool results remain intact', () => {
  const base = {id: 'base', decimals: 18}, quote = {id: 'quote', decimals: 18};
  const make = (protocol, id, scale, tvlUSD) => {
    const L = BigInt(scale) * 10n ** 18n;
    return {...meta(protocol, id), kind: 'cl', token0: base, token1: quote, sqrtPriceX96: 2n ** 96n,
      tick: 0, liquidity: L, fullRange: true, minTick: MIN_TICK, maxTick: MAX_TICK,
      ticks: [{index: -1000, net: L}, {index: 1000, net: -L}], tvlUSD};
  };
  const v3 = make('v3', '3', 100, 100), v4 = make('infinityCl', '4', 200, 200);
  const v2 = {...meta('v2', '2'), kind: 'v2', token0: base, token1: quote, reserve0: 1000e18, reserve1: 4000e18, tvlUSD: 10000};
  const pools = [v2, v3, v4], snapshot = {pools, failed: []};
  const read = scope => scopedSnapshot(snapshot, pools, scope).pools;
  const config = {percent: 5, precision: 4};
  const original = buildDepth(pools, 'base', config);
  assert.equal(buildDepth(read('v3'), 'base', config).price, 1);
  assert.equal(buildDepth(read('v4'), 'base', config).price, 1);
  assert.equal(buildDepth(read('all'), 'base', config).price, 4);
  const inventory3 = poolInventory(read('v3'), 'base'), inventory4 = poolInventory(read('v4'), 'base');
  assert.equal(inventory4.base, 2 * inventory3.base); assert.equal(inventory4.quote, 2 * inventory3.quote);
  assert.deepEqual(buildDepth(read('all'), 'base', config), original);
  assert.deepEqual(poolInventory(read('all'), 'base'), poolInventory(pools, 'base'));
});
