import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRpc} from '../server/esim/rpc.mjs';

test('a transient HTTP 429 retries within the physical request budget',async()=>{
 let calls=0;const delays=[];
 const rpc=makeRpc({endpoint:'https://example.invalid/private',budget:3,sleep:async n=>delays.push(n),fetch:async()=>++calls===1?{ok:false,status:429,json:async()=>({error:{code:429,message:'Throughput limit'}})}:{ok:true,json:async()=>[{id:0,result:'0x38'}]}});
 assert.equal(await rpc.rpc('eth_chainId',[]),'0x38');
 assert.equal(calls,2);assert.equal(rpc.stats.physical,2);assert.equal(delays.length,1);
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
