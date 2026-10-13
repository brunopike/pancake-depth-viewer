import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buildDepth, settings, poolInventory, estimateTarget, priceAtTick, cumulative, priceOf } from '../src/math.mjs';
import { OWNERS, poolMetadata } from '../src/ownership.mjs';

const source = (await readFile(new URL('../src/app.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const base = { id: '0x1111111111111111111111111111111111111111', symbol: 'BASE', decimals: 18 };
const quote = { id: '0x2222222222222222222222222222222222222222', symbol: 'USDT', decimals: 18 };
const pool = { id: 'pool', protocol: 'v2', kind: 'v2', token0: base, token1: quote, reserve0: 1000e18, reserve1: 4000e18, tvlUSD: '8000' };
const market = { base, quote, pools: [pool], key: `${base.id}/${quote.id}` };
const live = (block = 100n, price = 4) => ({ pools: [{ ...pool, reserve1: 1000e18 * price }], failed: [], blockNumber: block, timestamp: Date.now(), range: Infinity });
const settle = () => new Promise(resolve => setImmediate(resolve));

function app(search = '') {
  // DOM and external reads are controlled; actual app handlers and depth math run unchanged.
  const elements = new Map(), listeners = new Map(), timers = [], pending = [], labels = [];
  const canvas = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : key === 'fillText' ? text => labels.push(text) : () => {} });
  for (const match of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const attributes = new Map([...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    elements.set(match[1], { value: attributes.get('value') || '', checked: /\bchecked\b/.test(match[0]), disabled: /\bdisabled\b/.test(match[0]),
      textContent: '', innerHTML: '', hidden: false, style: {}, scrollTop: 0, scrollHeight: 1000, close() {},
      classList: { toggle() {}, add() {}, remove() {} }, parentElement: {},
      getAttribute: key => attributes.get(key), setAttribute: (key, value) => attributes.set(key, value),
      addEventListener: (type, callback) => listeners.set(`${match[1]}:${type}`, callback),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 350 }), getContext: () => canvas });
  }
  const document = { hidden: false, getElementById: id => elements.get(id), querySelectorAll: () => [], querySelector: () => null,
    addEventListener: (type, callback) => listeners.set(`document:${type}`, callback) };
  const context = vm.createContext({ document, window: {}, location: { href: `https://example.test/${search}`, search },
    history: { replaceState(_a, _b, url) { context.location.href = String(url); } }, URL, URLSearchParams, console, devicePixelRatio: 1,
    ResizeObserver: class { observe() {} }, setInterval: callback => timers.push(callback),
    fetch: () => new Promise(() => {}), buildDepth, settings, poolInventory, estimateTarget, priceAtTick, cumulative, priceOf, OWNERS, poolMetadata,
    readBrowserCache: selected => selected === market ? live() : null, saveBrowserCache() {}, readSharedCache: async () => null,
    loadPools: () => new Promise(resolve => pending.push(resolve)), market });
  vm.runInContext(source, context);
  vm.runInContext('state.market = market;', context);
  return { elements, listeners, timers, pending, labels, context, read: code => vm.runInContext(code, context),
    async finish(data = live(101n, 5)) { pending.shift()(data); await settle(); } };
}

test('Automatic refresh defaults to ten minutes and runs only when due', async () => {
  const a = app();
  assert.equal(a.read('state.refreshMinutes'), 10);
  assert.equal(Number(a.elements.get('refresh-minutes').value), 10);
  a.timers[0](); await settle();
  assert.equal(a.pending.length, 0);
  a.read('state.nextRefreshAt = Date.now() - 1');
  a.timers[0](); await settle();
  assert.equal(a.read('state.busy'), true);
  assert.equal(a.elements.get('refresh').disabled, true);
  await a.finish();
  assert.equal(a.read('state.depth.price'), 5);
});

test('Changing display settings does not discard an in-flight chain update', async () => {
  const a = app();
  const reading = a.read('refresh()'); await settle();
  a.elements.get('percent').value = '10'; a.elements.get('precision').value = '6';
  a.listeners.get('settings-form:submit')({ preventDefault() {} });
  assert.equal(a.read('state.busy'), true);
  await a.finish(); await reading;
  assert.equal(a.read('state.depth.price'), 5);
  assert.equal(a.read('state.depth.config.percent'), 10);
  assert.equal(a.read('state.depth.config.precision'), 6);
  assert.equal(a.elements.get('refresh').disabled, false);
});

test('A slower older RPC result cannot replace a newer displayed snapshot', async () => {
  const a = app();
  const reading = a.read('refresh()'); await settle();
  await a.finish(live(99n, 3)); await reading;
  assert.equal(a.read('state.live.blockNumber'), 100n);
  assert.equal(a.read('state.depth.price'), 4);
});

test('Returning to the page catches up only when the refresh interval has elapsed', async () => {
  const a = app(); a.elements.get('auto').checked = true;
  const resume = a.listeners.get('document:visibilitychange');
  assert.equal(typeof resume, 'function');
  resume(); await settle(); assert.equal(a.pending.length, 0);
  a.read('state.nextRefreshAt = Date.now() - 1');
  resume(); await settle();
  assert.equal(a.read('state.busy'), true);
  await a.finish();
  assert.equal(a.read('state.live.blockNumber'), 101n);
});

test('Automatic refresh skips hidden pages and overlapping reads', async () => {
  const a = app(); a.elements.get('auto').checked = true;
  a.read('state.nextRefreshAt = Date.now() - 1');
  a.context.document.hidden = true; a.timers[0](); await settle();
  assert.equal(a.read('state.busy'), false);
  a.context.document.hidden = false;
  a.timers[0](); a.timers[0](); await settle();
  assert.equal(a.elements.get('refresh').disabled, true);
  await a.finish();
  assert.equal(a.read('state.busy'), false);
  assert.equal(a.read('state.depth.price'), 5);
});

test('Switching tokens during an update cannot show the previous market data', async () => {
  const a = app();
  const oldRead = a.read('refresh()'); await settle();
  const other = { ...base, id: '0x3333333333333333333333333333333333333333', symbol: 'OTHER' };
  a.context.otherMarket = { ...market, base: other, key: `${other.id}/${quote.id}` };
  const newRead = a.read('selectMarket(otherMarket)'); await settle();
  await a.finish(); await oldRead;
  assert.equal(a.read('state.depth === null'), true);
  assert.equal(a.elements.get('pair-name').textContent, 'OTHER / USDT');
  const fresh = live(102n, 6); fresh.pools[0].token0 = other;
  await a.finish(fresh); await newRead;
  assert.equal(a.read('state.depth.price'), 6);
});

test('The book splits all four amount columns into own and external with cumulative totals', async () => {
  const a = app('?precision=3'), reading = a.read('refresh()'); await settle();
  const data = live(101n, 5); data.pools[0].ownership = { status: 'verified', ownBalance: 3n, totalSupply: 10n };
  await a.finish(data); await reading;
  assert.equal(a.read('state.depth.ownershipVerified'), true);
  assert.match(a.elements.get('bids').innerHTML, /class="split-value"/);
  assert.match(a.elements.get('bids').innerHTML, /class="own-color"/);
  assert.match(a.elements.get('bids').innerHTML, /class="external-color"/);
  assert.match(a.elements.get('lp-status').textContent, /已核对/);
  const row = a.read('state.depth.bids[0]');
  assert.ok(Math.abs(row.own.quantity / row.quantity - .3) < 1e-12);
  assert.equal(a.elements.get('asks').scrollTop, 1000); assert.equal(a.elements.get('bids').scrollTop, 0);
});

test('Missing ownership displays pending attribution while full-pool prices remain available', async () => {
  const a = app(), reading = a.read('refresh()'); await settle(); await a.finish(); await reading;
  assert.match(a.elements.get('lp-status').textContent, /待核对/);
  assert.match(a.elements.get('bids').innerHTML, /待核对/);
  assert.equal(a.read('state.depth.price'), 5);
});

test('Total and split views switch without changing amounts, chart, scroll position or chain reads', async () => {
  const a = app('?precision=3'), reading = a.read('refresh()'); await settle();
  const data = live(101n, 5); data.pools[0].ownership = { status: 'verified', ownBalance: 3n, totalSupply: 10n };
  await a.finish(data); await reading;
  const depth = a.read('state.depth'), chart = a.read('state.chartDepth');
  a.elements.get('asks').scrollTop = 177; a.elements.get('bids').scrollTop = 90;
  a.listeners.get('book-total:click')();
  assert.equal(a.read('state.depth'), depth); assert.equal(a.read('state.chartDepth'), chart);
  assert.match(a.elements.get('bids').innerHTML, /class="total-value"/);
  assert.doesNotMatch(a.elements.get('bids').innerHTML, /class="split-value"/);
  assert.equal(a.elements.get('book-total').getAttribute('aria-pressed'), 'true');
  assert.equal(a.elements.get('asks').scrollTop, 177); assert.equal(a.elements.get('bids').scrollTop, 90);
  a.listeners.get('book-split:click')();
  assert.match(a.elements.get('bids').innerHTML, /class="split-value"/);
  assert.equal(a.elements.get('book-split').getAttribute('aria-pressed'), 'true');
  assert.equal(a.elements.get('asks').scrollTop, 177); assert.equal(a.elements.get('bids').scrollTop, 90);
  assert.equal(a.pending.length, 0);
});

test('Chart and book ranges can change independently without a new chain read', async () => {
  const a = app(), reading = a.read('refresh()'); await settle(); await a.finish(); await reading;
  const before = a.elements.get('bids').innerHTML;
  a.elements.get('chart-percent').value = '10';
  a.listeners.get('chart-settings:submit')({ preventDefault() {} });
  assert.equal(a.read('state.chartDepth.low'), 4.5);
  assert.equal(a.read('state.depth.low'), 2.5);
  assert.equal(a.elements.get('bids').innerHTML, before);
  a.elements.get('percent').value = '20';
  a.listeners.get('settings-form:submit')({ preventDefault() {} });
  assert.equal(a.read('state.depth.low'), 4);
  assert.equal(a.read('state.chartDepth.low'), 4.5);
  assert.equal(a.pending.length, 0);
});


test('Chart precision is independent, persisted, and leaves the book and chain reads unchanged', async () => {
  const a = app('?precision=8'), reading = a.read('refresh()'); await settle(); await a.finish(); await reading;
  assert.equal(a.read('state.chartPrecision'), 4);
  const book = a.read('state.depth'), content = a.elements.get('bids').innerHTML;
  a.elements.get('chart-precision').value = '2'; a.listeners.get('chart-settings:submit')({ preventDefault() {} });
  assert.equal(a.read('state.chartDepth.config.precision'), 2);
  assert.equal(a.read('state.depth'), book); assert.equal(a.elements.get('bids').innerHTML, content);
  assert.equal(new URL(a.context.location.href).searchParams.get('chartPrecision'), '2');
  assert.ok(a.labels.includes('5.00'));
  a.elements.get('chart-precision').value = '19'; a.listeners.get('chart-settings:submit')({ preventDefault() {} });
  assert.equal(a.read('state.chartPrecision'), 2); assert.equal(a.elements.get('chart-range-error').hidden, false);
  const restored = app('?precision=8&chartPrecision=3');
  assert.equal(restored.read('state.config.precision'), 8); assert.equal(restored.read('state.chartPrecision'), 3);
  assert.equal(a.pending.length, 0);
});

test('Chart click details use the chart band, including own/external amounts, not the finer book band', async () => {
  const a = app('?precision=3'), reading = a.read('refresh()'); await settle();
  const data = live(101n, 5); data.pools[0].ownership = { status: 'verified', ownBalance: 3n, totalSupply: 10n };
  await a.finish(data); await reading;
  a.elements.get('chart-precision').value = '2'; a.listeners.get('chart-settings:submit')({ preventDefault() {} });
  const px = a.read('plot.x(4.987)');
  a.listeners.get('chart:click')({ clientX: px });
  const row = a.read('state.chartHover.row'), bookRow = a.read('state.depth.bids.find(r => r.price === state.focusPrice)');
  assert.equal(a.read('state.inspection.source'), 'chart');
  assert.ok(row.quantity > bookRow.quantity * 9, 'chart band spans ten book increments near the selected price');
  const formatted = n => a.read(`number(${n}, 2)`);
  assert.match(a.elements.get('inspection').innerHTML, /曲线 · 买盘/);
  for (const value of [row.quantity, row.quote, row.cumulativeQuote, row.own.quantity, row.external.quote]) {
    assert.ok(a.elements.get('inspection').innerHTML.includes(formatted(value)));
  }
  assert.ok(a.elements.get('chart-tip').innerHTML.includes(formatted(row.cumulativeQuote)));
  a.elements.get('chart-precision').value = '3'; a.listeners.get('chart-settings:submit')({ preventDefault() {} });
  assert.equal(a.read('state.chartHover.row'), a.read('state.chartDepth.bids.find(r => r.price === state.inspection.price)'));
  assert.ok(a.elements.get('inspection').innerHTML.includes('4.980'));
  a.elements.get('jump-price').value = '4.999'; a.listeners.get('jump-form:submit')({ preventDefault() {} });
  assert.equal(a.read('state.inspection.source'), 'book');
});

test('Manual refresh and interval edits restart the full minute countdown', async () => {
  const a = app();
  a.read('state.nextRefreshAt = Date.now() + 10');
  a.listeners.get('refresh:click')(); await settle();
  let remaining = a.read('state.nextRefreshAt - Date.now()');
  assert.ok(remaining > 599000 && remaining <= 600000);
  await a.finish();
  a.elements.get('refresh-minutes').value = '3'; a.listeners.get('refresh-minutes:change')();
  remaining = a.read('state.nextRefreshAt - Date.now()');
  assert.ok(remaining > 179000 && remaining <= 180000);
  assert.equal(new URL(a.context.location.href).searchParams.get('refreshMinutes'), '3');
  a.timers[0](); await settle(); assert.equal(a.pending.length, 0);
  a.elements.get('refresh-minutes').value = '0'; a.listeners.get('refresh-minutes:change')();
  assert.equal(a.read('state.refreshMinutes'), 3); assert.equal(a.elements.get('refresh-interval-error').hidden, false);
  assert.equal(app('?refreshMinutes=7').read('state.refreshMinutes'), 7);
});
