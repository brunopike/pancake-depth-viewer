import test from 'node:test';
import assert from 'node:assert/strict';
import {CLAIM_FLOW_URL,validClaimFlow,enrichClaimFlowSnapshot,readClaimFlowSnapshot} from '../src/claim-flow-client.mjs';
import {readSnapshot} from '../src/snapshot-client.mjs';

const token='0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d',source='0x67b97c3845438f264965ca154ba13051c6c73416';
const address=n=>'0x'+n.toString(16).padStart(40,'0'),hash=n=>'0x'+n.toString(16).padStart(64,'0');
const sale=(n,timestamp,direct,relay)=>({address:address(n),tx:hash(timestamp+n),block:timestamp,timestamp,amount_wei:String(direct+relay),direct_wei:String(direct),relay_wei:String(relay),examples:[{root:relay?address(99):address(n),path:[address(99),address(n)],txs:[hash(timestamp+n)],hops:1,truncated:false}]});
const flow=()=>({version:1,method:'proportional-v1',token,source,throughBlock:200,blockHash:hash(200),cutoff:200,sales:[sale(1,20,10,0),sale(2,90,0,20),sale(2,100,0,3),sale(3,180,5,5),sale(4,200,0,2)],unconfirmedFlows:[{tx:hash(999),address:null,block:100,timestamp:100,amount_wei:'1'}]});
const row=(n,received=false)=>({address:address(n),sold:'100',bought:'2',received,balance:'10',tags:[]});
const snapshot=(kind='report',block=200)=>({version:1,token,source,block,blockHash:hash(block),cutoff:200,...(kind==='holders'?{rows:[row(2),row(3),row(4)]}:{windows:Object.fromEntries([['yesterday',0,100],['today',100,300],['history',0,300]].map(([key,start,end])=>[key,{start,end,groups:{all_pools:{sold_wei:'1000'}},...(kind==='addresses'?{initiator:{missingSold:'7',rows:[row(1,true),row(2),row(3,true),row(4)]},funding:{missingSold:'7',rows:[row(1,true),row(2),row(3,true),row(4)]}}:{})}]))})});

test('claim-flow validator accepts only compatible metadata and normal sale evidence',()=>{
 const data=snapshot(),valid=flow();assert(validClaimFlow(valid,data));
 const invalid=[{version:2},{method:'exact'},{token:address(1)},{source:address(1)},{blockHash:'hash'},{blockHash:hash(199)},{throughBlock:201},{cutoff:201},{sales:[{...valid.sales[0],timestamp:201}]},{sales:[{...valid.sales[0],block:201}]},{sales:[{...valid.sales[0],address:'a'}]},{sales:[{...valid.sales[0],amount_wei:'-1'}]},{sales:[{...valid.sales[0],direct_wei:'11'}]},{sales:[{...valid.sales[0],relay_wei:1}]},{sales:[{...valid.sales[0],tx:'not-a-hash'}]},{sales:[{...valid.sales[0],examples:[{root:'invalid',path:[],txs:[],hops:0}]}]},{sales:[valid.sales[0],valid.sales[0]]},{unconfirmedFlows:[{...valid.unconfirmedFlows[0],timestamp:201}]}];
 for(const change of invalid)assert.equal(validClaimFlow({...valid,...change},data),false,JSON.stringify(change));
 assert.equal(validClaimFlow(null,data),false);
 assert.equal(validClaimFlow(valid,{...data,blockHash:undefined}),false);
 assert(validClaimFlow({...valid,throughBlock:199,blockHash:hash(199)},data)===false,'sales cannot exceed their own through block');
 const partial={...valid,throughBlock:199,cutoff:199,blockHash:hash(199),sales:valid.sales.filter(s=>s.timestamp<200),unconfirmedFlows:[]};
 assert(validClaimFlow(partial,data));assert.equal(enrichClaimFlowSnapshot('report',data,partial).windows.today.claimFlow.complete,false);
 const unknown={...valid,unconfirmedFlows:[{...valid.unconfirmedFlows[0],timestamp:null}]};
 assert(validClaimFlow(unknown,data));assert.equal(enrichClaimFlowSnapshot('report',data,unknown).windows.today.claimFlow.pending_wei,null);
});
test('report enrichment uses window boundaries and snapshot cutoff while leaving gross amounts and source objects intact',()=>{
 const data=snapshot(),original=structuredClone(data),f=flow(),beforeFlow=structuredClone(f);
 const next=enrichClaimFlowSnapshot('report',data,f);
 assert.equal(next.windows.yesterday.claimFlow.sold_wei,'30');
 assert.equal(next.windows.today.claimFlow.sold_wei,'13');
 assert.equal(next.windows.history.claimFlow.sold_wei,'43');
 assert.equal(next.windows.today.claimFlow.pending_wei,'1');
 assert.equal(next.windows.today.end,300);assert.equal(next.windows.today.groups.all_pools.sold_wei,'1000');
 assert.equal(next.block,200);assert.equal(next.cutoff,200);assert.equal(next.blockHash,data.blockHash);
 assert.deepEqual(data,original);assert.deepEqual(f,beforeFlow);
 assert.equal(enrichClaimFlowSnapshot('report',data,{...f,cutoff:201}),data);
 const newer={...data,windows:{today:{...data.windows.today,claimFlow:{throughBlock:200,cutoff:200,relay_wei:'100'}}}},older={...f,throughBlock:199,cutoff:199,blockHash:hash(199),sales:f.sales.filter(s=>s.timestamp<200)};
 assert.equal(enrichClaimFlowSnapshot('report',newer,older).windows.today.claimFlow,newer.windows.today.claimFlow);
});
test('fractional legacy timestamps retain exact window membership and cannot exceed the flow cutoff',()=>{
 const data=snapshot(),f={...flow(),cutoff:200.25,sales:[{...sale(2,90,0,20),timestamp:99.75},{...sale(3,180,5,5),timestamp:100.25}],unconfirmedFlows:[{tx:hash(999),address:null,block:100,timestamp:100.5,amount_wei:'1'}]};
 data.cutoff=200.25;
 assert(validClaimFlow(f,data));
 const next=enrichClaimFlowSnapshot('report',data,f);
 assert.equal(next.windows.yesterday.claimFlow.relay_wei,'20');assert.equal(next.windows.today.claimFlow.relay_wei,'5');assert.equal(next.windows.today.claimFlow.pending_wei,'1');
 assert.equal(validClaimFlow({...f,sales:[{...f.sales[0],timestamp:200.5}]},data),false);
 assert.equal(validClaimFlow({...f,sales:[{...f.sales[0],timestamp:NaN}]},data),false);
});
test('address enrichment adds confirmed earlier flags to both modes without future-sale leakage or changing gross rows',()=>{
 const data=snapshot('addresses'),original=structuredClone(data),next=enrichClaimFlowSnapshot('addresses',data,flow());
 for(const mode of ['initiator','funding']){
  const old=next.windows.yesterday[mode].rows,current=next.windows.today[mode].rows;
  assert.equal(old[0].receivedSold,true);assert.equal(old[0].firstReceivedSale,20);
  assert.equal(old[1].relaySold,true);assert.equal(old[1].firstRelaySale,90);
  assert.equal(old[2].relaySold,undefined);assert.equal(old[2].receivedSold,undefined);
  assert.equal(current[1].firstRelaySale,90,'prior relay evidence persists into later periods');
  assert.equal(current[2].relaySold,true);assert.equal(current[2].receivedSold,true);assert.equal(current[2].firstReceivedSale,180);
  assert.equal(current[3].relaySold,undefined,'sale at snapshot cutoff is outside a half-open address window');
  assert.equal(current[2].sold,'100');assert.equal(next.windows.today[mode].missingSold,'7');
 }
 const notRecipient={...data,windows:{today:{...data.windows.today,initiator:{rows:[row(3,false)]}}}};
 assert.equal(enrichClaimFlowSnapshot('addresses',notRecipient,flow()).windows.today.initiator.rows[0].receivedSold,undefined);
 assert.deepEqual(data,original);
});
test('holder enrichment includes a sale at its cutoff, deduplicates relay labels, and does not imply direct receipt',()=>{
 const data=snapshot('holders'),existing={id:'received-relay-sold',kind:'sold',text:'已确认标签'};data.rows[0].tags=[existing];
 const before=structuredClone(data),next=enrichClaimFlowSnapshot('holders',data,flow());
 assert.equal(next.rows[0],data.rows[0]);
 for(const holder of next.rows){assert.equal(holder.tags.filter(t=>t.id==='received-relay-sold').length,1);assert.equal(holder.received,false);}
 assert.match(next.rows[1].tags[0].text,/估算/);assert.deepEqual(data,before);
});
test('missing, malformed or incompatible static flow never discards the chosen snapshot',async()=>{
 const data=snapshot();
 for(const fetch of [async()=>{throw Error('offline');},async()=>({ok:false}),async()=>({ok:true,json:async()=>{throw Error('invalid-json');}}),async()=>({ok:true,json:async()=>({...flow(),cutoff:201})})]){
  assert.equal(await readClaimFlowSnapshot('report',data,{fetch}),data);
 }
 let requests=0;const simplified={...data,blockHash:undefined};
 assert.equal(await readClaimFlowSnapshot('report',simplified,{fetch:async()=>{requests++;}}),simplified);assert.equal(requests,0);
});
test('snapshot selection is unchanged and enrichment adds only one fixed free GET after selecting the newest source',async()=>{
 const calls=[];
 const fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.startsWith(CLAIM_FLOW_URL)?flow():snapshot('addresses',url.includes('raw.githubusercontent')?200:100)};};
 const selected=await readSnapshot('addresses',{fetch});
 assert.equal(selected.source,'background');assert.equal(selected.data.block,200);assert.equal(selected.data.windows.today.initiator.rows[1].relaySold,true);
 assert.equal(calls.length,3);assert(calls[2].url.startsWith(CLAIM_FLOW_URL+'?t='));
 assert(calls.every(call=>call.options.cache==='no-store'&&!call.options.method&&!call.url.includes('state.json')));
 assert(calls[2].options.signal instanceof AbortSignal);
 const retained=await readSnapshot('holders',{current:snapshot('holders',300),fetch});
 assert.equal(retained.source,'retained');assert.equal(retained.data.block,300);assert.equal(retained.data.rows[1].tags[0].id,'received-relay-sold');
});

test('an older model revision cannot replace a corrected estimate at the same cutoff',()=>{
 const data=snapshot();data.windows.history.claimFlow={throughBlock:200,cutoff:200,modelRevision:2,sold_wei:'42'};
 const next=enrichClaimFlowSnapshot('report',data,{...flow(),modelRevision:1});
 assert.equal(next.windows.history.claimFlow,data.windows.history.claimFlow);
});

test('daily history drilldowns refresh from the same flow as the top-level periods',()=>{
 const data=snapshot();data.history=[{date:'prior',start:0,end:100,claimFlow:{throughBlock:10,cutoff:10,sold_wei:'0'}},{date:'today',start:100,end:200,claimFlow:{throughBlock:10,cutoff:10,sold_wei:'0'}}];
 const before=structuredClone(data),next=enrichClaimFlowSnapshot('report',data,flow());
 assert.equal(next.history[0].claimFlow.sold_wei,next.windows.yesterday.claimFlow.sold_wei);
 assert.equal(next.history[1].claimFlow.sold_wei,next.windows.today.claimFlow.sold_wei);
 assert.equal(next.history[0].claimFlow.cutoff,200);assert.deepEqual(data,before);
 const corrected={...data,history:[{...data.history[0],claimFlow:{throughBlock:200,cutoff:200,modelRevision:3,sold_wei:'42'}}]};
 assert.equal(enrichClaimFlowSnapshot('report',corrected,{...flow(),modelRevision:2}).history[0].claimFlow.sold_wei,'42');
});
