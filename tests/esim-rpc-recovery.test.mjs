import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRpc} from '../server/esim/rpc.mjs';

test('a transient HTTP 429 retries within the physical request budget',async()=>{
 let calls=0;const delays=[];
 const rpc=makeRpc({endpoint:'https://example.invalid/private',budget:3,sleep:async n=>delays.push(n),fetch:async()=>++calls===1?{ok:false,status:429,json:async()=>({error:{code:429,message:'Throughput limit'}})}:{ok:true,json:async()=>[{id:0,result:'0x38'}]}});
 assert.equal(await rpc.rpc('eth_chainId',[]),'0x38');
 assert.equal(calls,2);assert.equal(rpc.stats.physical,2);assert(delays.some(n=>n>=1000));
});
test('concurrent chunks reserve paced starts and expensive trace reads stay separate',async()=>{
 const delays=[],sizes=[];
 const rpc=makeRpc({endpoint:'https://example.invalid',sleep:async n=>delays.push(n),fetch:async(_,options)=>{const calls=JSON.parse(options.body);sizes.push(calls.length);return {ok:true,json:async()=>calls.map(c=>({id:c.id,result:[]}))};}});
 await rpc.batch(Array.from({length:120},()=>['eth_getTransactionReceipt',['hash']]));
 assert(delays.some(n=>n>=200));assert(delays.some(n=>n>=400));
 await rpc.batch([['trace_filter',[]],['trace_filter',[]]]);assert.deepEqual(sizes.slice(-2),[1,1]);
});
test('monthly exhaustion is explicit, sanitized, and stops subsequent requests without retry',async()=>{
 for(const status of [200,429]){
  let calls=0;const progress=[];
  const rpc=makeRpc({endpoint:'https://example.invalid/private',sleep:()=>assert.fail('monthly quota must not retry'),progress:e=>progress.push(e),fetch:async()=>{calls++;return {ok:status===200,status,json:async()=>({error:{code:429,message:'Monthly capacity limit exceeded. https://example.invalid/private'}})};}});
  await assert.rejects(rpc.rpc('eth_chainId',[]),e=>e.message==='RPC_CAPACITY_EXCEEDED');
  await assert.rejects(rpc.rpc('eth_chainId',[]),/RPC_CAPACITY_EXCEEDED/);
  assert.equal(calls,1);assert(!JSON.stringify(progress).includes('private'));
 }
});
test('rate limits cannot silently become empty data or exceed the retry budget',async()=>{
 let calls=0;
 const rpc=makeRpc({endpoint:'https://example.invalid',budget:2,sleep:async()=>{},fetch:async()=>{calls++;return {ok:true,json:async()=>[{id:0,error:{code:429,message:'throughput'}}]};}});
 await assert.rejects(rpc.rpc('eth_getLogs',[]),/QUERY_LIMIT/);assert.equal(calls,2);
});

test('each concurrent chunk receives its own full transient retry allowance',async()=>{
 const attempts=new Map();
 const rpc=makeRpc({endpoint:'https://example.invalid',budget:9,minIntervalMs:0,sleep:async()=>{},fetch:async(_,options)=>{
  const calls=JSON.parse(options.body),key=calls[0].params[0],attempt=(attempts.get(key)||0)+1;attempts.set(key,attempt);
  return attempt<3?{ok:false,status:429,json:async()=>({error:{code:429,message:'throughput'}})}:{ok:true,status:200,json:async()=>calls.map(c=>({id:c.id,result:c.params[0]}))};
 }});
 const values=await rpc.batch(Array.from({length:120},(_,i)=>['eth_getTransactionReceipt',[String(i)]]));
 assert.equal(values.length,120);assert.deepEqual([...attempts.values()],[3,3,3]);assert.equal(rpc.stats.physical,9);
});
test('trace timeouts allow range recovery but preserve quota and keep provider text private',async()=>{
 for(const mode of ['provider','transport']){
  const progress=[];
  const rpc=makeRpc({endpoint:'https://example.invalid/private',progress:e=>progress.push(e),fetch:async()=>{
   if(mode==='transport')throw new DOMException('private','TimeoutError');
   return {ok:true,status:200,json:async()=>[{id:0,error:{code:-32002,message:'Execution timed out at https://example.invalid/private'}}]};
  }});
  await assert.rejects(rpc.rpc('trace_filter',[{}]),/RPC_QUERY_TIMEOUT/);
  assert(!JSON.stringify(progress).includes('private'));
 }
});
