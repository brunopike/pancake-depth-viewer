// Two fungible balance pools: distribution-origin tokens and other tokens.
// Floor to wei on partial transfers; a full-wallet transfer carries all origin wei.
export function cohortBalances({source,marketAddresses,openingBalances,transfers}){
 const zero='0x0000000000000000000000000000000000000000',markets=new Set(marketAddresses),balances=new Map(Object.entries(openingBalances).map(([a,b])=>[a,BigInt(b)])),origins=new Map(),returnedFlows=[];
 let issued=0n,returned=0n,pool=0n,burned=0n;
 const normal=a=>a!==source&&a!==zero&&!markets.has(a),need=a=>{if(!balances.has(a))throw Error('COHORT_OPENING_MISSING');};
 for(const e of [...transfers].sort((a,b)=>a.order[0]-b.order[0]||a.order[1]-b.order[1]||a.order[2]-b.order[2])){
  const v=BigInt(e.value);if(v===0n||e.from===e.to)continue;let tracked=0n;
  if(e.from===source&&normal(e.to)){tracked=v;issued+=v;}
  else if(normal(e.from)){need(e.from);const balance=balances.get(e.from),origin=origins.get(e.from)||0n;if(balance<v||origin>balance)throw Error('COHORT_LEDGER_UNDERFLOW');tracked=balance===v?origin:origin*v/balance;balances.set(e.from,balance-v);origins.set(e.from,origin-tracked);}
  if(e.to===source){returned+=tracked;returnedFlows.push({id:e.id,tx:e.tx,address:e.from,value_wei:e.value,source_wei:String(tracked)});}
  else if(e.to===zero)burned+=tracked;
  else if(markets.has(e.to))pool+=tracked;
  else{need(e.to);balances.set(e.to,balances.get(e.to)+v);origins.set(e.to,(origins.get(e.to)||0n)+tracked);}
 }
 const remaining=[...origins.values()].reduce((n,v)=>n+v,0n);if(issued!==remaining+returned+pool+burned)throw Error('COHORT_SOURCE_CONSERVATION');
 return {closingBalances:Object.fromEntries([...balances].map(([a,n])=>[a,String(n)])),sourceBalances:Object.fromEntries([...origins].map(([a,n])=>[a,String(n)])),returnedFlows,conservation:{issued:String(issued),remaining:String(remaining),returned:String(returned),pool:String(pool),burned:String(burned)}};
}
