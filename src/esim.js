import {readSnapshot,readTradingReport} from './snapshot-client.mjs';
import {esimEndpoint} from './site-runtime.mjs';
import {showSnapshotStatus,refreshButtonLabel} from './snapshot-status.mjs';
import {holderInsights,holderViewURL} from './holder-insights.mjs';
import {TAG_KEY,readManual} from './holder-model.mjs';
import {isSourceInflowAligned} from '../server/esim/source-inflows.mjs';
const $ = id => document.getElementById(id);
const names = { source_recipients: '曾领币地址', other_wallet_candidates: '其他钱包', remaining_unattributed: '合约及待核对交易', all_pools: '合计' };
const groups = Object.keys(names);
const fmt = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });
const integer = n => new Intl.NumberFormat('zh-CN').format(n ?? 0);
const date = s => new Date(s * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const amount = (wei, scale = 10000, decimals = 2) => {
  if (wei == null) return '待核验';
  const n = BigInt(wei), d = BigInt(scale) * 10n ** 18n, f = 10n ** BigInt(decimals);
  const rounded = ((n < 0n ? -n : n) * f + d / 2n) / d;
  return `${n < 0n ? '−' : ''}${new Intl.NumberFormat('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number(rounded) / Number(f))}`;
};
const net = wei => { if (wei == null) return '待核验'; const n = BigInt(wei); return `<strong class="${n > 0n ? 'sell' : 'buy'}">${n > 0n ? '卖出' : n < 0n ? '买入' : '持平'} ${amount(n < 0n ? -n : n)}</strong>`; };
const metric = (label, value, unit = '', sub = '', cls = '') => `<div class="metric ${cls}"><span>${label}</span><strong>${value}${unit ? `<em>${unit}</em>` : ''}</strong><small>${sub}</small></div>`;
const addresses = (g, side) => `${g[side + '_addresses_lower_bound'] ? '≥' : ''}${integer(g[side + '_addresses'])}`;
let report, holderReport, active = 'today', busy = false, endpoint = null, manual={};
try{manual=readManual(localStorage.getItem(TAG_KEY));}catch{}
const openLink=(url,text)=>`<a href="${escape(url)}" target="_top" rel="noopener noreferrer">${text} →</a>`;
function holdingsBridge(){
 if(!holderReport){$('holdings-bridge').innerHTML='<p class="empty">持仓摘要暂缺，点击刷新重试。</p>';return;}
 const x=holderInsights(holderReport,manual),share=x.total==='0'?0:Number(BigInt(x.own))/Number(BigInt(x.total))*100;
 const stateRows=x.states.map(state=>`<a class="receipt-state" href="${escape(holderViewURL({cohort:state.id,zero:state.id.endsWith('zero')}))}" target="_top" rel="noopener noreferrer"><span>${state.label}</span><strong>${integer(state.count)} <small>地址</small></strong><span class="state-track"><i style="width:${x.receivedCount?state.count/x.receivedCount*100:0}%"></i></span><em>${amount(state.balance)} 万 ESIM →</em></a>`).join('');
 $('holdings-bridge').innerHTML=`<div class="table-heading"><div><h2>当前持仓</h2><p>余额截至 ${date(x.cutoff)} · 独立于下方交易时段</p></div>${openLink(holderViewURL(),'持币明细')}</div><div class="holdings-body"><div class="inventory-view"><div class="inventory-metrics">${metric('我方钱包持仓',amount(x.own),'万 ESIM',openLink(holderViewURL({tags:['own']}),integer(x.ownCount)+' 个有持仓地址'))}${metric('领币地址仍持有',amount(x.received),'万 ESIM',openLink(holderViewURL({tags:['received'],zero:true}),integer(x.receivedCount)+' 个已索引领币地址'))}${metric('分发合约余额',amount(x.source),'万 ESIM',openLink(holderViewURL({search:'0x67b97c3845438f264965ca154ba13051c6c73416',zero:true}),'查看合约'))}${metric('非我方钱包持仓',amount(x.external),'万 ESIM',openLink(holderViewURL({excludeOwn:true}),'查看地址'))}${metric('高频 / 套利地址持仓',amount(x.robots.balance),'万 ESIM',openLink(holderViewURL({tags:['frequency','arbitrage']}),integer(x.robots.count)+' 个有持仓地址 · 含疑似'))}${metric('非我方前十持仓占比',x.externalTop10===null?'—':fmt.format(x.externalTop10)+'%','',openLink(holderViewURL({excludeOwn:true,chart:'top'}),'查看集中度'))}</div><div class="ownership-track" role="img" aria-label="已索引持仓中我方占 ${fmt.format(share)}%"><i style="width:${share}%"></i></div><p class="muted compact-note">已索引持仓：我方 ${fmt.format(share)}% · 其余 ${fmt.format(100-share)}% · 钱包余额，不含池内 LP</p></div><div class="receipt-view"><h3>领币后的当前状态</h3>${stateRows}<p class="muted compact-note">零持仓也可能由转出造成${x.manualCount?' · 含当前浏览器的手动标签':''}</p></div></div>`;
}


function tradeTable(w) {
  return `<section class="card"><div class="section-heading"><h3>谁在买卖</h3><span>万 ESIM</span></div><div class="table-scroll"><table class="trade-table"><thead><tr><th>地址类别</th><th>卖出量</th><th>买入量</th><th>净数额</th></tr></thead><tbody>${groups.map(key => {
    const g = w.groups[key];
    const detail = key === 'remaining_unattributed' ? (w.executionBreakdown || []).map(g => `<tr class="execution-row"><th>${escape(g.label)}${g.examples?.length ? `<details class="execution-evidence"><summary>地址与依据 · ${integer(g.path_addresses)} 个路径地址</summary>${g.examples.map(r => `<p><a href="https://bscscan.com/address/${escape(r.address)}" target="_blank" rel="noopener noreferrer">${escape(r.label)} · ${r.address.slice(0,8)}…${r.address.slice(-6)} ↗</a><small>${r.sourceURL ? `<a href="${escape(r.sourceURL)}" target="_blank" rel="noopener noreferrer">${escape(r.source)}</a>` : escape(r.source)}</small></p>`).join('')}</details>` : ''}</th>${[['sell','sold_wei'],['buy','bought_wei']].map(([side,field]) => `<td><strong>${amount(g[field])}</strong><small>${integer(g[side+'_txs'])} 笔</small></td>`).join('')}<td>${net(g.net_sold_wei)}</td></tr>`).join('') : '';
    return `<tr class="${key === 'all_pools' ? 'total' : ''}"><th>${names[key]}${key === 'other_wallet_candidates' ? '<small class="group-note">包含我方钱包</small>' : ''}</th>${[['sell', 'sold_wei'], ['buy', 'bought_wei']].map(([side, field]) => `<td><strong>${amount(g[field])}</strong><small>${addresses(g, side)} 地址 · ${integer(g[side + '_txs'])} 笔</small></td>`).join('')}<td>${net(g.net_sold_wei)}</td></tr>${detail}`;
  }).join('')}</tbody></table></div><p class="note">≥ 表示已识别地址下限。${w.executionBreakdown?.length ? '路由是交易通道，不代表平台自己买卖；高频仅表示交易次数。' : ''}</p></section>`;
}
function chart(hours) {
  const values = hours.filter(h => h.available).map(h => Math.abs(Number(h.net_sold_wei) / 1e18));
  const max = Math.max(...values, 1);
  return `<details class="card disclosure" open><summary>逐小时净买卖<span>北京时间</span></summary><div class="detail-body"><div class="chart-scroll"><div class="chart" style="--bars:${hours.length}">${hours.map(h => {
    const value = Number(h.net_sold_wei) / 1e18, label = `${date(h.start)} · ${h.available ? (value > 0 ? '卖出 ' : '买入 ') + amount(h.net_sold_wei.replace('-', '')) + ' 万 ESIM' : '尚无数据'}`;
    return `<button class="bar-col" type="button" data-detail="${escape(label)}" aria-label="${escape(label)}"><span class="plot">${h.available ? `<i class="bar ${value >= 0 ? 'positive' : 'negative'}" style="height:${Math.max(value ? 1 : 0, Math.abs(value) / max * 72)}px"></i>` : '<i class="missing-bar"></i>'}</span><span class="hour">${new Date((h.start + 28800) * 1000).getUTCHours().toString().padStart(2, '0')}:00</span></button>`;
  }).join('')}</div></div><p class="chart-readout muted">红色：净卖出　绿色：净买入 · 点击看数值</p></div></details>`;
}
function operations(w) {
  const b = w.bnb, d = w.distribution, i = w.interaction;
  return `<details class="card disclosure" open><summary>分发与合约交互<span>地址 · 数量 · BNB</span></summary><div class="detail-body"><div class="ops-grid">${metric('分发数量', amount(d.total_wei), '万 ESIM', integer(d.transactions) + ' 笔')}${metric('接收分发地址', integer(d.recipients), '', '首次接收 ' + integer(d.new_recipients))}${metric('成功交互地址', integer(i.successful_addresses), '', integer(i.successful_calls) + ' 次成功调用')}${metric('BNB 直接入金', amount(b.direct_inflow_wei, 1, 3), 'BNB', integer(b.direct_inflow_addresses) + ' 地址')}</div><table class="cumulative-summary"><thead><tr><th>BNB 收支</th><th>金额（BNB）</th></tr></thead><tbody>${[['直接流入', b.direct_inflow_wei], ['内部流入', b.internal_inflow_wei], ['全量支出', b.outflow_wei], ['净流入', b.net_inflow_wei], ['期初余额', b.balance_start_wei], ['期末余额', b.balance_end_wei]].map(([name, value]) => `<tr><th>${name}</th><td>${amount(value, 1, 3)}</td></tr>`).join('')}</tbody></table></div></details>`;
}
function claimFlowCard(w){
 const f=w.claimFlow;
 if(!f)return '<section class="card claim-flow"><div class="section-heading"><h3>分发币跨地址卖出</h3><span>数据待核验</span></div><p class="note">转手追踪数据尚未就绪。下方“曾领币地址”仍显示该地址的成交量，不能视作原分发币的卖出数量。</p></section>';
 const link=a=>`<a href="https://bscscan.com/address/${escape(a)}" target="_blank" rel="noopener noreferrer">${escape(a.slice(0,8))}…${escape(a.slice(-6))} ↗</a>`;
 const paths=f.examples.slice(0,10).map(r=>`<tr><th>${link(r.address)}</th><td>${amount(r.amount)}</td><td class="claim-path">${r.example?r.example.path.map(link).join(' <span>→</span> '):'路径样例暂缺'}${r.example?.truncated?'<small>显示末段路径</small>':''}</td><td><a href="https://bscscan.com/tx/${escape(r.tx)}" target="_blank" rel="noopener noreferrer">查看交易 ↗</a></td></tr>`).join('');
 return `<section class="card claim-flow"><div class="section-heading"><h3>分发币跨地址卖出 · 估算</h3><span>万 ESIM</span></div><div class="claim-flow-grid">${metric('已识别分发币卖出',amount(f.sold_wei),'万 ESIM',integer(f.transactions)+' 笔卖出')}${metric('原领币地址直接卖出',amount(f.direct_wei),'万 ESIM')}${metric('转手后卖出',amount(f.relay_wei),'万 ESIM',integer(f.relayAddresses)+' 个出币地址')}${metric('入池待核对',f.pending_wei===null?'待核验':amount(f.pending_wei,1),'ESIM',integer(f.pendingTransactions)+' 笔复杂入池')}</div><p class="note">追踪截至 ${date(f.cutoff)}${f.cutoff<w.availableThrough?'，早于本页成交数据截止时间':''}。混币按转出前余额比例估算；A→B→C 只计最后卖出，普通转账不计卖出。复杂 LP 路径列为待核对；${f.complete?'当前覆盖时段内没有待核对入池。':'已识别数量不含待核对入池。'}</p>${paths?`<details class="disclosure"><summary>转手卖出地址与路径样例<span>${integer(f.relayAddresses)} 个出币地址</span></summary><div class="detail-body"><p class="muted compact-note">按地址累计估算量排序，展示前 10 个；每行是一条路径样例，不代表该地址全部资金，也不证明地址属于同一人。</p><div class="table-scroll"><table class="claim-path-table"><thead><tr><th>卖出出币地址</th><th>转手卖出（万 ESIM）</th><th>路径样例</th><th>卖出交易</th></tr></thead><tbody>${paths}</tbody></table></div></div></details>`:''}</section>`;
}
function panel(key, w) {
  const title = key === 'today' ? '今日·0点到现在' : '昨日 · 24 小时';
  const heading = `<div class="period-heading"><h2>${title}</h2><p>${date(w.start)} — ${w.available ? date(key === 'today' ? w.availableThrough : w.end) : '等待更新'}<span>北京时间</span></p>${openLink(`./esim-addresses.html?period=${key}`,'查看卖出排名')}</div>`;
  if (!w.available) return heading + '<div class="empty">这个时段还没有更新的数据，请点击“刷新数据”。</div>';
  const g = w.groups.all_pools, b = w.bnb, d = w.distribution;
  return heading + `<div class="hero-grid">${metric('BNB 入金', amount(b.direct_inflow_wei, 1, 3), 'BNB', `${integer(b.direct_inflow_addresses)} 地址 · ${integer(b.direct_inflow_txs)} 笔`)}${metric('分发收币', amount(d.total_wei), '万 ESIM', `${integer(d.recipients)} 地址 · ${integer(d.transactions)} 笔`)}${metric('卖出总量', amount(g.sold_wei), '万 ESIM', integer(g.sell_txs) + ' 笔', 'sell')}${metric('买入总量', amount(g.bought_wei), '万 ESIM', integer(g.buy_txs) + ' 笔', 'buy')}${metric('净数额', net(g.net_sold_wei), '万 ESIM')}${metric('卖出地址', addresses(g, 'sell'), '', `曾领币 ${addresses(w.groups.source_recipients, 'sell')} 个`)}</div>${claimFlowCard(w)}${tradeTable(w)}${chart(report.hourly[key])}${operations(w)}`;
}
function render(r) {
  report = r;
  const naturalDay = Math.floor((Date.now() / 1000 + 28800) / 86400);
  const reportDay = Math.floor((r.windows.today.start + 28800) / 86400);
  $('tab-today').textContent = reportDay === naturalDay ? '今日·0点到现在' : `${date(r.windows.today.start).slice(0, 10)}（保存）`;
  $('tab-yesterday').textContent = reportDay === naturalDay ? '昨日 · 24 小时' : `${date(r.windows.yesterday.start).slice(0, 10)} · 24 小时`;
  $('cutoff').textContent = `数据截至 ${date(r.cutoff)} · 北京时间`;
  const w = r.windows.history, g = w.groups.source_recipients;
  const incoming=r.sourceInflow;
  const aligned=isSourceInflowAligned(incoming,r);
  const inflow=metric('分发合约累计转入',aligned?amount(incoming.total_wei):'待同步',aligned?'万 ESIM':'',aligned?`${integer(incoming.transfer_events)} 条非零转入 · Transfer 逐笔累计<br>截至 ${date(r.cutoff)} · 区块 ${integer(r.block)}<br>含回流和重复转入；余额仅作核对`:`${incoming?`转入已核验至 ${date(incoming.cutoff)}<br>`:''}正在补齐到分发账同一区块，完成后显示累计转入。`);
  const cumulative = metric('累计交互地址', integer(w.interaction.successful_addresses)) + metric('累计收币地址', integer(w.distribution.recipients)) + metric('曾领币卖出地址', addresses(g, 'sell')) + metric('累计直接入金', amount(w.bnb.direct_inflow_wei, 1, 3), 'BNB') + inflow + metric('累积分发', amount(w.distribution.total_wei), '万 ESIM',`${integer(w.distribution.transfer_events)} 条非零转出 · Transfer 逐笔累计<br>截至 ${date(r.cutoff)} · 区块 ${integer(r.block)}<br>含回流后再次分发，不等同于外部净流通量`) + metric('已识别分发币卖出（估算）', amount(w.claimFlow?.sold_wei), '万 ESIM',w.claimFlow?`含转手 ${amount(w.claimFlow.relay_wei)} 万 · 待核对 ${amount(w.claimFlow.pending_wei,1)} ESIM`:'转手追踪数据待核验');
  for (const key of ['today', 'yesterday']) $('panel-' + key).innerHTML = panel(key, r.windows[key]);
  $('cumulative-overview').innerHTML = `<div class="cum-caption"><strong>累计概览</strong><span>${date(r.origin)} 起</span></div><div class="cum-grid">${cumulative}</div>`;
  $('panel-history').innerHTML = `<div class="period-heading"><h2>历史累计</h2><p>${date(r.origin)} — ${date(r.cutoff)}</p></div>${claimFlowCard(w)}${tradeTable(w)}${operations(w)}<section class="card"><div class="section-heading"><h3>每日历史</h3><span>万 ESIM · 北京时间</span></div><div class="table-scroll"><table class="history-table"><thead><tr><th>日期</th><th>BNB 入金</th><th>合约交互</th><th>分发</th><th>卖出</th><th>买入</th><th>净数额</th></tr></thead><tbody>${r.history.map(d => `<tr data-date="${d.date}"><th><button type="button" class="day-button" data-day="${d.date}" aria-expanded="false" aria-controls="day-${d.date}">${d.date} ＋</button><small>${d.partialFirstDay ? '09:59:50 起' : d.end - d.start < 86400 ? '截至 ' + date(d.end).slice(-5) : '完整自然日'}</small></th><td>${amount(d.bnb.direct_inflow_wei, 1, 3)}<small>${integer(d.bnb.direct_inflow_addresses)} 地址 · ${integer(d.bnb.direct_inflow_txs)} 笔</small></td><td>${integer(d.interaction.successful_calls)}<small>${integer(d.interaction.successful_addresses)} 地址</small></td><td>${amount(d.distribution.total_wei)}<small>${integer(d.distribution.recipients)} 地址 · ${integer(d.distribution.transactions)} 笔</small></td><td>${amount(d.groups.all_pools.sold_wei)}<small>${addresses(d.groups.all_pools, 'sell')} 地址</small></td><td>${amount(d.groups.all_pools.bought_wei)}<small>${addresses(d.groups.all_pools, 'buy')} 地址</small></td><td>${net(d.groups.all_pools.net_sold_wei)}</td></tr><tr class="day-detail" id="day-${d.date}" hidden><td colspan="7"><div>${claimFlowCard(d)}${tradeTable(d)}${operations(d)}</div></td></tr>`).join('')}</tbody></table></div></section>`;
  $('coverage').textContent = `覆盖 ${r.coverage?.poolCount ?? '—'} 个已核验 ESIM 池，不含 CEX。区块 ${integer(r.block)}。`;
  $('top-addresses').innerHTML = `<div class="top-table"><h4>曾领币地址 · 累计卖出前三</h4><table class="trade-table"><thead><tr><th>地址</th><th>领取（万）</th><th>卖出（万）</th><th>余额（万）</th></tr></thead><tbody>${r.top.map(a => `<tr><th><a href="https://bscscan.com/address/${escape(a.address)}" target="_blank" rel="noopener noreferrer">${a.address.slice(0, 10)}…${a.address.slice(-6)} ↗</a></th><td>${amount(a.received_wei)}</td><td>${amount(a.sold_wei)}</td><td>${amount(holderReport?.rows.find(r=>r.address===a.address)?.balance??a.balance_wei)}<small>${holderReport?.rows.some(r=>r.address===a.address)?date(holderReport.cutoff):date(report.cutoff)}</small></td></tr>`).join('')}</tbody></table></div>`;
  document.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => {
    const row = $('day-' + button.dataset.day), opened = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!opened)); row.hidden = opened; button.textContent = button.dataset.day + (opened ? ' ＋' : ' −');
  }));
  document.querySelectorAll('.bar-col').forEach(button => {
    const show = () => { button.closest('.detail-body').querySelector('.chart-readout').textContent = button.dataset.detail; };
    button.addEventListener('click', show); button.addEventListener('focus', show); button.addEventListener('mouseenter', show);
  });
  holdingsBridge();
  selectTab(active);
}
function selectTab(key, focus = false) {
  active = key;
  for (const k of ['today', 'yesterday', 'history']) { const tab = $('tab-' + k); tab.setAttribute('aria-selected', String(k === key)); tab.tabIndex = k === key ? 0 : -1; $('panel-' + k).hidden = k !== key; }
  if (focus) $('tab-' + key).focus();
}
const tabs = ['today', 'yesterday', 'history'];
tabs.forEach((key, i) => { $('tab-' + key).addEventListener('click', () => selectTab(key)); $('tab-' + key).addEventListener('keydown', e => {
  const j = e.key === 'ArrowRight' ? (i + 1) % 3 : e.key === 'ArrowLeft' ? (i + 2) % 3 : e.key === 'Home' ? 0 : e.key === 'End' ? 2 : null;
  if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
}); });
async function json(url, options = {}) {
  const response = await fetch(url, { cache: 'no-store', ...options });
  let body; try { body = await response.json(); } catch { throw new Error('数据暂时无法读取，请稍后重试。'); }
  if (!response.ok) throw new Error(body.message || '查询暂时不可用，保留上次数据。');
  return body;
}
async function refresh(live=true) {
  if(busy)return;busy=true;$('refresh').disabled=true;$('refresh').textContent='正在刷新…';$('status').textContent='正在读取交易和持仓…';$('status').className='working';
  try{
    const trading=()=>readTradingReport({current:report,live:!!endpoint&&live,queryLive:endpoint?async()=>{const result=await json(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(260000)});if(!result.report)throw Error('交易查询未返回完整数据。');return result.report;}:null});
    const [trades,holders]=await Promise.allSettled([trading(),readSnapshot('holders',{current:holderReport})]);
    if(holders.status==='fulfilled')holderReport=holders.value.data;
    if(trades.status==='fulfilled'&&(!report||trades.value.data.block>=report.block))render(trades.value.data);else if(report)holdingsBridge();
    if(!report)throw Error('交易数据暂时无法读取，请重试。');
    const retained=trades.status==='rejected'||trades.value.source==='retained'||holders.status==='rejected'||holders.value.source==='retained';
    showSnapshotStatus($('status'),$('refresh'),[['交易',report],['持仓',holderReport]],{retained});
  }catch(e){$('status').textContent=e.message;$('status').className='notice';}
  finally{busy=false;$('refresh').disabled=false;$('refresh').textContent=refreshButtonLabel($('refresh'));}
}
$('refresh').addEventListener('click',refresh);
window.addEventListener('storage',e=>{if(e.key===TAG_KEY){manual=readManual(e.newValue);holdingsBridge();}});
try{
 const config=await json('./data/esim-config.json');endpoint=esimEndpoint(config);
}catch{}
await refresh(false);
