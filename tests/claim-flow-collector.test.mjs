import test from 'node:test';
import assert from 'node:assert/strict';
import {collectClaimFlow} from '../server/esim/claim-flow-collector.mjs';
import {TOKEN,SOURCE} from '../server/esim/metrics.mjs';
import {TRANSFER,topic} from '../server/esim/attribution.mjs';
const a=n=>'0x'+n.toString(16).padStart(40,'0'),h=n=>'0x'+n.toString(16).padStart(64,'0');
const log=(b,from,to,v)=>({address:TOKEN,topics:[TRANSFER,topic(from),topic(to)],data:'0x'+v.toString(16),blockNumber:'0x'+b.toString(16),transactionIndex:'0x0',logIndex:'0x0',transactionHash:h(b),removed:false});
const state=end=>({token:TOKEN,source:SOURCE,block:end,blockHash:h(end),cutoff:1000,pools:{},trades:[],distributions:[{id:h(100)+':0x0',block:100,recipient:a(1),value:'100'}]});
test('fixed ESIM logs backfill once and increment from the saved block, with opening and closing reconciliation',async()=>{
 const requests=[],logs=[log(100,SOURCE,a(1),100),log(101,a(1),a(2),20),log(103,a(2),a(1),10)];
 const transport={batch:async calls=>Promise.all(calls.map(async([method,p])=>{
  if(method==='eth_chainId')return '0x38';if(method==='eth_getBlockByNumber')return {hash:h(Number(BigInt(p[0])))};
  const q=p[0];requests.push(q);return logs.filter(e=>BigInt(e.blockNumber)>=BigInt(q.fromBlock)&&BigInt(e.blockNumber)<=BigInt(q.toBlock));
 })),rpc:async(_,[block])=>({hash:h(Number(BigInt(block)))})};
 const balances=async(addresses,block)=>addresses.map(addr=>BigInt(block)===99n?'0':addr===a(1)?BigInt(block)===102n?'80':'90':BigInt(block)===102n?'20':'10');
 const first=await collectClaimFlow(state(102),transport,{readBalances:balances});assert.equal(first.report.totals.remaining_wei,'100');
 await collectClaimFlow(state(104),transport,{previous:first,readBalances:balances});assert.equal(requests.at(-1).fromBlock,'0x67');assert(requests.every(q=>q.address===TOKEN&&q.topics[0]===TRANSFER));
 await assert.rejects(()=>collectClaimFlow(state(104),transport,{previous:{...first,blockHash:h(9)},readBalances:balances}),/CHECKPOINT_CHANGED/);
});
test('a balance discrepancy prevents publication',async()=>{
 const transport={batch:async calls=>calls.map(([m,p])=>m==='eth_chainId'?'0x38':m==='eth_getBlockByNumber'?{hash:h(Number(BigInt(p[0])))}:[log(100,SOURCE,a(1),100)]),rpc:async()=>({hash:h(100)})};
 await assert.rejects(()=>collectClaimFlow(state(100),transport,{readBalances:async(as,b)=>as.map(()=>b==='0x63'?'0':'99')}),/CLOSING_MISMATCH/);
});
