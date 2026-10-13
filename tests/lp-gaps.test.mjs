import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weakLiquidityRanges, gapSettings } from '../src/lp-gaps.mjs';
import { buildDepth, MIN_TICK, MAX_TICK } from '../src/math.mjs';
import { OWNERS, CL_POSITION_MANAGER } from '../src/ownership.mjs';
const base = { id: 'base', decimals: 18 }, quote = { id: 'quote', decimals: 18 };
const v2 = { id: 'v2', protocol: 'v2', kind: 'v2', token0: base, token1: quote, reserve0: 1000e18, reserve1: 4000e18, tvlUSD: '1000', ownership: { status: 'verified', ownBalance: 3n, totalSupply: 10n } };
const cl = (liquidity = 1000000n * 10n ** 18n) => ({ id: 'cl', protocol: 'infinityCl', kind: 'cl', token0: base, token1: quote, sqrtPriceX96: 2n ** 96n, tick: 0, spacing: 1, fullRange: true, minTick: MIN_TICK, maxTick: MAX_TICK, liquidity,
  ticks: [{ index: -1000, net: liquidity }, { index: 1000, net: -liquidity }],
  ownership: { status: 'verified', positions: [{ manager: CL_POSITION_MANAGER, tokenId: '1', owner: OWNERS[0], tickLower: -1000, tickUpper: 1000, liquidity }] } });
const near = (a, b) => assert.ok(Math.abs(a - b) <= Math.max(1, Math.abs(b)) * 1e-10, `${a} != ${b}`);

test('defaults are independent 100 percent, four decimals and inclusive fifty quote units', () => {
  const config = gapSettings();
  assert.equal(config.percent, 100); assert.equal(config.precision, 4); assert.equal(config.threshold, 50);
  const result = weakLiquidityRanges([cl()], 'base', 1);
  assert.equal(result.low, 0); assert.equal(result.high, 2); assert.equal(result.scanned, 20000);
  assert.ok(result.matched > 0 && result.matched < result.scanned);
  for (const range of result.ranges) for (const band of range.bands) assert.ok(band.quote <= 50);
});

test('threshold equality is included and filtering never rounds small positive amounts to zero', () => {
  const all = weakLiquidityRanges([v2], 'base', 4, { percent: 1, precision: 2, threshold: 1e6 });
  const amount = all.ranges[0].bands[0].quote;
  const equal = weakLiquidityRanges([v2], 'base', 4, { percent: 1, precision: 2, threshold: amount });
  assert.ok(equal.ranges.some(r => r.bands.some(b => b.quote === amount)));
  assert.equal(weakLiquidityRanges([v2], 'base', 4, { percent: 1, precision: 2, threshold: 0 }).matched, 0);
  const tiny = { ...v2, ownership: { ...v2.ownership, ownBalance: 1n, totalSupply: 10n ** 30n } };
  assert.equal(weakLiquidityRanges([tiny], 'base', 4, { percent: 1, precision: 2, threshold: 0 }).matched, 0);
});

test('uncompressed per-band amounts agree with the order book including inverse decimals and off-grid reference', () => {
  for (const pool of [v2, { ...v2, token0: { ...base, decimals: 6 }, reserve0: 1000e6 }]) {
    for (const id of ['base', 'quote']) {
      const depth = buildDepth([pool], id, { percent: 1, precision: 4 });
      const scan = weakLiquidityRanges([pool], id, depth.price, { percent: 1, precision: 4, threshold: 1e12 });
      for (const side of ['bid', 'ask']) {
        const rows = depth[side === 'bid' ? 'bids' : 'asks'];
        const bands = scan.ranges.filter(r => r.side === side).flatMap(r => r.bands).sort((a, b) => side === 'bid' ? b.low - a.low : a.high - b.high);
        assert.equal(bands.length, rows.length);
        rows.forEach((r, i) => near(bands[i].quote, r.own.quote));
      }
    }
  }
  const pool = { ...v2, reserve1: 3999.123e18 };
  const d = buildDepth([pool], 'base', { percent: .1, precision: 3 });
  const s = weakLiquidityRanges([pool], 'base', d.price, { percent: .1, precision: 3, threshold: 1e9 });
  near(s.ranges.filter(r => r.side === 'ask').flatMap(r => r.bands)[0].quote, d.asks[0].own.quote);
});

test('precision changes actual band amounts, adjacent weak bands merge and per-range totals conserve values', () => {
  const config = { percent: .1, threshold: 1e9 };
  const coarse = weakLiquidityRanges([v2], 'base', 4, { ...config, precision: 3 });
  const fine = weakLiquidityRanges([v2], 'base', 4, { ...config, precision: 4 });
  assert.ok(fine.scanned > coarse.scanned);
  assert.equal(fine.ranges.length, 2);
  near(fine.ranges.reduce((s, r) => s + r.totalQuote, 0), coarse.ranges.reduce((s, r) => s + r.totalQuote, 0));
  for (const r of fine.ranges) near(r.totalQuote, r.bands.reduce((s, b) => s + b.quote, 0));
});

test('zero threshold finds empty bands without including a band that crosses into a funded position', () => {
  const result = weakLiquidityRanges([cl()], 'base', 1, { percent: 50, precision: 2, threshold: 0 });
  assert.deepEqual(result.ranges.map(r => [r.low, r.high]), [[.5, .9], [1.11, 1.5]]);
  const empty = cl(0n);
  assert.equal(weakLiquidityRanges([empty], 'base', 1, { percent: 1, precision: 2, threshold: 0 }).matched, 2);
});

test('missing or partial ownership and excessive precision cannot produce misleading weak ranges', () => {
  for (const pools of [[], [{ ...cl(), fullRange: false }], [{ ...cl(), kind: 'bin' }]]) assert.throws(() => weakLiquidityRanges(pools, 'base', 1, { percent: 1 }), /未读完整/);
  assert.throws(() => weakLiquidityRanges([v2], 'base', 4, { percent: 1 }, { failedCount: 1 }), /未读完整/);
  assert.throws(() => weakLiquidityRanges([v2], 'base', 4, { percent: 1 }, { expectedPoolCount: 2 }), /未读完整/);
  assert.throws(() => weakLiquidityRanges([{ ...v2, ownership: undefined }], 'base', 4, { percent: 1 }), /待核对/);
  assert.throws(() => weakLiquidityRanges([cl()], 'base', 1, { precision: 18 }), /20,000/);
  for (const n of ['', null, 0, -1, Infinity, 'max']) assert.throws(() => gapSettings(n), /查询范围/);
  for (const n of ['', null, -1, Infinity]) assert.throws(() => gapSettings(100, 4, n), /金额上限/);
});
