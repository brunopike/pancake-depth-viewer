import seed from './restaking-seed.json' with {type:'json'};
import {ESIM_STAKE_EVENT} from './return-stakes.mjs';
import {TRANSFER,topic,order} from './attribution.mjs';
import {validRestaking,matchRestakingLogs,advanceRestaking} from './restaking.mjs';
const hex=n=>'0x'+n.toString(16),ensure=(ok,code)=>{if(!ok)throw Error(code);};

export async function collectRestaking(state,{rpc,batch},{progress=()=>{}}={}){
 if(state.block<seed.throughBlock)return null;
 const checkpoint=state.restaking??seed;
 ensure(validRestaking(checkpoint,state),'RESTAKING_INVALID_CHECKPOINT');
 if(checkpoint.throughBlock===state.block)return checkpoint;
 ensure(state.block-checkpoint.throughBlock<=2000000,'RESTAKING_BACKFILL_LIMIT');
 const opening=await rpc('eth_getBlockByNumber',[hex(checkpoint.throughBlock),false],{fresh:true});
 ensure(opening?.hash===checkpoint.blockHash,'RESTAKING_CHECKPOINT_CHANGED');
 const queries=[];
 for(let from=checkpoint.throughBlock+1;from<=state.block;from+=5000){
  const range={fromBlock:hex(from),toBlock:hex(Math.min(from+4999,state.block))};
  queries.push(['eth_getLogs',[{address:seed.source,topics:[ESIM_STAKE_EVENT],...range}]],['eth_getLogs',[{address:seed.token,topics:[TRANSFER,null,topic(seed.source)],...range}]]);
 }
 const pages=await batch(queries);ensure(pages.length===queries.length,'RESTAKING_INCOMPLETE');
 for(const [i,page]of pages.entries()){const range=queries[i][1][0];ensure(Array.isArray(page)&&page.length<10000&&page.every(l=>order(l).every(n=>Number.isSafeInteger(n)&&n>=0)&&order(l)[0]>=Number(BigInt(range.fromBlock))&&order(l)[0]<=Number(BigInt(range.toBlock))),'RESTAKING_EVENT_RANGE');}
 // The inbound filters and block headers reuse the source-inflow collector's fixed-read cache.
 const events=matchRestakingLogs(pages.filter((_,i)=>i%2===0).flat(),pages.filter((_,i)=>i%2===1).flat(),seed);
 const blocks=[...new Set(events.map(e=>e.block))],headers=await batch(blocks.map(b=>['eth_getBlockByNumber',[hex(b),false]])),byBlock=new Map(blocks.map((b,i)=>[b,headers[i]]));
 for(const e of events){const h=byBlock.get(e.block);ensure(h?.hash===e.blockHash&&Number(BigInt(h.number))===e.block&&h.transactions?.includes(e.tx),'RESTAKING_NOT_CANONICAL');e.timestamp=Number(BigInt(h.milliTimestamp||h.timestamp))/(h.milliTimestamp?1000:1);}
 const result=advanceRestaking(checkpoint,events,{startBlock:checkpoint.throughBlock+1,block:state.block,blockHash:state.blockHash,cutoff:state.cutoff});
 const closing=await rpc('eth_getBlockByNumber',[hex(state.block),false],{fresh:true});ensure(closing?.hash===state.blockHash&&validRestaking(result,state),'RESTAKING_END_CHANGED');
 progress({phase:'restaking-verified',block:state.block,added:events.length,events:result.events});return result;
}

// A delayed staking proof must not stall independent trades, BNB or balances.
export async function refreshRestaking(state,transport,{progress=()=>{}}={}){
 try{return {...state,restaking:await collectRestaking(state,transport,{progress}),restakingError:null};}
 catch(error){const code=/^[A-Z_]+$/.test(error.message)?error.message:'RESTAKING_QUERY_FAILED';progress({phase:'restaking-deferred',code,throughBlock:state.restaking?.throughBlock??0});return {...state,restaking:state.restaking??null,restakingError:code};}
}
