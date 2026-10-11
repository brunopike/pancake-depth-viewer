import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceOf, cumulative, buildDepth, settings } from '../src/math.mjs';
const token = (id, decimals = 18) => ({ id, decimals });
const a = token('a'), b = token('b');
const near = (x, y, tolerance = 1e-8) => assert.ok(Math.abs(x - y) <= Math.max(1, Math.abs(y)) * tolerance, `${x} != ${y}`);
const v2 = { kind: 'v2', token0: a, token1: b, reserve0: 1000e18, reserve1: 4000e18, tvlUSD: '8000' };
const cl = { kind: 'cl', token0: a, token1: b, sqrtPriceX96: 2n ** 96n, tick: 0, liquidity: 1000n * 10n ** 18n, ticks: [], tvlUSD: '8000' };
test('V2 conservation follows independently derived constant-product endpoint', () => {
  const buy = cumulative(v2, 'a', 4.4, 'ask');
  const x = 1000 - buy.quantity, y = 4000 + buy.quote;
  near(x * y, 4e6); near(y / x, 4.4);
  const sell = cumulative(v2, 'a', 3.6, 'bid');
  near((1000 + sell.quantity) * (4000 - sell.quote), 4e6);
  near((4000 - sell.quote) / (1000 + sell.quantity), 3.6);
});
test('Inverse pair uses the quote token as base, preserving amounts', () => {
  near(priceOf(v2, 'b'), .25);
  const direct = cumulative(v2, 'a', 4.4, 'ask');
  const inverse = cumulative(v2, 'b', 1 / 4.4, 'bid');
  near(direct.quantity, inverse.quote); near(direct.quote, inverse.quantity);
});
test('Mixed decimals produce human-unit prices and CL amounts', () => {
  const pool = { ...cl, token0: token('a', 6), token1: token('b', 18), sqrtPriceX96: BigInt(Math.round(1e6 * 2 ** 96)), liquidity: 1000n * 10n ** 12n, tick: 276324 };
  near(priceOf(pool, 'a'), 1);
  near(cumulative(pool, 'a', 1.21, 'ask').quantity, 1000 * (1 - 1 / 1.1));
  near(cumulative(pool, 'a', 1.21, 'ask').quote, 100);
});
test('CL deltas match virtual reserve formula within one liquidity segment', () => {
  const out = cumulative(cl, 'a', 1.21, 'ask');
  near(out.quantity, 1000 * (1 - 1 / 1.1)); near(out.quote, 100);
  const inverse = cumulative(cl, 'b', 1 / 1.21, 'bid');
  near(inverse.quantity, 100); near(inverse.quote, out.quantity);
});
test('Initialized tick adds liquidity on upward crossing', () => {
  const tick = 100, boundary = 1.0001 ** (tick / 2);
  const pool = { ...cl, ticks: [{ index: tick, net: cl.liquidity }] };
  const out = cumulative(pool, 'a', 1.04, 'ask'), end = Math.sqrt(1.04);
  near(out.quote, 1000 * (boundary - 1) + 2000 * (end - boundary));
  near(out.quantity, 1000 * (1 - 1 / boundary) + 2000 * (1 / boundary - 1 / end));
});
test('Downward crossing subtracts net liquidity and supports an empty interval', () => {
  const tick = -100, boundary = 1.0001 ** (tick / 2);
  const pool = { ...cl, ticks: [{ index: tick, net: cl.liquidity }] };
  const out = cumulative(pool, 'a', .96, 'bid');
  near(out.quote, 1000 * (1 - boundary)); near(out.quantity, 1000 * (1 / boundary - 1));
});
test('Empty segment can cross into another initialized liquidity interval', () => {
  const pool = { ...cl, liquidity: 0n, ticks: [{ index: 100, net: cl.liquidity }] };
  const out = cumulative(pool, 'a', 1.04, 'ask');
  near(out.quote, 1000 * (Math.sqrt(1.04) - 1.0001 ** 50));
});
test('Grouping preserves total depth for equal outer boundaries', () => {
  const one = buildDepth([cl, v2], 'a', { levels: 100, bps: 10 });
  const two = buildDepth([cl, v2], 'a', { levels: 200, bps: 5 });
  for (const side of ['asks', 'bids']) {
    near(one[side].at(-1).cumulativeQuote, two[side].at(-1).cumulativeQuote);
    near(one[side].reduce((s, r) => s + r.quote, 0), one[side].at(-1).cumulativeQuote);
    assert.equal(one[side].length, 100);
    assert.ok(one[side].every(r => r.quantity >= 0 && r.quote >= 0));
  }
});
test('Aggregate uses common absolute price boundaries across pools', () => {
  const secondary = { ...v2, reserve1: 4200e18, tvlUSD: '5000' };
  const result = buildDepth([v2, secondary], 'a', { levels: 100, bps: 10 });
  near(result.price, 4);
  near(result.asks.at(-1).cumulativeQuote, cumulative(v2, 'a', 4.4, 'ask').quote + cumulative(secondary, 'a', 4.4, 'ask').quote);
});
test('Invalid limits, range gaps and negative liquidity fail explicitly', () => {
  for (const args of [[0, 10], [501, 1], [100, NaN], [100, 100], [20, 0]]) assert.throws(() => settings(...args));
  assert.throws(() => cumulative({ ...cl, minTick: -100, maxTick: 100 }, 'a', 1.1, 'ask'), /tick/);
  assert.throws(() => cumulative({ ...cl, liquidity: -1n }, 'a', 1.1, 'ask'), /负流动性/);
});
