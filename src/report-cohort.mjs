import {cohortPathSummary,cohortTrackingNote} from './cohort-paths.mjs';
import {reportAmount as amount} from './report-number.mjs';
const integer=n=>Number(n||0).toLocaleString('en-US');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Date(s*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const link=a=>`<a class="cohort-address" href="https://bscscan.com/address/${escape(a)}" target="_blank" rel="noopener noreferrer">${escape(a)} ↗</a>`;
export function renderCohort(snapshot,reportCutoff){
 const c=snapshot?.external;
 if(!c)return '<div class="cohort-pending"><h3>外部地址当前余额</h3><p>正在按完整我方地址库重新核验外部范围；含我方的旧汇总已撤下，不作为外部数据展示。</p></div>';
 const tracking=cohortPathSummary(c.rows);
 return `<div class="cohort-head"><div><h3>外部地址当前持仓</h3><p>${integer(c.addressCount)} 个已索引外部地址 · ${integer(c.holdingCount)} 个当前有余额</p></div><span>每小时核验 · 同一区块<br>${date(c.cutoff)} · ${integer(c.throughBlock)}</span></div>
 <div class="cohort-metrics cohort-external-metrics"><div class="cohort-metric"><span>外部钱包当前持有</span><strong>${amount(c.balance_wei)} <em>ESIM</em></strong><p>${integer(c.holdingCount)} 个地址有余额</p><small>已剔除我方、活动预留和底池；混合钱包仅计已确认外部份额。</small></div>
 <div class="cohort-metric cohort-breakdown"><span>外部持仓构成</span><dl><div><dt>直接交互 / 领币地址</dt><dd>${amount(c.direct_balance_wei)} <em>ESIM</em></dd></div><div><dt>下游地址</dt><dd>${amount(c.downstream_balance_wei)} <em>ESIM</em></dd></div><div><dt>其他外部地址</dt><dd>${amount(c.other_balance_wei)} <em>ESIM</em></dd></div></dl><small>三项互不重复，合计等于左侧外部钱包当前持有量。</small></div></div>
 <p class="cohort-note">按现有地址库排除 ${integer(c.ownExcludedCount)} 个我方地址（包含 ${integer(c.mmExcludedCount)} 个做市 / 执行钱包及新补充的 0x857627…49e601）；另排除活动预留和已知资金池；其余按外部统计。公共路由仅作为下游追踪边界。${c.cutoff<reportCutoff?'本组余额按上述区块核验，早于页面交易截止时间。':''}</p>
 <p class="cohort-note">${escape(cohortTrackingNote(tracking))}</p>
 <details class="disclosure cohort-list"><summary>查看全部外部地址及余额<span>${integer(c.addressCount)} 个地址</span></summary><div class="detail-body"><p class="cohort-note">直接地址＝成功调用合约或直接收到分发。下游＝从这些外部直接地址逐级收币；追踪到我方、混合钱包或公共执行通道时停止继续扩散。其他＝未列入上述关联范围的已索引外部地址。转账关联不等于共同控制；这里展示钱包当前余额，不限定为领币来源。</p><div class="cohort-controls"><label>地址 <input data-cohort-search type="search" placeholder="输入完整或部分地址"></label><label>范围 <select data-cohort-role><option value="all">全部外部地址</option><option value="direct">直接交互 / 收币</option><option value="downstream">下游地址</option><option value="other">其他外部</option></select></label><label>排序 <select data-cohort-sort><option value="balance_wei">当前余额 ↓</option></select></label><button type="button" data-cohort-export>导出筛选结果 CSV</button></div><div class="table-scroll"><table class="cohort-table"><thead><tr><th>完整地址 / 关联关系</th><th>外部当前余额<br>ESIM</th></tr></thead><tbody data-cohort-body></tbody></table></div><div class="cohort-pagination"><span data-cohort-count></span><button data-cohort-prev type="button">上一页</button><button data-cohort-next type="button">下一页</button></div></div></details>`;
}
export function filterCohort(c,{search='',role='all',sort='balance_wei'}={}){
 const key=['balance_wei','stake_wei','source_balance_wei'].includes(sort)?sort:'balance_wei';
 return c.rows.filter(r=>(role==='all'||r.role===role)&&r.address.includes(search.trim().toLowerCase())).sort((a,b)=>BigInt(a[key])>BigInt(b[key])?-1:BigInt(a[key])<BigInt(b[key])?1:a.address.localeCompare(b.address));
}
export function cohortCSV(rows,allRows=rows){
 const {depths}=cohortPathSummary(allRows);
 const header=['完整地址','类别','成功调用合约','直接收到分发','首个已索引上游地址','上游转账交易','当前外部份额 ESIM','钱包全部余额 ESIM','混合钱包','下游层级（首次识别路径）'];
 const values=rows.map(r=>[r.address,r.role==='direct'?'直接交互/收币':r.role==='downstream'?'下游':'其他外部',r.interacted?'是':'否',r.received?'是':'否',r.via||'',r.viaTx||'',amount(r.balance_wei),amount(r.wallet_balance_wei??r.balance_wei),r.mixed?'是，仅外部份额计入':'否',r.role==='downstream'?(depths.get(r.address)??'待核验'):r.role==='direct'?0:'']);
 return '\ufeff'+[header,...values].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
export function rememberCohort(root){
 const q=s=>root.querySelector(s);return {open:q('.cohort-list')?.open||false,search:q('[data-cohort-search]')?.value||'',role:q('[data-cohort-role]')?.value||'all',sort:q('[data-cohort-sort]')?.value||'balance_wei',page:Number(q('[data-cohort-count]')?.dataset.page||0)};
}
export function bindCohort(root,snapshot,prior={}){
 const c=snapshot?.external;
 const find=s=>root.querySelector(s);if(!c)return;const size=25;let page=prior.page||0;find('.cohort-list').open=!!prior.open;find('[data-cohort-search]').value=prior.search||'';find('[data-cohort-role]').value=prior.role||'all';find('[data-cohort-sort]').value='balance_wei';
 const {depths}=cohortPathSummary(c.rows);
 const selected=()=>filterCohort(c,{search:find('[data-cohort-search]').value,role:find('[data-cohort-role]').value,sort:find('[data-cohort-sort]').value});
 const draw=()=>{const rows=selected();page=Math.max(0,Math.min(page,Math.ceil(rows.length/size)-1));find('[data-cohort-body]').innerHTML=rows.slice(page*size,(page+1)*size).map(r=>`<tr><th>${link(r.address)}<small>${r.role==='direct'?`直接地址 · ${[r.interacted?'调用过合约':'',r.received?'领过币':''].filter(Boolean).join(' / ')}`:r.role==='downstream'?`下游地址 · ${depths.get(r.address)!=null?'第 '+depths.get(r.address)+' 层':'层级待核验'} · <a href="https://bscscan.com/tx/${escape(r.viaTx)}" target="_blank" rel="noopener noreferrer" title="上游 ${escape(r.via)}">查看入账关系 ↗</a>`:'其他已索引外部地址'}</small></th><td>${amount(r.balance_wei)}${r.mixed?`<small>仅外部份额 · 钱包总额 ${amount(r.wallet_balance_wei)}</small>`:''}</td></tr>`).join('')||'<tr><td colspan="2">没有匹配的外部地址</td></tr>';find('[data-cohort-count]').dataset.page=page;find('[data-cohort-count]').textContent=`${integer(rows.length)} 个匹配地址 · 第 ${page+1} / ${Math.max(1,Math.ceil(rows.length/size))} 页`;find('[data-cohort-prev]').disabled=page===0;find('[data-cohort-next]').disabled=(page+1)*size>=rows.length;};
 for(const selector of ['[data-cohort-search]','[data-cohort-role]','[data-cohort-sort]'])find(selector).addEventListener(selector.includes('search')?'input':'change',()=>{page=0;draw();});
 find('[data-cohort-prev]').addEventListener('click',()=>{page--;draw();});find('[data-cohort-next]').addEventListener('click',()=>{page++;draw();});
 find('[data-cohort-export]').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([cohortCSV(selected(),c.rows)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`ESIM_外部地址_区块${c.throughBlock}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});draw();
}
