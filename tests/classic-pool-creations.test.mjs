import test from 'node:test';
import assert from 'node:assert/strict';
import {TOKEN} from '../server/esim/metrics.mjs';
import {signature,topic} from '../server/esim/attribution.mjs';
import {discoverClassicPoolCreations} from '../server/esim/classic-pools.mjs';
const factories=['0xca143ce32fe78f1f7019d7d551a6402fc5350c73','0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865'];
const pools=['0x'+'12'.repeat(20),'0x'+'34'.repeat(20)],other='0x'+'56'.repeat(20);
function fixture(){
 const calls=[];
 const rpc=async(m,p)=>{calls.push([m,p]);if(m==='alchemy_getAssetTransfers')return {transfers:[]};
  if(m==='eth_getLogs'){
   const i=factories.indexOf(p[0].address);if(p[0].topics[1]!==topic(TOKEN))return [];
   return [{address:factories[i],topics:[signature(i?'PoolCreated(address,address,uint24,int24,address)':'PairCreated(address,address,address,uint256)'),topic(TOKEN),topic(other)],data:i?topic('0x1')+topic(pools[i]).slice(2):topic(pools[i])+topic('0x1').slice(2),blockNumber:'0x65',removed:false}];
  }
  const {to,data}=p[0];if(factories.includes(to))return topic(pools[factories.indexOf(to)]);
  const i=pools.indexOf(to);return {'0x0dfe1681':topic(TOKEN),'0xd21220a7':topic(other),'0xc45a0155':topic(factories[i]),'0xddca3f43':topic('0x64')}[data];
 };
 return {calls,rpc,batch:entries=>Promise.all(entries.map(([m,p])=>rpc(m,p)))};
}
test('official factory creation logs discover V2 and V3 pools without any overlapping known-pool trade',async()=>{
 const t=fixture(),added=await discoverClassicPoolCreations({},t,100,110);
 assert.deepEqual(Object.keys(added).sort(),pools);assert.ok(Object.values(added).every(p=>p.historyFrom===null));
 const logs=t.calls.filter(([m])=>m==='eth_getLogs');assert.equal(logs.length,4);
 assert.ok(logs.every(([,p])=>p[0].fromBlock==='0x65'&&p[0].toBlock==='0x6e'));
 assert.ok(logs.some(([,p])=>p[0].topics[2]===topic(TOKEN)));
});
test('existing factory pools avoid repeated metadata and history queries',async()=>{
 const t=fixture();assert.deepEqual(await discoverClassicPoolCreations(Object.fromEntries(pools.map(p=>[p,{}])),t,100,110),{});
 assert.equal(t.calls.length,4);
});
