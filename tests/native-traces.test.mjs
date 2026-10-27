import test from 'node:test';
import assert from 'node:assert/strict';
import {collectNativeTraces} from '../server/esim/native-traces.mjs';
import {SOURCE} from '../server/esim/metrics.mjs';
test('small trace ranges retain every boundary and paginate without double counting',async()=>{
 const expected=Array.from({length:2501},(_,id)=>({id,block:1+Math.floor(id/10)})),calls=[];
 const got=await collectNativeTraces({rpc:async(method,[q])=>{
  assert.equal(method,'trace_filter');assert.deepEqual(q.fromAddress,[SOURCE]);assert.deepEqual(q.toAddress,[SOURCE]);assert.equal(q.mode,'union');
  const from=Number(q.fromBlock),to=Number(q.toBlock);assert(to-from<100);calls.push(q);
  return expected.filter(r=>r.block>=from&&r.block<=to).slice(q.after,q.after+q.count);
 }},1,251);
 assert.deepEqual(got,expected);assert.equal(new Set(got.map(r=>r.id)).size,2501);assert(calls.some(q=>q.after===1000));
});
test('a timed-out later page restarts in disjoint child ranges without reusing partial rows',async()=>{
 const expected=Array.from({length:1600},(_,id)=>({id,block:1+Math.floor(id/16)}));
 const got=await collectNativeTraces({rpc:async(_, [q])=>{
  const from=Number(q.fromBlock),to=Number(q.toBlock);
  if(to-from===99&&q.after)throw Error('RPC_QUERY_TIMEOUT');
  return expected.filter(r=>r.block>=from&&r.block<=to).slice(q.after,q.after+q.count);
 }},1,100);
 assert.deepEqual(got,expected);
});
test('quota, malformed response and an unrecoverable child abort rather than return an incomplete list',async()=>{
 for(const message of ['RPC_CAPACITY_EXCEEDED','QUERY_LIMIT','RPC_MEMBER_FAILED']){
  let calls=0;await assert.rejects(collectNativeTraces({rpc:async()=>{calls++;throw Error(message);}},1,100),new RegExp(message));assert.equal(calls,1);
 }
 await assert.rejects(collectNativeTraces({rpc:async()=>null},1,1),/TRACE_INCOMPLETE/);
 await assert.rejects(collectNativeTraces({rpc:async(_, [q])=>{if(Number(q.toBlock)>=2)throw Error('RPC_QUERY_TIMEOUT');return [{block:1}];}},1,2),/RPC_QUERY_TIMEOUT/);
});
