import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {renderDataAlert,depthDataAlert} from '../src/data-alert.mjs';
import {snapshotStatus,showSnapshotStatus,showSnapshotFailure,setSnapshotHealth} from '../src/snapshot-status.mjs';
const now=Date.parse('2026-11-01T06:00:00Z');
test('snapshot warnings include the original data time, cause and a truthful recovery state',()=>{
 const entries=[['交易',{cutoff:now/1000-901}]];
 const pending=snapshotStatus(entries,{now,realtime:true,health:{error:'BACKFILL_IN_PROGRESS'}});
 assert.match(pending.alert.reason,/15 分钟.*补齐停更/);assert.match(pending.alert.recovery,/正在恢复/);assert.equal(pending.alert.lastUpdated,new Date(now-901000).toISOString());
 const paused=snapshotStatus(entries,{now,realtime:true,health:{error:'RPC_CAPACITY_EXCEEDED'}});assert.match(paused.alert.recovery,/更新已暂停/);assert.doesNotMatch(paused.alert.recovery,/正在恢复/);
 assert.equal(snapshotStatus([['交易',{cutoff:now/1000-60}]],{now,realtime:true,health:{error:null}}).alert,null);
});
test('the same displayed banner disappears after a successful recovery; health polling cannot hide a failed read',()=>{
 const nodes=new Map(),root={hidden:true,querySelector:s=>{if(!nodes.has(s))nodes.set(s,{textContent:''});return nodes.get(s);}};
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:{getElementById:()=>root},configurable:true});
 try{
  const button={dataset:{},disabled:false},status={},entries=[['交易',{cutoff:Date.now()/1000-10}]];
  showSnapshotStatus(status,button,entries,{realtime:true});assert.equal(root.hidden,true);
  showSnapshotFailure();assert.equal(root.hidden,false);assert.match(nodes.get('[data-alert-reason]').textContent,/读取失败/);
  setSnapshotHealth({error:null});assert.equal(root.hidden,false);
  showSnapshotStatus(status,button,entries,{realtime:true});assert.equal(root.hidden,true);
 }finally{if(old)Object.defineProperty(globalThis,'document',old);else delete globalThis.document;setSnapshotHealth(null);}
});
test('depth warnings keep partial pools visible and clear only after a complete fresh snapshot',()=>{
 const live={timestamp:now-60000,failed:[{id:'one'}]};assert.match(depthDataAlert(live,{now}).reason,/1 个资金池/);
 assert.match(depthDataAlert(live,{now,recovering:true}).recovery,/正在恢复/);
 assert.match(depthDataAlert(live,{now,auto:false}).recovery,/已关闭/);
 assert.equal(depthDataAlert({...live,failed:[]},{now}),null);
 const root={hidden:false};renderDataAlert(null,root);assert.equal(root.hidden,true);
});
test('all chain pages place the alert before the page header and main content',async()=>{
 for(const file of ['index.html','esim.html','esim-addresses.html','esim-holders.html']){
  const html=await readFile(new URL('../'+file,import.meta.url),'utf8');assert(html.indexOf('id="data-alert"')<html.indexOf('<main'));assert.match(html,/data-alert\.css/);for(const field of ['reason','time','recovery'])assert(html.includes('data-alert-'+field));
 }
});

test('known worker failure codes have useful reasons without exposing raw diagnostics',async()=>{
 const {chainFailureReason}=await import('../src/snapshot-status.mjs');assert.match(chainFailureReason('RPC_UNAVAILABLE'),/接口暂时不可用/);assert.match(chainFailureReason('NEW_ESIM_POOL_REQUIRES_SYNC'),/新的交易池/);assert.match(chainFailureReason('CHECKPOINT_PUBLISH_PUSH_FAILED'),/无法发布/);assert.doesNotMatch(chainFailureReason('private https://example.invalid?key=secret'),/private|secret|example/);
});
test('historical verification failures remain visible even while live snapshots advance',()=>{
 const auxiliary=Object.fromEntries(['provenance','cohort','archive'].map(k=>[k,{cutoff:now/1000-60}])),entries=[['交易',{cutoff:now/1000-10}]];
 auxiliary.provenance.cutoff=now/1000-7201;
 assert.match(snapshotStatus(entries,{now,realtime:true,health:{auxiliary}}).alert.reason,/分发币跨地址追踪超过两小时/);
 auxiliary.provenance.cutoff=now/1000-60;
 assert.equal(snapshotStatus(entries,{now,realtime:true,health:{auxiliary}}).alert,null);
});
