import {encodeFunctionData,parseAbi} from 'viem';
import {TOKEN} from './metrics.mjs';
import {V2,V3,V4,TRANSFER,addr,eventKey,decodeLeg,attributionCandidates,attributedRows} from './attribution.mjs';

const FACTORY='0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865';
const V2_FACTORY='0xca143ce32fe78f1f7019d7d551a6402fc5350c73';
const abi=parseAbi(['function getPool(address,address,uint24) view returns (address)','function getPair(address,address) view returns (address)']);
const hex=n=>'0x'+n.toString(16);
const word=value=>{if(!/^0x[0-9a-f]{64}$/i.test(value||''))throw Error('CLASSIC_POOL_METADATA_MISSING');return value;};

export async function discoverClassicPools(events,pools,{batch,rpc},checkpoint,end){
 const unknown=[...new Set(events.filter(e=>(V3.has(e.topics[0])||e.topics[0]===V2)&&!pools[e.address.toLowerCase()]).map(e=>e.address.toLowerCase()))];
 if(!unknown.length)return {};
 const tokens=await batch(unknown.flatMap(to=>['0x0dfe1681','0xd21220a7'].map(data=>['eth_call',[{to,data},hex(end)]])));
 const added={};
 for(const [i,id] of unknown.entries()){
  const token0=addr(word(tokens[i*2])),token1=addr(word(tokens[i*2+1]));
  if(![token0,token1].includes(TOKEN))continue;
  const v3=events.some(e=>e.address.toLowerCase()===id&&V3.has(e.topics[0]));
  const expected=v3?FACTORY:V2_FACTORY;
  const metadata=await batch((v3?['0xc45a0155','0xddca3f43']:['0xc45a0155']).map(data=>['eth_call',[{to:id,data},hex(end)]]));
  if(addr(word(metadata[0]))!==expected)throw Error('NEW_ESIM_POOL_REQUIRES_SYNC');
  const fee=v3?Number(BigInt(word(metadata[1]))):null;
  if(v3&&(!Number.isSafeInteger(fee)||fee<=0||fee>0xffffff))throw Error('CLASSIC_POOL_METADATA_MISSING');
  const canonical=await rpc('eth_call',[{to:expected,data:encodeFunctionData({abi,functionName:v3?'getPool':'getPair',args:v3?[token0,token1,fee]:[token0,token1]})},hex(end)]);
  if(addr(word(canonical))!==id)throw Error('CLASSIC_POOL_IDENTITY_MISMATCH');
  // Earlier token activity must be replayed before the pool can advance the checkpoint.
  let historyFrom=null;
  for(const field of ['fromAddress','toAddress']){
   const history=await rpc('alchemy_getAssetTransfers',[{fromBlock:'0x0',toBlock:hex(checkpoint),[field]:id,contractAddresses:[TOKEN],category:['erc20'],excludeZeroValue:true,maxCount:'0x1',order:'asc'}]);
   if(!Array.isArray(history?.transfers))throw Error('INDEX_INCOMPLETE');
   if(history.pageKey&&!history.transfers.length)throw Error('INDEX_INCOMPLETE');
   for(const transfer of history.transfers){
    if(!/^0x[0-9a-f]+$/i.test(transfer.blockNum||''))throw Error('NEW_ESIM_POOL_HISTORY_REQUIRES_BACKFILL');
    const block=Number(BigInt(transfer.blockNum));
    if(!Number.isSafeInteger(block)||block<0||block>checkpoint)throw Error('INDEX_INCOMPLETE');
    historyFrom=historyFrom===null?block:Math.min(historyFrom,block);
   }
  }
  added[id]={id,manager:id,token0,token1,fee,verified:`Pancake V${v3?3:2} factory`,discoveredAfter:checkpoint,historyFrom};
 }
 return added;
}

export async function backfillClassicTrades(state,added,transport){
 const {batch,rpc}=transport,pools={...state.pools,...added},queries=[];
 for(const [id,pool] of Object.entries(added))if(pool.historyFrom!==null){
  for(let start=pool.historyFrom;start<=state.block;start+=5000)queries.push(['eth_getLogs',[{address:id,topics:[[V2,...V3]],fromBlock:hex(start),toBlock:hex(Math.min(start+4999,state.block))}]]);
 }
 if(!queries.length)return state.trades;
 const events=[...new Map((await batch(queries)).flat().map(e=>[eventKey(e),e])).values()];
 if(!events.length)return state.trades;
 const ensure=(ok,code)=>{if(!ok)throw Error(code);};
 for(const e of events)ensure(!e.removed&&added[e.address.toLowerCase()]&&Number(BigInt(e.blockNumber))>=added[e.address.toLowerCase()].historyFrom&&Number(BigInt(e.blockNumber))<=state.block,'EVENT_RANGE');
 const hashes=[...new Set(events.map(e=>e.transactionHash))];
 const values=await batch(hashes.map(h=>['eth_getTransactionReceipt',[h]]));
 const receipts=Object.fromEntries(hashes.map((h,i)=>[h,values[i]]));
 for(const [i,r] of values.entries())ensure(r?.transactionHash===hashes[i]&&r.status==='0x1','MISSING_RECEIPT');
 const headers=Object.fromEntries((await batch([...new Set(values.map(r=>r.blockNumber))].map(b=>['eth_getBlockByNumber',[b,false]]))).map(h=>[h.number,h]));
 for(const r of values){const h=headers[r.blockNumber];ensure(h?.hash===r.blockHash&&h.transactions[Number(BigInt(r.transactionIndex))]===r.transactionHash,'RECEIPT_CANONICAL');}
 for(const e of events){const r=receipts[e.transactionHash];ensure(r.blockHash===e.blockHash&&r.logs.some(l=>eventKey(l)===eventKey(e)&&l.address===e.address&&l.data===e.data),'EVENT_RECEIPT_MISMATCH');}
 for(const r of values)for(const e of r.logs)if((e.topics[0]===V2||V3.has(e.topics[0]))&&!pools[e.address.toLowerCase()]){
  ensure(!r.logs.some(t=>t.address.toLowerCase()===TOKEN&&t.topics[0]===TRANSFER&&t.topics.slice(1).some(a=>addr(a)===e.address.toLowerCase())),'NEW_ESIM_POOL_HISTORY_REQUIRES_BACKFILL');
 }
 // Recompute the whole affected transaction so an old known-pool leg is not counted twice.
 const legs=values.flatMap(r=>r.logs.filter(e=>(V2===e.topics[0]||V3.has(e.topics[0])||V4.has(e.topics[0]))&&pools[V4.has(e.topics[0])?e.topics[1]:e.address.toLowerCase()]).map(e=>{
  const h=headers[r.blockNumber],ts=h.milliTimestamp?Number(BigInt(h.milliTimestamp))/1000:Number(BigInt(h.timestamp));
  return decodeLeg(e,pools,ts);
 })).filter(l=>BigInt(l.amount_wei)>0n);
 const candidates=attributionCandidates(legs,receipts,state.firstRecipient,pools);
 const owners=[...new Set(candidates.flatMap(c=>c.owners.filter(o=>!o.claimBefore).map(o=>o.address)))];
 const code=await batch(owners.map(a=>['eth_getCode',[a,hex(state.block)]]));
 const rows=attributedRows(candidates,Object.fromEntries(owners.map((a,i)=>[a,code[i]]))).map(t=>({...t,initiator:receipts[t.tx].from.toLowerCase(),executor:receipts[t.tx].to?.toLowerCase()||null}));
 for(const side of ['sell','buy'])ensure(legs.filter(l=>l.side===side).reduce((n,l)=>n+BigInt(l.amount_wei),0n)===rows.filter(r=>r.side===side).reduce((n,r)=>n+BigInt(r.amount_wei),0n),'AMOUNTS_DONT_RECONCILE');
 const after=await rpc('eth_getBlockByNumber',[hex(state.block),false],{fresh:true});
 ensure(after?.hash===state.blockHash,'CHAIN_OR_CHECKPOINT_CHANGED');
 return [...state.trades.filter(t=>!receipts[t.tx]),...rows].sort((a,b)=>a.block-b.block||a.tx.localeCompare(b.tx));
}
