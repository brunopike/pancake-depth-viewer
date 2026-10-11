import { loadPools } from './chain.mjs';
import { buildDepth, settings } from './math.mjs';
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const number = (n, digits = 2) => Number(n).toLocaleString('en-US', { maximumFractionDigits: digits });
const compact = n => Number(n).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 2 });
const price = n => Number(n).toLocaleString('en-US', { maximumSignificantDigits: 7 });
const time = n => new Date(n).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
const protocolName = { v2: 'V2', v3: 'V3', infinityCl: 'Infinity CL', infinityBin: 'Infinity Bin', stable: 'StableSwap', infinityStable: 'Infinity Stable' };
const state = { catalog: null, markets: [], market: null, config: { levels: 100, bps: 10 }, live: null, depth: null, request: 0, hover: null, busy: false };
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
function setError(message) { $('error').hidden = !message; $('error').textContent = message || ''; }
function clearDepth() {
  state.depth = null; state.live = null; state.hover = null;
  ['mark-price', 'ask-total', 'bid-total'].forEach(id => $(id).textContent = '—');
  ['bids', 'asks'].forEach(id => $(id).innerHTML = '<div class="empty">读取链上流动性…</div>');
  $('chart-empty').style.display = 'flex'; $('chart-empty').textContent = '读取所选市场的链上流动性…';
  $('chart-tip').hidden = true; draw();
}
function updateURL() {
  const url = new URL(location.href);
  if (state.market) { url.searchParams.set('base', state.market.base.id); url.searchParams.set('quote', state.market.quote.id); }
  url.searchParams.set('levels', state.config.levels); url.searchParams.set('bps', state.config.bps);
  history.replaceState(null, '', url);
}
function updateControls() {
  $('levels').value = state.config.levels; $('bps').value = state.config.bps;
  $('range-label').textContent = `±${(state.config.levels * state.config.bps / 100).toFixed(2)}%`;
  document.querySelectorAll('[data-levels]').forEach(b => b.classList.toggle('active', Number(b.dataset.levels) === state.config.levels));
  $('levels-summary').textContent = `每侧 ${state.config.levels} 档 · ${state.config.bps} bps`;
}
async function selectMarket(market) {
  state.market = market;
  $('pair-name').textContent = `${market.base.symbol} / ${market.quote.symbol}`;
  $('quote-unit').textContent = `${market.quote.symbol} / ${market.base.symbol}`;
  $('book-units').textContent = `数量：${market.base.symbol} · 金额：${market.quote.symbol}`;
  $('chart-unit').textContent = `纵轴：累计 ${market.quote.symbol}`;
  updateURL(); $('market-dialog').close(); await refresh();
}
async function refresh() {
  if (!state.market) return;
  const request = ++state.request, market = state.market, config = { ...state.config };
  clearDepth(); setError(''); state.busy = true; $('refresh').disabled = true; $('export').disabled = true;
  $('status').textContent = `正在读取 ${market.pools.length} 个池，所有合约固定同一区块…`;
  try {
    const live = await loadPools(market.pools, market.base.id, config.levels * config.bps / 10000, (done, total) => {
      if (request === state.request) $('status').textContent = `读取池流动性 ${done} / ${total}…`;
    });
    if (request !== state.request) return;
    state.live = live;
    if (!live.pools.length) throw new Error('该市场暂无可用深度。请查看池覆盖明细，或切换交易对后重试。');
    state.depth = buildDepth(live.pools, market.base.id, config);
    render();
    const age = Date.now() - live.timestamp;
    $('status').textContent = `区块 ${live.blockNumber} · ${time(live.timestamp)} CST · 已读取 ${live.pools.length}/${market.pools.length} 个池${live.failed.length ? ' · 部分覆盖' : ''}`;
    if (age > 180000) setError('RPC 区块超过 3 分钟，当前显示为旧区块深度，请刷新。');
  } catch (e) {
    if (request !== state.request) return;
    setError(e.shortMessage || e.message || '数据读取失败，请重试');
    $('status').textContent = '本次读取未成功';
    ['bids', 'asks'].forEach(id => $(id).innerHTML = '<div class="empty">暂无可用深度</div>');
    $('chart-empty').textContent = '暂无可用深度';
  } finally {
    if (request === state.request) { state.busy = false; $('refresh').disabled = false; $('export').disabled = !state.depth; }
  }
}
function render() {
  const d = state.depth;
  $('mark-price').textContent = price(d.price);
  $('ask-total').textContent = compact(d.asks.at(-1).cumulativeQuote);
  $('bid-total').textContent = compact(d.bids.at(-1).cumulativeQuote);
  const maximum = Math.max(d.bids.at(-1).cumulativeQuote, d.asks.at(-1).cumulativeQuote, 1e-20);
  for (const [id, rows, side] of [['bids', d.bids, 'bid'], ['asks', d.asks, 'ask']]) {
    $(id).innerHTML = rows.map((r, i) => `<button class="book-row ${side}" data-side="${side}" data-index="${i}" style="--fill:${r.cumulativeQuote / maximum * 100}%;--side:var(--${side === 'bid' ? 'green' : 'red'})" aria-label="${side === 'bid' ? '卖出' : '买入'}侧第 ${r.level} 档，价格 ${r.price}，本档数量 ${r.quantity}，本档金额 ${r.quote}，累计金额 ${r.cumulativeQuote}"><span>${price(r.price)}</span><span>${compact(r.quantity)}</span><span>${compact(r.quote)}</span><span>${compact(r.cumulativeQuote)}</span></button>`).join('');
  }
  $('chart-empty').style.display = 'none';
  $('inspection').innerHTML = '<span class="eyebrow">DEPTH INSPECTOR</span><p>移动到曲线或档位，查看该价格的数量、金额与累计深度。</p>';
  draw();
}
function inspect(side, index, locate = false) {
  if (!state.depth) return;
  const row = (side === 'bid' ? state.depth.bids : state.depth.asks)[index];
  if (!row) return;
  state.hover = { side, index };
  const color = side === 'bid' ? 'bid-color' : 'ask-color';
  $('inspection').innerHTML = `<span class="eyebrow ${color}">${side === 'bid' ? '卖出' : '买入'}侧 · 第 ${row.level} 档 · ${row.offset > 0 ? '+' : ''}${number(row.offset, 1)} bps</span><div class="inspection-data"><div><span>价格 · ${escape(state.market.quote.symbol)}</span><strong>${price(row.price)}</strong></div><div><span>本档数量 · ${escape(state.market.base.symbol)}</span><strong>${number(row.quantity, 5)}</strong></div><div><span>本档金额</span><strong>${number(row.quote, 5)}</strong></div><div><span>累计金额</span><strong>${number(row.cumulativeQuote, 5)}</strong></div></div>`;
  document.querySelectorAll('.book-row.selected').forEach(e => e.classList.remove('selected'));
  const button = document.querySelector(`.book-row[data-side="${side}"][data-index="${index}"]`);
  button?.classList.add('selected');
  if (locate && button) button.parentElement.scrollTop = Math.max(0, button.offsetTop - button.parentElement.offsetTop - button.parentElement.clientHeight / 2);
  draw();
}

function draw() {
  const canvas = $('chart'), rect = canvas.getBoundingClientRect(), ratio = devicePixelRatio || 1;
  const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
  canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
  const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio); ctx.clearRect(0, 0, w, h);
  const left = 57, right = w - 12, top = 16, bottom = h - 35;
  const d = state.depth, max = d ? Math.max(d.bids.at(-1).cumulativeQuote, d.asks.at(-1).cumulativeQuote, 1e-20) * 1.1 : 100;
  ctx.font = '10px "IBM Plex Mono", monospace'; ctx.fillStyle = '#76899a'; ctx.strokeStyle = '#202b37'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = bottom - (bottom - top) * i / 4;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.textAlign = 'right'; ctx.fillText(compact(max * i / 4), left - 9, y + 3);
  }
  if (!d) return;
  const minPrice = d.bids.at(-1).price, maxPrice = d.asks.at(-1).price;
  const x = p => left + (p - minPrice) / (maxPrice - minPrice) * (right - left);
  const y = value => bottom - value / max * (bottom - top);
  plot = { left, right, top, bottom, x, y, minPrice, maxPrice, w, h };
  ctx.strokeStyle = '#354151'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(x(d.price), top); ctx.lineTo(x(d.price), bottom); ctx.stroke(); ctx.setLineDash([]);
  for (const [rows, color] of [[d.bids, '#69c7a7'], [d.asks, '#de92a2']]) {
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
  ctx.fillStyle = '#7e8f9f'; ctx.textAlign = 'left'; ctx.fillText(price(minPrice), left, h - 10);
  ctx.textAlign = 'right'; ctx.fillText(price(maxPrice), right, h - 10);
  ctx.fillStyle = '#d9c593'; ctx.textAlign = 'center'; ctx.fillText(price(d.price), x(d.price), h - 10);
  if (state.hover) {
    const r = (state.hover.side === 'bid' ? d.bids : d.asks)[state.hover.index];
    ctx.strokeStyle = '#708394'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(x(r.price), top); ctx.lineTo(x(r.price), bottom); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x(r.price), y(r.cumulativeQuote), 3, 0, Math.PI * 2); ctx.fillStyle = state.hover.side === 'bid' ? '#69c7a7' : '#de92a2'; ctx.fill();
  }
}

function showMarkets() { $('market-dialog').showModal(); $('search').value = ''; renderMarkets(); $('search').focus(); }
function renderMarkets() {
  const query = $('search').value.trim().toLowerCase();
  const matches = state.markets.filter(m => `${m.base.symbol} ${m.quote.symbol} ${m.base.name} ${m.quote.name} ${m.base.id} ${m.quote.id} ${m.pools.map(p => p.id).join(' ')}`.toLowerCase().includes(query));
  $('market-list').innerHTML = matches.slice(0, 200).map(m => `<button class="market-option" data-market="${escape(m.key)}"><span><strong>${escape(m.base.symbol)} / ${escape(m.quote.symbol)}</strong><small>${m.pools.length} 个池 · ${[...new Set(m.pools.map(p => protocolName[p.protocol] || p.protocol))].map(escape).join(' / ')} · ${escape(m.base.id.slice(0, 8))}…${escape(m.base.id.slice(-4))}</small></span><span>$${compact(m.tvl)}</span></button>`).join('') || '<div class="empty">目录中没有匹配市场</div>';
  $('search-summary').textContent = `匹配 ${matches.length} 个交易对${matches.length > 200 ? '，显示前 200 个；输入关键词可缩小范围' : ''}。目录中未发现的池不计入深度；支持按代币或池地址查询。`;
}
function coverage() {
  $('detail-title').textContent = '池覆盖明细';
  if (!state.market) return;
  const live = state.live;
  $('detail-body').innerHTML = `<p>${escape(state.market.base.symbol)} / ${escape(state.market.quote.symbol)} · 目录发现 ${state.market.pools.length} 个直接交易池。${live ? `已读取 ${live.pools.length} 个；未计入 ${live.failed.length} 个。` : '链上数据尚未就绪。'}<br>只聚合同一对合约地址的直接池；其他报价币、多跳路径和其他交易所不在这条曲线中。</p>` + state.market.pools.map(p => {
    const ready = live?.pools.find(x => x.id === p.id && x.protocol === p.protocol), failure = live?.failed.find(x => x.id === p.id && x.protocol === p.protocol);
    const special = ready?.hook && !/^0x0{40}$/i.test(ready.hook) ? ' · 含 Hook，图中未计入其执行影响' : '';
    return `<div class="detail-pool"><strong>${escape(protocolName[p.protocol] || p.protocol)} · ${Number(p.feeTier) / 10000}%</strong><span class="badge ${ready ? '' : 'failed'}">${ready ? '已计入' : failure ? '未计入' : '待读取'}</span><p>目录 TVL $${compact(p.tvlUSD)}${ready ? ` · ${ready.ticks.length} 个范围内初始化 tick${special}${ready.dynamicFee ? ' · 动态费' : ''}` : ''}${failure ? `<br>${escape(failure.error)}` : ''}</p><a class="address" href="https://pancakeswap.finance/liquidity/pool/bsc/${escape(p.protocol)}/${escape(p.id)}" target="_blank" rel="noopener">${escape(p.id)} ↗</a></div>`;
  }).join('');
  $('detail-dialog').showModal();
}
function methodology() {
  $('detail-title').textContent = '计算口径与数据来源';
  $('detail-body').innerHTML = `<p>市场目录来自 PancakeSwap Explorer API，GitHub Actions 每小时尝试更新。目录更新时间：${state.catalog ? time(state.catalog.fetchedAt) + ' CST' : '未知'}。${state.catalog?.complete ? '本次目录分页已走完。' : '本次目录分页未走完，覆盖不完整。'}分页完成仅代表该接口已返回完毕，不能证明已发现链上所有池。</p><p>深度由浏览器直接读取 BNB Chain 公开 RPC。V2 使用 getReserves 的恒定乘积曲线；V3 与 Infinity CL 使用现价、活跃流动性、tick bitmap 和初始化 tick 的 liquidityNet 跨区间积分。同一次刷新固定同一区块。曲线参考价格取已读取池中目录 TVL 最大的池。</p><p>买入侧金额为池内曲线从各池自身现价到价格上界的报价币增量；卖出侧金额为到价格下界的报价币增量。各池现价不同时，第一档包含各池到共同价格边界的增量。每档采用线性相对价格：参考价 × (1 ± 档号 × bps / 10000)。每侧最大 500 档，总范围小于 99%。</p><p>显示数量使用浮点积分估算，原始链上状态和 tick 的流动性变化使用 BigInt。这是静态池流动性深度，未扣手续费、协议费、Gas、税费或 Hook 执行影响，没有模拟最优路由或真实成交。Infinity Bin / StableSwap 目前只列入目录和覆盖明细，不计入曲线。</p><p>“市场”按两种代币合约地址分组；同名代币不合并。其他报价币市场可在搜索中切换。不能把不同报价币的金额直接相加。目录 TVL 与链上深度读取时间可能不同；RPC 或单池失败会明确显示部分覆盖。</p><p><a href="https://developer.pancakeswap.finance/apis/subgraph" target="_blank" rel="noopener">PancakeSwap 开发文档 ↗</a><br><a href="https://github.com/pancakeswap/pancakeswap-ai" target="_blank" rel="noopener">PancakeSwap 官方 API 使用示例 ↗</a><br><a href="https://github.com/pancakeswap/infinity-core" target="_blank" rel="noopener">Infinity CL 合约与数学 ↗</a></p>`;
  $('detail-dialog').showModal();
}

$('market-button').addEventListener('click', showMarkets);
$('search').addEventListener('input', renderMarkets);
$('market-list').addEventListener('click', e => { const key = e.target.closest('[data-market]')?.dataset.market; const m = state.markets.find(m => m.key === key); if (m) selectMarket(m); });
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.close).close()));
$('settings-form').addEventListener('submit', e => { e.preventDefault(); try { state.config = settings($('levels').value, $('bps').value); updateControls(); updateURL(); refresh(); } catch (e) { setError(e.message); } });
document.querySelectorAll('[data-levels]').forEach(b => b.addEventListener('click', () => { $('levels').value = b.dataset.levels; $('settings-form').requestSubmit(); }));
$('refresh').addEventListener('click', refresh);
$('coverage-button').addEventListener('click', coverage);
$('method-button').addEventListener('click', methodology);
$('share').addEventListener('click', async () => {
  try { updateURL(); await navigator.clipboard.writeText(location.href); $('share').textContent = '链接已复制'; setTimeout(() => $('share').textContent = '复制链接', 2000); }
  catch { setError('浏览器未允许复制，请从地址栏复制当前链接；参数已保存。'); }
});
$('export').addEventListener('click', () => {
  if (!state.depth || !state.live) return;
  const lines = [`# chainId=56,block=${state.live.blockNumber},timestamp=${new Date(state.live.timestamp).toISOString()},base=${state.market.base.id},quote=${state.market.quote.id},pools=${state.live.pools.length}/${state.market.pools.length},bps=${state.config.bps},levels=${state.config.levels}`, 'side,level,price,offset_bps,base_quantity,quote_amount,cumulative_base_quantity,cumulative_quote_amount'];
  for (const side of ['bids', 'asks']) for (const r of state.depth[side]) lines.push([side, r.level, r.price, r.offset, r.quantity, r.quote, r.cumulativeQuantity, r.cumulativeQuote].join(','));
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `pancake-depth-${state.live.blockNumber}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
for (const id of ['bids', 'asks']) {
  $(id).addEventListener('pointerover', e => { const row = e.target.closest('[data-index]'); if (row) inspect(row.dataset.side, Number(row.dataset.index)); });
  $(id).addEventListener('click', e => { const row = e.target.closest('[data-index]'); if (row) inspect(row.dataset.side, Number(row.dataset.index)); });
  $(id).addEventListener('focusin', e => { const row = e.target.closest('[data-index]'); if (row) inspect(row.dataset.side, Number(row.dataset.index)); });
}
function chartPointer(e, locate = false) {
  if (!plot || !state.depth) return;
  const rect = $('chart').getBoundingClientRect(), px = e.clientX - rect.left;
  const p = plot.minPrice + (px - plot.left) / (plot.right - plot.left) * (plot.maxPrice - plot.minPrice);
  const side = p < state.depth.price ? 'bid' : 'ask';
  const index = Math.max(0, Math.min(state.config.levels - 1, Math.ceil(Math.abs(p / state.depth.price - 1) * 10000 / state.config.bps) - 1));
  inspect(side, index, locate);
  const r = (side === 'bid' ? state.depth.bids : state.depth.asks)[index];
  const tip = $('chart-tip'); tip.hidden = false; tip.innerHTML = `<strong class="${side === 'bid' ? 'bid-color' : 'ask-color'}">${price(r.price)} ${escape(state.market.quote.symbol)}</strong><span>累计 ${number(r.cumulativeQuote, 2)}</span>`;
  tip.style.left = `${Math.max(0, Math.min(rect.width - 180, px + 12))}px`; tip.style.top = '26px';
}
$('chart').addEventListener('pointermove', e => chartPointer(e));
$('chart').addEventListener('click', e => chartPointer(e, true));
$('chart').addEventListener('pointerleave', () => { $('chart-tip').hidden = true; });
new ResizeObserver(draw).observe($('chart').parentElement);
setInterval(() => { if ($('auto').checked && !state.busy && !document.hidden) refresh(); }, 60000);

async function init() {
  $('export').disabled = true;
  const params = new URLSearchParams(location.search);
  try { state.config = settings(params.get('levels') || 100, params.get('bps') || 10); } catch (e) { setError(`${e.message}；已恢复默认显示设置。`); }
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
    $('catalog-status').textContent = `目录 ${number(catalog.pools.length, 0)} 个池 / ${number(state.markets.length, 0)} 个市场 · ${time(catalog.fetchedAt)} CST${catalog.complete ? '' : ' · 分页未完成'}`;
    const requested = params.has('base') && params.has('quote');
    let market = state.markets.find(m => m.base.id.toLowerCase() === params.get('base')?.toLowerCase() && m.quote.id.toLowerCase() === params.get('quote')?.toLowerCase());
    if (!requested) market = state.markets.find(m => m.base.symbol === 'ARTX' && m.quote.symbol === 'USDT') || state.markets.find(m => m.base.symbol === 'WBNB' && m.quote.symbol === 'USDT') || state.markets[0];
    if (market) await selectMarket(market);
    else { $('status').textContent = '链接交易对未在当前目录中发现，请选择市场'; $('chart-empty').textContent = '请选择市场'; setError('链接中的交易对未在目录中发现，没有自动替换为其他市场。'); showMarkets(); }
  } catch (e) { $('status').textContent = '市场目录不可用'; setError(e.message); }
}
init();
