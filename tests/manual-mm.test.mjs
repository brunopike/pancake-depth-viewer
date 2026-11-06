import test from 'node:test';
import assert from 'node:assert/strict';
import {runMmPass,mmStepPending} from '../scripts/esim/vm-worker.mjs';
test('idle manual MM probes the queue without a child or paid calls',async()=>{
 const result=await runMmPass(()=>assert.fail('must not start collector'),{query:async sql=>{assert.match(sql,/source='manual'/);return{rows:[]};}});
 assert.equal(JSON.parse(result).status,'idle');assert.equal(mmStepPending(result),false);
});
test('an explicit manual queue entry runs one existing fenced step only',async()=>{
 let calls=0;await runMmPass(async(file,args,options)=>{calls++;assert.equal(file,'server/mm-ledger/worker.mjs');assert.equal(options.extra.MM_STEP_MS,'40000');return 'complete';},{query:async()=>({rows:[{id:'manual'}]})});assert.equal(calls,1);
});
