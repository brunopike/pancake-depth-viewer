import test from 'node:test';
import assert from 'node:assert/strict';
import {canReuseHolderBalances,BALANCE_IMPLEMENTATION} from '../server/esim/holder-balance-guard.mjs';

test('incremental balances fail closed on changed implementations or unavailable checks',async()=>{
 const previous={block:100,priorBlock:10};
 assert.equal(await canReuseHolderBalances({batch:async()=>{throw Error('RPC_UNAVAILABLE');}},previous,110,20),false);
 let observed;
 assert.equal(await canReuseHolderBalances({batch:async calls=>{observed=calls;return ['0x'+'0'.repeat(64)];}},previous,110,20),false);
 assert.equal(observed.filter(([method])=>method==='eth_getStorageAt').length,4);
 const scans=observed.filter(([method])=>method==='eth_getLogs').map(([,params])=>params[0]);
 assert.deepEqual(scans.map(s=>[s.fromBlock,s.toBlock]),[['0x65','0x6e'],['0xb','0x14']]);
 assert(scans.every(s=>s.topics.length===1));
});

test('matching implementation address alone cannot authorize balance reuse',async()=>{
 const pointer='0x'+BALANCE_IMPLEMENTATION.address.slice(2).padStart(64,'0');
 const transport={batch:async()=>[pointer,pointer,pointer,pointer,'0x','0x',[],[]]};
 assert.equal(await canReuseHolderBalances(transport,{block:100,priorBlock:10},110,20),false);
});
