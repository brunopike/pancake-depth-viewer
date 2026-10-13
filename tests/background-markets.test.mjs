import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { configuredMarkets, configuredCatalog, marketPools, snapshotName } from '../src/background-markets.mjs';
import { DEFAULT_BASE, DEFAULT_QUOTE, latestSharedURL } from '../src/snapshot.mjs';
const selected = { name: 'ESIM / USDT', enabled: true, base: DEFAULT_BASE, quote: DEFAULT_QUOTE };
const third = '0x1111111111111111111111111111111111111111';

test('Only explicitly enabled exact pairs are selected; empty selection makes no implicit default', () => {
  assert.deepEqual(configuredMarkets({ markets: [] }), []);
  assert.deepEqual(configuredMarkets({ markets: [{ ...selected, enabled: false }] }), []);
  const markets = configuredMarkets({ markets: [selected, { ...selected, base: third, enabled: false }] });
  assert.equal(markets.length, 1);
  const p = (a, b, protocol = 'v2') => ({ protocol, token0: { id: a }, token1: { id: b } });
  const catalog = { pools: [p(DEFAULT_BASE, DEFAULT_QUOTE), p(DEFAULT_QUOTE, DEFAULT_BASE), p(third, DEFAULT_QUOTE), p(DEFAULT_BASE, third)] };
  assert.deepEqual(marketPools(catalog, markets[0]), catalog.pools.slice(0, 2));
  assert.throws(() => marketPools({ pools: [catalog.pools[2]] }, markets[0]), /可读取池子/);
});

test('Invalid and duplicate selections fail closed before RPC work', () => {
  for (const markets of [[{ ...selected, base: '../key' }], [{ ...selected, enabled: 'true' }], [selected, selected], [selected, { ...selected, base: DEFAULT_QUOTE, quote: DEFAULT_BASE }]]) {
    assert.throws(() => configuredMarkets({ markets }));
  }
  assert.throws(() => configuredMarkets({}));
  assert.throws(() => snapshotName('../key', DEFAULT_QUOTE));
});

test('Published directories contain only selected pairs and cannot reintroduce unrelated pools', () => {
  const p = (a, b, id) => ({ id, protocol: 'v3', token0: { id: a }, token1: { id: b } });
  const source = { chainId: 56, fetchedAt: '2026-10-13T00:00:00Z', pools: [
    p(DEFAULT_BASE, DEFAULT_QUOTE, 'selected'), p(DEFAULT_QUOTE, DEFAULT_BASE, 'inverse'),
    p(third, DEFAULT_QUOTE, 'unrelated'), p(DEFAULT_BASE, third, 'other-quote'),
  ] };
  const config = { markets: [selected] };
  const result = configuredCatalog(source, config);
  assert.deepEqual(result.pools, source.pools.slice(0, 2));
  assert.equal(result.fetchedAt, source.fetchedAt);
  assert.equal(result.scope, 'configured-pairs');
  assert.deepEqual(configuredCatalog(result, config), result);
  assert.deepEqual(configuredCatalog(source, { markets: [] }).pools, []);
  assert.deepEqual(configuredCatalog(source, { markets: [{ ...selected, enabled: false }] }).pools, []);
  assert.throws(() => configuredCatalog({ ...source, pools: source.pools.slice(2) }, config), /可读取池子/);
  assert.throws(() => configuredCatalog({ ...source, chainId: 1 }, config), /格式错误/);
});

test('Selected pairs have isolated cache files, retaining the original ESIM URL', async () => {
  assert.equal(snapshotName(DEFAULT_BASE, DEFAULT_QUOTE), 'esim-usdt.json');
  assert.equal(snapshotName(third, DEFAULT_QUOTE), `${third}-${DEFAULT_QUOTE}.json`);
  await assert.rejects(() => latestSharedURL(undefined, '../secret.json'), /Invalid snapshot/);
  const config = JSON.parse(await readFile(new URL('../public/data/background-markets.json', import.meta.url), 'utf8'));
  assert.deepEqual(configuredMarkets(config), [{ name: selected.name, base: selected.base, quote: selected.quote }]);
});
