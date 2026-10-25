import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshDueSnapshots,workerFailureCode,assertWorkerHealthy} from '../scripts/esim/hourly-worker.mjs';
import {SNAPSHOT_INTERVAL_MS as hour} from '../src/snapshot-status.mjs';
import {SOURCE_INFLOW_SEED as seed} from '../server/esim/source-inflows.mjs';
const now=(seed.cutoff+100000)*1000,h=n=>'0x'+n.toString(16).padStart(64,'0');
const snapshot=(kind,cutoff,offset=100)=>{const block=seed.throughBlock+offset;return {version:1,block,blockHash:h(block),cutoff,token:seed.token,source:seed.source,...(kind==='holders'?{rows:[],tradeCutoff:cutoff}:{windows:{},sourceInflow:{...seed,seedBlock:seed.throughBlock,throughBlock:block,blockHash:h(block),cutoff,reconciled:true}})};};
test('fresh datasets survive worker handoff without any paid reads or website builds',async()=>{
 const values={report:snapshot('report',now/1000-600),holders:snapshot('holders',now/1000-300)};
 const next=await refreshDueSnapshots({now:()=>now,read:async k=>values[k],refresh:()=>assert.fail('duplicate paid read'),publishSite:()=>assert.fail('duplicate build')});
 assert.equal(next,now+50*60000);
});
test('an overdue report also synchronizes holder trades and dispatches one website publication',async()=>{
 const values={report:snapshot('report',now/1000-7200),holders:snapshot('holders',now/1000-600)},reads=[];let published=0;
 const next=await refreshDueSnapshots({now:()=>now,read:async k=>values[k],refresh:async k=>{reads.push(k);values[k]=snapshot(k,now/1000,200);},publishSite:async()=>published++});
 assert.deepEqual(reads,['report','holders']);assert.equal(published,1);assert.equal(next,now+hour);
});
test('a failed transaction update never blocks the independent holder update or creates immediate retries',async()=>{
 const values={report:snapshot('report',now/1000-7200),holders:snapshot('holders',now/1000-7200)},errors=[];let published=0;
 const next=await refreshDueSnapshots({now:()=>now,read:async k=>values[k],refresh:async k=>{if(k==='report')throw Error('private transport detail');values[k]=snapshot(k,now/1000,200);},publishSite:async()=>published++,onError:k=>errors.push(k)});
 assert.deepEqual(errors,['report']);assert.equal(published,1);assert.equal(next,now+hour);
});
test('unavailable checkpoints and unchanged results are not paid-loop success or new publications',async()=>{
 const errors=[];let calls=0;
 const next=await refreshDueSnapshots({now:()=>now,read:async k=>{if(k==='report')throw Error('unavailable');return snapshot(k,now/1000-7200);},refresh:async()=>calls++,publishSite:()=>assert.fail('unchanged snapshot'),onError:k=>errors.push(k)});
 assert.equal(calls,1);assert.deepEqual(errors,['report','holders']);assert.equal(next,now+hour);
});
test('a fresh report with an outdated inflow ledger is immediately synchronized, even without a new closing block',async()=>{
 const values={report:snapshot('report',now/1000-600),holders:snapshot('holders',now/1000-300)},reads=[];let published=0;
 delete values.report.sourceInflow;
 const next=await refreshDueSnapshots({now:()=>now,read:async k=>values[k],refresh:async k=>{reads.push(k);values[k]=snapshot(k,values[k].cutoff);},publishSite:async()=>published++});
 assert.deepEqual(reads,['report']);assert.equal(published,1);assert.equal(next,now+50*60000);
});
test('worker preserves a safe quota failure reason and reports recovery independently',async()=>{
 const values={report:snapshot('report',now/1000-7200),holders:snapshot('holders',now/1000-600)},errors=[],success=[];
 await refreshDueSnapshots({now:()=>now,read:async k=>values[k],refresh:async()=>{throw Error('RPC_CAPACITY_EXCEEDED');},publishSite:()=>assert.fail('no data changed'),onError:(k,e)=>errors.push([k,workerFailureCode(e)]),onSuccess:k=>success.push(k)});
 assert.deepEqual(errors,[['report','RPC_CAPACITY_EXCEEDED']]);assert.deepEqual(success,['holders']);
 assert.equal(workerFailureCode({stderr:'private URL\nESIM refresh stopped: RPC_CAPACITY_EXCEEDED. Last verified checkpoint preserved.\n'}),'RPC_CAPACITY_EXCEEDED');
 assert.equal(workerFailureCode(Error('https://private.example/secret')),'UPDATE_FAILED');
 assert.equal(workerFailureCode({stderr:'ESIM refresh stopped: DIRECT_CALL_INDEX_MISMATCH. Last verified checkpoint preserved.\n'}),'DIRECT_CALL_INDEX_MISMATCH');
 assert.throws(()=>assertWorkerHealthy(new Set(['report'])),/SNAPSHOT_UPDATE_FAILED/);
 assert.doesNotThrow(()=>assertWorkerHealthy(new Set()));
});
test('a verified partial backfill publishes its progress and resumes after a minute',async()=>{
 const values={report:snapshot('report',now/1000-7200),holders:snapshot('holders',now/1000)},errors=[];let published=0;
 const next=await refreshDueSnapshots({now:()=>now,read:async k=>values[k],refresh:async k=>{assert.equal(k,'report');values[k]=snapshot('report',now/1000-3600,200);throw Error('QUERY_LIMIT');},publishSite:async()=>published++,onError:(k,e)=>errors.push([k,e.message])});
 assert.equal(next,now+60000);assert.equal(published,1);assert.deepEqual(errors,[['report','QUERY_LIMIT']]);
});
test('a fresh balance snapshot still updates when its trade checkpoint trails the report',async()=>{
 const values={report:snapshot('report',now/1000-600),holders:{...snapshot('holders',now/1000-300),tradeCutoff:now/1000-7200}},calls=[];
 await refreshDueSnapshots({now:()=>now,read:async k=>values[k],refresh:async k=>{calls.push(k);values[k]={...values[k],tradeCutoff:values.report.cutoff};},publishSite:async()=>{}});
 assert.deepEqual(calls,['holders']);
});
