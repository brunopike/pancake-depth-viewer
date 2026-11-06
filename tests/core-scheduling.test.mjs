import test from 'node:test';
import assert from 'node:assert/strict';
import {dueTask,mmStepPending} from '../scripts/esim/vm-worker.mjs';

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
 const now=10_000_000,last={core:now,holders:now-599_999,depth:now-599_999,mm:now-599_999,archive:now};
 const input={now,last,cutoff:now/1000,block:1,pendingBlock:1};
 assert.equal(dueTask(input),null);
 assert.equal(dueTask({...input,now:now+1}),'holders');
});
