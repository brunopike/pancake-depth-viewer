import test from 'node:test';
import assert from 'node:assert/strict';
import {dueTask,mmStepPending,mmStepCutoff,runDepthPass} from '../scripts/esim/vm-worker.mjs';

test('an aged core resumes after one background job, even within the old cooldown',()=>{
 const now=10_000_000,last={core:now-40_000,holders:now-700_000,depth:now-1000,mm:now-650_000,archive:now,backgroundAttemptAt:now-1000};
 assert.equal(dueTask({now,last,cutoff:(now-160_000)/1000,block:1,pendingBlock:0}),'core');
});

test('continuous aged core alternates with every overdue background job without starving either',()=>{
 let now=10_000_000;
 const last={core:0,holders:1,depth:2,mm:3,archive:4},jobs=[];
 for(let i=0;i<9;i++){
  const task=dueTask({now,last,cutoff:(now-140_000)/1000,block:1,pendingBlock:0});
  jobs.push(task);now+=task==='core'?100_000:40_000;last[task]=now;if(task!=='core')last.backgroundAttemptAt=now;
 }
 assert.deepEqual(jobs,['core','holders','core','depth','core','mm','core','archive','core']);
});

test('failed background attempts cannot consume consecutive core turns',()=>{
 let now=10_000_000;const last={core:now-60000,holders:1,archive:2,depth:3,mm:now},retryAt={};
 const tasks=[];
 for(let i=0;i<8;i++){
  const task=dueTask({now,last,retryAt,cutoff:(now-160000)/1000,block:1,pendingBlock:0});tasks.push(task);
  if(task==='core'){now+=100000;last.core=now;}
  else{now+=55000;last.backgroundAttemptAt=now;retryAt[task]=now+60000;}
 }
 assert(tasks.every((task,i)=>i%2===0?task!=='core':task==='core'));
 assert.equal(last.holders,1,'failed data is never marked fresh');
});

test('unfinished or unrecognized MM output retains short checkpoint continuation',()=>{
 const now=10_000_000,last={core:now,holders:now,depth:now,archive:now,mm:now-60001};
 for(const status of ['running','queued'])assert(mmStepPending(JSON.stringify({phase:'mm-server-step',status})));
 assert(mmStepPending('unrecognized output'));
 assert.equal(mmStepPending('log\n'+JSON.stringify({phase:'mm-server-step',status:'complete'})),false);
 const input={now,last:{...last,mmPending:true},cutoff:now/1000,block:1,pendingBlock:1};
 assert.equal(dueTask(input),'mm');
 assert.equal(dueTask({...input,last:{...last,mmPending:false}}),null);
});

test('heavy polling leaves room for core while staying within its ten-minute cadence',()=>{
 const now=10_000_000,last={core:now,holders:now-599_999,depth:now-599_999,mm:now-599_999,mmCutoff:now,archive:now};
 const input={now,last,cutoff:now/1000,block:1,pendingBlock:1};
 assert.equal(dueTask(input),null);
 assert.equal(dueTask({...input,now:now+1}),'holders');
});

test('MM starts from the data deadline, allowing for work already spent before completion',()=>{
 const now=10_000_000,last={core:now,holders:now,depth:now,archive:now,mm:now-5*60000,mmCutoff:now-5*60000};
 const input={now,last,cutoff:now/1000,block:1,pendingBlock:1};
 assert.equal(dueTask(input),'mm');
 assert.equal(dueTask({...input,last:{...last,mmCutoff:now-4*60000}}),null);
 const output=JSON.stringify({phase:'mm-server-step',status:'complete',cutoff:new Date(last.mmCutoff).toISOString()});
 assert.equal(mmStepCutoff(output,now),last.mmCutoff);
 assert.equal(mmStepCutoff(output.replace(new Date(last.mmCutoff).toISOString(),new Date(now+120000).toISOString()),now),0);
 assert.equal(mmStepCutoff('{}',now),0);
});

test('overdue live snapshots run before an hourly archive',()=>{
 const now=20_000_000,last={core:now-1000,holders:now-4*60000,depth:now-16*60000,archive:now-61*60000,mm:now-8*60000,mmPending:true};
 assert.equal(dueTask({now,last,cutoff:(now-60000)/1000,block:1,pendingBlock:0}),'depth');
});


test('an unowned depth lease cannot be recorded as a successful pass',async()=>{
 const called=[];await assert.rejects(runDepthPass(async(...args)=>called.push(args),{lease:null,dryRun:false}),/DEPTH_LEASE_UNAVAILABLE/);assert.deepEqual(called,[]);
});
test('depth publication follows a successful fenced snapshot only',async()=>{
 const lease={id:'fixture'},calls=[];await runDepthPass(async(...args)=>calls.push(args),{lease,dryRun:false});
 assert.deepEqual(calls.map(c=>c[0]),['scripts/snapshot.mjs','scripts/publish-snapshot.mjs']);assert(calls.every(c=>c[2].lease===lease));
 let count=0;await assert.rejects(runDepthPass(async()=>{count++;throw Error('READ_FAILED');},{lease,dryRun:false}),/READ_FAILED/);assert.equal(count,1);
});

test('an unavailable depth lease cannot starve the other background jobs across slow core passes',()=>{
 let now=20_000_000;const last={core:now-1000,holders:1,depth:1,archive:1,mm:1,mmPending:true},retryAt={},seen=[];
 for(let i=0;i<12;i++){
  const task=dueTask({now,last,retryAt,cutoff:(now-200000)/1000,block:1,pendingBlock:0});seen.push(task);
  if(task==='depth'){retryAt.depth=now+60000;now+=100;}
  else {now+=task==='core'?142000:1000;last[task]=now;}
  if(task!=='core')last.backgroundAttemptAt=now;
 }
 for(const task of ['core','holders','archive','mm'])assert(seen.includes(task),task+': '+seen.join(','));
});
