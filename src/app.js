import { loadPools } from './chain.mjs';
import { buildDepth, settings, poolInventory, estimateTarget } from './math.mjs';
import { readBrowserCache, readSharedCache, saveBrowserCache } from './browser-cache.mjs';
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const number = (n, digits = 2) => !Number.isFinite(Number(n)) ? '无有限上限' : Number(n) !== 0 && Math.abs(n) < 10 ** -digits
  ? Number(n).toLocaleString('en-US', { maximumSignificantDigits: 3 }) : Number(n).toLocaleString('en-US', { maximumFractionDigits: digits });
const compact = n => {
  n = Number(n);
  if (!Number.isFinite(n)) return '无有限上限';
  if (n !== 0 && Math.abs(n) < 0.000001) return '＜0.000001';
  if (Math.abs(n) >= 1e12) return n.toExponential(3);
  if (Math.abs(n) >= 100000000) return `${number(n / 100000000)}亿`;
  if (Math.abs(n) >= 10000) return `${number(n / 10000)}万`;
  return number(n, Math.abs(n) < 1 ? 6 : 2);
};
const price = n => Number.isFinite(n) ? n !== 0 && (Math.abs(n) >= 1e12 || Math.abs(n) < 1e-10) ? n.toExponential(3) : Number(n).toLocaleString('en-US', { maximumSignificantDigits: 9 }) : '无价格上限';
const bandPrice = n => n === 0 || !Number.isFinite(n) || Math.abs(n) >= 1e12 ? price(n) : n < state.config.step ? `＜${state.config.step.toFixed(state.config.precision)}` : Number(n).toLocaleString('en-US', { minimumFractionDigits: state.config.precision, maximumFractionDigits: state.config.precision });
const time = n => new Date(n).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
const protocolName = { v2: 'V2', v3: 'V3', infinityCl: 'Infinity CL', infinityBin: 'Infinity Bin', stable: 'StableSwap', infinityStable: 'Infinity Stable' };
const state = { catalog: null, markets: [], market: null, config: settings(50, 4), live: null, depth: null, request: 0, hover: null, focusPrice: null, targetPrice: null, busy: false };
let plot;

function pairMarket(p) {
  const priority = symbol => ({ USDT: 10, USDC: 9, FDUSD: 8, BUSD: 7, DAI: 6, WBNB: 5, WETH: 4 })[symbol] || 0;
  const quote = priority(p.token0.symbol) >= priority(p.token1.symbol) ? p.token0 : p.token1;
  const base = quote === p.token0 ? p.token1 : p.token0;
  return { key: `${base.id.toLowerCase()}/${quote.id.toLowerCase()}`, base, quote };
}
function catalogMarkets(pools) {
  const groups = new Map();
  for (const p of pools) {
    if (![p.token0, p.token1].every(t => t && /^0x[0-9a-f]{40}$/i.test(t.id) && Number.isInteger(t.decimals) && t.decimals >= 0 && t.decimals <= 36)) continue;
    const pair = pairMarket(p);
    const market = groups.get(pair.key) || { ...pair, pools: [], tvl: 0 };
    market.pools.push(p); market.tvl += Number(p.tvlUSD) || 0; groups.set(pair.key, market);
  }
  return [...groups.values()].sort((a, b) => b.tvl - a.tvl);
}
function plainError(message) {
  const known = {
    'RPC 合约读取失败，请重试或缩小范围': '暂时读不到这个池子的链上数据，请稍后刷新。',
    '目录与链上代币身份不一致': '列表中的币种与链上实际币种对不上，这个池子未计入。',
    'Infinity PoolKey 身份校验失败': '这个池子的币种或所属合约对不上，未计入。',
    '空池': '这个池子目前没有可用于买卖的资金。',
    '池尚未初始化': '这个池子尚未开始提供买卖资金。',
    '无效 tick spacing': '这个池子的价格设置数据异常，暂时无法计算。',
    '初始化 tick 数过多，请选择较小百分比': '这个池子的价格数据太多，暂时未计入。可输入较小百分比再试。',
    '全部价格数据校验失败，池子未计入': '这个池子的全部数据未通过校验，没有计入最大范围。',
    '此版本尚未支持深度计算': '这种类型的池子暂时还不能计算，没有加进图里。',
    '目标价格超出已读取 tick 范围，请刷新': '所选价格超出这次读取的范围，请刷新数据。',
    '负流动性：池数据不一致': '这个池子的资金数据不一致，暂时无法计算。',
    '深度超出数值范围': '这次读取的数值过大，暂时无法计算。',
    '没有可计算深度的池': '暂时没有读到可用于计算的池子，请刷新或切换代币。',
    '池现价无效': '没有读到有效价格，请刷新或切换代币。',
  };
  if (message.startsWith('RPC 合约读取失败：')) return '暂时读不到这个池子的数据，请稍后刷新。';
  return known[message] || '这次没能读到可用数据，请稍后刷新。';
}
function setError(message, technical = '') {
  $('error').hidden = !message;
  $('error').innerHTML = escape(message || '') + (technical && technical !== message
    ? `<details><summary>查看技术信息</summary><p>${escape(technical)}</p></details>` : '');
}
function clearDepth() {
  state.depth = null; state.live = null; state.hover = null; state.focusPrice = null;
  state.targetPrice = null; $('target-price').value = ''; $('target-result').hidden = true; $('target-button').disabled = true;
  $('ask-range-note').textContent = ''; $('bid-range-note').textContent = '';
  $('range-result').hidden = true; $('jump-button').disabled = true; $('jump-status').textContent = '';
  ['mark-price', 'book-price', 'ask-total', 'bid-total'].forEach(id => $(id).textContent = '—');
  ['bids', 'asks'].forEach(id => $(id).innerHTML = '<div class="empty">正在读取池子里的资金…</div>');
  $('chart-empty').style.display = 'flex'; $('chart-empty').textContent = '正在读取这个代币的买卖资金…';
  $('chart-tip').hidden = true; draw();
}
function updateURL() {
  const url = new URL(location.href);
  if (state.market) { url.searchParams.set('base', state.market.base.id); url.searchParams.set('quote', state.market.quote.id); }
  url.searchParams.delete('levels'); url.searchParams.delete('bps');
  url.searchParams.set('range', state.config.percent); url.searchParams.set('precision', state.config.precision);
  history.replaceState(null, '', url);
}
function updateControls() {
  const c = state.config, range = c.maximum ? '最大：现价 0.5～2 倍' : `上下 ${number(c.percent, 4)}%`;
  $('percent').disabled = c.maximum;
  if (!c.maximum) $('percent').value = c.percent;
  $('precision').value = c.precision;
  $('maximum').setAttribute('aria-pressed', String(c.maximum));
  $('maximum').classList.toggle('active', c.maximum);
  $('range-label').textContent = range;
  $('settings-hint').textContent = `${c.maximum ? '最大 = 现价 0.5～2 倍' : `${number(c.percent, 4)}% = 价格上下 ${number(c.percent, 4)}%`}；${c.precision} 位小数 = 每档 ${c.step.toFixed(c.precision)}。`;
  document.querySelectorAll('[data-percent]').forEach(b => b.classList.toggle('active', !c.maximum && Number(b.dataset.percent) === c.percent));
  $('levels-summary').textContent = '档数按价格精度自动计算';
  $('range-result').hidden = true;
}

async function selectMarket(market) {
  clearDepth();
  state.market = market;
  $('pair-name').textContent = `${market.base.symbol} / ${market.quote.symbol}`;
  $('quote-unit').textContent = `${market.quote.symbol} / ${market.base.symbol}`;
  $('book-units').textContent = `币量：${market.base.symbol} · 价值：${market.quote.symbol === 'USDT' ? 'U（USDT）' : market.quote.symbol}`;
  document.querySelectorAll('.value-label').forEach(e => e.textContent = `价值 ${market.quote.symbol === 'USDT' ? 'U' : market.quote.symbol}`);
  document.querySelectorAll('.cumulative-value-label').forEach(e => e.textContent = `累计价值 ${market.quote.symbol === 'USDT' ? 'U' : market.quote.symbol}`);
  $('book-quote').textContent = market.quote.symbol;
  $('target-unit').textContent = market.quote.symbol;
  $('chart-unit').textContent = `竖着看：合计金额（${market.quote.symbol}）`;
  updateURL(); $('market-dialog').close(); await refresh();
}
async function refresh() {
  if (!state.market) return;
  const request = ++state.request, market = state.market;
  setError(''); state.busy = true; $('refresh').disabled = true;
  $('status').textContent = `正在从链上读取 ${market.pools.length} 个池子的数据…`;
  let displayed = false, previous;
  const usable = live => live?.pools.length && (live.range === Infinity || live.range === state.config.range) && Date.now() - live.timestamp < 86400000;
  const show = (live, updating = false) => {
    if (request !== state.request || !usable(live)) return false;
    const depth = buildDepth(live.pools, market.base.id, state.config, { focusPrice: state.focusPrice });
    state.live = live; state.depth = depth; state.hover = null;
    render(); $('jump-button').disabled = false;
    $('status').textContent = `${time(live.timestamp)} · 合并 ${live.pools.length}/${market.pools.length} 个池子${live.failed.length ? ` · ${live.failed.length} 个未计入` : ''}${updating ? ' · 正在更新…' : ''}`;
    setError(Date.now() - live.timestamp > 180000 ? '显示的是较早的数据，正在检查更新。' : '');
    displayed = true; return true;
  };
  try {
    previous = state.live || readBrowserCache(market);
    if (usable(previous)) show(previous, true);
    else { previous = null; clearDepth(); }
    const sharedPromise = readSharedCache(market);
    if (!previous) {
      const seed = await readSharedCache(market, true);
      if (usable(seed)) { previous = seed; show(seed, true); }
    }
    const shared = await sharedPromise;
    if (usable(shared) && (!previous || shared.blockNumber > previous.blockNumber)) {
      previous = shared; show(shared, true); saveBrowserCache(market, shared);
    }
    if (request !== state.request) return;
    const live = await loadPools(market.pools, market.base.id, Infinity, (done, total) => {
      if (request === state.request) $('status').textContent = `${displayed ? `显示 ${time(state.live.timestamp)} · ` : ''}正在更新池子 ${done} / ${total}…`;
    }, { previous });
    if (request !== state.request) return;
    live.source = '公共节点';
    if (!live.pools.length) {
      if (displayed) throw new Error('暂时未读到新数据');
      state.live = live;
      setError('这个代币暂时没有可用数据。点击“查看数据明细”了解原因，或换个代币再试。');
      $('status').textContent = '这次没有读到可用数据';
      ['bids', 'asks'].forEach(id => $(id).innerHTML = '<div class="empty">暂时没有可用数据</div>');
      $('chart-empty').textContent = '暂时没有可用数据';
      return;
    }
    // A transient partial update must not replace a complete cached snapshot.
    if (previous && live.pools.length < previous.pools.length) throw new Error('部分池子暂时无法更新');
    const newest = state.live && state.live.blockNumber > live.blockNumber ? state.live : live;
    show(newest); saveBrowserCache(market, newest);
    if (Date.now() - newest.timestamp > 180000) setError('当前数据已超过 3 分钟，可能有变化，请点击“刷新数据”。');
  } catch (e) {
    if (request !== state.request) return;
    const technical = e.shortMessage || e.message || '读取失败';
    if (displayed) {
      setError('暂时没能更新，继续显示上次数据。', technical);
      $('status').textContent = `${time(state.live.timestamp)} · 合并 ${state.live.pools.length}/${market.pools.length} 个池子 · 更新失败`;
    } else {
      setError(plainError(technical), technical);
      $('status').textContent = '这次没有读到可用数据';
      ['bids', 'asks'].forEach(id => $(id).innerHTML = '<div class="empty">暂时没有可用数据</div>');
      $('chart-empty').textContent = '暂时没有可用数据';
    }
  } finally {
    if (request === state.request) { state.busy = false; $('refresh').disabled = false; $('jump-button').disabled = !state.depth; }
  }
}
function render() {
  const d = state.depth;
  $('mark-price').textContent = price(d.price); $('book-price').textContent = price(d.price);
  $('ask-total-label').textContent = '卖盘币量 · 全池';
  $('bid-total-label').textContent = '买盘资金 · 全池';
  try {
    const inventory = poolInventory(state.live.pools, state.market.base.id);
    $('ask-total').textContent = `${compact(inventory.base)} ${state.market.base.symbol}`;
    $('bid-total').textContent = `${compact(inventory.quote)} ${state.market.quote.symbol}`;
    const coverage = `全价格范围 · ${state.live.pools.length}/${state.market.pools.length} 个池`;
    $('ask-range-note').textContent = coverage; $('bid-range-note').textContent = coverage;
    $('target-button').disabled = false;
  } catch {
    $('ask-total').textContent = '—'; $('bid-total').textContent = '—';
    $('ask-range-note').textContent = '全池数据未读完整'; $('bid-range-note').textContent = '全池数据未读完整';
    $('target-button').disabled = true;
  }
  renderTarget();
  const maximum = Math.max(...[...d.bids, ...d.asks].map(r => Number.isFinite(r.cumulativeQuote) ? r.cumulativeQuote : 0), 1e-20);
  $('levels-summary').textContent = `卖盘 ${d.asks.length} 行 · 买盘 ${d.bids.length} 行${d.grouped ? ' · 相邻档已合并' : ''}`;
  $('range-result').hidden = false;
  $('range-result').textContent = d.grouped ? '相邻档已合并，总金额不变。' : '';
  $('range-result').hidden = !$('range-result').textContent;

  for (const [id, rows, side] of [['bids', d.bids, 'bid'], ['asks', d.asks, 'ask']]) {
    const displayedRows = rows.map((r, i) => ({ r, i }));
    if (side === 'ask') displayedRows.reverse();
    $(id).innerHTML = displayedRows.map(({ r, i }) => `<button class="book-row ${side}" data-side="${side}" data-index="${i}" style="--fill:${(Number.isFinite(r.cumulativeQuote) ? r.cumulativeQuote / maximum * 100 : 100)}%;--side:var(--${side === 'bid' ? 'green' : 'red'})" aria-label="${side === 'bid' ? '买盘' : '卖盘'}第 ${r.level} 档，价格 ${price(r.price)}，币量 ${compact(r.quantity)}，累计币量 ${compact(r.cumulativeQuantity)}，价值 ${compact(r.quote)}，合计金额 ${compact(r.cumulativeQuote)}"><span title="实际边界价格 ${r.price}">${r.endpoint || r.focus ? price(r.price) : bandPrice(r.price)}</span><span>${compact(r.quantity)}</span><span>${compact(r.cumulativeQuantity)}</span><span>${compact(r.quote)}</span><span>${compact(r.cumulativeQuote)}</span></button>`).join('');
  }
  $('asks').scrollTop = $('asks').scrollHeight;
  $('bids').scrollTop = 0;
  $('chart-empty').style.display = 'none';
  $('inspection').innerHTML = '<span class="eyebrow">价格明细</span><p>点表格查看完整数字。</p>';
  if (state.focusPrice != null) {
    const p = state.focusPrice, side = p < d.price ? 'bid' : 'ask';
    const index = (side === 'bid' ? d.bids : d.asks).findIndex(r => r.price === p);
    if (index >= 0) { inspect(side, index, true); $('jump-status').textContent = `已定位 ${price(p)}。`; }
    else { state.focusPrice = null; $('jump-status').textContent = ''; }
  }
  draw();
}

function renderTarget() {
  const result = $('target-result');
  result.hidden = state.targetPrice == null;
  if (result.hidden) return;
  try {
    const estimate = estimateTarget(state.live.pools, state.market.base.id, state.targetPrice, state.depth.price);
    const base = escape(state.market.base.symbol), quote = escape(state.market.quote.symbol);
    const direction = estimate.side === 'ask' ? '买到' : '卖到';
    result.className = 'target-result';
    if (estimate.side === 'same') { result.textContent = '目标价与参考价相同。'; return; }
    const empty = estimate.emptyPools ? ` · ${estimate.emptyPools} 个池在目标价处无流动性` : '';
    result.innerHTML = `<span class="${estimate.side === 'ask' ? 'ask-color' : 'bid-color'}">${direction} ${price(estimate.targetPrice)} ${quote}</span><strong>${estimate.side === 'ask' ? '预计花费' : '预计换回'} ${number(estimate.quote, 2)} ${quote}</strong><span>${estimate.side === 'ask' ? '预计买入' : '需卖出'} ${number(estimate.quantity, 2)} ${base}${empty} · 未含费用</span>`;
  } catch (e) { result.className = 'target-result target-error'; result.textContent = e.message; }
}
function inspect(side, index, locate = false) {
  if (!state.depth) return;
  const row = (side === 'bid' ? state.depth.bids : state.depth.asks)[index];
  if (!row) return;
  state.hover = { side, index };
  const color = side === 'bid' ? 'bid-color' : 'ask-color';
  const offsetText = Number.isFinite(row.offset) ? `比参考价${row.offset > 0 ? '高' : '低'} ${number(Math.abs(row.offset) / 100, 3)}%` : '没有固定价格上限';
  $('inspection').innerHTML = `<span class="eyebrow ${color}">${side === 'bid' ? '买盘' : '卖盘'} · 第 ${row.level} 档 · ${offsetText}</span><div class="inspection-data"><div><span>每个 ${escape(state.market.base.symbol)} 的价格（${escape(state.market.quote.symbol)}）</span><strong>${price(row.price)}</strong></div><div><span>币量（${escape(state.market.base.symbol)}）</span><strong>${number(row.quantity, 5)}</strong></div><div><span>累计币量（${escape(state.market.base.symbol)}）</span><strong>${number(row.cumulativeQuantity, 5)}</strong></div><div><span>价值（${escape(state.market.quote.symbol)}）</span><strong>${number(row.quote, 5)}</strong></div><div><span>累计价值（${escape(state.market.quote.symbol)}）</span><strong>${number(row.cumulativeQuote, 5)}</strong></div></div>`;
  document.querySelectorAll('.book-row.selected').forEach(e => e.classList.remove('selected'));
  const button = document.querySelector(`.book-row[data-side="${side}"][data-index="${index}"]`);
  button?.classList.add('selected');
  if (locate && button) button.parentElement.scrollTop = Math.max(0, button.offsetTop - button.parentElement.clientHeight / 2 + button.offsetHeight / 2);
  draw();
}

function draw() {
  const canvas = $('chart'), rect = canvas.getBoundingClientRect(), ratio = devicePixelRatio || 1;
  const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
  canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
  const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio); ctx.clearRect(0, 0, w, h);
  const left = 57, right = w - 12, top = 16, bottom = h - (w < 400 ? 47 : 35);
  const d = state.depth, max = d ? Math.max(...[...d.bids, ...d.asks].map(r => Number.isFinite(r.cumulativeQuote) ? r.cumulativeQuote : 0), 1e-20) * 1.1 : 100;
  ctx.font = '12px "IBM Plex Mono", monospace'; ctx.fillStyle = '#76899a'; ctx.strokeStyle = '#202b37'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = bottom - (bottom - top) * i / 4;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.textAlign = 'right'; ctx.fillText(compact(max * i / 4), left - 9, y + 3);
  }
  if (!d) return;
  const chartBids = d.bids.filter(r => r.price >= 0 && Number.isFinite(r.cumulativeQuote));
  const chartAsks = d.asks.filter(r => Number.isFinite(r.price) && Number.isFinite(r.cumulativeQuote));
  const minPrice = chartBids.at(-1)?.price ?? d.price * .999, maxPrice = chartAsks.at(-1)?.price || d.price * 1.001;
  const middle = (left + right) / 2;
  const log = d.compressed, positiveMin = Math.max(minPrice, d.price * 1e-12);
  const x = p => p <= 0 ? left : log ? p < d.price ? middle - Math.log(d.price / p) / Math.max(1e-12, Math.log(d.price / positiveMin)) * (middle - left)
    : middle + Math.log(p / d.price) / Math.max(1e-12, Math.log(maxPrice / d.price)) * (right - middle)
    : left + (p - minPrice) / Math.max(1e-30, maxPrice - minPrice) * (right - left);
  const atX = px => px <= left && minPrice === 0 ? 0 : log ? px < middle ? d.price * Math.exp(-(middle - px) / (middle - left) * Math.log(d.price / positiveMin))
    : d.price * Math.exp((px - middle) / (right - middle) * Math.log(maxPrice / d.price))
    : minPrice + (px - left) / (right - left) * (maxPrice - minPrice);
  const y = value => bottom - value / max * (bottom - top);
  plot = { left, right, top, bottom, x, y, atX, minPrice, maxPrice, w, h };
  ctx.strokeStyle = '#354151'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(x(d.price), top); ctx.lineTo(x(d.price), bottom); ctx.stroke(); ctx.setLineDash([]);
  for (const [rows, color] of [[chartBids, '#69c7a7'], [chartAsks, '#de92a2']]) {
    if (!rows.length) continue;
    ctx.beginPath(); ctx.moveTo(x(d.price), bottom);
    let previousY = bottom;
    for (const r of rows) { ctx.lineTo(x(r.price), previousY); ctx.lineTo(x(r.price), y(r.cumulativeQuote)); previousY = y(r.cumulativeQuote); }
    ctx.lineTo(x(rows.at(-1).price), bottom); ctx.closePath();
    const gradient = ctx.createLinearGradient(0, top, 0, bottom); gradient.addColorStop(0, `${color}30`); gradient.addColorStop(1, `${color}03`);
    ctx.fillStyle = gradient; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x(d.price), bottom); previousY = bottom;
    for (const r of rows) { ctx.lineTo(x(r.price), previousY); ctx.lineTo(x(r.price), y(r.cumulativeQuote)); previousY = y(r.cumulativeQuote); }
    ctx.strokeStyle = color; ctx.lineWidth = 1.7; ctx.stroke();
  }
  ctx.fillStyle = '#7e8f9f'; ctx.textAlign = 'left'; ctx.fillText(price(minPrice), left, h - (w < 400 ? 24 : 10));
  ctx.textAlign = 'right'; ctx.fillText(price(maxPrice), right, h - (w < 400 ? 24 : 10));
  ctx.fillStyle = '#d9c593'; ctx.textAlign = 'center'; ctx.fillText(price(d.price), x(d.price), h - (w < 400 ? 4 : 10));
  if (state.hover) {
    const r = (state.hover.side === 'bid' ? d.bids : d.asks)[state.hover.index];
    if (!r || r.price < 0 || !Number.isFinite(r.price) || !Number.isFinite(r.cumulativeQuote)) return;
    ctx.strokeStyle = '#708394'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(x(r.price), top); ctx.lineTo(x(r.price), bottom); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x(r.price), y(r.cumulativeQuote), 3, 0, Math.PI * 2); ctx.fillStyle = state.hover.side === 'bid' ? '#69c7a7' : '#de92a2'; ctx.fill();
  }
}

function showMarkets() { $('market-dialog').showModal(); $('search').value = ''; renderMarkets(); $('search').focus(); }
function renderMarkets() {
  const query = $('search').value.trim().toLowerCase();
  const matches = state.markets.filter(m => `${m.base.symbol} ${m.quote.symbol} ${m.base.name} ${m.quote.name} ${m.base.id} ${m.quote.id} ${m.pools.map(p => p.id).join(' ')}`.toLowerCase().includes(query));
  $('market-list').innerHTML = matches.slice(0, 200).map(m => `<button class="market-option" data-market="${escape(m.key)}"><span><strong>${escape(m.base.symbol)} / ${escape(m.quote.symbol)}</strong><small>${m.pools.length} 个池子 · ${[...new Set(m.pools.map(p => protocolName[p.protocol] || p.protocol))].map(escape).join(' / ')} · ${escape(m.base.id.slice(0, 8))}…${escape(m.base.id.slice(-4))}</small></span><span>$${compact(m.tvl)}</span></button>`).join('') || '<div class="empty">没有找到，请换个名称或粘贴地址试试</div>';
  $('search-summary').textContent = `找到 ${matches.length} 组买卖币种${matches.length > 200 ? '，先显示前 200 组；输入名称可缩小范围' : ''}。例如 ESIM / USDT 表示用 USDT 买卖 ESIM。列表未收录的池子不会计入。`;
}
function coverage() {
  $('detail-title').textContent = '哪些池子算进来了？';
  if (!state.market) return;
  const live = state.live;
  $('detail-body').innerHTML = `<p>“池子”是 PancakeSwap 里用于买卖两种币的一组资金。这里把成功读取的池子合在一起看。</p><p>${escape(state.market.base.symbol)} / ${escape(state.market.quote.symbol)}：已找到 ${state.market.pools.length} 个池子。${live ? `图中已计入 ${live.pools.length} 个，未计入 ${live.failed.length} 个。<br>数据时间：${time(live.timestamp)}（北京时间）；链上记录编号（区块）：${live.blockNumber}；读取来源：${live.source === 'Alchemy' ? 'Alchemy 后台' : '公共节点'}。` : '还没有读取完链上数据。'}<br>只合并买卖同样两种币的池子。其他币种、其他链和其他交易所的资金另算。</p>` + state.market.pools.map(p => {
    const ready = live?.pools.find(x => x.id === p.id && x.protocol === p.protocol), failure = live?.failed.find(x => x.id === p.id && x.protocol === p.protocol);
    const special = ready?.hook && !/^0x0{40}$/i.test(ready.hook) ? ' · 这个池子有额外交易规则，本页估算未考虑这些规则' : '';
    return `<div class="detail-pool"><strong>${escape(protocolName[p.protocol] || p.protocol)} · 列表费率 ${Number(p.feeTier) / 10000}%</strong><span class="badge ${ready ? '' : 'failed'}">${ready ? '已加进图里' : failure ? '未加进图里' : '还在读取'}</span><p>列表中的池内资金估值：$${compact(p.tvlUSD)}${ready ? ` · ${ready.kind === 'cl' ? `已读取 ${ready.ticks.length} 个价格分界点` : '已读取两种币的余额'}${special}${ready.dynamicFee ? ' · 手续费会变动' : ''}` : ''}${failure ? `<br>${escape(plainError(failure.error))}` : ''}</p>${failure ? `<details><summary>查看技术信息</summary><p>${escape(failure.error)}</p></details>` : ''}<a class="address" href="https://pancakeswap.finance/liquidity/pool/bsc/${escape(p.protocol)}/${escape(p.id)}" target="_blank" rel="noopener">池子地址：${escape(p.id)} ↗</a></div>`;
  }).join('');
  $('detail-dialog').showModal();
}
function methodology() {
  $('detail-title').textContent = '怎么看这些数据？';
  $('detail-body').innerHTML = `<h3>先选币种，再看金额</h3><p>例如 ESIM / USDT，表示用 USDT 买卖 ESIM。价格 0.06 表示 1 个 ESIM 对应 0.06 USDT。绿色是买盘，红色是卖盘。这里的“深度”，就是选定价格范围里的买卖数量和金额，按池内资金估算。</p><h3>一行表格是什么意思？</h3><p>每一行是一小段价格区间。“币量”和“价值 U”只看这一段；“累计币量”和“累计价值 U”是从最接近现价的档位加到当前这一档。点击一行能看完整数字。曲线越高，表示累计金额越多。</p><h3>全池币量和目标价格</h3><p>顶部卖盘显示池内代币，买盘显示用于买入的计价币，统计全部价格范围中的交易资金，未含未领取的手续费。输入目标价格：高于现价时，看买入要付多少；低于现价时，看要卖多少币、可换回多少。某个池子在目标价处没有资金时会提示，不能当成保证成交的报价。目标价估算不受图表范围限制，未模拟外部套利或资金新增。</p><h3>价格上下范围</h3><p>输入 10%，表格和曲线就看参考价上下 10% 内的买卖数量和金额。例如参考价 1 USDT，就是看 0.9 到 1.1 USDT。“最大”看现价的 0.5～2 倍。例如现价 0.06，就是看 0.03～0.12。表格金额是到对应价格的估算花费或所得。</p><h3>小数位数怎么设置？</h3><p>4 位小数表示每档价格相差 0.0001；2 位小数就是 0.01。档数自动计算。档位太多时，每行会合并相邻档，最多显示 500 行；整个范围的总金额不会减少。范围的最后一档可能只是一小段，以实际边界价格计算。小数位数只改变表格的细分程度，不改变范围内的总金额。</p><h3>池子是什么？为什么只显示部分数据？</h3><p>池子是用于买卖两种币的一组资金。同样两种币可以有多个池子，本页合并成功读取的池子。参考价格取这些池子中，官方列表资金估值最大的那个。读不到的池子、还未支持的池子类型不会加进图里，可点“查看数据明细”了解原因。当前只看 BNB 链上的 PancakeSwap。ESIM / USDT 与 ESIM / BNB 分开显示；同名但地址不同的代币也分开显示。</p><h3>数据从哪里来？多久更新？</h3><p>代币和池子列表来自 PancakeSwap 官方数据接口，后台每小时尝试更新。列表更新时间：${state.catalog ? time(state.catalog.fetchedAt) + '（北京时间）' : '暂时未知'}。${state.catalog?.complete ? '这次已读取完接口提供的列表，但不保证链上所有池子都在里面。' : '列表还未收集完整，有些池子可能尚未收录。'}打开时先显示有时间标记的缓存，再检查链上更新；流动性未改变的档位直接复用。打开页面立即读取链上数据，默认每分钟自动更新；回到页面也会立即检查更新。也可点“刷新数据”。ESIM/USDT 后台每 60 分钟更新共享数据，即使网页关闭也会运行；实际时间以页面显示为准。池子列表中的美元估值和图里的买卖金额是不同指标，更新时间也可能不同。</p><h3>金额是估算值</h3><p>这些数值按池子的资金计算，未计入手续费、网络费用、代币转账税费，以及某些池子的额外交易规则。实际买卖金额以交易时的报价为准。</p><details><summary>查看详细算法与技术来源</summary><p>V2 使用实际储备量的恒定乘积曲线；V3 与 Infinity CL 使用当前价格、活跃流动性、tick bitmap 和初始化 tick 的 liquidityNet，按价格区间积分。一次刷新固定同一区块。原始状态及流动性变化使用 BigInt，显示积分使用浮点数。Infinity Bin / StableSwap 目前只列入列表与明细，不计入曲线。</p><p>百分比模式的边界 = 参考价 ×（1 ± 百分比 / 100），价格下限最低为 0。精度为 n 位小数时，基础价格档距为 10⁻ⁿ；相邻档合并后仍按实际边界积分，最后一档抵达原始范围边界。最大显示范围为现价的 0.5～2 倍。后台全量缓存读取合约全部 tick bitmap 并校验两端流动性归零；显示范围独立于缓存读取范围。各池从自身现价积分到共同价格边界；各池现价不同，第一档可能包含已有池间价差。这里只合并同一对代币地址的直接池，未模拟多跳路由或真实成交。</p><p><a href="https://developer.pancakeswap.finance/apis/subgraph" target="_blank" rel="noopener">PancakeSwap 开发文档 ↗</a><br><a href="https://github.com/pancakeswap/pancakeswap-ai" target="_blank" rel="noopener">官方数据接口使用示例 ↗</a><br><a href="https://github.com/pancakeswap/infinity-core" target="_blank" rel="noopener">Infinity CL 合约与计算方法 ↗</a></p></details>`;
  $('detail-dialog').showModal();
}

$('market-button').addEventListener('click', showMarkets);
$('search').addEventListener('input', renderMarkets);
$('market-list').addEventListener('click', e => { const key = e.target.closest('[data-market]')?.dataset.market; const m = state.markets.find(m => m.key === key); if (m) selectMarket(m); });
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.close).close()));
$('settings-form').addEventListener('submit', e => { e.preventDefault(); try {
  const previous = state.config;
  state.config = settings($('maximum').getAttribute('aria-pressed') === 'true' ? 'max' : $('percent').value, $('precision').value);
  updateControls(); updateURL();
  if (state.depth && state.live && (previous.percent === state.config.percent || state.live.range === Infinity)) {
    // Display controls do not cancel full-range reads. Completion uses the current controls.
    state.depth = buildDepth(state.live.pools, state.market.base.id, state.config, { focusPrice: state.focusPrice }); render();
    $('status').textContent = `${time(state.live.timestamp)} · 合并 ${state.live.pools.length}/${state.market.pools.length} 个池子${state.busy ? ' · 正在更新…' : ''}`;
  }
  else if (!state.busy) refresh();
} catch (e) { setError(e.message); } });
document.querySelectorAll('[data-percent]').forEach(b => b.addEventListener('click', () => { $('maximum').setAttribute('aria-pressed', 'false'); $('percent').disabled = false; $('percent').value = b.dataset.percent; $('settings-form').requestSubmit(); }));
$('maximum').addEventListener('click', () => { $('maximum').setAttribute('aria-pressed', String($('maximum').getAttribute('aria-pressed') !== 'true')); $('settings-form').requestSubmit(); });
$('refresh').addEventListener('click', refresh);
$('target-form').addEventListener('submit', e => {
  e.preventDefault(); state.targetPrice = $('target-price').value; renderTarget();
});
$('target-price').addEventListener('input', () => { state.targetPrice = null; $('target-result').hidden = true; });
$('coverage-button').addEventListener('click', coverage);
$('method-button').addEventListener('click', methodology);
for (const id of ['bids', 'asks']) {
  $(id).addEventListener('pointerover', e => { const row = e.target.closest('[data-index]'); if (row) inspect(row.dataset.side, Number(row.dataset.index)); });
  $(id).addEventListener('click', e => { const row = e.target.closest('[data-index]'); if (row) inspect(row.dataset.side, Number(row.dataset.index)); });
  $(id).addEventListener('focusin', e => { const row = e.target.closest('[data-index]'); if (row) inspect(row.dataset.side, Number(row.dataset.index)); });
}
function chartPointer(e, locate = false) {
  if (!plot || !state.depth) return;
  const rect = $('chart').getBoundingClientRect(), px = e.clientX - rect.left;
  const p = plot.atX(Math.max(plot.left, Math.min(plot.right, px)));
  const side = p < state.depth.price ? 'bid' : 'ask';
  const rows = side === 'bid' ? state.depth.bids : state.depth.asks;
  let index = rows.findIndex(r => side === 'bid' ? r.price <= p : r.price >= p);
  if (index < 0) index = rows.length - 1;
  inspect(side, index, locate);
  const r = (side === 'bid' ? state.depth.bids : state.depth.asks)[index];
  const tip = $('chart-tip'); tip.hidden = false; tip.innerHTML = `<strong class="${side === 'bid' ? 'bid-color' : 'ask-color'}">${price(r.price)} ${escape(state.market.quote.symbol)}</strong><span>从第 1 档合计 ${number(r.cumulativeQuote, 2)} ${escape(state.market.quote.symbol)}</span>`;
  tip.style.left = `${Math.max(0, Math.min(rect.width - 180, px + 12))}px`; tip.style.top = '26px';
}
$('jump-form').addEventListener('submit', e => {
  e.preventDefault(); if (!state.depth) return;
  const value = $('jump-price').value, p = Number(value), d = state.depth;
  if (!value || !Number.isFinite(p) || p < 0) { $('jump-status').textContent = '请输入有效价格。'; return; }
  if (p < d.low || p > d.high) { $('jump-status').textContent = '超出当前范围，请扩大范围或选“最大”。'; return; }
  if (p === d.price) { $('jump-status').textContent = '这个价格就是池子现价。'; return; }
  state.focusPrice = p;
  state.depth = buildDepth(state.live.pools, state.market.base.id, state.config, { focusPrice: p });
  render();
  const side = p < state.depth.price ? 'bid' : 'ask';
  const index = (side === 'bid' ? state.depth.bids : state.depth.asks).findIndex(r => r.price === p);
  document.querySelector(`.book-row[data-side="${side}"][data-index="${index}"]`)?.focus({ preventScroll: true });
});
$('chart').addEventListener('pointermove', e => chartPointer(e));
$('chart').addEventListener('click', e => chartPointer(e, true));
$('chart').addEventListener('pointerleave', () => { $('chart-tip').hidden = true; });
new ResizeObserver(draw).observe($('chart').parentElement);
setInterval(() => { if ($('auto').checked && !state.busy && !document.hidden) refresh(); }, 60000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && $('auto').checked && !state.busy) refresh();
});
$('auto').addEventListener('change', () => {
  if ($('auto').checked && !state.busy && !document.hidden) refresh();
});

async function init() {
  $('auto').checked = true;
  const params = new URLSearchParams(location.search);
  try { state.config = settings(params.get('range') || (params.has('levels') && params.has('bps') ? Number(params.get('levels')) * Number(params.get('bps')) / 100 : 50), params.get('precision') ?? 4); } catch (e) { setError(`${e.message}；已恢复默认显示设置。`); }
  updateControls();
  try {
    let catalog;
    if ('DecompressionStream' in window) {
      const r = await fetch('./data/catalog.json.gz', { cache: 'no-cache' });
      if (!r.ok) throw new Error('市场目录读取失败');
      const bytes = new Uint8Array(await r.arrayBuffer());
      const data = bytes[0] === 31 && bytes[1] === 139
        ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
        : new TextDecoder().decode(bytes);
      catalog = JSON.parse(data);
    } else {
      const r = await fetch('./data/catalog.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('市场目录读取失败');
      catalog = await r.json();
    }
    if (!Array.isArray(catalog.pools) || catalog.chainId !== 56) throw new Error('市场目录格式错误');
    state.catalog = catalog; state.markets = catalogMarkets(catalog.pools);
    $('catalog-status').textContent = `已收录 ${number(state.markets.length, 0)} 组买卖币种、${number(catalog.pools.length, 0)} 个池子 · 列表更新于 ${time(catalog.fetchedAt)}（北京时间）${catalog.complete ? '' : ' · 列表还未收集完整'}`;
    const requested = params.has('base') && params.has('quote');
    let market = state.markets.find(m => m.base.id.toLowerCase() === params.get('base')?.toLowerCase() && m.quote.id.toLowerCase() === params.get('quote')?.toLowerCase());
    if (!requested) market = state.markets.find(m => m.base.symbol === 'ESIM' && m.quote.symbol === 'USDT') || state.markets.find(m => m.base.symbol === 'WBNB' && m.quote.symbol === 'USDT') || state.markets[0];
    if (market) await selectMarket(market);
    else { $('status').textContent = '列表还没有收录链接中的币种，请重新选择'; $('chart-empty').textContent = '请先选择代币'; setError('暂时找不到链接中的币种，请从列表里重新选择。'); showMarkets(); }
  } catch (e) { $('status').textContent = '暂时无法加载代币列表'; setError('代币列表加载失败，请刷新页面或稍后再试。', e.message); }
}
init();
