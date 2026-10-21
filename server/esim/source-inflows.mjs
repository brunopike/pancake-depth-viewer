import seed from './source-inflows-seed.json' with {type:'json'};
export const SOURCE_INFLOW_SEED=seed;
const uint=value=>typeof value==='string'&&/^(0|[1-9][0-9]*)$/.test(value)&&BigInt(value)<2n**256n;
const hash=value=>/^0x[0-9a-f]{64}$/.test(value||'');
const ensure=(ok,code)=>{if(!ok)throw Error(code);};

// The already-audited all-history checkpoint includes the two deposits before
// the distribution ledger starts. Add only later Transfer events, in wei.
export function buildSourceInflow({transfers,startBlock,throughBlock,blockHash,cutoff,balance,checkpoint=seed}) {
  ensure(Number.isSafeInteger(throughBlock)&&throughBlock>=checkpoint.throughBlock&&startBlock<=checkpoint.throughBlock+1,'SOURCE_INFLOW_LEDGER_GAP');
  let total=BigInt(checkpoint.total_wei),expected=BigInt(checkpoint.balance_wei),count=checkpoint.transfer_events;
  const seen=new Set();
  for(const event of transfers){
    const block=event.order?.[0];
    ensure(Number.isSafeInteger(block)&&block>=startBlock&&block<=throughBlock,'SOURCE_INFLOW_INVALID_EVENT');
    if(block<=checkpoint.throughBlock||event.from!==checkpoint.source&&event.to!==checkpoint.source)continue;
    ensure(typeof event.id==='string'&&!seen.has(event.id)&&uint(event.value),'SOURCE_INFLOW_DUPLICATE_OR_INVALID_EVENT');seen.add(event.id);
    const value=BigInt(event.value);
    if(event.to===checkpoint.source){total+=value;expected+=value;if(value>0n)count++;}
    if(event.from===checkpoint.source)expected-=value;
  }
  ensure(uint(balance)&&expected>=0n&&expected===BigInt(balance),'SOURCE_INFLOW_BALANCE_MISMATCH');
  return {version:1,method:'transfer-events-v1',token:checkpoint.token,source:checkpoint.source,scope:'all-history-gross',seedBlock:checkpoint.seedBlock??checkpoint.throughBlock,
    throughBlock,blockHash,cutoff,total_wei:total.toString(),transfer_events:count,balance_wei:balance,reconciled:true};
}

export function validSourceInflow(value,snapshot) {
  try{
    const block=snapshot?.block??snapshot?.throughBlock;
    return value?.version===1&&value.token===seed.token&&value.source===seed.source&&(!snapshot.token||snapshot.token===seed.token)&&(!snapshot.source||snapshot.source===seed.source)&&value.scope==='all-history-gross'&&value.reconciled===true&&value.seedBlock===seed.throughBlock&&
      Number.isSafeInteger(value.throughBlock)&&value.throughBlock>=seed.throughBlock&&value.throughBlock<=block&&hash(value.blockHash)&&
      (value.throughBlock!==block||value.blockHash===snapshot.blockHash)&&Number.isFinite(value.cutoff)&&value.cutoff>=seed.cutoff&&value.cutoff<=snapshot.cutoff&&
      uint(value.total_wei)&&BigInt(value.total_wei)>=BigInt(seed.total_wei)&&uint(value.balance_wei)&&
      Number.isSafeInteger(value.transfer_events)&&value.transfer_events>=seed.transfer_events;
  }catch{return false;}
}
export function newerSourceInflow(current,next,snapshot){
  const prior=validSourceInflow(current,snapshot)?current:null;
  return validSourceInflow(next,snapshot)&&(!prior||next.throughBlock>=prior.throughBlock&&next.cutoff>=prior.cutoff&&BigInt(next.total_wei)>=BigInt(prior.total_wei)&&next.transfer_events>=prior.transfer_events)?next:prior;
}
export function isSourceInflowAligned(value,snapshot){
 return validSourceInflow(value,snapshot)&&value.throughBlock===snapshot.block&&value.blockHash===snapshot.blockHash&&value.cutoff===snapshot.cutoff;
}
