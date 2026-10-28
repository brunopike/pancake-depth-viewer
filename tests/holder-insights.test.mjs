import test from 'node:test';
import assert from 'node:assert/strict';
import {holderInsights,sellerProfile,holderViewURL,displayEsimBalance} from '../src/holder-insights.mjs';
import {readSnapshot,readTradingReport,newerSnapshot} from '../src/snapshot-client.mjs';
import {selectHolders} from '../src/holder-model.mjs';
const a=n=>'0x'+n.toString(16).padStart(40,'0');
const tag=(id,kind=id)=>({id,kind,text:id});
const row=(n,balance,tags=[])=>({address:a(n),balance:String(balance),tags});
test('report external circulation uses the holder-page exclusions and mixed-wallet split',()=>{
 const unit=10n**18n,rows=[
  {address:'0x588177775e6fba9e752d0c9dfd5bbb562e8f016a',balance:String(500000n*unit),tags:[]},
  {address:'0xa7d81e889f2df910389c95fa0f9d6092220edf87',balance:String(15000000n*unit),tags:[]},
  {address:'0x238a358808379702088667322f80ac48bad5e6c4',balance:String(4000000n*unit),tags:[]},
  row(1,String(100n*unit)),
 ];
 const x=holderInsights({rows,totalSupply:String(20000000n*unit),cutoff:1});
 assert.equal(x.circulation.external,String(410024n*unit));
 assert.equal(x.circulation.nonExternal,String(19090076n*unit));
 assert.equal(x.circulation.top10,100);
 assert.equal(new URL(holderViewURL({scope:'external-stat'})).searchParams.get('scope'),'external-stat');
});
test('recipient states partition addresses and balances; wallet stock is not inferred from sells',()=>{
 const rows=[row(1,100,[tag('received')]),row(2,60,[tag('received'),tag('received-sold','sold')]),row(3,0,[tag('received'),tag('cleared')]),row(4,0,[tag('received'),tag('received-zero','cleared')]),row(5,800,[tag('own-lp','lp'),tag('known','own')]),row(6,40)];
 const before=structuredClone(rows),x=holderInsights({rows,cutoff:5,block:1,price:.06});
 assert.deepEqual(x.states.map(s=>s.count),[1,1,1,1]);assert.equal(x.received,'160');assert.equal(x.receivedCount,4);
 assert.equal(x.own,'800');assert.equal(x.external,'200');assert.equal(BigInt(x.own)+BigInt(x.external),BigInt(x.total));
 assert.equal(x.source,null);assert.equal(x.externalTop10,100);assert.deepEqual(rows,before);
 for(const state of x.states){const selected=selectHolders({rows},{cohort:state.id,includeZero:true});assert.equal(selected.total,state.count);assert.equal(selected.all.reduce((n,r)=>n+BigInt(r.balance),0n).toString(),state.balance);}
});
test('manual own classification excludes robots and updates report cohorts consistently',()=>{
 const r=row(7,10,[tag('frequency')]),manual={[r.address]:{kind:'own',text:'我方'}};
 const x=holderInsights({rows:[r],cutoff:5,block:1,price:.06},manual);
 assert.equal(x.own,'10');assert.equal(x.external,'0');assert.equal(x.externalTop10,null);assert.equal(x.manualCount,1);
 const p=sellerProfile({address:r.address,own:false,highFrequency:true,received:false},r,manual);
 assert.equal(p.own,true);assert.equal(p.frequency,false);assert(!p.tags.some(t=>t.kind==='frequency'));
 assert.equal(sellerProfile({address:a(8),received:false}).balance,null);
});
test('drill-through carries an explicit holder filter, address and zero-holder selection',()=>{
 const u=new URL(holderViewURL({tags:['received','own'],search:a(1),zero:true}));
 assert.equal(u.searchParams.get('view'),'holders');assert.equal(u.searchParams.get('tags'),'received,own');assert.equal(u.searchParams.get('search'),a(1));assert.equal(u.searchParams.get('zero'),'1');
});
test('snapshot refresh cache-busts only fixed sources, falls back and never regresses or invents data',async()=>{
 const data={version:1,block:4,cutoff:4,token:'0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d',rows:[]};let calls=[];
 const fetch=async(u,o)=>{calls.push([u,o]);if(calls.length===1)throw Error('offline');return{ok:true,json:async()=>data};};
 assert.equal((await readSnapshot('holders',{fetch})).source,'background');assert(calls.every(([u,o])=>u.includes('?t=')&&o.cache==='no-store'));
 const current={...data,block:6};assert.equal((await readSnapshot('holders',{current,fetch:async()=>({ok:true,json:async()=>data})})).data,current);
 assert.equal((await readSnapshot('holders',{current,fetch:async()=>{throw Error('offline')}})).source,'retained');
 await assert.rejects(readSnapshot('holders',{fetch:async()=>({ok:true,json:async()=>({...data,token:'other'})})}),/无法读取/);
});
test('published snapshots win equal blocks; external-host failure falls back to bundled data',async()=>{
 const data={version:1,block:10,cutoff:10,token:'0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d',rows:[]};const calls=[];
 const fetch=async u=>{calls.push(u);return {ok:true,json:async()=>data};};
 assert.equal((await readSnapshot('holders',{fetch})).source,'published');assert.equal(calls.length,2);assert(calls[0].startsWith('./data/current-esim-holders.json?'));
 let i=0;assert.equal((await readSnapshot('holders',{fetch:async()=>{if(++i<3)throw Error('blocked');return {ok:true,json:async()=>data};}})).source,'bundled');
});
test('current receipt and historical robot labels cannot change the prior trading window filters',()=>{
 const r=row(9,10,[tag('received'),tag('frequency')]);
 const p=sellerProfile({address:r.address,received:false,highFrequency:false},r);
 assert.equal(p.received,false);assert.equal(p.frequency,false);assert(p.tags.some(t=>t.text==='当前领过币'));
});
test('unchanged balance from a newer query still shows its newer source time',()=>{
 const holder=row(1,100),report={block:100,cutoff:1000};
 assert.deepEqual(displayEsimBalance({block:200,timestamp:2000,esim:'100'},holder,report),{balance:'100',cutoff:2000,source:'live'});
 assert.equal(displayEsimBalance({block:50,timestamp:500,esim:'50'},holder,report).source,'snapshot');
 assert.equal(newerSnapshot({block:200},{block:100}).block,200);
});
test('user-confirmed arbitrage wallet is classified consistently without an automatic duplicate',()=>{
 const address='0x278d858f05b94576c1e6f73285886876ff6ef8d2',r={...row(1,120),address};
 const p=sellerProfile({address,received:false,highFrequency:false},r);
 assert.equal(p.frequency,true);assert.equal(p.own,false);assert(p.tags.some(t=>t.text==='套利机器人（用户确认）'));
 assert.deepEqual(holderInsights({rows:[r],block:1,cutoff:1,price:.06}).robots,{balance:'120',count:1});
});
test('initial report uses static data without paid query; failed manual live request retains saved report',async()=>{
 const data={version:1,token:'0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d',block:100,cutoff:1000,windows:{today:{}}};
 const fetch=async()=>({ok:true,json:async()=>data});let paid=0;
 const queryLive=async()=>{paid++;throw Error('503');};
 assert.equal((await readTradingReport({fetch,queryLive})).data,data);assert.equal(paid,0);
 assert.equal((await readTradingReport({fetch,queryLive,live:true})).data,data);assert.equal(paid,1);
});
