import {readSnapshot,newerSnapshot} from './snapshot-client.mjs';
import {sellerProfile,holderViewURL,displayEsimBalance} from './holder-insights.mjs';
import {TAG_KEY,readManual} from './holder-model.mjs';
const $ = id => document.getElementById(id);
let saved, current, period='today', mode='initiator', filter='all', page=0, endpoint, busy=false, balanceBusy=false, timer, searchTimer, generation=0;
let holderReport,manual={},lastTradeSource,lastHolderSource;
try{manual=readManual(localStorage.getItem(TAG_KEY));}catch{}
let holderMap=new Map();
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const profile=r=>sellerProfile(r,holderMap.get(r.address),manual);
const datasets=new Map(),datasetKey=()=>period+':'+mode;
const balances = new Map(), integer = n => new Intl.NumberFormat('zh-CN').format(n);
const date = s => new Date(s*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
const amount = (wei,digits=2) => wei==null?'—':new Intl.NumberFormat('zh-CN',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(BigInt(wei))/1e18);
const options = () => ({period,mode,filter,page,sort:$('sort').value,search:$('address-search').value.trim().toLowerCase()});
const url = () => endpoint + '?' + new URLSearchParams({view:'addresses',dataset:'1',...options()});
const tags=r=>{const p=profile(r),hasCleared=p.tags.some(t=>t.id==='cleared'),hasSold=p.tags.some(t=>t.id==='received-sold'),visible=p.tags.filter(t=>!(t.kind==='received'&&(hasCleared||hasSold))&&!(t.id==='received-sold'&&hasCleared));return visible.length?visible.map(t=>`<span class="tag" data-kind="${escape(t.kind)}" title="${escape(t.evidence||'已核对交易分类')}">${escape(t.text)}</span>`).join(''):'<span class="tag">其他交易</span>';};

function localPage() {
 const o=options(),candidate=datasets.get(datasetKey()),cached=candidate&&candidate.block>=saved.block?candidate:null,w=cached?.window||saved.windows[period],data=cached||w[mode];
 const all=data.rows.filter(r=>{const p=profile(r);return (!o.search||r.address.includes(o.search))&&(filter==='all'||filter==='own'&&p.own||filter==='received'&&p.received||filter==='other'&&!p.own&&!p.received||filter==='frequency'&&p.frequency);}).toSorted((a,b)=>{
  const x=BigInt(a[o.sort]),y=BigInt(b[o.sort]);return x===y?a.address.localeCompare(b.address):x>y?-1:1;
 });
 page=Math.min(page,Math.max(0,Math.ceil(all.length/25)-1));
 return { ...(cached||saved), totals:{sold:all.reduce((n,r)=>n+BigInt(r.sold),0n).toString(),bought:all.reduce((n,r)=>n+BigInt(r.bought),0n).toString(),own:all.filter(r=>profile(r).own).length}, window:w, population:data.rows.length, missingSold:data.missingSold, total:all.length,page,options:o,rows:all.slice(page*25,(page+1)*25) };
}
function render(schedule=true) {
 if(!current)return; const w=current.window; page=current.page;
 $('cutoff').textContent=`交易截至 ${date(current.cutoff)} · 北京时间`;
 $('mode-note').textContent=mode==='initiator'?'交易发起地址：谁提交了交易，可能与实际持币人不同。':'出币资金地址：按资金路径识别，包含钱包和合约。';
 $('summary').innerHTML=`<span>卖出地址<strong>${integer(current.total)}</strong><small>当前筛选结果</small></span><span>合计卖出<strong class="sell">${amount(current.totals?.sold)} ESIM</strong><small>${w.available?date(w.start)+' — '+date(w.end):'等待更新'}</small></span><span>合计买入<strong class="buy">${amount(current.totals?.bought)} ESIM</strong><small>同一批卖出地址的买入量</small></span><span>未归入地址的卖出<strong>${amount(current.missingSold)} ESIM</strong><small>复杂资金路径</small></span>`;
 const naturalDay=Math.floor((Date.now()/1000+28800)/86400),snapshotDay=saved?Math.floor((saved.windows.today.start+28800)/86400):naturalDay;
 for(const [key,label]of [['today','今日'],['yesterday','昨日 · 24 小时'],['history','历史累计']])document.querySelector(`[data-period="${key}"]`).textContent=snapshotDay===naturalDay||key==='history'?label:date(saved.windows[key].start).slice(0,5)+(key==='today'?'（保存）':' · 24 小时');
 $('rows').innerHTML=current.rows.map((r,i)=>{const b=balances.get(r.address),h=holderMap.get(r.address),esim=displayEsimBalance(b,h,holderReport);return `<tr><th><span class="rank">${page*25+i+1}</span><div class="address-link-row"><a href="https://bscscan.com/address/${r.address}" target="_blank" rel="noopener noreferrer" title="${r.address}">${r.address.slice(0,8)}…${r.address.slice(-6)} ↗</a><a class="holding-link" href="${holderViewURL({search:r.address,zero:true})}" target="_blank" rel="noopener noreferrer">看持仓 ↗</a></div><div class="tags">${tags(r)}</div></th><td class="sell">${amount(r.sold)}</td><td class="buy">${amount(r.bought)}</td><td class="${BigInt(r.netSold)>=0n?'sell':'buy'}">${amount(r.netSold)}</td><td>${integer(r.sellCount)} / ${integer(r.buyCount)}<small>单日最多 ${integer(r.peakDailyTrades)} 笔</small></td><td>${amount(esim.balance,2)}<small>${esim.source==='missing'?'余额暂缺':(esim.source==='snapshot'?'快照 ':'查询 ')+date(esim.cutoff)}</small></td><td>${amount(b?.usdt,2)}</td><td>${amount(b?.bnb,6)}</td></tr>`;}).join('')||'<tr><td colspan="8" class="empty">这个条件下暂无卖出地址。</td></tr>';
 $('row-count').textContent=`${integer(current.total)} 个地址`; $('page').textContent=`${current.total?page+1:0} / ${Math.ceil(current.total/25)}`;
 $('prev').disabled=page===0; $('next').disabled=(page+1)*25>=current.total; $('balances').disabled=balanceBusy||!current.total||!endpoint;
 for(const group of ['period','mode','filter'])for(const b of document.querySelectorAll(`[data-${group}]`))b.setAttribute(group==='period'?'aria-selected':'aria-pressed',String(b.dataset[group]===({period,mode,filter})[group]));
 $('own-rule').innerHTML=`我方刷量：调用指定执行合约 <a href="https://bscscan.com/address/${current.ownExecutor}" target="_blank" rel="noopener noreferrer">${current.ownExecutor.slice(0,10)}…${current.ownExecutor.slice(-6)} ↗</a> 的发起钱包。我方 LP：用户确认的四个流动性地址。`;
 const times=current.rows.map(r=>balances.get(r.address)?.timestamp).filter(Boolean);
 $('balance-status').textContent=times.length?`余额截至 ${date(Math.min(...times))}${Math.min(...times)!==Math.max(...times)?' — '+date(Math.max(...times)):''} · 北京时间`:holderReport?`ESIM 快照 ${date(holderReport.cutoff)}；USDT / BNB 余额${endpoint?'仅查询当前页':'暂缺'}。`:'余额暂缺，点击刷新重试。';
 if(schedule&&endpoint){clearTimeout(timer);timer=setTimeout(()=>fetchBalances(),400);}
}
async function json(path,options={}){
 const response=await fetch(path,{cache:'no-store',...options});let body;
 try{body=await response.json();}catch{throw new Error('接口暂时不可用，请稍后再试。');}
 if(!response.ok)throw new Error(body.message||'查询失败，保留已显示的数据。');return body;
}
async function loadSaved(){const result=await readSnapshot('addresses',{current:saved});lastTradeSource=result.source;return result.data;}
async function loadHolders(){try{const result=await readSnapshot('holders',{current:holderReport});holderReport=result.data;lastHolderSource=result.source;holderMap=new Map(holderReport.rows.map(r=>[r.address,r]));}catch{lastHolderSource='retained';} }
async function loadPage(){
 const seq=++generation,key=datasetKey();clearTimeout(timer);
 if(saved){current=localPage();render(false);}
 if(endpoint&&!datasets.has(key))try{const result=await json(url(),{signal:AbortSignal.timeout(25000)});if(seq!==generation)return;datasets.set(key,newerSnapshot(datasets.get(key),result.report));current=localPage();render();}
 catch{if(seq!==generation)return;$('status').textContent='接口暂不可用，显示已保存的排名。';$('status').className='notice';}
 else if(endpoint)render();
}
async function fetchBalances(manual=false){
 if(balanceBusy||!endpoint||!current)return;
 const addresses=current.rows.filter(r=>manual||!balances.has(r.address)||Date.now()-balances.get(r.address).checkedAt>60000).map(r=>r.address);
 if(!addresses.length)return;const requested=current.rows.map(r=>r.address).join(',');balanceBusy=true;$('balances').disabled=true;$('balance-status').textContent='正在查询本页余额…';
 try{const result=await json(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'balances',addresses}),signal:AbortSignal.timeout(55000)});
  for(const[address,value]of Object.entries(result.balances||{}))balances.set(address,value);render(false);
 }catch(e){$('balance-status').textContent=e.name==='TimeoutError'?'余额查询超时，请稍后重试。':e.message;}
 finally{balanceBusy=false;$('balances').disabled=!endpoint||!current.rows.length;if(current.rows.map(r=>r.address).join(',')!==requested){clearTimeout(timer);timer=setTimeout(()=>fetchBalances(),400);}}
}
$('balances').addEventListener('click',()=>fetchBalances(true));
for(const b of document.querySelectorAll('[data-period]'))b.addEventListener('click',()=>{period=b.dataset.period;page=0;loadPage();});
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>{mode=b.dataset.mode;page=0;loadPage();});
for(const b of document.querySelectorAll('[data-filter]'))b.addEventListener('click',()=>{filter=b.dataset.filter;page=0;loadPage();});
$('address-search').maxLength=42;
$('address-search').addEventListener('input',()=>{page=0;clearTimeout(searchTimer);clearTimeout(timer);searchTimer=setTimeout(loadPage,300);});$('sort').addEventListener('change',()=>{page=0;loadPage();});
$('prev').addEventListener('click',()=>{page--;loadPage();});$('next').addEventListener('click',()=>{page++;loadPage();});
$('refresh').addEventListener('click',async()=>{
 if(busy)return;busy=true;++generation;$('refresh').disabled=true;$('refresh').textContent='正在刷新…';$('status').textContent='正在读取交易和持仓…';const seq=generation,requestedKey=datasetKey(),requestedURL=url();
 try{
  const trading=async()=>{if(endpoint){const result=await json(requestedURL,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(260000)});datasets.set(requestedKey,newerSnapshot(datasets.get(requestedKey),result.report));return;}saved=await loadSaved();};
  await Promise.all([trading(),loadHolders()]);current=localPage();render();
  const partial=lastTradeSource==='retained'||lastHolderSource==='retained';$('status').textContent=`${partial?'部分更新未完成，保留上次数据':'已刷新'} · 交易 ${date(current.cutoff)}${holderReport?' · 持仓 '+date(holderReport.cutoff):''}${endpoint?'':' · 后台每小时更新'}`;$('status').className=partial?'notice':'success';
 }catch(e){$('status').textContent=e.name==='TimeoutError'?'更新超时，保留上次数据。':e.message;$('status').className='notice';}
 finally{busy=false;$('refresh').disabled=false;$('refresh').textContent='刷新数据';}
});
window.addEventListener('storage',e=>{if(e.key===TAG_KEY){manual=readManual(e.newValue);if(saved){current=localPage();render(false);}}});
const query=new URLSearchParams(location.search);
if(['today','yesterday','history'].includes(query.get('period')))period=query.get('period');
if(['all','own','received','other','frequency'].includes(query.get('filter')))filter=query.get('filter');
if(['initiator','funding'].includes(query.get('mode')))mode=query.get('mode');
$('address-search').value=(query.get('search')||'').slice(0,42);
try{const config=await json('./data/esim-config.json');endpoint=config.apiOrigin?new URL('/api/esim',config.apiOrigin).href:location.hostname.endsWith('.vercel.app')?'./api/esim':null;}catch{endpoint=null;}
try{await Promise.all([loadSaved().then(data=>{saved=data;}),loadHolders()]);await loadPage();$('status').textContent=`交易 ${date(current.cutoff)}${holderReport?' · 持仓 '+date(holderReport.cutoff):''} · ${endpoint?'可实时查询':'后台每小时更新'}`;}catch{$('status').textContent='地址数据暂时无法读取，请点击刷新重试。';$('status').className='notice';}
