import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poolInventory, estimateTarget, buildDepth, MIN_TICK, MAX_TICK } from '../src/math.mjs';

const token = (id, decimals = 18) => ({ id, decimals });
const base = token('base'), quote = token('quote');
const v2 = { kind: 'v2', token0: base, token1: quote, reserve0: 1000e18, reserve1: 4000e18, tvlUSD: '8000' };
const L = 1000n * 10n ** 18n;
const cl = { kind: 'cl', token0: base, token1: quote, sqrtPriceX96: 2n ** 96n, tick: 0,
  liquidity: L, fullRange: true, minTick: MIN_TICK, maxTick: MAX_TICK, tvlUSD: '10000',
  ticks: [{ index: -1200, net: L }, { index: -1000, net: -L }, { index: -200, net: L },
    { index: 200, net: -L }, { index: 1000, net: L }, { index: 1200, net: -L }] };
const near = (a, b) => assert.ok(Math.abs(a - b) <= Math.max(1, Math.abs(b)) * 1e-9, `${a} != ${b}`);

test('Whole-pool inventory preserves V2 reserves, inverse order and mixed token decimals', () => {
  const p = { ...v2, token0: token('base', 6), reserve0: 1000e6 };
  assert.deepEqual(poolInventory([p], 'base'), { base: 1000, quote: 4000 });
  assert.deepEqual(poolInventory([p], 'quote'), { base: 4000, quote: 1000 });
});

test('CL inventory includes principal in active and distant inactive positions', () => {
  const inventory = poolInventory([cl], 'base');
  const ask = 1000 * (1 - 1 / 1.0001 ** 100) + 1000 * (1 / 1.0001 ** 500 - 1 / 1.0001 ** 600);
  const bid = 1000 * (1 - 1.0001 ** -100) + 1000 * (1.0001 ** -500 - 1.0001 ** -600);
  near(inventory.base, ask); near(inventory.quote, bid);
  const inverse = poolInventory([cl], 'quote');
  near(inverse.base, bid); near(inverse.quote, ask);
});

test('Full inventory is independent of chart endpoints and decimal grouping', () => {
  const before = poolInventory([cl, v2], 'base');
  buildDepth([cl, v2], 'base', { percent: 5, precision: 2 });
  buildDepth([cl, v2], 'base', { percent: 'max', precision: 8 });
  assert.deepEqual(poolInventory([cl, v2], 'base'), before);
  near(before.base, 1000 + poolInventory([cl], 'base').base);
  near(before.quote, 4000 + poolInventory([cl], 'base').quote);
});

test('Target above current price reports quote paid and base bought beyond the chart range', () => {
  const out = estimateTarget([v2], 'base', 8, 4);
  assert.equal(out.side, 'ask');
  near(out.quote, 4000 * (Math.sqrt(2) - 1));
  near(out.quantity, 1000 * (1 - 1 / Math.sqrt(2)));
  const ladder = buildDepth([v2], 'base', { percent: 100, precision: 4 });
  near(out.quote, ladder.asks.at(-1).cumulativeQuote);
});

test('Target below current price reports base sold and quote received', () => {
  const out = estimateTarget([v2], 'base', 2, 4);
  assert.equal(out.side, 'bid');
  near(out.quantity, 1000 * (Math.sqrt(2) - 1));
  near(out.quote, 4000 * (1 - 1 / Math.sqrt(2)));
  near((1000 + out.quantity) * (4000 - out.quote), 4e6);
});

test('A CL target across an empty interval includes distant liquidity and flags exhaustion', () => {
  const out = estimateTarget([cl], 'base', 2, 1);
  near(out.quantity, poolInventory([cl], 'base').base);
  near(out.quote, 1000 * (1.0001 ** 100 - 1) + 1000 * (1.0001 ** 600 - 1.0001 ** 500));
  assert.equal(out.emptyPools, 1);
});

test('Pool-price differences include only pools that need movement in the selected direction', () => {
  const higher = { ...v2, reserve1: 9000e18 };
  near(estimateTarget([v2, higher], 'base', 8, 4).quote, estimateTarget([v2], 'base', 8, 4).quote);
  assert.equal(estimateTarget([v2], 'base', 4, 4).side, 'same');
});

test('Missing full-range data and invalid targets fail without publishing misleading totals', () => {
  const partial = { ...cl, fullRange: false, minTick: -100, maxTick: 100 };
  assert.throws(() => poolInventory([partial], 'base'), /全池数据/);
  assert.throws(() => estimateTarget([partial], 'base', 1.01, 1), /全池数据/);
  for (const target of ['', 0, -1, NaN, Infinity]) assert.throws(() => estimateTarget([v2], 'base', target, 4), /目标价格/);
  assert.throws(() => estimateTarget([cl], 'base', 1e40, 1), /合约价格范围/);
});
