import {reportAmount as amount} from './report-number.mjs';
const integer=n=>Number(n||0).toLocaleString('en-US');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Date(s*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const link=a=>`<a class="cohort-address" href="https://bscscan.com/address/${escape(a)}" target="_blank" rel="noopener noreferrer">${escape(a)} ↗</a>`;
export function renderCohort(c,reportCutoff){
 if(!c)return '<div class="cohort-pending"><h3>关联钱包持仓与回流质押</h3><p>正在补齐逐笔质押核验。完成后在这里显示直接交互及下游钱包、当前持仓和实际质押数量；尚未核验的数据不显示为 0。</p></div>';
 return `<div class="cohort-head"><div><h3>这些钱包现在还持有多少，又质押了多少</h3><p>${integer(c.directCount)} 个直接交互 / 收币地址 → ${integer(c.downstreamCount)} 个下游地址 · 合计 ${integer(c.addressCount)} 个，已去重</p></div><span>每小时核验 · 同一区块<br>${date(c.cutoff)} · ${integer(c.throughBlock)}</span></div>
 <div class="cohort-metrics"><div class="cohort-metric"><span>当前钱包持仓合计</span><strong>${amount(c.balance_wei)} <em>ESIM</em></strong><p>直接地址 ${amount(c.direct_balance_wei)}<br>下游地址 ${amount(c.downstream_balance_wei)}</p><small>含我方及外部；包含买入和其他来源，不等于外部流通量</small></div>
 <div class="cohort-metric"><span>实际转回质押 · 累计</span><strong>${amount(c.stake_wei)} <em>ESIM</em></strong><p>${integer(c.stakeAddresses)} 个地址 · ${integer(c.stakeTransactions)} 笔交易<br>其中分发来源约 ${amount(c.source_stake_wei)}</p><small>质押调用 + 质押事件 + 实际转账核验；重复质押会累计，不是当前锁仓余额</small></div>
 <div class="cohort-metric cohort-estimate"><span>持仓中：分发来源仍持有 · 估算</span><strong>${amount(c.source_balance_wei)} <em>ESIM</em></strong><p>这是左侧持仓合计的一部分，不能再相加</p><small>混币按余额比例追踪；钱包间转手不重复计算当前余额</small></div></div>
 <p class="cohort-note">另有 ${amount(c.other_return_wei)} ESIM 转回合约，但未同时满足质押三项证据，未计入“实际转回质押”。${c.cutoff<reportCutoff?'本组数据早于页面交易时间，持仓与质押统一采用上述核验时间。':''}</p>
 <details class="disclosure cohort-list"><summary>查看全部关联地址及数量<span>${integer(c.addressCount)} 个地址</span></summary><div class="detail-body"><p class="cohort-note">直接地址＝成功调用合约或直接收到分发的地址。下游＝索引期内从该群体逐级收币的地址；已知资金池、公共路由和共享执行器不再向外扩散。转账关联不证明共同控制；非分发来源资金也可能经过这些钱包。</p><div class="cohort-controls"><label>地址 <input data-cohort-search type="search" placeholder="输入完整或部分地址"></label><label>范围 <select data-cohort-role><option value="all">全部地址</option><option value="direct">直接交互 / 收币</option><option value="downstream">下游地址</option></select></label><label>排序 <select data-cohort-sort><option value="balance_wei">当前持仓 ↓</option><option value="stake_wei">转回质押 ↓</option><option value="source_balance_wei">分发来源持仓 ↓</option></select></label><button type="button" data-cohort-export>导出筛选结果 CSV</button></div><div class="table-scroll"><table class="cohort-table"><thead><tr><th>完整地址 / 关联关系</th><th>当前全部持仓<br>ESIM</th><th>其中分发来源<br>ESIM · 估算</th><th>转回质押累计<br>ESIM</th><th>其他回流<br>ESIM · 未认定质押</th></tr></thead><tbody data-cohort-body></tbody></table></div><div class="cohort-pagination"><span data-cohort-count></span><button data-cohort-prev type="button">上一页</button><button data-cohort-next type="button">下一页</button></div></div></details>`;
}
export function filterCohort(c,{search='',role='all',sort='balance_wei'}={}){
 const key=['balance_wei','stake_wei','source_balance_wei'].includes(sort)?sort:'balance_wei';
 return c.rows.filter(r=>(role==='all'||r.role===role)&&r.address.includes(search.trim().toLowerCase())).sort((a,b)=>BigInt(a[key])>BigInt(b[key])?-1:BigInt(a[key])<BigInt(b[key])?1:a.address.localeCompare(b.address));
}
export function cohortCSV(rows){
 const header=['完整地址','类别','成功调用合约','直接收到分发','首个已索引上游地址','上游转账交易','当前全部持仓 ESIM','其中分发来源持仓 ESIM 估算','实际转回质押 ESIM 累计','其中分发来源质押 ESIM 估算','其他回流 ESIM 未认定质押','质押交易数'];
 const values=rows.map(r=>[r.address,r.role==='direct'?'直接交互/收币':'下游',r.interacted?'是':'否',r.received?'是':'否',r.via||'',r.viaTx||'',...['balance_wei','source_balance_wei','stake_wei','source_stake_wei','other_return_wei'].map(k=>amount(r[k])),r.stake_transactions]);
 return '\ufeff'+[header,...values].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
export function bindCohort(root,c){
 if(!c)return;const find=s=>root.querySelector(s),size=25;let page=0;
 const selected=()=>filterCohort(c,{search:find('[data-cohort-search]').value,role:find('[data-cohort-role]').value,sort:find('[data-cohort-sort]').value});
 const draw=()=>{const rows=selected();page=Math.max(0,Math.min(page,Math.ceil(rows.length/size)-1));find('[data-cohort-body]').innerHTML=rows.slice(page*size,(page+1)*size).map(r=>`<tr><th>${link(r.address)}<small>${r.role==='direct'?`直接地址 · ${[r.interacted?'调用过合约':'',r.received?'领过币':''].filter(Boolean).join(' / ')}`:`下游地址 · <a href="https://bscscan.com/tx/${escape(r.viaTx)}" target="_blank" rel="noopener noreferrer" title="上游 ${escape(r.via)}">查看入账关系 ↗</a>`}</small></th><td>${amount(r.balance_wei)}</td><td>${amount(r.source_balance_wei)}</td><td>${amount(r.stake_wei)}<small>${integer(r.stake_transactions)} 笔</small></td><td>${amount(r.other_return_wei)}</td></tr>`).join('')||'<tr><td colspan="5">没有匹配的地址</td></tr>';find('[data-cohort-count]').textContent=`${integer(rows.length)} 个匹配地址 · 第 ${page+1} / ${Math.max(1,Math.ceil(rows.length/size))} 页`;find('[data-cohort-prev]').disabled=page===0;find('[data-cohort-next]').disabled=(page+1)*size>=rows.length;};
 for(const selector of ['[data-cohort-search]','[data-cohort-role]','[data-cohort-sort]'])find(selector).addEventListener(selector.includes('search')?'input':'change',()=>{page=0;draw();});
 find('[data-cohort-prev]').addEventListener('click',()=>{page--;draw();});find('[data-cohort-next]').addEventListener('click',()=>{page++;draw();});
 find('[data-cohort-export]').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([cohortCSV(selected())],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`ESIM_关联钱包_区块${c.throughBlock}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});draw();
}
