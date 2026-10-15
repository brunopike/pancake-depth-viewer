import {readSnapshot} from './snapshot-client.mjs';
import {showSnapshotStatus,refreshButtonLabel} from './snapshot-status.mjs';
import {holderCharts} from './holder-charts.mjs';
import {TAG_KEY,TAG_KINDS,validateManual,readManual,rowTags,selectHolders,changePercent,ownershipAmounts} from './holder-model.mjs';
import {HOLDER_SORT_KEYS} from './holder-ranking.mjs';
import {createTagFilter} from './tag-filter-control.mjs';
import {HOLDER_IMPORT} from './holder-labels.mjs';
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(n,d=2)=>Number(n).toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d});
const units=s=>Number(BigInt(s))/1e18,quantity=s=>s==null?'暂缺':number(units(s),2),short=a=>a.slice(0,8)+'…'+a.slice(-6);
const compact=s=>{const n=units(s);return n>=1e8?number(n/1e8)+'亿':n>=1e4?number(n/1e4)+'万':number(n,2);};
const date=s=>new Date(s*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
let report,manual={},page=0,pageSize=100,chartMode='groups',busy=false,pending=null,returnFocus=null,cohort=null,excludeOwn=false;
const mobileExpanded = new Set();
const cohortNames={'held':'持币 · 未见卖出','sold-held':'卖出后仍持币','sold-zero':'卖出后零持仓','zero':'零持仓 · 未见卖出'};
try{manual=readManual(localStorage.getItem(TAG_KEY));}catch{}
function validate(r){if(r?.version!==1||r.token!=='0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d'||!Array.isArray(r.rows)||!r.block)throw new Error('持仓数据格式有误。');return r;}
const tagFilter=createTagFilter({getManual:()=>manual,onChange:()=>{page=0;if($('filter').querySelector('input[value="cleared"]:checked'))$('include-zero').checked=true;render();}});
const selectedFilters=()=>tagFilter.selected(),renderCustomFilters=()=>tagFilter.refresh(),updateFilters=()=>tagFilter.update();
function syncSort(){
 const key=$('sort').value,ascending=$('sort-direction').value==='asc';
 for(const button of document.querySelectorAll('[data-sort]')){
  const selected=button.dataset.sort===key;
  button.setAttribute('aria-pressed',String(selected));button.querySelector('.sort-arrow').textContent=selected?(ascending?'↑':'↓'):'↕';
  button.setAttribute('aria-label',`${button.dataset.label}，${selected&&ascending?'当前升序，点击降序':selected?'当前降序，点击升序':'点击'+(button.dataset.sort==='address'?'升序':'降序')+'排序'}`);
 }
 for(const header of document.querySelectorAll('.holder-table thead th')){const active=header.querySelector('[data-sort][aria-pressed="true"]');header.setAttribute('aria-sort',active?ascending?'ascending':'descending':'none');}
 $('holder-sort-note').textContent=`当前排序：${$('sort').selectedOptions[0].textContent} · ${ascending?'从小到大':'从大到小'}；按完整筛选结果排序，暂缺数据排在末尾。`;
}
function pair(stats,key){return `<span class="buy">买 ${key==='Count'?number(stats.buyCount,0):quantity(stats.buyAmount)}</span><span class="sell">卖 ${key==='Count'?number(stats.sellCount,0):quantity(stats.sellAmount)}</span>`;}
function drawChart(rows){
 const model=holderCharts(rows,manual),{total,count,groups,countGroups,top}=model;
 $('chart').setAttribute('aria-label',`已筛选 ${count} 个有持仓地址，共 ${quantity(total)} ESIM`);
 if(!count){$('chart').innerHTML='<p class="empty">当前筛选没有持仓。</p>';return;}
 const panel=(title,note,body)=>`<section class="distribution-panel"><h3>${title}</h3><p class="distribution-note">${note}</p>${body}</section>`;
 const scope=`<p class="distribution-scope">当前筛选：${number(count,0)} 个有持仓地址 · ${quantity(total)} ESIM${chartMode==='top'&&count<10?' · 前 10 地址仅显示现有 '+count+' 个':''}</p>`;
 if(chartMode==='top'){
  const max=Number(BigInt(top[0].balance));
  const bars=`<div class="rank-bars${top.length>5?' rank-columns':''}" style="--rank-rows:${Math.ceil(top.length/2)}">${top.map((r,i)=>`<div class="rank-row"><span class="bar-rank">${i+1}</span><div class="rank-holder"><a href="https://bscscan.com/address/${escape(r.address)}" target="_blank" rel="noopener noreferrer" title="${escape(r.address)}">${escape(short(r.address))} ↗</a><div class="bar-track"><span style="width:${Number(BigInt(r.balance))/max*100}%"></span></div></div><div class="rank-value"><strong title="${quantity(r.balance)} ESIM">${compact(r.balance)} <small>ESIM</small></strong><span>${number(r.share)}%</span></div></div>`).join('')}</div>`;
  $('chart').innerHTML=scope+panel('持仓排行','横条对比持仓数量；右侧显示占筛选总持仓的比例。',bars);$('chart').querySelector('.distribution-panel').classList.add('rank-panel');return;
 }
 let cursor=0;const stops=groups.map(g=>{const start=cursor;cursor+=Number(BigInt(g.balance))/Number(BigInt(total))*100;return `${g.color} ${start}% ${cursor}%`;});
 const ring=`<div class="holdings-breakdown"><div class="donut" role="img" aria-label="${groups.map(g=>`${g.label} ${number(g.share)}%`).join('，')}" style="background:conic-gradient(${stops.join(',')})"><div class="donut-center"><strong>${compact(total)}</strong><span>筛选持仓 · ESIM</span></div></div><div class="chart-legend">${groups.map(g=>`<div class="legend-row"><i style="background:${g.color}"></i><span>${escape(g.label)}</span><strong>${number(g.share)}%</strong><small>${quantity(g.balance)} ESIM</small></div>`).join('')}</div></div>`;
 const byCount=[...countGroups].sort((a,b)=>b.count-a.count);
 const counts=`<div class="count-bars">${byCount.map(g=>`<div class="count-row"><div><span><i style="background:${g.color}"></i>${escape(g.label)}</span><strong>${number(g.count,0)} <small>个</small><em>${number(g.count/count*100)}%</em></strong></div><div class="bar-track"><span style="background:${g.color};width:${g.count/count*100}%"></span></div></div>`).join('')}</div>${groups.length===1?'<p class="single-group-note">当前筛选只有 1 个分类，因此占比为 100%。可清除标签或搜索条件查看整体分布。</p>':''}`;
 $('chart').innerHTML=scope+panel('持仓占比','已确认的混合持仓按我方 / 外部份额拆分，币量不重复统计。',ring)+panel('地址数量分布','每个地址只计一次；混合归属地址单独列组。',counts);
}
function render(){
 if(!report)return;
 const selected=selectHolders(report,{search:$('search').value,filter:selectedFilters(),cohort,excludeOwn,includeZero:$('include-zero').checked,page,pageSize,sort:$('sort').value,direction:$('sort-direction').value},manual);page=selected.page;syncSort();
 $('filter-context').hidden=!cohort&&!excludeOwn;$('filter-context').textContent=[cohort?`来自合约报告：${cohortNames[cohort]}`:'',excludeOwn?'仅看非我方持仓；混合地址仅显示外部份额':''].filter(Boolean).join(' · ');
 $('cutoff').textContent=`余额截至 ${date(report.cutoff)} · 北京时间 · 区块 ${number(report.block,0)}`;
 $('summary').innerHTML=`<div><span>已索引持币地址</span><strong>${number(report.coverage.holding,0)}</strong><small>含大户名单及已知活跃地址</small></div><div><span>已覆盖总供应量</span><strong>${number(Number(BigInt(report.coverage.balance))/Number(BigInt(report.totalSupply))*100)}%</strong><small>全部供应量 ${compact(report.totalSupply)} ESIM</small></div><div><span>ESIM 参考价格</span><strong>${number(report.price,6)} U</strong><small>Pancake ESIM / USDT</small></div><div><span>24h 对比时点</span><strong>${report.priorCutoff?date(report.priorCutoff):'暂缺'}</strong><small>连续 24 小时的持仓变化</small></div>`;
 $('trade-cutoff').textContent=`24h 买卖 ${date(report.tradeWindowStart)} — ${date(report.tradeCutoff)}；累计自 ${date(report.historyStart)} 起。按交易发起地址统计成交币量，买绿 / 卖红。`;
 $('rows').innerHTML=selected.rows.map((r,i)=>{
  const pct=changePercent(r.balance,r.priorBalance),change=r.change24h,positive=change!==null&&BigInt(change)>0n;
  const tags=rowTags(r,manual);
  const parts=ownershipAmounts(r,manual);
  const splitNote=r.ownershipScope==='external'?`<small>仅外部份额 · 钱包合计 ${quantity(r.walletBalance)}</small>`:parts.mixed?`<small class="holding-split"><span class="own-share">我方 ${quantity(parts.own)}</span><span class="external-share">外部 ${quantity(parts.external)}</span>${parts.needsReview?'<span class="sell">余额低于已确认外部份额，归属需复核；暂不计入我方。</span>':''}</small>`:'';
  const delta=change===null?'暂缺':`${positive?'+':''}${quantity(change)}`;
  return `<tr data-mobile-expanded="${mobileExpanded.has(r.address)}"><th scope="row"><span class="rank">${page*pageSize+i+1}</span><a href="https://bscscan.com/address/${r.address}" target="_blank" rel="noopener noreferrer" title="${r.address}">${short(r.address)} ↗</a><small><button class="tag-edit-button" data-tag="${r.address}">${manual[r.address]?'编辑标签':'加标签'}</button></small></th><td>${tags.length?tags.map(t=>`<span class="tag" data-kind="${escape(t.kind)}" title="${escape(t.evidence)}">${t.manual?'✎ ':''}${escape(t.text)}</span>`).join(''):'<span class="tag">待识别</span>'}${tags.length?`<details class="tag-evidence"><summary>依据</summary>${tags.map(t=>`<p><strong>${escape(t.text)}</strong>：${escape(t.evidence)}</p>`).join('')}</details>`:''}</td><td data-mobile-label="持仓 · ESIM">${quantity(r.balance)}${splitNote}</td><td data-mobile-label="参考价值 · USDT">${number(units(r.balance)*report.price)}</td><td data-mobile-label="占总供应量">${number(Number(BigInt(r.balance))/Number(BigInt(report.totalSupply))*100,4)}%</td><td data-mobile-label="24h 持仓变化 · ESIM" class="${change===null||BigInt(change)===0n?'':positive?'buy':'sell'}">${delta}<small>${pct===null?'历史余额暂缺':pct==='new'?'新增持仓':`${Number(pct)>0?'+':''}${number(pct,2)}%`}</small></td><td data-mobile-label="24h 买卖次数">${pair(r.day,'Count')}</td><td data-mobile-label="24h 买卖币量 · ESIM">${pair(r.day,'Amount')}</td><td data-mobile-label="累计买卖次数">${pair(r.history,'Count')}</td><td data-mobile-label="累计买卖币量 · ESIM">${pair(r.history,'Amount')}</td><td class="mobile-holder-details"><button type="button" class="mobile-holder-toggle" data-mobile-toggle="${escape(r.address)}" aria-expanded="${mobileExpanded.has(r.address)}">${mobileExpanded.has(r.address)?'收起买卖数据':'展开买卖数据'}</button><p class="mobile-full-address">${escape(r.address)}</p></td></tr>`;
 }).join('')||'<tr><td colspan="10" class="empty">没有符合条件的地址。可切换标签，或显示零持仓地址。</td></tr>';
 $('row-count').textContent=`${number(selected.total,0)} 个地址`;$('page').textContent=`${selected.total?page+1:0} / ${Math.ceil(selected.total/pageSize)}`;$('prev').disabled=page===0;$('next').disabled=(page+1)*pageSize>=selected.total;
 $('coverage').innerHTML=`<p>名单来源：<a href="${escape(report.coverage.source)}" target="_blank" rel="noopener noreferrer">OKLink 前 ${report.coverage.seedTop} 名</a>（${escape(report.coverage.seedAt.slice(0,10))}），并补入已知领币、交易、交互地址和新增 ESIM 转账地址。本表是已索引地址排名，不是全链完整持有人名单。余额、24h 变化来自固定区块的链上读取。</p><p>补充名单：${escape(HOLDER_IMPORT.source)}，${escape(date(Date.parse(HOLDER_IMPORT.capturedAt)/1000))}（北京时间），共 ${HOLDER_IMPORT.count} 个地址。同步地址归属及类型；表格持仓快照不覆盖链上余额。标签的“依据”可查看来源。</p>`;
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
 $('tag-confirm').innerHTML=`<p>请核对要${remove?'删除':'保存'}的标签：</p><code>${escape(address)}</code><p>分类：${escape(TAG_KINDS[value.kind])}</p><p>标签：<strong>${escape(value.text)}</strong></p><p>仅保存在当前浏览器。</p>`;$('tag-submit').focus();
}
$('tag-form').addEventListener('submit',e=>{e.preventDefault();$('tag-error').textContent='';try{if(!pending){stageTag();return;}const next={...manual};if(pending.remove)delete next[pending.value.address];else next[pending.value.address]=pending.value;localStorage.setItem(TAG_KEY,JSON.stringify(next));manual=next;const included=report?.rows.some(r=>r.address===pending.value.address),removed=pending.remove;closeTag();renderCustomFilters();updateFilters();$('status').textContent=removed?'标签已删除。':included?'标签已保存到当前浏览器。':'标签已保存；该地址尚未进入当前索引名单。';}catch(e){$('tag-error').textContent=e.name==='QuotaExceededError'?'浏览器存储空间不足，标签未保存。':e.message;}});
$('tag-remove').addEventListener('click',()=>{try{stageTag(true);}catch(e){$('tag-error').textContent=e.message;}});$('tag-cancel').addEventListener('click',closeTag);$('tag-back').addEventListener('click',()=>{pending=null;$('tag-edit').hidden=false;$('tag-confirm').hidden=true;$('tag-back').hidden=true;$('tag-remove').hidden=!manual[$('tag-address').value.toLowerCase()];$('tag-submit').textContent='下一步：核对';});
$('add-tag').addEventListener('click',()=>openTag());$('rows').addEventListener('click',e=>{
 const toggle=e.target.closest('[data-mobile-toggle]');
 if(toggle){const address=toggle.dataset.mobileToggle,open=!mobileExpanded.has(address);if(open)mobileExpanded.add(address);else mobileExpanded.delete(address);toggle.closest('tr').dataset.mobileExpanded=String(open);toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'收起买卖数据':'展开买卖数据';return;}
 const button=e.target.closest('[data-tag]');if(button)openTag(button.dataset.tag);
});

function renderLabelManager(){
 const labels=Object.values(manual).sort((a,b)=>a.text.localeCompare(b.text,'zh-CN')||a.address.localeCompare(b.address));
 $('label-manager-list').innerHTML=labels.length?labels.map(label=>`<article class="managed-label"><div><strong>${escape(label.text)}</strong><small>${escape(TAG_KINDS[label.kind])}</small><code>${escape(label.address)}</code></div><div class="managed-label-actions"><button type="button" data-edit-label="${escape(label.address)}">编辑</button><button type="button" data-delete-label="${escape(label.address)}">删除</button></div></article>`).join(''):'<p class="empty">还没有添加标签。可点“添加标签”给地址添加。</p>';
}
$('manage-tags').addEventListener('click',()=>{renderLabelManager();$('label-manager').showModal();});
$('label-manager-close').addEventListener('click',()=>$('label-manager').close());
$('label-manager-add').addEventListener('click',()=>{$('label-manager').close();openTag();});
$('label-manager-list').addEventListener('click',e=>{const button=e.target.closest('[data-edit-label],[data-delete-label]');if(!button)return;const address=button.dataset.editLabel||button.dataset.deleteLabel;$('label-manager').close();openTag(address);if(button.dataset.deleteLabel)stageTag(true);});
$('search').addEventListener('input',()=>{page=0;render();});$('include-zero').addEventListener('change',()=>{page=0;render();});
$('sort').addEventListener('change',()=>{page=0;render();});$('sort-direction').addEventListener('change',()=>{page=0;render();});
for(const button of document.querySelectorAll('[data-sort]'))button.addEventListener('click',()=>{const key=button.dataset.sort;$('sort-direction').value=$('sort').value===key?$('sort-direction').value==='desc'?'asc':'desc':key==='address'?'asc':'desc';$('sort').value=key;page=0;render();});
$('page-size').addEventListener('change',()=>{pageSize=Number($('page-size').value);page=0;render();});$('prev').addEventListener('click',()=>{page--;render();});$('next').addEventListener('click',()=>{page++;render();});
for(const b of document.querySelectorAll('[data-columns]'))b.addEventListener('click',()=>{$('rows').closest('table').dataset.columns=b.dataset.columns;for(const t of document.querySelectorAll('[data-columns]'))t.setAttribute('aria-pressed',String(t===b));});
$('reset-view').addEventListener('click',()=>{cohort=null;excludeOwn=false;$('search').value='';$('include-zero').checked=false;for(const input of $('filter').querySelectorAll('input'))input.checked=false;updateFilters();});
for(const b of document.querySelectorAll('[data-chart]'))b.addEventListener('click',()=>{chartMode=b.dataset.chart;for(const t of document.querySelectorAll('[data-chart]'))t.setAttribute('aria-pressed',String(t===b));render();});
window.addEventListener('storage',e=>{if(e.key===TAG_KEY){manual=readManual(e.newValue);renderCustomFilters();updateFilters();if($('label-manager').open)renderLabelManager();}});
async function refresh(){
 if(busy)return;busy=true;$('refresh').disabled=true;$('refresh').textContent='正在刷新…';$('status').textContent='正在读取最新持仓…';
 try{const result=await readSnapshot('holders',{current:report});report=validate(result.data);render();
  showSnapshotStatus($('status'),$('refresh'),[['持仓',report],['持仓内交易',{cutoff:report.tradeCutoff}]],{retained:result.source==='retained'});
 }catch(e){$('status').textContent=e.message;$('status').className='notice';if(!report)$('rows').innerHTML='<tr><td colspan="10" class="empty">暂时无法读取持仓，请点击刷新重试。</td></tr>';}
 finally{busy=false;$('refresh').disabled=false;$('refresh').textContent=refreshButtonLabel($('refresh'));}
}
renderCustomFilters();
const query=new URLSearchParams(location.search);
$('search').value=(query.get('search')||'').slice(0,64);
if(HOLDER_SORT_KEYS.includes(query.get('sort')))$('sort').value=query.get('sort');
if(['asc','desc'].includes(query.get('direction')))$('sort-direction').value=query.get('direction');
cohort=Object.hasOwn(cohortNames,query.get('cohort'))?query.get('cohort'):null;
excludeOwn=query.get('scope')==='external';
if(query.get('chart')==='top'){chartMode='top';for(const b of document.querySelectorAll('[data-chart]'))b.setAttribute('aria-pressed',String(b.dataset.chart==='top'));}
$('include-zero').checked=query.get('zero')==='1'||!!cohort?.endsWith('zero');
for(const input of $('filter').querySelectorAll('input'))input.checked=(query.get('tags')||'').split(',').includes(input.value);
updateFilters();
$('refresh').addEventListener('click',refresh);
await refresh();
