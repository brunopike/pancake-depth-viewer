import test from 'node:test';
import assert from 'node:assert/strict';
import {collectClaimFlow} from '../server/esim/claim-flow-collector.mjs';
import {TOKEN,SOURCE} from '../server/esim/metrics.mjs';
import {TRANSFER,topic,signature} from '../server/esim/attribution.mjs';
import {SOURCE_INFLOW_SEED} from '../server/esim/source-inflows.mjs';
const a=n=>'0x'+n.toString(16).padStart(40,'0'),h=n=>'0x'+n.toString(16).padStart(64,'0');
const log=(b,from,to,v)=>({address:TOKEN,topics:[TRANSFER,topic(from),topic(to)],data:'0x'+v.toString(16),blockNumber:'0x'+b.toString(16),transactionIndex:'0x0',logIndex:'0x0',transactionHash:h(b),removed:false});
const state=end=>({token:TOKEN,source:SOURCE,block:end,blockHash:h(end),cutoff:1000,pools:{},trades:[],distributions:[{id:h(100)+':0x0',block:100,recipient:a(1),value:'100'}]});
test('candidate receipts are verified before one replay, including zero-origin fills and excluding earlier history',async()=>{
 const logs=[log(100,SOURCE,a(1),100),log(101,a(2),a(9),50)],requested=[],s={...state(101),pools:{[a(9)]:{}},trades:[99,101].map(block=>({tx:h(block),block,timestamp:block,side:'sell',address:a(2),amount_wei:'50'}))};
 const transport={batch:async calls=>calls.map(([method,p])=>{
  if(method==='eth_chainId')return '0x38';if(method==='eth_getBlockByNumber')return {hash:h(Number(BigInt(p[0])))};
  if(method==='eth_getLogs')return logs;
  assert.equal(method,'eth_getTransactionReceipt');requested.push(p[0]);return {transactionHash:h(101),blockHash:h(101),blockNumber:'0x65',status:'0x1',logs:[logs[1]]};
 }),rpc:async()=>({hash:h(101)})};
 const result=await collectClaimFlow(s,transport,{readBalances:async(addresses,block)=>addresses.map(address=>address===a(1)?block==='0x63'?'0':'100':block==='0x63'?'100':'50')});
 assert.deepEqual(requested,[h(101)]);assert.equal(result.report.totals.sold_wei,'0');assert.equal(result.report.totals.remaining_wei,'100');
});
test('fixed ESIM logs backfill once and increment from the saved block, with opening and closing reconciliation',async()=>{
 const requests=[],logs=[log(100,SOURCE,a(1),100),log(101,a(1),a(2),20),log(103,a(2),a(1),10)];
 const transport={batch:async calls=>Promise.all(calls.map(async([method,p])=>{
  if(method==='eth_chainId')return '0x38';if(method==='eth_getBlockByNumber')return {hash:h(Number(BigInt(p[0])))};
  const q=p[0];requests.push(q);return logs.filter(e=>BigInt(e.blockNumber)>=BigInt(q.fromBlock)&&BigInt(e.blockNumber)<=BigInt(q.toBlock));
 })),rpc:async(_,[block])=>({hash:h(Number(BigInt(block)))})};
 const balances=async(addresses,block)=>addresses.map(addr=>BigInt(block)===99n?'0':addr===a(1)?BigInt(block)===102n?'80':'90':BigInt(block)===102n?'20':'10');
 const first=await collectClaimFlow(state(102),transport,{readBalances:balances});assert.equal(first.report.totals.remaining_wei,'100');
 const progress=[],next=await collectClaimFlow(state(104),transport,{previous:JSON.parse(JSON.stringify(first)),readBalances:balances,progress:e=>progress.push(e)});assert.equal(requests.at(-1).fromBlock,'0x67');assert(requests.every(q=>q.address===TOKEN&&q.topics[0]===TRANSFER));
 assert.equal(progress.find(e=>e.phase==='claim-origin-replay').total,1);
 const full=await collectClaimFlow(state(104),transport,{readBalances:balances});assert.deepEqual(next.report,full.report);assert.deepEqual(next.replayWallets,full.replayWallets);
 const changed=[],reclassified={...state(104),pools:{[a(9)]:{}}};
 const rebuilt=await collectClaimFlow(reclassified,transport,{previous:first,readBalances:balances,progress:e=>changed.push(e)});
 assert.equal(changed.find(e=>e.phase==='claim-origin-replay').total,3);assert.deepEqual(rebuilt.report.totals,full.report.totals);assert.notEqual(rebuilt.report.replayInputHash,full.report.replayInputHash);
 await assert.rejects(()=>collectClaimFlow(state(104),transport,{previous:{...first,blockHash:h(9)},readBalances:balances}),/CHECKPOINT_CHANGED/);
});
test('a balance discrepancy prevents publication',async()=>{
 const transport={batch:async calls=>calls.map(([m,p])=>m==='eth_chainId'?'0x38':m==='eth_getBlockByNumber'?{hash:h(Number(BigInt(p[0])))}:[log(100,SOURCE,a(1),100)]),rpc:async()=>({hash:h(100)})};
 await assert.rejects(()=>collectClaimFlow(state(100),transport,{readBalances:async(as,b)=>as.map(()=>b==='0x63'?'0':'99')}),/CLOSING_MISMATCH/);
});
test('a newly recognized market rechecks prior receipt LP safety before rebuilding provenance',async()=>{
 const p=a(8),q=a(9),logs=[log(100,SOURCE,a(1),100),log(101,a(1),p,100)],trades=[{tx:h(101),block:101,timestamp:101,side:'sell',address:a(1),amount_wei:'100'}];
 const transport={batch:async calls=>calls.map(([method,args])=>{
  if(method==='eth_chainId')return '0x38';
  if(method==='eth_getBlockByNumber')return {hash:h(Number(BigInt(args[0])))};
  if(method==='eth_getLogs')return logs;
  return {transactionHash:h(101),blockHash:h(101),blockNumber:'0x65',status:'0x1',logs:[logs[1],{address:q,topics:[signature('Mint(address,uint256,uint256)')]}]};
 }),rpc:async()=>({hash:h(101)})},readBalances=async addresses=>addresses.map(()=> '0');
 const first=await collectClaimFlow({...state(101),pools:{[p]:{}},trades},transport,{readBalances});
 assert.equal(first.report.totals.sold_wei,'100');
 const changed={...state(101),pools:{[p]:{},[q]:{}},trades},rebuilt=await collectClaimFlow(changed,transport,{previous:first,readBalances}),fresh=await collectClaimFlow(changed,transport,{readBalances});
 assert.deepEqual(rebuilt.report,fresh.report);assert.equal(rebuilt.report.totals.sold_wei,'0');assert.equal(rebuilt.report.totals.unconfirmed_pool_wei,'100');
});
test('source gross inflow enrichment pins the seed hash and independently reconciles the contract wallet',async()=>{
 const checkpoint={...SOURCE_INFLOW_SEED,throughBlock:99,blockHash:h(99),cutoff:900,total_wei:'300',transfer_events:1,balance_wei:'300'};
 const requests=[],transport={batch:async calls=>calls.map(([method,p])=>{requests.push([method,p]);return method==='eth_chainId'?'0x38':method==='eth_getBlockByNumber'?{hash:h(Number(BigInt(p[0])))}:[log(100,SOURCE,a(1),100)];}),rpc:async()=>({hash:h(100)})};
 const balances=async(addresses,block)=>addresses.map(addr=>addr===SOURCE?'200':block==='0x63'?'0':'100');
 const result=await collectClaimFlow(state(100),transport,{readBalances:balances,sourceInflowSeed:checkpoint});
 assert.equal(result.report.sourceInflow.total_wei,'300');assert.equal(result.report.sourceInflow.transfer_events,1);assert.equal(result.report.sourceInflow.balance_wei,'200');assert.equal(result.report.modelRevision,3);
 assert(requests.some(([method,p])=>method==='eth_getBlockByNumber'&&p[0]==='0x63'));
 await assert.rejects(()=>collectClaimFlow(state(100),transport,{readBalances:async(addresses,block)=>addresses.map(addr=>addr===SOURCE?'199':block==='0x63'?'0':'100'),sourceInflowSeed:checkpoint}),/SOURCE_INFLOW_BALANCE_MISMATCH/);
 await assert.rejects(()=>collectClaimFlow(state(100),transport,{readBalances:balances,sourceInflowSeed:{...checkpoint,blockHash:h(1)}}),/SOURCE_INFLOW_CHECKPOINT_CHANGED/);
});
