import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownLiquidityGaps, gapPercent } from '../src/lp-gaps.mjs';
import { priceAtTick, MIN_TICK, MAX_TICK } from '../src/math.mjs';
import { OWNERS, CL_POSITION_MANAGER } from '../src/ownership.mjs';

const base = { id: 'base', decimals: 18 }, quote = { id: 'quote', decimals: 18 };
const position = (a, b, liquidity = 1n, id = '1') => ({ manager: CL_POSITION_MANAGER, tokenId: id, owner: OWNERS[0], tickLower: a, tickUpper: b, liquidity });
const pool = (positions = []) => {
  const net = new Map();
  for (const p of positions) {
    net.set(p.tickLower, (net.get(p.tickLower) || 0n) + p.liquidity);
    net.set(p.tickUpper, (net.get(p.tickUpper) || 0n) - p.liquidity);
  }
  return { id: 'cl', protocol: 'infinityCl', kind: 'cl', token0: base, token1: quote,
    sqrtPriceX96: 2n ** 96n, tick: 0, spacing: 1, fullRange: true, minTick: MIN_TICK, maxTick: MAX_TICK,
    liquidity: positions.filter(p => p.tickLower <= 0 && p.tickUpper > 0).reduce((a, p) => a + p.liquidity, 0n),
    ticks: [...net].sort((a, b) => a[0] - b[0]).map(([index, net]) => ({ index, net })),
    ownership: { status: 'verified', positions } };
};
const p = tick => priceAtTick(pool(), 'base', tick);

test('default 100 percent covers 0 to twice the reference, and excludes cleared positions', () => {
  const result = ownLiquidityGaps([pool([position(-100, 100, 0n)])], 'base', 1);
  assert.deepEqual(result, { percent: 100, low: 0, high: 2, gaps: [{ low: 0, high: 2 }] });
});

test('merge overlapping and touching positions across pools, preserving a narrow genuine gap', () => {
  const first = pool([position(-100, 100), position(100, 200, 1n, '2')]);
  const second = pool([position(-200, -50), position(201, 300, 1n, '2')]);
  assert.deepEqual(ownLiquidityGaps([first, second], 'base', 1).gaps,
    [{ low: 0, high: p(-200) }, { low: p(200), high: p(201) }, { low: p(300), high: 2 }]);
});

test('clip intervals to the independent query and keep inverse-token decimals correct', () => {
  const cl = { ...pool([position(-100, 200)]), token0: { ...base, decimals: 6 } };
  const ref = 1e12;
  const result = ownLiquidityGaps([cl], 'quote', ref, 1.5);
  const boundary = priceAtTick(cl, 'quote', -100);
  assert.deepEqual(result.gaps, [{ low: boundary, high: ref * 1.015 }]);
  assert.deepEqual(ownLiquidityGaps([pool([position(-100, 100)])], 'base', 1, .1).gaps, []);
});

test('even one unit of V2 ownership covers all positive prices, but unknown pools still block', () => {
  const v2 = { kind: 'v2', token0: base, token1: quote, reserve0: 1, reserve1: 1,
    ownership: { status: 'verified', ownBalance: 1n, totalSupply: 10n ** 30n } };
  assert.deepEqual(ownLiquidityGaps([v2], 'base', 1).gaps, []);
  assert.deepEqual(ownLiquidityGaps([{ ...v2, ownership: { ...v2.ownership, ownBalance: 0n } }], 'base', 1).gaps, [{ low: 0, high: 2 }]);
  assert.throws(() => ownLiquidityGaps([v2, { ...pool(), ownership: undefined }], 'base', 1), /待核对/);
});

test('missing, partial, invalid and unsupported states never become zero-liquidity claims', () => {
  const cl = pool([position(-100, 100)]);
  for (const pools of [[], [{ ...cl, fullRange: false }], [{ ...cl, kind: 'bin' }]]) {
    assert.throws(() => ownLiquidityGaps(pools, 'base', 1), /未读完整/);
  }
  assert.throws(() => ownLiquidityGaps([cl], 'base', 1, 100, { expectedPoolCount: 2 }), /未读完整/);
  assert.throws(() => ownLiquidityGaps([cl], 'base', 1, 100, { failedCount: 1 }), /未读完整/);
  assert.throws(() => ownLiquidityGaps([{ ...cl, liquidity: 0n }], 'base', 1), /校验/);
  assert.throws(() => ownLiquidityGaps([cl], 'base', 0), /未就绪/);
  for (const value of ['', null, 0, -1, Infinity, 'max', 1000001]) assert.throws(() => gapPercent(value), /查询范围/);
});
