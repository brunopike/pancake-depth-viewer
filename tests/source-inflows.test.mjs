import test from 'node:test';
import assert from 'node:assert/strict';
import {SOURCE_INFLOW_SEED as seed,buildSourceInflow,validSourceInflow,newerSourceInflow} from '../server/esim/source-inflows.mjs';
import {buildReport,ORIGIN} from '../server/esim/metrics.mjs';
import {enrichClaimFlowSnapshot} from '../src/claim-flow-client.mjs';
import {readSnapshot,readTradingReport} from '../src/snapshot-client.mjs';
import {attachClaimFlow} from '../server/esim/store.mjs';
const h=n=>'0x'+n.toString(16).padStart(64,'0'),other='0x'+'1'.repeat(40);
const end=seed.throughBlock+10,cutoff=seed.cutoff+10;
const event=(id,block,from,to,value)=>({id,order:[block,0,Number(id)],from,to,value:String(value)});
const snapshot={version:1,token:seed.token,source:seed.source,block:end,blockHash:h(end),cutoff};
const build=(transfers=[],balance=seed.balance_wei,extra={})=>buildSourceInflow({transfers,startBlock:126376724,throughBlock:end,blockHash:h(end),cutoff,balance,...extra});
const flow=extra=>({version:1,method:'proportional-v1',modelRevision:3,token:seed.token,source:seed.source,throughBlock:end,blockHash:h(end),cutoff,sales:[],unconfirmedFlows:[],...extra});

test('all-history seed includes deposits before the distribution ledger, and unchanged refreshes retain exact wei/counts',()=>{
 assert.equal(seed.total_wei,'30107845345513670974954265');assert.equal(seed.transfer_events,1575);
 const r=build();assert.equal(r.total_wei,seed.total_wei);assert.equal(r.transfer_events,1575);assert.equal(r.balance_wei,seed.balance_wei);assert(validSourceInflow(r,snapshot));
 assert.deepEqual(build([],seed.balance_wei),r);
});
test('gross incoming counts returns and self-transfers, not net balance; one tx may have separate transfer events',()=>{
 const incoming=9007199254740993001n;
 const rows=[event('1',seed.throughBlock,other,seed.source,999),event('2',seed.throughBlock+1,other,seed.source,incoming),event('3',end,seed.source,seed.source,7),event('4',end,seed.source,other,3),event('5',end,other,seed.source,0),event('6',end,other,other,888)];
 const before=structuredClone(rows),balance=(BigInt(seed.balance_wei)+incoming-3n).toString(),r=build(rows,balance);
 assert.equal(r.total_wei,(BigInt(seed.total_wei)+incoming+7n).toString());assert.equal(r.transfer_events,1577);assert.equal(r.balance_wei,balance);assert.deepEqual(rows,before);
 assert.deepEqual(build(rows,balance),r);
});
test('duplicates, missing coverage, future events, and reconciliation discrepancies are rejected',()=>{
 const r=event('1',end,other,seed.source,2);
 assert.throws(()=>build([r,r],(BigInt(seed.balance_wei)+4n).toString()),/DUPLICATE/);
 assert.throws(()=>build([r],seed.balance_wei),/BALANCE_MISMATCH/);
 assert.throws(()=>build([],'0',{startBlock:seed.throughBlock+2}),/LEDGER_GAP/);
 assert.throws(()=>build([],'0',{throughBlock:seed.throughBlock-1}),/LEDGER_GAP/);
 assert.throws(()=>build([event('1',end+1,other,seed.source,1)]),/INVALID_EVENT/);
});
test('unreconciled, foreign, malformed and future metrics cannot replace a verified report value',()=>{
 const current=build();
 for(const bad of [null,{}, {...current,total_wei:'-1'},{...current,total_wei:1},{...current,total_wei:'0'},{...current,reconciled:false},{...current,source:other},{...current,token:other},{...current,throughBlock:end+1},{...current,blockHash:h(1)},{...current,cutoff:cutoff+1},{...current,transfer_events:1574}]){
  assert.equal(validSourceInflow(bad,snapshot),false);assert.equal(newerSourceInflow(current,bad,snapshot),current);
 }
 const older={...current,throughBlock:end-1,blockHash:h(end-1),cutoff:cutoff-1};assert.equal(newerSourceInflow(current,older,snapshot),current);
 assert.equal(newerSourceInflow(null,null,snapshot),null);
 const advanced=build([event('1',end,other,seed.source,10)],(BigInt(seed.balance_wei)+10n).toString()),later={...snapshot,block:end+1,blockHash:h(end+1),cutoff:cutoff+1};
 for(const lower of [{...advanced,total_wei:seed.total_wei},{...advanced,transfer_events:seed.transfer_events},{...advanced,cutoff:cutoff-1}]){
  const next={...lower,throughBlock:end+1,blockHash:h(end+1)};assert(validSourceInflow(next,later));assert.equal(newerSourceInflow(advanced,next,later),advanced);
 }
});
test('the fixed report summary carries its independent source cutoff; all trading/distribution windows remain unchanged',()=>{
 const state={...snapshot,origin:ORIGIN,trades:[],distributions:[],calls:[],native:[],firstRecipient:{}};
 const prior=buildReport(state,cutoff),value=build();
 const next=buildReport({...state,claimFlow:flow({sourceInflow:value})},cutoff);
 assert.equal(next.sourceInflow.total_wei,seed.total_wei);assert.equal(next.sourceInflow.cutoff,cutoff);
 for(const key of ['today','yesterday','history']){assert.deepEqual(next.windows[key].groups,prior.windows[key].groups);assert.deepEqual(next.windows[key].distribution,prior.windows[key].distribution);assert.deepEqual(next.windows[key].bnb,prior.windows[key].bnb);}
 assert.equal(prior.sourceInflow,null);
});
test('browser enrichment adds the metric to old static reports without paid calls or overwriting a later metric',()=>{
 const windows={history:{start:seed.cutoff-20,end:cutoff,groups:{all_pools:{sold_wei:'42'}}}},value=build();
 const old={...snapshot,windows},before=structuredClone(old);
 const enriched=enrichClaimFlowSnapshot('report',old,flow({sourceInflow:value}));
 assert.equal(enriched.sourceInflow.total_wei,value.total_wei);assert.deepEqual(enriched.windows.history.groups,old.windows.history.groups);assert.deepEqual(old,before);
 assert.equal(enrichClaimFlowSnapshot('report',enriched,flow({sourceInflow:{...value,total_wei:'bad'}})).sourceInflow,value);
 const early={...value,throughBlock:end-1,cutoff:cutoff-1,blockHash:h(end-1)};
 assert.equal(enrichClaimFlowSnapshot('report',enriched,flow({sourceInflow:early})).sourceInflow,value);
 assert.equal(enrichClaimFlowSnapshot('report',old,flow({sourceInflow:{...value,throughBlock:end+1}})).sourceInflow,null);
});
test('refresh and optional live-query failures retain the last verified independent inflow counter',async()=>{
 const current={...snapshot,windows:{},sourceInflow:build()},raw={...snapshot,windows:{}};
 const fetch=async url=>{if(url.includes('claim-flow'))throw Error('temporarily offline');return {ok:true,json:async()=>raw};};
 assert.equal((await readSnapshot('report',{current,fetch})).data.sourceInflow,current.sourceInflow);
 const later={...raw,block:end+1,blockHash:h(end+1),cutoff:cutoff+1};
 const live=await readTradingReport({current,fetch,live:true,queryLive:async()=>later});assert.equal(live.data.block,later.block);assert.equal(live.data.sourceInflow,current.sourceInflow);assert.equal(live.data.sourceInflow.cutoff,cutoff);
 const retained=await readTradingReport({current,fetch:async()=>{throw Error('offline');},live:true,queryLive:async()=>{throw Error('offline');}});assert.equal(retained.data.sourceInflow,current.sourceInflow);
});
test('bad inline fields are removed before rendering when no verified prior metric is available',async()=>{
 for(const sourceInflow of [{...build(),total_wei:'malformed'},{...build(),cutoff:cutoff+3600},{...build(),throughBlock:end+1},{}]){
  const raw={...snapshot,windows:{},sourceInflow},fetch=async url=>{if(url.includes('claim-flow'))throw Error('offline');return {ok:true,json:async()=>raw};};
  assert.equal((await readSnapshot('report',{fetch})).data.sourceInflow,null);
  const live=await readTradingReport({fetch,live:true,queryLive:async()=>({...raw,block:end+1,blockHash:h(end+1)})});assert.equal(live.data.sourceInflow,null);
 }
});
test('server attachment cannot downgrade a corrected same-block flow or erase its compatible cumulative metric',()=>{
 const totals={issued_wei:'0',sold_wei:'0',direct_wei:'0',relay_wei:'0',unconfirmed_pool_wei:'0',remaining_wei:'0',returned_wei:'0',burned_wei:'0'};
 const current={...snapshot,claimFlow:flow({totals,sourceInflow:build()})};
 assert.equal(attachClaimFlow(current,flow({totals,modelRevision:2})),current);
 const later=flow({totals,throughBlock:end+1,blockHash:h(end+1),cutoff:cutoff+1});
 const attached=attachClaimFlow({...current,block:end+1,blockHash:h(end+1),cutoff:cutoff+1},later);
 assert.equal(attached.claimFlow.throughBlock,end+1);assert.equal(attached.claimFlow.sourceInflow,current.claimFlow.sourceInflow);
});
