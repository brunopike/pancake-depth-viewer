import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotIssues,checkpointPassComplete,standbyMayTakeover} from '../server/esim/worker-health.mjs';
const now=2_000_000_000_000;
const healthy=()=>({snapshots:Object.fromEntries(['report','addresses','holders','depth'].map(kind=>[kind,{block:100,cutoff:now/1000-60,updatedAt:new Date(now-30000).toISOString()}])),lastDelivery:new Date(now-30000).toISOString(),error:null});
test('independent health checks use chain cutoff rather than recent database writes',()=>{
 const status=healthy();assert.deepEqual(snapshotIssues(status,now),[]);
 status.snapshots.report.cutoff=now/1000-901;status.snapshots.report.updatedAt=new Date(now).toISOString();
 assert(snapshotIssues(status,now).includes('report:STALE'));
});
test('missing snapshots, mismatched core views and silent notifications are visible failures',()=>{
 const status=healthy();delete status.snapshots.depth;status.snapshots.addresses.block=99;status.lastDelivery=new Date(now-3600001).toISOString();
 const issues=snapshotIssues(status,now);assert(issues.includes('depth:MISSING'));assert(issues.includes('core:VIEW_MISMATCH'));assert(issues.includes('webhook:SILENT'));
});
test('persistent catch-up yields only after a complete checkpoint and keeps ordinary batch behavior',()=>{
 assert.equal(checkpointPassComplete(1000,90999,true),false);assert.equal(checkpointPassComplete(1000,91000,true),true);
 assert.equal(checkpointPassComplete(1000,1_000_000,false),false);
});
test('only full standby collectors can replace a stalled VM, never manual holders or local jobs',()=>{
 assert.equal(standbyMayTakeover('core','scripts/esim/realtime-worker.mjs','true'),true);
 assert.equal(standbyMayTakeover('depth','scripts/hourly-worker.mjs','true'),true);
 assert.equal(standbyMayTakeover('core','scripts/esim/holders-job.mjs','true'),false);
 assert.equal(standbyMayTakeover('core','scripts/esim/realtime-worker.mjs',undefined),false);
});

test('MM health rejects static health responses and independently checks the data cutoff',async()=>{
 const {ledgerIssues}=await import('../server/esim/worker-health.mjs');
 assert(ledgerIssues({app:'esim-ledger'},now).includes('MISSING_SNAPSHOT'));
 const health={ok:true,issues:[],latest:{end_at:new Date(now-30000).toISOString()}};
 assert.deepEqual(ledgerIssues(health,now),[]);
 health.latest.end_at=new Date(now-901000).toISOString();assert(ledgerIssues(health,now).includes('STALE_SNAPSHOT'));
 health.issues=['BALANCE_CHECK_FAILED'];assert(ledgerIssues(health,now).includes('BALANCE_CHECK_FAILED'));
});
