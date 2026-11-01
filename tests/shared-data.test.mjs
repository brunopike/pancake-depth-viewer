import test from 'node:test';import assert from 'node:assert/strict';
import {sharedRpcKey,fixedRead,loadSharedRegistry,sharedCache} from '../server/esim/shared-data.mjs';
import {makeRpc} from '../server/esim/rpc.mjs';
import {CONFIRMED_HOLDER_LABELS} from '../src/holder-labels.mjs';
import {EXECUTION_LABELS} from '../server/esim/execution-categories.mjs';
import {externalScope} from '../server/esim/external-cohort.mjs';
test('shared fixed-block hit avoids another paid query; explicit fresh bypasses both caches',async()=>{
 const params=['0x123',false],q=sharedRpcKey('eth_getBlockByNumber',params);let network=0,writes=0;
 const t=makeRpc({endpoint:'https://example.invalid',shared:{read:async()=>new Map([[q,{number:'0x123'}]]),write:async()=>{writes++;}},fetch:async()=>{network++;return{ok:true,status:200,json:async()=>[{id:0,result:{number:'0x123'}}]};},minIntervalMs:0});
 assert.deepEqual(await t.rpc('eth_getBlockByNumber',params),{number:'0x123'});assert.equal(network,0);assert.equal(t.stats.sharedHits,1);
 await t.rpc('eth_getBlockByNumber',params,{fresh:true});assert.equal(network,1);assert.equal(writes,1);
});
test('nested moving bounds cannot enter common fixed-block cache',()=>{for(const tag of ['latest','pending','safe','finalized'])assert.equal(fixedRead('eth_getLogs',[{toBlock:tag}]),false);assert.equal(fixedRead('eth_blockNumber',[]),false);assert.equal(fixedRead('eth_call',[{},'0x123']),true);});
test('large historical cache reads stay bounded and retain every verified hit',async()=>{
 const calls=Array.from({length:1201},(_,i)=>({method:'eth_getTransactionReceipt',params:['0x'+i.toString(16)]})),sizes=[];
 const cache=sharedCache({query:async(_,[keys])=>{sizes.push(keys.length);assert(keys.length<=500);return keys.map(key=>({key,result:{verified:true}}));}});
 const found=await cache.read(calls);
 assert.deepEqual(sizes,[500,500,201]);assert.equal(found.size,1201);
 assert(calls.every(c=>found.get(sharedRpcKey(c.method,c.params)).verified));
});
test('new MM ownership reaches holder and execution labels without changing a mixed wallet',async()=>{
 const address='0x'+'a'.repeat(40),mixed='0x588177775e6fba9e752d0c9dfd5bbb562e8f016a',old=structuredClone(CONFIRMED_HOLDER_LABELS[mixed]),before=externalScope().mmCount;
 try{await loadSharedRegistry({query:async()=>[{address,kind:'own',label:'我方做市',evidence:'已登记',mm_included:true},{address:mixed,kind:'own',label:'wrong',mm_included:true}]});assert.equal(CONFIRMED_HOLDER_LABELS[address].kind,'own');assert.equal(EXECUTION_LABELS[address].category,'own');assert.equal(externalScope().mmCount,before+1);assert.deepEqual(CONFIRMED_HOLDER_LABELS[mixed],old);}finally{delete CONFIRMED_HOLDER_LABELS[address];delete EXECUTION_LABELS[address];}
});
