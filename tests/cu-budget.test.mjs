import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRpc} from '../server/esim/rpc.mjs';
import {createCuMeter,quoteCu,cuErrorCode} from '../server/esim/cu-budget.mjs';
import {workerFailureCode} from '../scripts/esim/hourly-worker.mjs';

test('forty paid eth_call members cost 1040 CU; JSON RPC batching is not a discount',async()=>{
 const transport=makeRpc({endpoint:'https://example.invalid',shared:null,minIntervalMs:0,
  fetch:async(_,options)=>({ok:true,status:200,json:async()=>JSON.parse(options.body).map(c=>({id:c.id,result:'0x0'}))})});
 await transport.batch(Array.from({length:40},(_,i)=>['eth_call',[{to:'0x1',data:String(i)},'0x123']]));
 assert.equal(transport.stats.estimatedCu,1040);
});

test('async CU admission cannot let concurrent chunks exceed the physical HTTP cap',async()=>{
 let sent=0;
 const transport=makeRpc({endpoint:'https://example.invalid',shared:null,minIntervalMs:0,budget:1,
  fetch:async(_,options)=>{sent++;return {ok:true,status:200,json:async()=>JSON.parse(options.body).map(c=>({id:c.id,result:'0x0'}))};}});
 await assert.rejects(transport.batch(Array.from({length:81},(_,i)=>['eth_call',[{to:'0x1',data:String(i)},'0x123']])),/QUERY_LIMIT/);
 assert.equal(sent,1);assert.equal(transport.stats.physical,1);
});

test('slow CU admission cannot send an already expired request',async t=>{
 let now=1000;t.mock.method(Date,'now',()=>now);
 const meter={stats:{estimatedCu:26},charge:async()=>{now+=1000;}};
 const transport=makeRpc({endpoint:'https://example.invalid',shared:null,meter,timeoutMs:100,
  fetch:async()=>assert.fail('expired request must not be sent')});
 await assert.rejects(transport.rpc('eth_call',[{},'0x1']),/QUERY_LIMIT/);
 assert.equal(transport.stats.physical,0);
});

test('billing methods include trace and NFT costs and reject unknown costs',()=>{
 assert.equal(quoteCu(['eth_chainId','eth_blockNumber','eth_getLogs','alchemy_getAssetTransfers','trace_filter','getNFTsForOwner']).units,710);
 assert.throws(()=>quoteCu(['unknown']),/CU_UNKNOWN_METHOD/);
});

test('budget deferral survives holder and depth child process errors',()=>{
 assert.equal(workerFailureCode({stderr:'CU_BUDGET_DEFERRED\n'}),'CU_BUDGET_DEFERRED');
 assert.equal(workerFailureCode({stderr:'CU_METER_UNAVAILABLE\n'}),'CU_METER_UNAVAILABLE');
 assert.equal(cuErrorCode(new Error('private URL',{cause:new Error('CU_BUDGET_DEFERRED')})),'CU_BUDGET_DEFERRED');
});

test('budget denial happens before transport and keeps retry time',async()=>{
 const meter=createCuMeter({mode:'enforce',task:'core',query:async()=>({rows:[{admitted:false,retry_at_ms:12345}]})});
 const t=makeRpc({endpoint:'https://example.invalid',shared:null,meter,fetch:async()=>assert.fail('denied batch must not be sent')});
 await assert.rejects(t.rpc('eth_call',[{},'0x1']),e=>e.message==='CU_BUDGET_DEFERRED'&&e.retryAt===12345);
 assert.equal(t.stats.estimatedCu,0);assert.equal(t.stats.physical,0);
});

test('observe mode records metering gaps, enforcement fails closed, neither leaks transport URLs',async()=>{
 const warnings=[],broken=()=>{throw Error('private credential must not escape');};
 const observe=createCuMeter({mode:'observe',task:'mm',query:broken,warning:e=>warnings.push(e)});
 await observe.charge(['eth_call']);assert.equal(observe.stats.estimatedCu,26);
 assert.deepEqual(warnings,[{phase:'cu-meter-unavailable',task:'mm'}]);
 const enforce=createCuMeter({mode:'enforce',task:'mm',query:broken});
 await assert.rejects(enforce.charge(['eth_call']),/^Error: CU_METER_UNAVAILABLE$/);
});

test('a hung metering DB has a deadline and observe mode does not delay every following request',{timeout:250},async()=>{
 let queries=0;const warnings=[];
 const observe=createCuMeter({mode:'observe',task:'core',timeoutMs:5,warning:e=>warnings.push(e),query:()=>{queries++;return new Promise(()=>{});}});
 await observe.charge(['eth_call']);await observe.charge(['eth_call']);
 assert.equal(queries,1);assert.equal(warnings.length,1);assert.equal(observe.stats.unpersistedCu,52);
 const enforced=createCuMeter({mode:'enforce',timeoutMs:5,query:()=>new Promise(()=>{})});
 await assert.rejects(enforced.charge(['eth_call']),/CU_METER_UNAVAILABLE/);
});

test('viem multicall is one paid outer eth_call, and REST NFT pages are counted separately',async()=>{
 const meter=createCuMeter(),sent=[];
 const request=async(url,options)=>{sent.push(url);return {ok:true};};
 await meter.wrapFetch(request)('https://example.invalid/private',{body:JSON.stringify({method:'eth_call',params:[{data:'multicall-data'},'latest']})});
 await meter.wrapFetch(request,{method:'getNFTsForOwner'})('https://example.invalid/private',{});
 assert.equal(meter.stats.estimatedCu,506);assert.equal(meter.stats.attemptedCalls,2);
 assert(!JSON.stringify(meter.stats).includes('private'));
});

test('all shared-cache hits spend zero CU; each network retry is counted',async()=>{
 let sent=0;
 const transport=makeRpc({endpoint:'https://example.invalid',shared:null,minIntervalMs:0,sleep:async()=>{},
  fetch:async()=>++sent===1?{ok:false,status:429,json:async()=>({error:{code:429}})}:{ok:true,status:200,json:async()=>[{id:0,result:'0x1'}]}});
 await transport.rpc('eth_getBalance',['0x1','0x123']);
 assert.equal(transport.stats.estimatedCu,40);
 const {sharedRpcKey}=await import('../server/esim/shared-data.mjs');
 const hit=makeRpc({endpoint:'https://example.invalid',shared:{read:async calls=>new Map(calls.map(c=>[sharedRpcKey(c.method,c.params),'0x0'])),write:async()=>{}},fetch:async()=>assert.fail('cache should avoid request')});
 await hit.rpc('eth_call',[{to:'0x1'},'0x123']);assert.equal(hit.stats.estimatedCu,0);
});
