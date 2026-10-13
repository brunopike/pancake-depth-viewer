// Proportional token provenance is a model, not a claim of common ownership.
const ZERO='0x0000000000000000000000000000000000000000';
const sum=(rows,key)=>rows.reduce((n,r)=>n+BigInt(r[key]),0n);
const compare=(a,b)=>a.order[0]-b.order[0]||a.order[1]-b.order[1]||a.order[2]-b.order[2];
const ensure=(ok,code)=>{if(!ok)throw Error(code);};
const key=lot=>(lot.root||'')+'|'+(lot.payer||'');
function add(lots,lot){if(!lot.amount)return;const k=key(lot),old=lots.get(k);if(old)old.amount+=lot.amount;else lots.set(k,{...lot});}
function shares(lots,value,total){
 const parts=[...lots.values()].map(lot=>({...lot,amount:lot.amount*value/total,remainder:lot.amount*value%total}));
 let remaining=value-parts.reduce((n,p)=>n+p.amount,0n);
 const ranked=[...parts].sort((a,b)=>a.remainder===b.remainder?key(a).localeCompare(key(b)):a.remainder>b.remainder?-1:1);
 for(const p of ranked){if(!remaining)break;p.amount++;remaining--;}
 ensure(remaining===0n,'FLOW_ROUNDING');return parts.filter(p=>p.amount);
}
export function traceClaimFlow({source,marketAddresses,openingBalances,transfers,trades,unsafeTransactions=[],zero=ZERO}){
 const markets=new Set(marketAddresses),wallets=new Map(),sales=[],unconfirmedFlows=[],byTx=new Map(),seen=new Set(),unsafe=new Set(unsafeTransactions),times=new Map();
 for(const t of trades){times.set(t.tx,t.timestamp);if(t.side==='buy')unsafe.add(t.tx);}
 const totals={issued:0n,direct:0n,relay:0n,pool:0n,returned:0n,burned:0n,matchedGross:0n};
 for(const t of trades)if(t.side==='sell'&&t.address){if(!byTx.has(t.tx))byTx.set(t.tx,new Map());const m=byTx.get(t.tx),old=m.get(t.address);if(old)old.amount+=BigInt(t.amount_wei);else m.set(t.address,{...t,amount:BigInt(t.amount_wei)});}
 const get=(address,tx)=>{
  let w=wallets.get(address);
  if(!w){ensure(Object.hasOwn(openingBalances,address),'FLOW_OPENING_MISSING');w={balance:BigInt(openingBalances[address]),lots:new Map(),tx:null};ensure(w.balance>=0n,'FLOW_BALANCE');wallets.set(address,w);}
  if(w.tx!==tx){const merged=new Map();for(const lot of w.lots.values())add(merged,{...lot,payer:null});w.lots=merged;w.tx=tx;}
  if(!w.lots.size&&w.balance)add(w.lots,{root:null,payer:null,amount:w.balance,path:[],txs:[],hops:0});
  return w;
 };
 const ordered=[...transfers].sort(compare);let tx=null,sinks=new Map(),owners=new Map(),inputGross=0n,outputSeen=false,recycled=false;
 const finish=()=>{
  const safe=!unsafe.has(tx)&&!recycled&&inputGross===[...owners.values()].reduce((n,t)=>n+t.amount,0n);
  for(const [address,t]of owners){const sink=sinks.get(address);if(!safe||!sink||sink.gross!==t.amount)continue;
   sink.confirmed=true;
   totals.matchedGross+=t.amount;
   const direct=sink.parts.filter(p=>p.root===address).reduce((n,p)=>n+p.amount,0n),relay=sink.parts.filter(p=>p.root&&p.root!==address).reduce((n,p)=>n+p.amount,0n);
   ensure(direct+relay<=t.amount,'FLOW_SALE_EXCEEDS_FILL');totals.direct+=direct;totals.relay+=relay;
   if(direct+relay)sales.push({tx:t.tx,address,block:t.block,timestamp:t.timestamp,amount_wei:t.amount.toString(),direct_wei:direct.toString(),relay_wei:relay.toString(),examples:sink.parts.filter(p=>p.root).slice(0,3).map(p=>({root:p.root,path:p.path,txs:p.txs,hops:p.hops,truncated:p.hops+1>p.path.length}))});
  }
  for(const [address,sink]of sinks){if(sink.confirmed)continue;const amount=sink.parts.filter(p=>p.root).reduce((n,p)=>n+p.amount,0n);if(amount)unconfirmedFlows.push({tx,address,block:sink.block,timestamp:times.get(tx)??sink.timestamp??null,amount_wei:amount.toString(),reason:unsafe.has(tx)||recycled?'mixed-market-or-lp-path':'pool-input-not-matched-to-sale'});}
 };
 for(const e of ordered){
  ensure(!seen.has(e.id),'FLOW_DUPLICATE');seen.add(e.id);
  if(e.tx!==tx){finish();tx=e.tx;sinks=new Map();owners=byTx.get(tx)||new Map();inputGross=0n;outputSeen=false;recycled=false;}
  const value=BigInt(e.value);ensure(value>=0n,'FLOW_NEGATIVE_TRANSFER');if(!value||e.from===e.to)continue;
  if(markets.has(e.from)&&!markets.has(e.to))outputSeen=true;
  if(markets.has(e.to)&&!markets.has(e.from)){inputGross+=value;if(outputSeen)recycled=true;}
  let parts;
  if(e.from===source){
   if(markets.has(e.to)||e.to===zero)continue;
   parts=[{root:e.to,payer:null,amount:value,path:[e.to],txs:[e.tx],hops:0}];totals.issued+=value;
  }else if(e.from===zero||markets.has(e.from))parts=[{root:null,payer:null,amount:value,path:[],txs:[],hops:0}];
  else{
   const w=get(e.from,tx);ensure(w.balance>=value,'FLOW_BALANCE');parts=shares(w.lots,value,w.balance);
   for(const part of parts){const lot=w.lots.get(key(part));lot.amount-=part.amount;if(!lot.amount)w.lots.delete(key(part));}
   w.balance-=value;
   parts=parts.map(p=>({...p,payer:p.payer??(owners.has(e.from)?e.from:null),path:p.root?[...p.path,e.to].slice(-8):[],txs:p.root?[...p.txs,e.tx].slice(-8):[],hops:p.root?p.hops+1:0}));
  }
  const tracked=parts.filter(p=>p.root).reduce((n,p)=>n+p.amount,0n);
  if(e.to===source){totals.returned+=tracked;continue;}
  if(e.to===zero){totals.burned+=tracked;continue;}
  if(markets.has(e.to)){
   totals.pool+=tracked;
   for(const p of parts){if(!sinks.has(p.payer))sinks.set(p.payer,{gross:0n,parts:[],block:e.order[0],timestamp:e.timestamp??null});const sink=sinks.get(p.payer);sink.gross+=p.amount;sink.parts.push(p);}continue;
  }
  const w=get(e.to,tx);w.balance+=value;for(const p of parts)add(w.lots,p);
 }
 finish();
 let remaining=0n;
 for(const w of wallets.values()){const all=[...w.lots.values()];ensure(all.reduce((n,p)=>n+p.amount,0n)===w.balance,'FLOW_LEDGER_MISMATCH');remaining+=all.filter(p=>p.root).reduce((n,p)=>n+p.amount,0n);}
 const sold=totals.direct+totals.relay,unconfirmed=totals.pool-sold;
 ensure(unconfirmed>=0n&&totals.issued===remaining+sold+unconfirmed+totals.returned+totals.burned,'FLOW_CONSERVATION');
 return {version:1,method:'proportional-v1',sales,unconfirmedFlows,totals:{issued_wei:totals.issued.toString(),direct_wei:totals.direct.toString(),relay_wei:totals.relay.toString(),sold_wei:sold.toString(),remaining_wei:remaining.toString(),unconfirmed_pool_wei:unconfirmed.toString(),returned_wei:totals.returned.toString(),burned_wei:totals.burned.toString(),matched_gross_wei:totals.matchedGross.toString()},closingBalances:Object.fromEntries([...wallets].map(([a,w])=>[a,w.balance.toString()]))};
}
export function claimFlowWindow(flow,start,end){
 if(!flow)return null;const rows=flow.sales.filter(s=>s.timestamp>=start&&s.timestamp<end),direct=sum(rows,'direct_wei'),relay=sum(rows,'relay_wei');
 const ranked=new Map();for(const r of rows){if(!BigInt(r.relay_wei))continue;const prior=ranked.get(r.address);if(prior)prior.amount+=BigInt(r.relay_wei);else ranked.set(r.address,{address:r.address,amount:BigInt(r.relay_wei),example:r.examples.find(e=>e.root!==r.address),tx:r.tx});}
 const pending=(flow.unconfirmedFlows||[]).filter(r=>r.timestamp>=start&&r.timestamp<end),unknown=(flow.unconfirmedFlows||[]).some(r=>r.timestamp===null),pendingAmount=sum(pending,'amount_wei');
 return {method:flow.method,cutoff:flow.cutoff??null,throughBlock:flow.throughBlock??null,direct_wei:direct.toString(),relay_wei:relay.toString(),sold_wei:(direct+relay).toString(),pending_wei:unknown?null:pendingAmount.toString(),pendingTransactions:new Set(pending.map(r=>r.tx)).size,complete:!unknown&&pendingAmount===0n&&flow.cutoff>=end,transactions:new Set(rows.map(r=>r.tx)).size,relayAddresses:ranked.size,examples:[...ranked.values()].sort((a,b)=>a.amount>b.amount?-1:a.amount<b.amount?1:a.address.localeCompare(b.address)).slice(0,50).map(r=>({...r,amount:r.amount.toString()}))};
}
