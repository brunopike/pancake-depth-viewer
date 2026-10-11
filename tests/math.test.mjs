import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceOf, cumulative, buildDepth, settings, tickRange, MIN_TICK, MAX_TICK } from '../src/math.mjs';
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
  const one = buildDepth([cl, v2], 'a', { percent: 10, precision: 3 });
  const two = buildDepth([cl, v2], 'a', { percent: 10, precision: 4 });
  for (const side of ['asks', 'bids']) {
    near(one[side].at(-1).cumulativeQuote, two[side].at(-1).cumulativeQuote);
    near(one[side].reduce((s, r) => s + r.quote, 0), one[side].at(-1).cumulativeQuote);
    assert.ok(one[side].length > 20);
    assert.ok(one[side].every(r => r.quantity >= 0 && r.quote >= 0));
  }
});
test('Aggregate uses common absolute price boundaries across pools', () => {
  const secondary = { ...v2, reserve1: 4200e18, tvlUSD: '5000' };
  const result = buildDepth([v2, secondary], 'a', { percent: 10, precision: 2 });
  near(result.price, 4);
  near(result.asks.at(-1).cumulativeQuote, cumulative(v2, 'a', 4.4, 'ask').quote + cumulative(secondary, 'a', 4.4, 'ask').quote);
});
test('Invalid limits, range gaps and negative liquidity fail explicitly', () => {
  for (const args of [[0, 4], [-1, 4], [NaN, 4], [10, 19], [10, -1], [10, 1.5], [10, '']]) assert.throws(() => settings(...args));
  assert.throws(() => cumulative({ ...cl, minTick: -100, maxTick: 100 }, 'a', 1.1, 'ask'), /tick/);
  assert.throws(() => cumulative({ ...cl, liquidity: -1n }, 'a', 1.1, 'ask'), /负流动性/);
});

test('Percentage and precision remain independent; grouped rows keep exact totals', () => {
  const small = buildDepth([v2], 'a', { percent: 25, precision: 2 });
  const grouped = buildDepth([v2], 'a', { percent: 25, precision: 8 });
  near(small.asks.at(-1).price, 5); near(small.bids.at(-1).price, 3);
  near(grouped.asks.at(-1).cumulativeQuote, 4000 * (Math.sqrt(1.25) - 1));
  near(grouped.bids.at(-1).cumulativeQuote, 4000 * (1 - Math.sqrt(.75)));
  assert.ok(grouped.asks.length <= 500);
  near(grouped.asks.reduce((s, r) => s + r.quote, 0), small.asks.at(-1).cumulativeQuote);
  assert.ok(grouped.asks.every((r, i, rows) => !i || r.price > rows[i - 1].price));
});
test('Decimal bands align to prices and the partial final band keeps the endpoint', () => {
  const pool = { ...v2, reserve1: 1234e18 };
  const out = buildDepth([pool], 'a', { percent: 1, precision: 2 });
  near(out.asks[0].price, 1.24); near(out.asks.at(-1).price, 1.24634);
  near(out.bids[0].price, 1.23); near(out.bids.at(-1).price, 1.22166);
});
test('Maximum CL crosses distant empty gaps and exhausts all liquidity', () => {
  const L = cl.liquidity;
  const pool = { ...cl, fullRange: true, minTick: -887272, maxTick: 887272,
    ticks: [{ index: -200, net: L }, { index: 200, net: -L }, { index: 1000, net: L }, { index: 1200, net: -L }] };
  const out = buildDepth([pool], 'a', { percent: 'max', precision: 4 });
  near(out.asks.at(-1).price, 1.0001 ** 1200);
  near(out.asks.at(-1).cumulativeQuote, 1000 * (1.0001 ** 100 - 1 + 1.0001 ** 600 - 1.0001 ** 500));
  near(out.bids.at(-1).cumulativeQuote, 1000 * (1 - 1.0001 ** -100));
  assert.ok(Number.isFinite(out.asks.at(-1).cumulativeQuote));
  assert.throws(() => buildDepth([{ ...pool, fullRange: false }], 'a', { percent: 'max', precision: 4 }), /全部/);
});
test('V2 maximum represents asymptotes without inventing a finite cap', () => {
  const out = buildDepth([v2], 'a', { percent: 'max', precision: 4 });
  assert.equal(out.asks.at(-1).price, Infinity); assert.equal(out.asks.at(-1).cumulativeQuote, Infinity);
  near(out.asks.at(-1).cumulativeQuantity, 1000);
  assert.equal(out.bids.at(-1).price, 0); near(out.bids.at(-1).cumulativeQuote, 4000);
  assert.equal(out.bids.at(-1).cumulativeQuantity, Infinity);
  assert.ok(out.bids.every(r => !Number.isNaN(r.quote) && !Number.isNaN(r.quantity)));
});
test('At 100 percent the lower price is zero and the sell total is the V2 quote reserve', () => {
  const out = buildDepth([v2], 'a', { percent: 100, precision: 2 });
  near(out.asks.at(-1).price, 8); near(out.bids.at(-1).price, 0);
  near(out.bids.at(-1).cumulativeQuote, 4000); assert.equal(out.bids.at(-1).cumulativeQuantity, Infinity);
});

test('Full and zero-lower-bound bitmap ranges stay within protocol bounds in both token orders', () => {
  const pool = { ...cl, spacing: 20 };
  assert.deepEqual(tickRange(pool, 'a', 1, Infinity), [MIN_TICK, MAX_TICK]);
  const direct = tickRange(pool, 'a', 1, 1), inverse = tickRange(pool, 'b', 1, 1);
  assert.equal(direct[0], MIN_TICK); assert.equal(inverse[1], MAX_TICK);
  assert.ok(direct[1] > 6900 && inverse[0] < -6900);
});
test('Inverse maximum CL and mixed-pool maximum conserve endpoint currency amounts', () => {
  const pool = { ...cl, fullRange: true, minTick: MIN_TICK, maxTick: MAX_TICK,
    ticks: [{ index: -200, net: cl.liquidity }, { index: 200, net: -cl.liquidity }] };
  const direct = buildDepth([pool], 'a', { percent: 'max', precision: 6 });
  const inverse = buildDepth([pool], 'b', { percent: 'max', precision: 6 });
  near(direct.asks.at(-1).cumulativeQuantity, inverse.bids.at(-1).cumulativeQuote);
  near(direct.asks.at(-1).cumulativeQuote, inverse.bids.at(-1).cumulativeQuantity);
  const mixed = buildDepth([pool, v2], 'a', { percent: 'max', precision: 6 });
  near(mixed.bids.at(-1).cumulativeQuote, 4000 + direct.bids.at(-1).cumulativeQuote);
  near(mixed.asks.at(-1).cumulativeQuantity, 1000 + direct.asks.at(-1).cumulativeQuantity);
  assert.ok([...mixed.bids, ...mixed.asks].every(r => !Number.isNaN(r.quote)));
});

test('Extreme-price bands preserve tiny token quantities despite enormous quote values', () => {
  const p = {kind:'cl', protocol:'v3', id:'0x01', token0:{id:'base',decimals:18},token1:{id:'quote',decimals:18},
    sqrtPriceX96:2n**96n, tick:0,liquidity:10n**18n,spacing:1,tvlUSD:'1',fullRange:true,
    minTick:MIN_TICK,maxTick:MAX_TICK,ticks:[{index:MIN_TICK,net:10n**18n},{index:MAX_TICK,net:-(10n**18n)}]};
  const depth=buildDepth([p],'base',settings('max',8));
  const last=depth.asks.at(-1);
  assert.ok(last.quantity>0 && last.quantity<1e-12);
  assert.ok(last.quote>1e12);
  const sum=depth.asks.reduce((v,r)=>v+r.quantity,0);
  near(sum,cumulative(p,'base',depth.high,'ask').quantity);
});
