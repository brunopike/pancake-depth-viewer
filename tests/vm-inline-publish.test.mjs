import test from 'node:test';
import assert from 'node:assert/strict';
import * as runtime from '../scripts/esim/vm-worker.mjs';
import {publishCore} from '../scripts/esim/realtime-worker.mjs';
import {SOURCE_INFLOW_SEED as seed} from '../server/esim/source-inflows.mjs';
import {ORIGIN} from '../server/esim/metrics.mjs';
import {refreshNeeded} from '../scripts/esim/realtime-worker.mjs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

test('a completed VM core pass publishes once in the same child without reloading the ledger',async()=>{
 const calls=[];
 await runtime.runCorePass(async(file,args,options)=>{calls.push({file,args,options});},{remote:true,bootstrap:false,block:100});
 assert.deepEqual(calls.map(c=>c.file),['scripts/esim/refresh.mjs']);
 assert.equal(calls[0].options.extra.ESIM_INLINE_CORE_PUBLISH,'true');
});

test('the inline CLI refuses missing fencing credentials before reading or publishing a checkpoint',async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'esim-inline-guard-'));
 try{
  await assert.rejects(promisify(execFile)(process.execPath,[fileURLToPath(new URL('../scripts/esim/refresh.mjs',import.meta.url))],{cwd,env:{PATH:process.env.PATH,ESIM_INLINE_CORE_PUBLISH:'true'}}),error=>{
   assert.match(error.stderr,/WORKER_LEASE_REQUIRED/);return true;
  });
 }finally{await rm(cwd,{recursive:true,force:true});}
});

test('primary and standby catch up after 120 seconds without any notification',()=>{
 const now=1000000,last={core:now-60001,holders:now,archive:now,depth:now,mm:now};
 assert.equal(runtime.dueTask({now,last,cutoff:(now-120000)/1000,pendingBlock:0,block:100}),'core');
 assert.equal(refreshNeeded({now,lastRun:now-120000,cutoff:(now-120000)/1000,pendingBlock:0,block:100}),true);
});

test('only QUERY_LIMIT falls back to publishing a verified saved prefix with an advancing minimum',async()=>{
 const calls=[];
 const partial=await runtime.runCorePass(async(file,args,options)=>{calls.push({file,args,options});if(calls.length===1)throw Error('QUERY_LIMIT');},{remote:false,bootstrap:false,block:100});
 assert.equal(partial,true);assert.equal(calls[1].file,'scripts/esim/vm-task.mjs');
 assert.equal(calls[1].options.extra.ESIM_MIN_BLOCK,'101');
 const failures=[];
 await assert.rejects(runtime.runCorePass(async file=>{failures.push(file);throw Error('AMOUNTS_DONT_RECONCILE');},{block:100}),/AMOUNTS_DONT_RECONCILE/);
 assert.equal(failures.length,1);
});

test('publisher returns the same pinned metadata only after both views have been accepted',async()=>{
 const old=process.env.ESIM_REALTIME_DATABASE_URL;delete process.env.ESIM_REALTIME_DATABASE_URL;
 try{
  const state={version:1,token:seed.token,source:seed.source,origin:ORIGIN,block:seed.throughBlock,blockHash:seed.blockHash,cutoff:seed.cutoff,sourceInflow:{...seed,seedBlock:seed.throughBlock,reconciled:true},trades:[],calls:[],native:[],distributions:[],firstRecipient:{},coverage:{}};
  let accepted=false;
  const result=await publishCore(state,async(views,options)=>{
   assert.deepEqual(views.map(v=>v.kind),['report','addresses']);
   assert(views.every(v=>v.data.block===state.block&&v.data.cutoff===state.cutoff));
   assert.equal(options.processedBlock,state.block);accepted=true;
  });
  assert.equal(accepted,true);assert.deepEqual(result,{block:state.block,cutoff:state.cutoff,flowBlock:0});
 }finally{if(old!==undefined)process.env.ESIM_REALTIME_DATABASE_URL=old;}
});
