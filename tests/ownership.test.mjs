import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDepth, poolInventory, priceAtTick, MIN_TICK, MAX_TICK } from '../src/math.mjs';
import { OWNERS, CL_POSITION_MANAGER, V3_POSITION_MANAGER, ownedCurve, validateOwnership } from '../src/ownership.mjs';

const L = 1000n * 10n ** 18n;
const base = { id: 'base', decimals: 18 }, quote = { id: 'quote', decimals: 18 };
const position = (lower, upper, liquidity = L / 4n, id = '1', owner = OWNERS[0]) => ({ manager: CL_POSITION_MANAGER, tokenId: id, owner, tickLower: lower, tickUpper: upper, liquidity });
const cl = { id: 'cl', protocol: 'infinityCl', kind: 'cl', token0: base, token1: quote, sqrtPriceX96: 2n ** 96n, tick: 0, spacing: 10,
  liquidity: L, fullRange: true, minTick: MIN_TICK, maxTick: MAX_TICK, tvlUSD: '10000',
  ticks: [{ index: -200, net: L }, { index: 200, net: -L }, { index: 1000, net: L / 2n }, { index: 1200, net: -L / 2n }],
  ownership: { status: 'verified', positions: [position(-200, 200), position(1000, 1200, L / 3n, '2', OWNERS[1])] } };
const v2 = { id: 'v2', protocol: 'v2', kind: 'v2', token0: base, token1: quote, reserve0: 1000e18, reserve1: 1000e18, tvlUSD: '1000',
  ownership: { status: 'verified', ownBalance: 3n, totalSupply: 10n } };
const near = (a, b) => assert.ok(Math.abs(a - b) <= Math.max(1, Math.abs(b)) * 1e-9, `${a} != ${b}`);

test('Each band preserves whole-pool totals and separates concentrated and V2 ownership', () => {
  const split = buildDepth([cl, v2], 'base', { percent: 50, precision: 4 });
  const whole = buildDepth([{ ...cl, ownership: undefined }, { ...v2, ownership: undefined }], 'base', { percent: 50, precision: 4 });
  assert.equal(split.ownershipVerified, true);
  for (const side of ['asks', 'bids']) for (let i = 0; i < split[side].length; i++) {
    const row = split[side][i], before = whole[side][i];
    for (const field of ['quantity', 'quote', 'cumulativeQuantity', 'cumulativeQuote']) near(row[field], before[field]);
    near(row.own.quantity + row.external.quantity, row.quantity);
    near(row.own.quote + row.external.quote, row.quote);
    assert.ok(row.own.quantity >= 0 && row.external.quantity >= 0);
  }
  // A position farther from the current price has a different owner share.
  const allOwn = poolInventory([ownedCurve(cl).pool], 'base');
  const expectedAsk = 250 * (1 - 1 / 1.0001 ** 100) + (1000 / 3) * (1 / 1.0001 ** 500 - 1 / 1.0001 ** 600);
  near(allOwn.base, expectedAsk);
});

test('Inverse pairs, unequal decimals, fine precision and inserted target prices conserve the split', () => {
  const p = { ...cl, token0: { ...base, decimals: 6 } };
  for (const [id, focus] of [['base', 1.02e-12], ['quote', .98e12]]) {
    const depth = buildDepth([p], id, { percent: 'max', precision: 18 }, { focusPrice: focus });
    assert.equal(depth.ownershipVerified, true);
    for (const row of [...depth.bids, ...depth.asks]) {
      near(row.own.quantity + row.external.quantity, row.quantity);
      near(row.own.quote + row.external.quote, row.quote);
    }
  }
});

test('Verified zero ownership is numeric zero; missing or incomplete ownership is unknown', () => {
  const empty = { ...cl, ownership: { status: 'verified', positions: [] } };
  const depth = buildDepth([empty, { ...v2, ownership: { status: 'verified', ownBalance: 0n, totalSupply: 10n } }], 'base', { percent: 10, precision: 3 });
  assert.equal(depth.ownershipVerified, true);
  for (const r of [...depth.asks, ...depth.bids]) { assert.equal(r.own.quantity, 0); near(r.external.quote, r.quote); }
  for (const ownership of [undefined, { status: 'unavailable' }]) {
    const pending = buildDepth([{ ...cl, ownership }], 'base', { percent: 10, precision: 3 });
    assert.equal(pending.ownershipVerified, false);
    assert.equal(pending.asks[0].own, null); assert.equal(pending.asks[0].external, null);
    assert.ok(pending.asks[0].quantity > 0);
  }
});

test('A zero lower price keeps both V2 asymptotic quantities meaningful, without Infinity minus Infinity', () => {
  const depth = buildDepth([v2], 'base', { percent: 100, precision: 4 });
  const row = depth.bids.at(-1);
  assert.equal(row.own.quantity, Infinity); assert.equal(row.external.quantity, Infinity);
  assert.equal(row.external.cumulativeQuantity, Infinity);
  near(row.own.quote + row.external.quote, row.quote);
});

test('Tick prices match decimal 1.0001 at the main-pool range, without binary literal drift', () => {
  const expected = 0.06400061673639999265963510471904311647560669483141144;
  assert.ok(Math.abs(priceAtTick(cl, 'quote', 27490) - expected) < expected * 1e-15);
});

test('Invalid owners, duplicated NFTs, bad tick boundaries and over-attributed liquidity fail validation', () => {
  const badPositions = [
    [position(-200, 200, L / 4n, '1', '0x0000000000000000000000000000000000000001')],
    [position(-200, 200), position(1000, 1200)],
    [position(-205, 200)], [position(200, -200)], [position(-200, 200, -1n)],
    [position(-200, 200, L + 1n)], [position(500, 600)],
    [{ ...position(-200, 200), manager: V3_POSITION_MANAGER }]
  ];
  for (const positions of badPositions) assert.throws(() => validateOwnership({ ...cl, ownership: { status: 'verified', positions } }), /LP/);
  for (const ownBalance of [-1n, 11n]) assert.throws(() => validateOwnership({ ...v2, ownership: { status: 'verified', ownBalance, totalSupply: 10n } }), /LP/);
});
