import {TAG_KEY,TAG_KINDS,validateManual,readManual,rowTags,selectHolders,groupHolders,changePercent} from './holder-model.mjs';
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CACHE='https://raw.githubusercontent.com/starkweng/pancake-depth-viewer/holder-cache/holders.json';
const number=(n,d=2)=>Number(n).toLocaleString('zh-CN',{maximumFractionDigits:d});
const units=s=>Number(BigInt(s))/1e18,quantity=s=>s==null?'暂缺':number(units(s),4),short=a=>a.slice(0,8)+'…'+a.slice(-6);
const compact=s=>{const n=units(s);return n>=1e8?number(n/1e8)+'亿':n>=1e4?number(n/1e4)+'万':number(n,2);};
const date=s=>new Date(s*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
let report,manual={},page=0,pageSize=100,chartMode='groups',busy=false,pending=null,returnFocus=null;
try{manual=readManual(localStorage.getItem(TAG_KEY));}catch{}
function validate(r){if(r?.version!==1||r.token!=='0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d'||!Array.isArray(r.rows)||!r.block)throw new Error('持仓数据格式有误。');return r;}
async function json(url,options={}){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(25000),...options});if(!r.ok){let body;try{body=await r.json();}catch{}throw new Error(body?.message||'数据暂时无法读取。');}return r.json();}
function pair(stats,key){return `<span class="buy">买 ${key==='Count'?number(stats.buyCount,0):quantity(stats.buyAmount)}</span><span class="sell">卖 ${key==='Count'?number(stats.sellCount,0):quantity(stats.sellAmount)}</span>`;}
function drawChart(rows){
 const total=rows.reduce((n,r)=>n+BigInt(r.balance),0n);$('chart').setAttribute('aria-label',`已筛选 ${rows.length} 个地址，共 ${quantity(total.toString())} ESIM`);
 if(total===0n){$('chart').innerHTML='<p class="empty">当前筛选没有持仓。</p>';return;}
 if(chartMode==='top'){
  const top=rows.filter(r=>BigInt(r.balance)>0n).slice(0,10),max=Number(BigInt(top[0].balance));
  $('chart').innerHTML=`<div class="top-bars">${top.map(r=>`<div class="bar-row"><a href="https://bscscan.com/address/${r.address}" target="_blank" rel="noopener noreferrer" title="${r.address}">${short(r.address)}</a><div class="bar-track"><span style="width:${Math.max(.4,Number(BigInt(r.balance))/max*100)}%"></span></div><strong title="${quantity(r.balance)} ESIM">${compact(r.balance)}</strong></div>`).join('')}</div>`;return;
 }
 const groups=groupHolders(rows,manual);let cursor=0;const stops=groups.map(g=>{const start=cursor;cursor+=Number(BigInt(g.balance))/Number(total)*100;return `${g.color} ${start}% ${cursor}%`;});
 $('chart').innerHTML=`<div class="donut" style="background:conic-gradient(${stops.join(',')})"><div class="donut-center"><strong>${compact(total.toString())}</strong><span>已筛选持仓 ESIM</span></div></div><div class="chart-legend">${groups.map(g=>`<div class="legend-row"><i style="background:${g.color}"></i><span>${g.label}</span><strong>${number(Number(BigInt(g.balance))/Number(total)*100)}%</strong><small>${quantity(g.balance)} ESIM</small></div>`).join('')}</div>`;
}
function render(){
 if(!report)return;
 const selected=selectHolders(report,{search:$('search').value,filter:$('filter').value,includeZero:$('include-zero').checked,page,pageSize},manual);page=selected.page;
 $('cutoff').textContent=`余额截至 ${date(report.cutoff)} · 北京时间 · 区块 ${number(report.block,0)}`;
 $('summary').innerHTML=`<div><span>已索引持币地址</span><strong>${number(report.coverage.holding,0)}</strong><small>含大户名单及已知活跃地址</small></div><div><span>已覆盖总供应量</span><strong>${number(Number(BigInt(report.coverage.balance))/Number(BigInt(report.totalSupply))*100)}%</strong><small>全部供应量 ${compact(report.totalSupply)} ESIM</small></div><div><span>ESIM 参考价格</span><strong>${number(report.price,6)} U</strong><small>Pancake ESIM / USDT</small></div><div><span>24h 对比时点</span><strong>${report.priorCutoff?date(report.priorCutoff):'暂缺'}</strong><small>连续 24 小时的持仓变化</small></div>`;
 $('trade-cutoff').textContent=`24h 买卖 ${date(report.tradeWindowStart)} — ${date(report.tradeCutoff)}；累计自 ${date(report.historyStart)} 起。按交易发起地址统计成交币量，买绿 / 卖红。`;
 $('rows').innerHTML=selected.rows.map((r,i)=>{
  const pct=changePercent(r.balance,r.priorBalance),change=r.change24h,positive=change!==null&&BigInt(change)>0n;
  const tags=rowTags(r,manual);
  const delta=change===null?'暂缺':`${positive?'+':''}${quantity(change)}`;
  return `<tr><th scope="row"><span class="rank">${page*pageSize+i+1}</span><a href="https://bscscan.com/address/${r.address}" target="_blank" rel="noopener noreferrer" title="${r.address}">${short(r.address)} ↗</a><small><button class="tag-edit-button" data-tag="${r.address}">${manual[r.address]?'编辑标记':'标记'}</button></small></th><td>${tags.length?tags.map(t=>`<span class="tag" data-kind="${escape(t.kind)}" title="${escape(t.evidence)}">${t.manual?'✎ ':''}${escape(t.text)}</span>`).join(''):'<span class="tag">待识别</span>'}${tags.length?`<details class="tag-evidence"><summary>依据</summary>${tags.map(t=>`<p><strong>${escape(t.text)}</strong>：${escape(t.evidence)}</p>`).join('')}</details>`:''}</td><td>${quantity(r.balance)}</td><td>${number(units(r.balance)*report.price)}</td><td>${number(Number(BigInt(r.balance))/Number(BigInt(report.totalSupply))*100,4)}%</td><td class="${change===null||BigInt(change)===0n?'':positive?'buy':'sell'}">${delta}<small>${pct===null?'历史余额暂缺':pct==='new'?'新增持仓':`${Number(pct)>0?'+':''}${number(pct,2)}%`}</small></td><td>${pair(r.day,'Count')}</td><td>${pair(r.day,'Amount')}</td><td>${pair(r.history,'Count')}</td><td>${pair(r.history,'Amount')}</td></tr>`;
 }).join('')||'<tr><td colspan="10" class="empty">没有符合条件的地址。可切换标签，或显示零持仓地址。</td></tr>';
 $('row-count').textContent=`${number(selected.total,0)} 个地址`;$('page').textContent=`${selected.total?page+1:0} / ${Math.ceil(selected.total/pageSize)}`;$('prev').disabled=page===0;$('next').disabled=(page+1)*pageSize>=selected.total;
 $('coverage').innerHTML=`<p>名单来源：<a href="${escape(report.coverage.source)}" target="_blank" rel="noopener noreferrer">OKLink 前 ${report.coverage.seedTop} 名</a>（${escape(report.coverage.seedAt.slice(0,10))}），并补入已知领币、交易、交互地址和新增 ESIM 转账地址。本表是已索引地址排名，不是全链完整持有人名单。余额、24h 变化来自固定区块的链上读取。</p>`;
 drawChart(selected.all);
}
function openTag(address=''){
 returnFocus=document.activeElement;pending=null;$('tag-form').reset();$('tag-address').value=address;$('tag-kind').value=manual[address]?.kind||'own';$('tag-text').value=manual[address]?.text||'';
 $('tag-edit').hidden=false;$('tag-confirm').hidden=true;$('tag-back').hidden=true;$('tag-error').textContent='';$('tag-submit').textContent='下一步：核对';$('tag-remove').hidden=!manual[address];$('tag-dialog').showModal();(address?$('tag-text'):$('tag-address')).focus();
}
function closeTag(){$('tag-dialog').close();pending=null;returnFocus?.focus();}
function stageTag(remove=false){
 const address=$('tag-address').value.trim().toLowerCase();
 const value=validateManual({address,kind:$('tag-kind').value,text:$('tag-text').value});
 pending={value,remove};$('tag-edit').hidden=true;$('tag-confirm').hidden=false;$('tag-back').hidden=false;$('tag-remove').hidden=true;$('tag-submit').textContent=remove?'确认删除':'确认保存';
 $('tag-confirm').innerHTML=`<p>请核对要${remove?'删除':'保存'}的标记：</p><code>${escape(address)}</code><p>分类：${escape(TAG_KINDS[value.kind])}</p><p>标签：<strong>${escape(value.text)}</strong></p><p>仅保存在当前浏览器。</p>`;$('tag-submit').focus();
}
$('tag-form').addEventListener('submit',e=>{e.preventDefault();$('tag-error').textContent='';try{if(!pending){stageTag();return;}const next={...manual};if(pending.remove)delete next[pending.value.address];else next[pending.value.address]=pending.value;localStorage.setItem(TAG_KEY,JSON.stringify(next));manual=next;const included=report?.rows.some(r=>r.address===pending.value.address);closeTag();render();$('status').textContent=included?'手动标记已保存到当前浏览器。':'标记已保存；该地址尚未进入当前索引名单。';}catch(e){$('tag-error').textContent=e.name==='QuotaExceededError'?'浏览器存储空间不足，标签未保存。':e.message;}});
$('tag-remove').addEventListener('click',()=>{try{stageTag(true);}catch(e){$('tag-error').textContent=e.message;}});$('tag-cancel').addEventListener('click',closeTag);$('tag-back').addEventListener('click',()=>{pending=null;$('tag-edit').hidden=false;$('tag-confirm').hidden=true;$('tag-back').hidden=true;$('tag-remove').hidden=!manual[$('tag-address').value.toLowerCase()];$('tag-submit').textContent='下一步：核对';});
$('add-tag').addEventListener('click',()=>openTag());$('rows').addEventListener('click',e=>{const button=e.target.closest('[data-tag]');if(button)openTag(button.dataset.tag);});
$('search').addEventListener('input',()=>{page=0;render();});$('filter').addEventListener('change',()=>{page=0;if(['cleared','received-zero'].includes($('filter').value))$('include-zero').checked=true;render();});$('include-zero').addEventListener('change',()=>{page=0;render();});$('page-size').addEventListener('change',()=>{pageSize=Number($('page-size').value);page=0;render();});$('prev').addEventListener('click',()=>{page--;render();});$('next').addEventListener('click',()=>{page++;render();});
for(const b of document.querySelectorAll('[data-chart]'))b.addEventListener('click',()=>{chartMode=b.dataset.chart;for(const t of document.querySelectorAll('[data-chart]'))t.setAttribute('aria-pressed',String(t===b));render();});
window.addEventListener('storage',e=>{if(e.key===TAG_KEY){manual=readManual(e.newValue);render();}});
async function refresh(){
 if(busy)return;busy=true;$('refresh').disabled=true;$('status').textContent='正在读取最新持仓快照…';
 try{let next;try{next=await json(`${CACHE}?t=${Date.now()}`);}catch{next=await json('./data/esim-holders.json');}
  validate(next);if(!report||next.block>=report.block)report=next;render();
  const stale=Date.now()/1000-report.cutoff>7200;
  $('status').textContent=`${stale?'快照较早':'已更新快照'} · ${date(report.cutoff)}。后台每小时查询 ESIM；按钮读取最近结果。`;
 }catch(e){$('status').textContent=`${e.name==='TimeoutError'?'查询超时，请稍后重试。':e.message}${report?' 保留上次数据。':''}`;if(!report)$('rows').innerHTML='<tr><td colspan="10" class="empty">暂时无法读取持仓，请点击刷新重试。</td></tr>';}
 finally{busy=false;$('refresh').disabled=false;}
}
$('refresh').addEventListener('click',refresh);
await refresh();
