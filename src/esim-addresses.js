const $ = id => document.getElementById(id);
let saved, current, period='today', mode='initiator', filter='all', page=0, endpoint, busy=false, balanceBusy=false, timer, searchTimer, generation=0;
const balances = new Map(), integer = n => new Intl.NumberFormat('zh-CN').format(n);
const date = s => new Date(s*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
const amount = (wei,digits=2) => wei==null?'—':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:digits}).format(Number(BigInt(wei))/1e18);
const options = () => ({period,mode,filter,page,sort:$('sort').value,search:$('address-search').value.trim().toLowerCase()});
const url = () => endpoint + '?' + new URLSearchParams({view:'addresses',...options()});
const tags = r => `${r.own?`<span class="tag own">我方${r.ownType}</span>`:''}${r.received?'<span class="tag received">领过币</span>':''}${r.highFrequency?'<span class="tag frequency">高频</span>':''}${!r.own&&!r.received?'<span class="tag">其他交易</span>':''}`;
function localPage() {
 const o=options(), w=saved.windows[period], data=w[mode];
 const all=data.rows.filter(r=>(!o.search||r.address.includes(o.search))&&(filter==='all'||filter==='own'&&r.own||filter==='received'&&r.received||filter==='other'&&!r.own&&!r.received||filter==='frequency'&&r.highFrequency)).toSorted((a,b)=>{
  const x=BigInt(a[o.sort]),y=BigInt(b[o.sort]);return x===y?a.address.localeCompare(b.address):x>y?-1:1;
 });
 page=Math.min(page,Math.max(0,Math.ceil(all.length/25)-1));
 return { ...saved, window:w, population:data.rows.length, missingSold:data.missingSold, total:all.length,page,options:o,rows:all.slice(page*25,(page+1)*25) };
}
function render(schedule=true) {
 if(!current)return; const w=current.window; page=current.page;
 $('cutoff').textContent=`交易截至 ${date(current.cutoff)} · 北京时间`;
 $('mode-note').textContent=mode==='initiator'?'交易发起地址：谁提交了交易，可能与实际持币人不同。':'出币资金地址：按资金路径识别，包含钱包和合约。';
 $('summary').innerHTML=`<span>当前范围 <strong>${w.available?date(w.start)+' — '+date(w.end):'等待更新'}</strong></span><span>卖出地址 <strong>${integer(current.population)}</strong></span><span>我方执行钱包 <strong>${integer(current.ownProgramCount)}</strong></span><span>未归入地址的卖出量 <strong>${amount(current.missingSold)} ESIM</strong></span>`;
 $('rows').innerHTML=current.rows.map((r,i)=>{const b=balances.get(r.address);return `<tr><th><span class="rank">${page*25+i+1}</span><a href="https://bscscan.com/address/${r.address}" target="_blank" rel="noopener noreferrer" title="${r.address}">${r.address.slice(0,8)}…${r.address.slice(-6)} ↗</a><div class="tags">${tags(r)}</div></th><td class="sell">${amount(r.sold)}</td><td class="buy">${amount(r.bought)}</td><td class="${BigInt(r.netSold)>=0n?'sell':'buy'}">${amount(r.netSold)}</td><td>${integer(r.sellCount)} / ${integer(r.buyCount)}<small>单日最多 ${integer(r.peakDailyTrades)} 笔</small></td><td>${amount(b?.esim,4)}</td><td>${amount(b?.usdt,4)}</td><td>${amount(b?.bnb,6)}</td></tr>`;}).join('')||'<tr><td colspan="8" class="empty">这个条件下暂无卖出地址。</td></tr>';
 $('row-count').textContent=`${integer(current.total)} 个地址`; $('page').textContent=`${current.total?page+1:0} / ${Math.ceil(current.total/25)}`;
 $('prev').disabled=page===0; $('next').disabled=(page+1)*25>=current.total; $('balances').disabled=balanceBusy||!current.total||!endpoint;
 for(const group of ['period','mode','filter'])for(const b of document.querySelectorAll(`[data-${group}]`))b.setAttribute(group==='period'?'aria-selected':'aria-pressed',String(b.dataset[group]===({period,mode,filter})[group]));
 $('own-rule').innerHTML=`我方刷量：调用指定执行合约 <a href="https://bscscan.com/address/${current.ownExecutor}" target="_blank" rel="noopener noreferrer">${current.ownExecutor.slice(0,10)}…${current.ownExecutor.slice(-6)} ↗</a> 的发起钱包。我方 LP：您提供的两个流动性地址。`;
 const times=current.rows.map(r=>balances.get(r.address)?.timestamp).filter(Boolean);
 $('balance-status').textContent=times.length?`余额截至 ${date(Math.min(...times))}${Math.min(...times)!==Math.max(...times)?' — '+date(Math.max(...times)):''} · 北京时间`:'余额只查询当前页，减少请求。';
 if(schedule&&endpoint){clearTimeout(timer);timer=setTimeout(()=>fetchBalances(),400);}
}
async function json(path,options={}){
 const response=await fetch(path,{cache:'no-store',...options});let body;
 try{body=await response.json();}catch{throw new Error('接口暂时不可用，请稍后再试。');}
 if(!response.ok)throw new Error(body.message||'查询失败，保留已显示的数据。');return body;
}
async function loadSaved(){
 try{return await json('https://raw.githubusercontent.com/starkweng/pancake-depth-viewer/esim-cache/addresses.json',{signal:AbortSignal.timeout(15000)});}
 catch{return json('./data/esim-addresses.json');}
}
async function loadPage(){
 const seq=++generation;clearTimeout(timer);if(saved){current=localPage();render(false);}
 if(endpoint)try{const result=await json(url(),{signal:AbortSignal.timeout(25000)});if(seq!==generation)return;current=result.report;render();}catch{if(seq!==generation)return;try{saved??=await loadSaved();current=localPage();render();}catch{$('status').textContent='地址数据暂时无法读取，请稍后重试。';}}
}
async function fetchBalances(manual=false){
 if(balanceBusy||!endpoint||!current)return;
 const addresses=current.rows.filter(r=>manual||!balances.has(r.address)||Date.now()-balances.get(r.address).checkedAt>60000).map(r=>r.address);
 if(!addresses.length)return;const requested=current.rows.map(r=>r.address).join(',');balanceBusy=true;$('balances').disabled=true;$('balance-status').textContent='正在查询本页余额…';
 try{const result=await json(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'balances',addresses}),signal:AbortSignal.timeout(55000)});
  for(const[address,value]of Object.entries(result.balances||{}))balances.set(address,value);render(false);
 }catch(e){$('balance-status').textContent=e.name==='TimeoutError'?'余额查询超时，请稍后重试。':e.message;}
 finally{balanceBusy=false;$('balances').disabled=!current.rows.length;if(current.rows.map(r=>r.address).join(',')!==requested){clearTimeout(timer);timer=setTimeout(()=>fetchBalances(),400);}}
}
$('balances').addEventListener('click',()=>fetchBalances(true));
for(const b of document.querySelectorAll('[data-period]'))b.addEventListener('click',()=>{period=b.dataset.period;page=0;loadPage();});
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>{mode=b.dataset.mode;page=0;loadPage();});
for(const b of document.querySelectorAll('[data-filter]'))b.addEventListener('click',()=>{filter=b.dataset.filter;page=0;loadPage();});
$('address-search').maxLength=42;
$('address-search').addEventListener('input',()=>{page=0;clearTimeout(searchTimer);clearTimeout(timer);searchTimer=setTimeout(loadPage,300);});$('sort').addEventListener('change',()=>{page=0;loadPage();});
$('prev').addEventListener('click',()=>{page--;loadPage();});$('next').addEventListener('click',()=>{page++;loadPage();});
$('refresh').addEventListener('click',async()=>{
 if(busy)return;busy=true;++generation;$('refresh').disabled=true;$('status').textContent='正在查询新增交易…';const seq=generation;
 try{if(!endpoint)throw new Error('实时查询接口尚未连接，当前显示保存的排名。');
  const result=await json(url(),{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(260000)});
  if(seq===generation){current=result.report;render();}else await loadPage();
  $('status').textContent=result.catchingUp?'已补齐一段数据，请再次刷新以继续更新。':`交易已更新至 ${date(result.report.cutoff)}。`;
 }catch(e){$('status').textContent=e.name==='TimeoutError'?'查询超时，保留上次排名。':e.message;}
 finally{busy=false;$('refresh').disabled=false;}
});
try{const config=await json('./data/esim-config.json');endpoint=config.apiOrigin?new URL('/api/esim',config.apiOrigin).href:location.hostname.endsWith('.vercel.app')||location.hostname==='127.0.0.1'?'./api/esim':null;
 if(!endpoint)saved=await loadSaved();$('status').textContent=endpoint?'按卖出量排名。点击地址可在 BscScan 查看。':'已读取后台保存的排名；实时查询与余额接口待连接。';await loadPage();
}catch{$('status').textContent='地址数据暂时无法读取，请稍后重试。';}
