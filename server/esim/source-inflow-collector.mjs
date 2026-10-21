import {SOURCE_INFLOW_SEED as seed,buildSourceInflow,newerSourceInflow} from './source-inflows.mjs';
import {TRANSFER,topic,addr,order} from './attribution.mjs';
const hex=n=>`0x${n.toString(16)}`;
const hash=s=>/^0x[0-9a-f]{64}$/.test(s||'');
const uint=s=>typeof s==='string'&&/^(0|[1-9][0-9]*)$/.test(s)&&BigInt(s)<2n**256n;
const ensure=(ok,code)=>{if(!ok)throw Error(code);};

// Increment the audited Transfer ledger. The balance is a checksum only: no
// missing inflow is ever manufactured from a balance or an outgoing amount.
export async function collectSourceInflow(state,{rpc,batch},{progress=()=>{}}={}){
 ensure(state.token===seed.token&&state.source===seed.source&&state.block>=seed.throughBlock,'SOURCE_INFLOW_INVALID_TARGET');
 const checkpoint=newerSourceInflow(state.sourceInflow,state.claimFlow?.sourceInflow,state)||seed;
 ensure(state.block-checkpoint.throughBlock<=2000000,'SOURCE_INFLOW_BACKFILL_LIMIT');
 const [chain,opening,closing]=await batch([['eth_chainId',[]],['eth_getBlockByNumber',[hex(checkpoint.throughBlock),false]],['eth_getBlockByNumber',[hex(state.block),false]]],{fresh:true});
 ensure(chain==='0x38'&&opening?.hash===checkpoint.blockHash&&closing?.hash===state.blockHash,'SOURCE_INFLOW_CHECKPOINT_CHANGED');
 let openingOut=0n,totalOut=0n;
 const outgoing=[],seenOut=new Set();
 for(const row of state.distributions){
  ensure(uint(row.value)&&Number.isSafeInteger(row.block)&&row.block<=state.block,'SOURCE_INFLOW_INVALID_DISTRIBUTION');
  totalOut+=BigInt(row.value);
  if(row.block<=checkpoint.throughBlock){openingOut+=BigInt(row.value);continue;}
  ensure(hash(row.tx)&&Array.isArray(row.order)&&row.order.length===3&&row.order.every(Number.isSafeInteger)&&row.order[0]===row.block&&/^0x[0-9a-f]{40}$/.test(row.recipient),'SOURCE_INFLOW_INVALID_DISTRIBUTION');
  const id=`${row.tx}:${row.order[2]}`;
  ensure(!seenOut.has(id),'SOURCE_INFLOW_DUPLICATE_DISTRIBUTION');seenOut.add(id);
  outgoing.push({id,order:row.order,from:seed.source,to:row.recipient,value:row.value});
 }
 ensure(openingOut===BigInt(checkpoint.total_wei)-BigInt(checkpoint.balance_wei),'SOURCE_INFLOW_OPENING_MISMATCH');
 const queries=[];
 for(let start=checkpoint.throughBlock+1;start<=state.block;start+=5000)queries.push(['eth_getLogs',[{address:seed.token,topics:[TRANSFER,null,topic(seed.source)],fromBlock:hex(start),toBlock:hex(Math.min(start+4999,state.block))}]]);
 progress({phase:'source-inflow-scan',start:checkpoint.throughBlock+1,end:state.block,ranges:queries.length});
 const pages=await batch(queries),incoming=[],seen=new Set(),rawBlocks=new Map();
 ensure(pages.length===queries.length,'SOURCE_INFLOW_INCOMPLETE');
 for(const [i,page] of pages.entries()){
  ensure(Array.isArray(page)&&page.length<10000,'SOURCE_INFLOW_INCOMPLETE');
  const range=queries[i][1][0];
  for(const raw of page){
   ensure(!raw.removed&&raw.address?.toLowerCase()===seed.token&&raw.topics?.length===3&&raw.topics[0]===TRANSFER&&raw.topics[2]===topic(seed.source)&&raw.topics.slice(1).every(hash)&&/^0x[0-9a-fA-F]{64}$/.test(raw.data)&&hash(raw.transactionHash)&&hash(raw.blockHash),'SOURCE_INFLOW_INVALID_LOG');
   const at=order(raw);
   ensure(at.every(n=>Number.isSafeInteger(n)&&n>=0)&&at[0]>=Number(BigInt(range.fromBlock))&&at[0]<=Number(BigInt(range.toBlock)),'SOURCE_INFLOW_EVENT_RANGE');
   const id=`${raw.transactionHash}:${at[2]}`;
   ensure(!seen.has(id),'SOURCE_INFLOW_DUPLICATE_LOG');seen.add(id);
   ensure(!rawBlocks.has(at[0])||rawBlocks.get(at[0]).hash===raw.blockHash,'SOURCE_INFLOW_LOG_FORK');
   if(!rawBlocks.has(at[0]))rawBlocks.set(at[0],{hash:raw.blockHash,logs:[]});
   rawBlocks.get(at[0]).logs.push(raw);
   incoming.push({id,order:at,from:addr(raw.topics[1]),to:seed.source,value:BigInt(raw.data).toString()});
  }
 }
 ensure(incoming.length<50000,'SOURCE_INFLOW_EVENT_LIMIT');
 const blocks=[...rawBlocks.keys()],headers=await batch(blocks.map(b=>['eth_getBlockByNumber',[hex(b),false]]));
 ensure(headers.length===blocks.length,'SOURCE_INFLOW_INCOMPLETE');
 for(const [i,header] of headers.entries()){
  const raw=rawBlocks.get(blocks[i]);
  ensure(header?.hash===raw.hash&&Number(BigInt(header.number))===blocks[i]&&raw.logs.every(log=>header.transactions?.[Number(BigInt(log.transactionIndex))]===log.transactionHash),'SOURCE_INFLOW_LOG_NOT_CANONICAL');
 }
 // A source-to-source Transfer occurs in both scans but is one event.
 const events=new Map(incoming.map(row=>[row.id,row]));
 for(const row of outgoing){
  const prior=events.get(row.id);
  if(prior)ensure(prior.from===row.from&&prior.to===row.to&&prior.value===row.value&&prior.order.every((n,i)=>n===row.order[i]),'SOURCE_INFLOW_EVENT_CONFLICT');
  else events.set(row.id,row);
 }
 const pinned=state.sourceTokenBalance;
 let balance=pinned?.block===state.block&&pinned.blockHash===state.blockHash&&pinned.cutoff===state.cutoff?pinned.balance_wei:null;
 if(balance===null){
  const raw=await rpc('eth_call',[{to:seed.token,data:`0x70a08231${seed.source.slice(2).padStart(64,'0')}`},hex(state.block)]);
  ensure(typeof raw==='string'&&/^0x[0-9a-f]+$/i.test(raw),'SOURCE_INFLOW_BALANCE_MISSING');balance=BigInt(raw).toString();
 }
 const result=buildSourceInflow({transfers:[...events.values()],startBlock:checkpoint.throughBlock+1,throughBlock:state.block,blockHash:state.blockHash,cutoff:state.cutoff,balance,checkpoint});
 const after=await rpc('eth_getBlockByNumber',[hex(state.block),false],{fresh:true});
 ensure(after?.hash===state.blockHash,'SOURCE_INFLOW_END_HASH_CHANGED');
 progress({phase:'source-inflow-verified',block:state.block,scanned:incoming.length,transfer_events:result.transfer_events});
 return {...result,outgoing_wei:totalOut.toString(),outgoing_transfer_events:state.distributions.length};
}
