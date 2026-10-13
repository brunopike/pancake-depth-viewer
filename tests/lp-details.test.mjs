import test from 'node:test';
import assert from 'node:assert/strict';
import { lpDetails } from '../src/lp-details.mjs';
import { inventorySplit, ownedInventory, MIN_TICK, MAX_TICK } from '../src/math.mjs';
import { OWNERS, CL_POSITION_MANAGER, validateOwnership, validateOwnershipIndex } from '../src/ownership.mjs';
const L=1000n*10n**18n;
const base={id:'base',decimals:18},quote={id:'quote',decimals:18};
const pos=(owner,id,lower,upper,liquidity)=>({owner,tokenId:id,manager:CL_POSITION_MANAGER,tickLower:lower,tickUpper:upper,liquidity});
const pool={id:'pool',protocol:'infinityCl',kind:'cl',token0:base,token1:quote,sqrtPriceX96:2n**96n,tick:0,spacing:10,liquidity:L,
 fullRange:true,minTick:MIN_TICK,maxTick:MAX_TICK,ticks:[{index:-200,net:L},{index:200,net:-L},{index:1000,net:L},{index:1200,net:-L}],
 ownership:{status:'verified',positions:[pos(OWNERS[0],'1',-200,200,L/4n),pos(OWNERS[1],'2',-200,200,L/4n),pos(OWNERS[2],'1570878',1000,1200,L)]}};
const v2={id:'v2',kind:'v2',protocol:'v2',token0:base,token1:quote,reserve0:1000e18,reserve1:4000e18,
 ownership:{status:'verified',totalSupply:10n,ownBalance:7n,shares:OWNERS.map((owner,i)=>({owner,ownBalance:[1n,2n,3n,1n][i]}))}};
const near=(a,b)=>assert.ok(Math.abs(a-b)<Math.max(1,Math.abs(b))*1e-10,`${a} != ${b}`);
test('Four wallets, individual LPs and whole/own/external totals reconcile in either token order',()=>{
 for(const baseId of ['base','quote']){
  const wallets=lpDetails([pool,v2],baseId), split=inventorySplit([pool,v2],baseId);
  assert.deepEqual(wallets.map(w=>w.owner),OWNERS);
  for(const key of ['base','quote']){
   near(wallets.reduce((sum,w)=>sum+w[key],0),split.own[key]);
   near(split.own[key]+split.external[key],split.total[key]);
   for(const w of wallets)near(w.positions.reduce((sum,p)=>sum+p[key],0),w[key]);
  }
  const third=wallets[2].positions.find(p=>p.tokenId==='1570878');
  assert.equal(third.pool.id,'pool');assert.equal(third.owner,OWNERS[2]);
  assert.ok(third.bounds[0]<third.bounds[1]);
  assert.equal(third[baseId==='base'?'quote':'base'],0);
 }
});
test('Adding the third owner reclassifies its distant position without changing any pool inventory',()=>{
 const old={...pool,ownership:{...pool.ownership,positions:pool.ownership.positions.slice(0,2)}};
 const before=inventorySplit([old],'base'),after=inventorySplit([pool],'base');
 assert.deepEqual(before.total,after.total);
 const third=lpDetails([pool],'base')[2];
 near(after.own.base-before.own.base,third.base);
 near(before.external.base-after.external.base,third.base);
 assert.equal(after.own.quote,before.own.quote);
});
test('Missing attribution or old positive V2 totals cannot be presented as per-wallet zeros',()=>{
 assert.throws(()=>lpDetails([],'base'));
 assert.throws(()=>lpDetails([{...pool,ownership:{status:'unavailable'}}],'base'));
 assert.throws(()=>lpDetails([{...v2,ownership:{...v2.ownership,shares:undefined}}],'base'));
 const empty={...pool,ownership:{status:'verified',positions:[]}};
 assert.ok(lpDetails([empty],'base').every(w=>w.base===0&&w.quote===0&&w.positions.length===0));
 const bad={...v2,ownership:{...v2.ownership,shares:OWNERS.map(owner=>({owner,ownBalance:0n}))}};
 assert.throws(()=>validateOwnership(bad));
});
test('An older checkpoint is rejected after adding the fourth wallet',()=>{
 const index={version:1,chainId:56,blockNumber:100n,blockHash:'0x'+'1'.repeat(64),owners:OWNERS.slice(0,3),nfts:[]};
 assert.throws(()=>validateOwnershipIndex(index));
 assert.equal(validateOwnershipIndex({...index,owners:OWNERS}).owners.length,4);
});
