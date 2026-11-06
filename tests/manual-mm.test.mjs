import {neon,neonConfig} from '@neondatabase/serverless';
import test from 'node:test';
import assert from 'node:assert/strict';
import {runMmPass,mmStepPending,manualSyncPending} from '../scripts/esim/vm-worker.mjs';
test('Neon array rows: idle manual MM probes without a child or paid calls',async()=>{
 const result=await runMmPass(()=>assert.fail('must not start collector'),{query:async sql=>{assert.match(sql,/source='manual'/);return[];}});
 assert.equal(JSON.parse(result).status,'idle');assert.equal(mmStepPending(result),false);
});
test('Neon array rows: an explicit manual entry runs one existing fenced step only',async()=>{
 let calls=0;await runMmPass(async(file,args,options)=>{calls++;assert.equal(file,'server/mm-ledger/worker.mjs');assert.equal(options.extra.MM_STEP_MS,'40000');return 'complete';},{query:async()=>[{id:'manual'}]});assert.equal(calls,1);
});

test('installed Neon transport returns array rows for both active and idle queues',async()=>{
 const previous=neonConfig.fetchFunction;let rows=[['manual-fixture']];
 try{
  neonConfig.fetchFunction=async()=>Response.json({command:'SELECT',rowCount:rows.length,rows,fields:[{name:'id',dataTypeID:25}]});
  const sql=neon('postgresql://synthetic:synthetic@synthetic.invalid/synthetic',{fetchOptions:{signal:undefined}});
  const actual=await sql.query('SELECT id');assert.equal(Array.isArray(actual),true);assert.equal(actual.rows,undefined);
  assert.equal(await manualSyncPending(sql),true);let spawned=0;
  await runMmPass(async(_file,args)=>{spawned++;assert.deepEqual(args,[]);return 'done';},sql);assert.equal(spawned,1);
  rows=[];assert.equal(await manualSyncPending(sql),false);await runMmPass(()=>assert.fail('idle must not spawn'),sql);
 }finally{neonConfig.fetchFunction=previous;}
});
