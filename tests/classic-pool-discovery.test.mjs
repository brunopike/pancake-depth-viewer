import test from 'node:test';
import assert from 'node:assert/strict';
import {TOKEN} from '../server/esim/metrics.mjs';
import {V2,V3,topic} from '../server/esim/attribution.mjs';
import {discoverClassicPools} from '../server/esim/classic-pools.mjs';
const pool='0x'+'12'.repeat(20),other='0x'+'34'.repeat(20),factory='0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865';
const event={address:pool,topics:[[...V3][0]]};
function transport({token0=TOKEN,owner=factory,resolved=pool,history=[]}={}){
 const calls=[];
 const rpc=async(method,params)=>{calls.push([method,params]);if(method==='alchemy_getAssetTransfers')return {transfers:history};
  const {to,data}=params[0];if(to===factory||to==='0xca143ce32fe78f1f7019d7d551a6402fc5350c73')return topic(resolved);
  return {'0x0dfe1681':topic(token0),'0xd21220a7':topic(other),'0xc45a0155':topic(owner),'0xddca3f43':'0x'+(10000).toString(16).padStart(64,'0')}[data];};
 return {calls,rpc,batch:async entries=>Promise.all(entries.map(([m,p])=>rpc(m,p)))};
}
test('new Pancake V3 pool requires factory identity and no earlier ESIM activity at the checkpoint',async()=>{
 const t=transport(),result=await discoverClassicPools([event],{},t,100,110);
 assert.equal(result[pool].token0,TOKEN);assert.equal(result[pool].token1,other);
 assert.equal(result[pool].manager,pool);assert.equal(result[pool].fee,10000);
 const history=t.calls.filter(([m])=>m==='alchemy_getAssetTransfers');assert.equal(history.length,2);
 for(const [,p] of history){assert.equal(p[0].toBlock,'0x64');assert.deepEqual(p[0].contractAddresses,[TOKEN]);}
 assert.ok(t.calls.filter(([m])=>m==='eth_call').every(([,p])=>p[1]==='0x6e'));
});
test('existing or foreign-token pools do not trigger historical ESIM scans',async()=>{
 const t=transport();assert.deepEqual(await discoverClassicPools([event],{[pool]:{}},t,100,110),{});assert.equal(t.calls.length,0);
 const foreign=transport({token0:other});assert.deepEqual(await discoverClassicPools([event],{},foreign,100,110),{});
 assert.equal(foreign.calls.filter(([m])=>m==='alchemy_getAssetTransfers').length,0);
});
test('unknown factories, mismatched canonical pool addresses and earlier activity stop publication',async()=>{
 await assert.rejects(()=>discoverClassicPools([event],{},transport({owner:other}),100,110),/NEW_ESIM_POOL_REQUIRES_SYNC/);
 await assert.rejects(()=>discoverClassicPools([event],{},transport({resolved:other}),100,110),/CLASSIC_POOL_IDENTITY_MISMATCH/);
 await assert.rejects(()=>discoverClassicPools([event],{},transport({history:[{hash:'prior'}]}),100,110),/NEW_ESIM_POOL_HISTORY_REQUIRES_BACKFILL/);
});

test('canonical Pancake V2 pair is discovered and its earlier ESIM activity schedules a backfill',async()=>{
 const t=transport({owner:'0xca143ce32fe78f1f7019d7d551a6402fc5350c73',history:[{blockNum:'0x50'}]});
 const result=await discoverClassicPools([{...event,topics:[V2]}],{},t,100,110);
 assert.equal(result[pool].token0,TOKEN);assert.equal(result[pool].historyFrom,80);
 assert.equal(t.calls.filter(([m,p])=>m==='eth_call'&&p[0].data==='0xddca3f43').length,0);
});

test('V2 discovery rejects untrusted factories and counterfeit canonical pair addresses',async()=>{
 const v2={...event,topics:[V2]},owner='0xca143ce32fe78f1f7019d7d551a6402fc5350c73';
 await assert.rejects(()=>discoverClassicPools([v2],{},transport({owner:other}),100,110),/NEW_ESIM_POOL_REQUIRES_SYNC/);
 await assert.rejects(()=>discoverClassicPools([v2],{},transport({owner,resolved:other}),100,110),/CLASSIC_POOL_IDENTITY_MISMATCH/);
});
