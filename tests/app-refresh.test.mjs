import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buildDepth, settings, poolInventory, estimateTarget } from '../src/math.mjs';

const source = (await readFile(new URL('../src/app.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const base = { id: '0x1111111111111111111111111111111111111111', symbol: 'BASE', decimals: 18 };
const quote = { id: '0x2222222222222222222222222222222222222222', symbol: 'USDT', decimals: 18 };
const pool = { id: 'pool', protocol: 'v2', kind: 'v2', token0: base, token1: quote, reserve0: 1000e18, reserve1: 4000e18, tvlUSD: '8000' };
const market = { base, quote, pools: [pool], key: `${base.id}/${quote.id}` };
const live = (block = 100n, price = 4) => ({ pools: [{ ...pool, reserve1: 1000e18 * price }], failed: [], blockNumber: block, timestamp: Date.now(), range: Infinity });
const settle = () => new Promise(resolve => setImmediate(resolve));

function app() {
  // DOM and external reads are controlled; actual app handlers and depth math run unchanged.
  const elements = new Map(), listeners = new Map(), timers = [], pending = [];
  const canvas = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
  for (const match of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const attributes = new Map([...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    elements.set(match[1], { value: attributes.get('value') || '', checked: /\bchecked\b/.test(match[0]), disabled: /\bdisabled\b/.test(match[0]),
      textContent: '', innerHTML: '', hidden: false, style: {}, scrollTop: 0, scrollHeight: 1000, close() {},
      classList: { toggle() {}, add() {}, remove() {} }, parentElement: {},
      getAttribute: key => attributes.get(key), setAttribute: (key, value) => attributes.set(key, value),
      addEventListener: (type, callback) => listeners.set(`${match[1]}:${type}`, callback),
      getBoundingClientRect: () => ({ width: 800, height: 350 }), getContext: () => canvas });
  }
  const document = { hidden: false, getElementById: id => elements.get(id), querySelectorAll: () => [], querySelector: () => null,
    addEventListener: (type, callback) => listeners.set(`document:${type}`, callback) };
  const context = vm.createContext({ document, window: {}, location: { href: 'https://example.test/', search: '' },
    history: { replaceState() {} }, URL, URLSearchParams, console, devicePixelRatio: 1,
    ResizeObserver: class { observe() {} }, setInterval: callback => timers.push(callback),
    fetch: () => new Promise(() => {}), buildDepth, settings, poolInventory, estimateTarget,
    readBrowserCache: selected => selected === market ? live() : null, saveBrowserCache() {}, readSharedCache: async () => null,
    loadPools: () => new Promise(resolve => pending.push(resolve)), market });
  vm.runInContext(source, context);
  vm.runInContext('state.market = market;', context);
  return { elements, listeners, timers, pending, context, read: code => vm.runInContext(code, context),
    async finish(data = live(101n, 5)) { pending.shift()(data); await settle(); } };
}

test('Opening with the default controls enables minute refresh without user action', async () => {
  const a = app();
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

test('Returning to the page refreshes immediately when automatic refresh is enabled', async () => {
  const a = app(); a.elements.get('auto').checked = true;
  const resume = a.listeners.get('document:visibilitychange');
  assert.equal(typeof resume, 'function');
  resume(); await settle();
  assert.equal(a.read('state.busy'), true);
  await a.finish();
  assert.equal(a.read('state.live.blockNumber'), 101n);
});

test('Automatic refresh skips hidden pages and overlapping reads', async () => {
  const a = app(); a.elements.get('auto').checked = true;
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
