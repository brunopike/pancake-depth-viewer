import {startSnapshotPolling} from './snapshot-poll.mjs';
import {readSnapshot,newerSnapshot,realtimeHost} from './snapshot-client.mjs';
import {compactViewsEnabled,readView,cachedView} from './view-client.mjs';
import {esimEndpoint} from './site-runtime.mjs';
import {showSnapshotStatus,refreshButtonLabel} from './snapshot-status.mjs';
import {sellerProfile,holderViewURL,displayEsimBalance} from './holder-insights.mjs';
import {TAG_KEY,readManual} from './holder-model.mjs';
import {createTagFilter} from './tag-filter-control.mjs';
import {SELLER_GROUPS,sellerSummaries} from './seller-summary.mjs';
import {SELLER_PAGE_SIZE,SELLER_SORT_KEYS,filterSellerRows,rankSellerRows,sellerPage,balanceBatches} from './seller-ranking.mjs';
const $ = id => document.getElementById(id);
let saved, current, period='today', mode='initiator', filter='all', page=0, endpoint, busy=false, balanceBusy=false, timer, searchTimer, generation=0;
let holderReport,manual={},lastTradeSource,lastHolderSource;
let compactAvailable=true,compactKey='',reloadForTags=false;
try{manual=readManual(localStorage.getItem(TAG_KEY));}catch{}
const tagFilter=createTagFilter({getManual:()=>manual,onChange:()=>{page=0;loadPage();}});
let holderMap=new Map();
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const profile=r=>sellerProfile(r,holderMap.get(r.address),manual);
const datasets=new Map(),datasetKey=()=>period+':'+mode;
const balances = new Map(), integer = n => new Intl.NumberFormat('zh-CN').format(n);
const date = s => new Date(s*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
const amount = (wei,digits=2) => wei==null?'—':new Intl.NumberFormat('zh-CN',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(BigInt(wei))/1e18);
const options = () => ({period,mode,filter,page,tags:tagFilter.selected(),sort:$('sort').value,direction:$('sort-direction').value,search:$('address-search').value.trim().toLowerCase()});
// Dataset requests supply the full period. Sorting, marks and pagination are local.
const url = () => endpoint + '?' + new URLSearchParams({view:'addresses',dataset:'1',period,mode,sort:'sold'});
const balanceValue=(row,key)=>key==='esim'?displayEsimBalance(balances.get(row.address),holderMap.get(row.address),holderReport).balance:balances.get(row.address)?.[key]??null;
const tags=r=>{const p=profile(r),hasCleared=p.tags.some(t=>t.id==='cleared'),hasSold=p.tags.some(t=>t.id==='received-sold'),visible=p.tags.filter(t=>!(t.kind==='received'&&(hasCleared||hasSold))&&!(t.id==='received-sold'&&hasCleared));return visible.length?visible.map(t=>`<span class="tag" data-kind="${escape(t.kind)}" title="${escape(t.evidence||'已核对交易分类')}">${escape(t.text)}</span>`).join(''):'<span class="tag">其他交易</span>';};

function localPage() {
 const o=options(),candidate=datasets.get(datasetKey()),cached=candidate&&candidate.block>=saved.block?candidate:null,w=cached?.window||saved.windows[period],data=cached||w[mode];
 const all=rankSellerRows(filterSellerRows(data.rows,o,profile,manual),o.sort,o.direction,balanceValue);
 const pagination=sellerPage(all,page);page=pagination.page;
 return { ...(cached||saved), groups:sellerSummaries([...data.rows,...(data.buyOnlyRows||[])],profile,{sold:data.missingSold,bought:data.missingBought}),activityComplete:Array.isArray(data.buyOnlyRows), totals:{sold:all.reduce((n,r)=>n+BigInt(r.sold),0n).toString(),bought:all.reduce((n,r)=>n+BigInt(r.bought),0n).toString(),own:all.filter(r=>profile(r).own).length}, window:w, population:data.rows.length, missingSold:data.missingSold,missingBought:data.missingBought, ...pagination,options:o };
}
function render(schedule=true) {
 if(!current)return; const w=current.window; page=current.page;
 $('cutoff').textContent=`交易数据截至 ${date(current.cutoff)}${holderReport?' · 持仓快照截至 '+date(holderReport.cutoff):''} · 北京时间`;
 const funding=current.options.mode==='funding';
 $('mode-current').textContent=funding?'按出币地址':'按操作钱包';
 $('mode-note').textContent=funding?'按卖出币的来源地址汇总，可能包含合约；买入量按接收币的地址统计，无法确认来源的卖出单列。':'按发起交易的钱包汇总卖出量；通过合约执行时，它可能不是实际转出币的地址。';
 const category=SELLER_GROUPS.find(group=>group.id===current.options.filter).label;
 $('ranking-title').textContent=`${category}卖出排名 · ${funding?'出币地址':'操作钱包'}`;
 $('address-column-label').textContent=`排名 / ${funding?'出币地址':'操作钱包'}`;
 for(const button of document.querySelectorAll('[data-sort]')){
  const selected=button.dataset.sort===current.options.sort,ascending=current.options.direction==='asc';
  button.setAttribute('aria-pressed',String(selected));button.querySelector('.sort-arrow').textContent=selected?(ascending?'↑':'↓'):'↕';
  button.setAttribute('aria-label',`${button.dataset.label}，${selected&&ascending?'当前升序，点击降序':selected?'当前降序，点击升序':'点击'+(button.dataset.sort==='address'?'升序':'降序')+'排序'}`);
 }
 for(const header of document.querySelectorAll('.address-table thead th')){const active=header.querySelector('[data-sort][aria-pressed="true"]');header.setAttribute('aria-sort',active?current.options.direction==='asc'?'ascending':'descending':'none');}
 $('balance-sort-note').hidden=!['esim','usdt','bnb'].includes($('sort').value);
 $('balance-sort-note').textContent=$('sort').value==='esim'?'按已显示的 ESIM 最新余额排序；缺失余额排在末尾。':'按已查询的余额排序；未查询地址排在末尾，不能作为全市场余额排名。';
 const groupCard=group=>`<section class="seller-group${current.options.filter===group.id?' selected':''}" data-summary-group="${group.id}"><h2>${group.label}${current.options.filter===group.id?'<small>当前排名</small>':''}</h2><div class="seller-metrics"><div><span>${group.id==='all'&&BigInt(current.missingSold)>0n?'已识别卖出地址数':'卖出地址数'}</span><strong>${w.available?integer(group.count):'—'}</strong></div><div><span>卖出 <small>ESIM</small></span><strong class="sell">${amount(w.available?group.sold:null)}</strong></div><div><span>买入 <small>ESIM</small></span><strong class="buy">${amount(w.available&&current.activityComplete?group.bought:null)}</strong></div><div><span>净卖出 <small>ESIM</small></span><strong class="${BigInt(group.netSold)>=0n?'sell':'buy'}">${amount(w.available&&current.activityComplete?group.netSold:null)}</strong></div></div>${current.activityComplete&&group.activeCount!=null?`<p class="seller-scope">交易地址 ${integer(group.activeCount)} 个 · 仅买入 ${integer(group.buyOnlyCount)} 个（${amount(group.buyOnlyBought)} ESIM）</p>`:''}${group.id==='received'?'<p class="seller-scope">统计截至时段末领过币的地址，包含其领币前的交易；不等于领取所得的卖出量。</p>':''}</section>`;
 $('summary').innerHTML=`<div class="seller-primary">${current.groups.filter(group=>group.primary).map(groupCard).join('')}</div><div class="seller-secondary">${current.groups.filter(group=>!group.primary).map(groupCard).join('')}</div><p class="seller-scope">${w.available?date(w.start)+' — '+date(w.end)+' · 北京时间':'等待更新'} · 范围：已核验 ESIM 链上池，不含交易所内部成交。“全部”含未归因金额和仅买入的地址；其余分类及下方排名只计已识别地址，排名仅列卖过币的钱包。标签和搜索只筛选下方排名；分类可能重叠，不能相加。${current.activityComplete?'':' 买入概览待补齐：当前保存的快照仅含卖出地址。'}</p>${BigInt(current.missingSold)>0n?`<p class="seller-unattributed">未归因卖出：${amount(current.missingSold)} ESIM · 已计入“全部”成交；${funding?'出币地址':'操作钱包'}未确认，未计入地址分类及排名。</p>`:''}${BigInt(current.missingBought||'0')>0n?`<p class="seller-unattributed">未归因买入：${amount(current.missingBought)} ESIM · 已计入“全部”成交；接收或操作地址未确认，未计入地址分类及排名。</p>`:''}`;
 const net=(BigInt(current.totals.sold)-BigInt(current.totals.bought)).toString();
 $('filter-note').textContent=`当前排名：${category}${current.options.tags.length&&!current.options.tags.includes('all')?' · 标签：'+$('filter-label').textContent:''} · ${integer(current.total)} 个卖出地址 · 卖出 ${amount(current.totals.sold)} · 排名内地址买入 ${amount(current.totals.bought)} · 净卖出 ${amount(net)} ESIM${current.options.search?' · 已按搜索筛选':''}`;
 const naturalDay=Math.floor((Date.now()/1000+28800)/86400),snapshotDay=saved?Math.floor((saved.windows.today.start+28800)/86400):naturalDay;
 for(const [key,label]of [['today','今日·0点到现在'],['yesterday','昨日 · 24 小时'],['history','历史累计']])document.querySelector(`[data-period="${key}"]`).textContent=snapshotDay===naturalDay||key==='history'?label:date(saved.windows[key].start).slice(0,5)+(key==='today'?'（保存）':' · 24 小时');
 $('rows').innerHTML=current.rows.map((r,i)=>{const b=balances.get(r.address),h=holderMap.get(r.address),esim=displayEsimBalance(b,h,holderReport);return `<tr><th><span class="rank">${page*SELLER_PAGE_SIZE+i+1}</span><div class="address-link-row"><a href="https://bscscan.com/address/${r.address}" target="_blank" rel="noopener noreferrer" title="${r.address}">${r.address.slice(0,8)}…${r.address.slice(-6)} ↗</a><a class="holding-link" href="${holderViewURL({search:r.address,zero:true})}" target="_top" rel="noopener noreferrer">看持仓 →</a></div><div class="tags">${tags(r)}</div></th><td class="sell">${amount(r.sold)}</td><td class="buy">${amount(r.bought)}</td><td class="${BigInt(r.netSold)>=0n?'sell':'buy'}">${amount(r.netSold)}</td><td>${integer(r.sellCount)} / ${integer(r.buyCount)}<small>单日最多 ${integer(r.peakDailyTrades)} 笔</small></td><td>${amount(esim.balance,2)}<small>${esim.source==='missing'?'余额暂缺':(esim.source==='snapshot'?'快照 ':'查询 ')+date(esim.cutoff)}</small></td><td>${amount(b?.usdt,2)}</td><td>${amount(b?.bnb,6)}</td></tr>`;}).join('')||'<tr><td colspan="8" class="empty">这个条件下暂无卖出地址。</td></tr>';
 const start=current.total?page*SELLER_PAGE_SIZE+1:0,end=page*SELLER_PAGE_SIZE+current.rows.length;
 $('row-count').textContent=`${integer(start)}–${integer(end)} / ${integer(current.total)} 个地址 · 每页 ${SELLER_PAGE_SIZE} 条`; $('page').textContent=`${current.total?page+1:0} / ${current.pages}`;
 $('prev').disabled=page===0; $('next').disabled=(page+1)*SELLER_PAGE_SIZE>=current.total; $('balances').disabled=balanceBusy||!current.total||!endpoint;
 for(const group of ['period','mode','filter'])for(const b of document.querySelectorAll(`[data-${group}]`))b.setAttribute(group==='period'?'aria-selected':'aria-pressed',String(b.dataset[group]===current.options[group]));
 $('own-rule').innerHTML=`我方交易：调用已确认执行合约 ${(current.ownExecutors||[current.ownExecutor]).map(a=>`<a href="https://bscscan.com/address/${a}" target="_blank" rel="noopener noreferrer">${a.slice(0,10)}…${a.slice(-6)} ↗</a>`).join(' / ')} 的发起钱包，累计已识别 ${integer(current.ownProgramCount)} 个；同时包含已确认的我方钱包与 LP 地址。`;
 const times=current.rows.map(r=>balances.get(r.address)?.timestamp).filter(Boolean);
 $('balance-status').textContent=times.length?`余额截至 ${date(Math.min(...times))}${Math.min(...times)!==Math.max(...times)?' — '+date(Math.max(...times)):''} · 北京时间`:holderReport?`ESIM 快照 ${date(holderReport.cutoff)}；USDT / BNB 余额${endpoint?'仅查询当前页':'暂缺'}。`:'余额暂缺，点击刷新重试。';
 if(schedule&&endpoint&&!['esim','usdt','bnb'].includes($('sort').value)){clearTimeout(timer);timer=setTimeout(()=>fetchBalances(),400);}
}
async function json(path,options={}){
 const response=await fetch(path,{cache:'no-store',...options});let body;
 try{body=await response.json();}catch{throw new Error('接口暂时不可用，请稍后再试。');}
 if(!response.ok)throw new Error(body.message||'查询失败，保留已显示的数据。');return body;
}
async function loadSaved(){const result=await readSnapshot('addresses',{current:saved?._compact?null:saved});lastTradeSource=result.source;return result.data;}
async function loadHolders(){try{const result=await readSnapshot('holders',{current:holderReport?._compact?null:holderReport});holderReport=result.data;lastHolderSource=result.source;holderMap=new Map(holderReport.rows.map(r=>[r.address,r]));}catch{lastHolderSource='retained';if(holderReport?._compact)throw Error('正在读取本地标签所需的完整持仓。');} }
function applyCompact(view,key,schedule=true){
 if(saved&&view.block<saved.block||holderReport&&view.holders.block<holderReport.block)return false;
 current=view;saved={...view,_compact:true};compactKey=key;holderReport={...view.holders,_compact:true};holderMap=new Map(holderReport.rows.map(row=>[row.address,row]));lastTradeSource=lastHolderSource='realtime';render(schedule);return true;
}
async function loadPage(){
 try{await loadPageRequest();return true;}catch(error){$('status').textContent=error.message||'筛选结果暂时无法更新，保留已显示的数据。';$('status').className='notice';return false;}
}
async function loadPageRequest(){
 const seq=++generation,key=datasetKey();clearTimeout(timer);
 if(compactViewsEnabled(manual)&&compactAvailable){
  const o=options(),viewKey=JSON.stringify(o);$('rows').setAttribute('aria-busy','true');
  try{
   const cached=await cachedView('sellers',o);
   if(cached&&seq===generation&&compactViewsEnabled(manual))applyCompact(cached.data,viewKey,false);
   const view=await readView('sellers',o,{current:compactKey===viewKey?current:null,minimum:{block:saved?.block,holderBlock:holderReport?.block},balances:['esim','usdt','bnb'].includes(o.sort)?Object.fromEntries(balances):undefined});
   if(seq!==generation||!compactViewsEnabled(manual))return;
   if(!applyCompact(view,viewKey))throw Error('所选时段的数据尚未同步，请稍后刷新。');showSnapshotStatus($('status'),$('refresh'),[['交易',current],['持仓',holderReport]]);return;
  }catch{
   if(seq!==generation)return;compactAvailable=false;
   $('status').textContent='正在读取备用快照…';
  }finally{if(seq===generation)$('rows').removeAttribute('aria-busy');}
 }
 if(!saved||saved._compact){
  const [next]=await Promise.all([loadSaved(),loadHolders()]);if(seq!==generation)return;saved=next;
 }
 if(saved){current=localPage();render(false);}
 if(endpoint&&!realtimeHost()&&!datasets.has(key))try{const result=await json(url(),{signal:AbortSignal.timeout(25000)});if(seq!==generation)return;datasets.set(key,newerSnapshot(datasets.get(key),result.report));current=localPage();render();}
 catch{if(seq!==generation)return;$('status').textContent='接口暂不可用，显示已保存的排名。';$('status').className='notice';}
 else if(endpoint)render();
}
async function fetchBalances(manual=false){
 if(balanceBusy||!endpoint||!current)return;
 const addresses=current.rows.filter(r=>manual||!balances.has(r.address)||Date.now()-balances.get(r.address).checkedAt>60000).map(r=>r.address);
 if(!addresses.length)return;const requested=current.rows.map(r=>r.address).join(',');balanceBusy=true;$('balances').disabled=true;$('balance-status').textContent='正在查询本页余额…';
 try{const batches=balanceBatches(addresses);for(const [i,batch]of batches.entries()){
   $('balance-status').textContent=`正在查询本页余额… ${i+1} / ${batches.length}`;
   const result=await json(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'balances',addresses:batch}),signal:AbortSignal.timeout(55000)});
   for(const[address,value]of Object.entries(result.balances||{}))balances.set(address,value);
  }if(saved?._compact){if(['esim','usdt','bnb'].includes($('sort').value))await loadPage();else render(false);}else{current=localPage();render(false);}
 }catch(e){$('balance-status').textContent=e.name==='TimeoutError'?'余额查询超时，请稍后重试。':e.message;}
 finally{balanceBusy=false;$('balances').disabled=!endpoint||!current.rows.length;if(!['esim','usdt','bnb'].includes($('sort').value)&&current.rows.map(r=>r.address).join(',')!==requested){clearTimeout(timer);timer=setTimeout(()=>fetchBalances(),400);}}
}
$('balances').addEventListener('click',()=>fetchBalances(true));
for(const b of document.querySelectorAll('[data-period]'))b.addEventListener('click',()=>{period=b.dataset.period;page=0;loadPage();});
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>{mode=b.dataset.mode;page=0;loadPage();});
for(const b of document.querySelectorAll('[data-filter]'))b.addEventListener('click',()=>{filter=b.dataset.filter;page=0;loadPage();});
$('address-search').maxLength=42;
$('address-search').addEventListener('input',()=>{page=0;clearTimeout(searchTimer);clearTimeout(timer);searchTimer=setTimeout(loadPage,300);});$('sort').addEventListener('change',()=>{page=0;loadPage();});$('sort-direction').addEventListener('change',()=>{page=0;loadPage();});
for(const button of document.querySelectorAll('[data-sort]'))button.addEventListener('click',()=>{const key=button.dataset.sort;$('sort-direction').value=$('sort').value===key?$('sort-direction').value==='desc'?'asc':'desc':key==='address'?'asc':'desc';$('sort').value=key;page=0;loadPage();});
$('prev').addEventListener('click',()=>{page--;loadPage();});$('next').addEventListener('click',()=>{page++;loadPage();});
$('refresh').addEventListener('click',async()=>{
 if(busy)return false;busy=true;++generation;$('refresh').disabled=true;$('refresh').textContent='正在刷新…';$('status').textContent='正在读取交易和持仓…';const seq=generation,requestedKey=datasetKey(),requestedURL=url();
 try{
  if(compactViewsEnabled(manual)){compactAvailable=true;await loadPage();return;}
  const trading=async()=>{if(endpoint&&!realtimeHost()){const result=await json(requestedURL,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(260000)});datasets.set(requestedKey,newerSnapshot(datasets.get(requestedKey),result.report));lastTradeSource='live';return;}saved=await loadSaved();};
  await Promise.all([trading(),loadHolders()]);current=localPage();render();
  const partial=lastTradeSource==='retained'||lastHolderSource==='retained';showSnapshotStatus($('status'),$('refresh'),[['交易',current||saved],['持仓',holderReport]],{retained:partial});
 }catch(e){$('status').textContent=e.name==='TimeoutError'?'更新超时，保留上次数据。':e.message;$('status').className='notice';}
 finally{busy=false;$('refresh').disabled=false;$('refresh').textContent=refreshButtonLabel($('refresh'));if(reloadForTags){reloadForTags=false;void loadPage().catch(()=>{});}}
});
window.addEventListener('storage',e=>{if(e.key===TAG_KEY){manual=readManual(e.newValue);tagFilter.refresh();page=0;if(busy)reloadForTags=true;else void loadPage().catch(()=>{$('status').textContent='本地标签已保留，持仓数据正在重试。';});}});
tagFilter.refresh();
const query=new URLSearchParams(location.search);
if(['today','yesterday','history'].includes(query.get('period')))period=query.get('period');
if(['all','own','received','other','frequency'].includes(query.get('filter')))filter=query.get('filter');
if(['initiator','funding'].includes(query.get('mode')))mode=query.get('mode');
$('address-search').value=(query.get('search')||'').slice(0,42);
if(SELLER_SORT_KEYS.includes(query.get('sort')))$('sort').value=query.get('sort');
if(['asc','desc'].includes(query.get('direction')))$('sort-direction').value=query.get('direction');
for(const input of $('filter').querySelectorAll('input'))input.checked=(query.get('tags')||'').split(',').includes(input.value);
tagFilter.refresh();
try{const config=await json('./data/esim-config.json');endpoint=esimEndpoint(config);}catch{endpoint=null;}
try{if(await loadPage())showSnapshotStatus($('status'),$('refresh'),[['交易',current||saved],['持仓',holderReport]],{retained:lastTradeSource==='retained'||lastHolderSource==='retained'});}catch{$('status').textContent='地址数据暂时无法读取，请点击刷新重试。';$('status').className='notice';}

startSnapshotPolling(async()=>{
 if(busy)return false;busy=true;
 try{if(compactViewsEnabled(manual)){compactAvailable=true;return await loadPage();}const [next]=await Promise.all([loadSaved(),loadHolders()]);saved=next;current=localPage();render(false);showSnapshotStatus($('status'),$('refresh'),[['交易',current],['持仓',holderReport]],{retained:lastTradeSource==='retained'||lastHolderSource==='retained'});}
 finally{busy=false;if(reloadForTags){reloadForTags=false;void loadPage().catch(()=>{});}}
});
