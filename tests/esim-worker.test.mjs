import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshDueSnapshots} from '../scripts/esim/hourly-worker.mjs';
import {SNAPSHOT_INTERVAL_MS as hour} from '../src/snapshot-status.mjs';
const now=1791918000000;
const snapshot=(kind,cutoff,block=100)=>({version:1,block,cutoff,token:'0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d',...(kind==='holders'?{rows:[]}:{windows:{}})});
test('fresh datasets survive worker handoff without any paid reads or website builds',async()=>{
 const values={report:snapshot('report',now/1000-600),holders:snapshot('holders',now/1000-300)};
 const next=await refreshDueSnapshots({now:()=>now,read:async k=>values[k],refresh:()=>assert.fail('duplicate paid read'),publishSite:()=>assert.fail('duplicate build')});
 assert.equal(next,now+50*60000);
});
test('only an overdue dataset is refreshed and both files publish through one website dispatch',async()=>{
 const values={report:snapshot('report',now/1000-7200),holders:snapshot('holders',now/1000-600)},reads=[];let published=0;
 const next=await refreshDueSnapshots({now:()=>now,read:async k=>values[k],refresh:async k=>{reads.push(k);values[k]=snapshot(k,now/1000,200);},publishSite:async()=>published++});
 assert.deepEqual(reads,['report']);assert.equal(published,1);assert.equal(next,now+50*60000);
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
