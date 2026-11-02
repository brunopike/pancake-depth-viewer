import test from 'node:test';
import assert from 'node:assert/strict';
import {readAuxiliaryJobs} from '../server/esim/auxiliary-health.mjs';
test('historical job status exposes live lease state without worker identities or secrets',async()=>{
 const result=await readAuxiliaryJobs({query:async()=>[{job:'provenance',running:true,updated_at:'2026-11-02T15:00:00Z',owner:'private-runner'},{job:'cohort',running:false,updated_at:'2026-11-02T14:00:00Z'},{job:'core',running:true,owner:'private'}]});
 assert.deepEqual(result,{provenance:{running:true,lastHeartbeat:'2026-11-02T15:00:00Z'},cohort:{running:false,lastHeartbeat:'2026-11-02T14:00:00Z'}});
 assert.doesNotMatch(JSON.stringify(result),/private|owner/);
});
