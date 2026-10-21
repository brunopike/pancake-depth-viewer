import test from 'node:test';
import assert from 'node:assert/strict';
import {collectSourceInflow} from '../server/esim/source-inflow-collector.mjs';
import {SOURCE_INFLOW_SEED as seed,isSourceInflowAligned} from '../server/esim/source-inflows.mjs';
import {TRANSFER,topic} from '../server/esim/attribution.mjs';
import {buildReport,ORIGIN} from '../server/esim/metrics.mjs';
const h=n=>'0x'+n.toString(16).padStart(64,'0'),hex=n=>'0x'+n.toString(16),other='0x'+'1'.repeat(40);
const end=seed.throughBlock+10001,cutoff=seed.cutoff+100;
const opening={block:seed.throughBlock,value:(BigInt(seed.total_wei)-BigInt(seed.balance_wei)).toString(),timestamp:seed.cutoff-1};
const state=()=>({version:1,token:seed.token,source:seed.source,block:end,blockHash:h(end),cutoff,origin:ORIGIN,distributions:[opening],trades:[],calls:[],native:[],firstRecipient:{}});
const log=(index,value,from=other,block=end)=>({address:seed.token,topics:[TRANSFER,topic(from),topic(seed.source)],data:h(value),transactionHash:h(index+100),blockHash:h(block),blockNumber:hex(block),transactionIndex:hex(index),logIndex:hex(index),removed:false});
function transport(logs=[],balance=seed.balance_wei,override=()=>undefined){
 const calls=[];
 const rpc=async(method,params,options)=>{
  calls.push([method,params,options]);const replacement=override(method,params,options);if(replacement!==undefined)return replacement;
  if(method==='eth_chainId')return '0x38';
  if(method==='eth_call')return hex(BigInt(balance));
  if(method==='eth_getLogs')return logs.filter(e=>BigInt(e.blockNumber)>=BigInt(params[0].fromBlock)&&BigInt(e.blockNumber)<=BigInt(params[0].toBlock));
  if(method==='eth_getBlockByNumber'){
   const block=Number(BigInt(params[0])),transactions=[];
   for(const e of logs.filter(e=>Number(BigInt(e.blockNumber))===block))transactions[Number(BigInt(e.transactionIndex))]=e.transactionHash;
   return {number:hex(block),hash:block===seed.throughBlock?seed.blockHash:h(block),transactions};
  }
  throw Error('unexpected method');
 };
 return {rpc,batch:(queries,options)=>Promise.all(queries.map(([m,p])=>rpc(m,p,options))),calls};
}
test('incoming Transfer amounts are summed exactly, with narrow gapless ranges and the same distribution cutoff',async()=>{
 const input=state(),incoming=9007199254740993001n,logs=[log(0,incoming),log(1,0)],t=transport(logs,(BigInt(seed.balance_wei)+incoming).toString()),before=structuredClone(input);
 const result=await collectSourceInflow(input,t);
 assert.equal(result.total_wei,(BigInt(seed.total_wei)+incoming).toString());assert.equal(result.transfer_events,seed.transfer_events+1);
 assert.equal(result.method,'transfer-events-v1');assert(isSourceInflowAligned(result,input));assert.deepEqual(input,before);
 const queries=t.calls.filter(([m])=>m==='eth_getLogs').map(([,p])=>p[0]);assert.equal(queries.length,3);
 for(const [i,q] of queries.entries()){
  assert.equal(q.address,seed.token);assert.deepEqual(q.topics,[TRANSFER,null,topic(seed.source)]);
  assert.equal(Number(BigInt(q.fromBlock)),seed.throughBlock+1+i*5000);assert.equal(Number(BigInt(q.toBlock)),Math.min(seed.throughBlock+5000+i*5000,end));
 }
 const report=buildReport({...input,sourceInflow:result},cutoff);assert.equal(report.sourceInflow,result);assert(!Object.hasOwn(report,'sourceAccounting'));
 assert.equal(report.windows.history.distribution.total_wei,result.outgoing_wei);
});
test('an incoming and outgoing self-transfer is counted once as gross inflow, without changing balance',async()=>{
 const input=state(),raw=log(0,7,seed.source);
 input.distributions.push({block:end,tx:raw.transactionHash,recipient:seed.source,value:'7',order:[end,0,0]});
 const r=await collectSourceInflow(input,transport([raw]));assert.equal(r.total_wei,(BigInt(seed.total_wei)+7n).toString());assert.equal(r.transfer_events,seed.transfer_events+1);
});
test('balance increases cannot fabricate missing incoming transfers; bad prefixes, duplicate logs and reorgs fail closed',async()=>{
 const input=state(),before=structuredClone(input);
 await assert.rejects(collectSourceInflow(input,transport([],(BigInt(seed.balance_wei)+5n).toString())),/BALANCE_MISMATCH/);
 await assert.rejects(collectSourceInflow({...input,distributions:[]},transport()),/OPENING_MISMATCH/);
 await assert.rejects(collectSourceInflow(input,transport([log(0,1),log(0,1)])),/DUPLICATE_LOG/);
 await assert.rejects(collectSourceInflow(input,transport([],seed.balance_wei,(m,p)=>m==='eth_getBlockByNumber'&&p[0]===hex(seed.throughBlock)?{hash:h(1)}:undefined)),/CHECKPOINT_CHANGED/);
 let boundary=0;
 await assert.rejects(collectSourceInflow(input,transport([],seed.balance_wei,(m,p)=>m==='eth_getBlockByNumber'&&p[0]===hex(end)&&++boundary===2?{hash:h(1)}:undefined)),/END_HASH_CHANGED/);
 assert.deepEqual(input,before);
});
test('foreign tokens, source filters, malformed amounts and noncanonical events are rejected',async()=>{
 for(const raw of [{...log(0,1),address:other},{...log(0,1),topics:[TRANSFER,topic(other),topic(other)]},{...log(0,1),data:'0x1'},{...log(0,1),removed:true},{...log(0,1),blockHash:h(1)}]){
  await assert.rejects(collectSourceInflow(state(),transport([raw])),/INVALID_LOG|NOT_CANONICAL/);
 }
});
test('incremental refresh keeps the original audited anchor and never rescans prior incoming events',async()=>{
 const first=await collectSourceInflow(state(),transport()),next={...state(),block:end+1,blockHash:h(end+1),cutoff:cutoff+1,sourceInflow:first};
 const t=transport([log(0,4,other,end+1)],(BigInt(seed.balance_wei)+4n).toString()),result=await collectSourceInflow(next,t);
 assert.equal(result.seedBlock,seed.throughBlock);assert(isSourceInflowAligned(result,next));assert.equal(result.transfer_events,seed.transfer_events+1);
 assert.equal(t.calls.filter(([m])=>m==='eth_getLogs').length,1);assert.equal(t.calls.find(([m])=>m==='eth_getLogs')[1][0].fromBlock,hex(end+1));
});
