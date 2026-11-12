import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {renderDataAlert,depthDataAlert} from '../src/data-alert.mjs';
import {snapshotStatus,showSnapshotStatus,showSnapshotFailure,setSnapshotHealth} from '../src/snapshot-status.mjs';
const now=Date.parse('2026-11-01T06:00:00Z');
test('snapshot warnings include the original data time, cause and a truthful recovery state',()=>{
 const entries=[['交易',{cutoff:now/1000-901}]];
 const pending=snapshotStatus(entries,{now,realtime:true,health:{error:'BACKFILL_IN_PROGRESS'}});
 assert.match(pending.alert.reason,/5 分钟.*补齐停更/);assert.match(pending.alert.recovery,/正在恢复/);assert.equal(pending.alert.lastUpdated,new Date(now-901000).toISOString());
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
 const stale=snapshotStatus(entries,{now,realtime:true,health:{auxiliary}}).alert;
 assert.match(stale.reason,/分发币跨地址追踪.*超过两小时/);
 assert.equal(stale.lastUpdated,new Date(auxiliary.provenance.cutoff*1000).toISOString());
 const pending=structuredClone(auxiliary);pending.provenance=null;
 assert.equal(snapshotStatus(entries,{now,realtime:true,health:{auxiliary:pending}}).alert.lastUpdated,null);
 auxiliary.provenance.cutoff=now/1000-60;
 assert.equal(snapshotStatus(entries,{now,realtime:true,health:{auxiliary}}).alert,null);
});
test('historical lag is scoped amber and reports a running verifier without claiming current results',()=>{
 const auxiliary=Object.fromEntries(['provenance','cohort','archive'].map(k=>[k,{cutoff:now/1000-60}]));auxiliary.provenance.cutoff=now/1000-7201;
 const options={now,realtime:true,health:{auxiliary,auxiliaryJobs:{provenance:{running:true}}}};
 const r=snapshotStatus([['交易',{cutoff:now/1000-10}],['持仓',{cutoff:now/1000-20}]],options);
 assert.equal(r.alert.severity,'progress');assert.equal(r.alert.scope,'history');assert.match(r.alert.title,/进行中/);
 assert.match(r.alert.recovery,/正在运行/);assert.match(r.text,/交易和持仓已更新/);assert.doesNotMatch(r.text,/当前显示上次核验快照/);
 assert.equal(r.alert.lastUpdated,new Date(auxiliary.provenance.cutoff*1000).toISOString());
 const real=snapshotStatus([['交易',{cutoff:now/1000-901}]],options);assert.equal(real.alert.severity,'error');assert.match(real.alert.title,/数据更新异常/);
 const future=snapshotStatus([['交易',{cutoff:now/1000+120}]],options);assert.equal(future.alert.severity,'error');assert.match(future.alert.reason,/时间超前/);
});
test('an expired or unavailable historical worker is never described as running',()=>{
 const auxiliary={provenance:{cutoff:now/1000-7201},cohort:{cutoff:now/1000},archive:{cutoff:now/1000}};
 const r=snapshotStatus([['交易',{cutoff:now/1000-10}]],{now,realtime:true,health:{auxiliary,auxiliaryJobs:{provenance:{running:false}}}});
 assert.equal(r.alert.severity,'warning');assert.doesNotMatch(r.alert.recovery,/正在运行/);assert.match(r.alert.reason,/超过两小时/);
});

test('banner restores error appearance after a historical-only warning',()=>{
 const nodes=new Map(),root={dataset:{},querySelector:s=>{if(!nodes.has(s))nodes.set(s,{textContent:''});return nodes.get(s);},setAttribute(k,v){this[k]=v;}};
 renderDataAlert({severity:'warning',title:'ESIM 链上 · 历史统计待更新',reason:'old history',lastUpdated:new Date(now).toISOString(),recovery:'running'},root);
 assert.equal(root.dataset.severity,'warning');assert.equal(root.role,'status');assert.equal(nodes.get('.data-alert-fields>div:nth-child(2)>dt').textContent,'历史数据截至');
 renderDataAlert({reason:'read failed',recovery:'retry'},root);
 assert.equal(root.dataset.severity,'error');assert.equal(root.role,'alert');assert.match(nodes.get('.data-alert-heading strong').textContent,/数据更新异常/);
 assert.equal(nodes.get('.data-alert-fields>div:nth-child(2)>dt').textContent,'最后更新时间');
});
test('minor active work uses a status notice; a failed or stale core read still uses an alert',()=>{
 const nodes=new Map(),root={dataset:{},querySelector:s=>{if(!nodes.has(s))nodes.set(s,{textContent:''});return nodes.get(s);},setAttribute(k,v){this[k]=v;}};
 renderDataAlert({severity:'progress',title:'历史数据补充进行中',reason:'补查新增地址',recovery:'正在补查'},root);
 assert.equal(root.dataset.severity,'progress');assert.equal(root.role,'status');
 renderDataAlert({reason:'读取失败',recovery:'等待重试'},root);
 assert.equal(root.dataset.severity,'error');assert.equal(root.role,'alert');
 const live={timestamp:now-60000,pools:[{}],failed:[{id:'one'}]};
 assert.equal(depthDataAlert(live,{now,recovering:true}).severity,'progress');
 assert.equal(depthDataAlert({...live,timestamp:now-901000},{now,recovering:true}).severity,'error');
});
test('initial cache display is a loading state, not a failed update; a real failed read still alerts',()=>{
 const entries=[['交易',{cutoff:now/1000-10}],['持仓',null]];
 const pending=snapshotStatus(entries,{now,realtime:true,loading:true});
 assert.equal(pending.alert,null);assert.equal(pending.warning,false);assert.match(pending.text,/正在读取最新/);
 assert.equal(snapshotStatus(entries,{now,realtime:true,loading:true,health:{error:'BACKFILL_IN_PROGRESS'}}).alert,null);
 const failed=snapshotStatus(entries,{now,realtime:true,loading:true,failed:true,retained:true});
 assert.equal(failed.alert.severity,'error');assert.match(failed.alert.reason,/读取失败/);
});
test('routine fresh backfill stays quiet; overdue backfill and incomplete historical data still alert',()=>{
 const entries=[['交易',{cutoff:now/1000-60}],['持仓',{cutoff:now/1000-30}]];
 assert.equal(snapshotStatus(entries,{now,realtime:true,health:{error:'BACKFILL_IN_PROGRESS'}}).alert,null);
 assert(snapshotStatus([['交易',{cutoff:now/1000-901}]],{now,realtime:true,health:{error:'BACKFILL_IN_PROGRESS'}}).alert);
 const auxiliary={provenance:{cutoff:now/1000-7201},cohort:{cutoff:now/1000},archive:{cutoff:now/1000}};
 assert.match(snapshotStatus(entries,{now,realtime:true,health:{error:'BACKFILL_IN_PROGRESS',auxiliary}}).alert.reason,/超过两小时/);
});
test('the ordinary status strip stays hidden; unresolved problems use only the top alert',()=>{
 const status={},button={dataset:{},disabled:false},entries=[['交易',{cutoff:Date.now()/1000-30}]];
 showSnapshotStatus(status,button,entries,{realtime:true});assert.equal(status.hidden,true);
 showSnapshotStatus(status,button,entries,{realtime:true,loading:true});assert.equal(status.hidden,true);
 showSnapshotStatus(status,button,entries,{realtime:true,failed:true});assert.equal(status.hidden,true);assert.equal(button.dataset.snapshotWarning,'true');
 showSnapshotStatus(status,button,entries,{realtime:true});assert.equal(status.hidden,true);
});

test('core and holder deadlines stay separate in the visible status',()=>{
 const entries=[['交易',{cutoff:now/1000-300}],['持仓',{cutoff:now/1000-899}]];
 assert.equal(snapshotStatus(entries,{now,realtime:true}).warning,false);
 entries[0][1].cutoff-=1;assert.match(snapshotStatus(entries,{now,realtime:true}).alert.reason,/交易数据超过 5 分钟/);
 entries[0][1].cutoff=now/1000-10;entries[1][1].cutoff=now/1000-901;assert.match(snapshotStatus(entries,{now,realtime:true}).alert.reason,/持仓数据超过 15 分钟/);
});

test('a core-only delay reports the core time rather than an older in-date holding snapshot',()=>{
 const entries=[['交易',{cutoff:now/1000-361}],['持仓',{cutoff:now/1000-899}]];
 const result=snapshotStatus(entries,{now,realtime:true});
 assert.match(result.alert.reason,/最早距今 6 分钟/);
 assert.equal(result.alert.lastUpdated,new Date(now-361000).toISOString());
 assert.doesNotMatch(result.alert.reason,/持仓数据超过|14 分钟/);
});

test('health polling treats an active refresh as reading cached data while real failures remain visible',()=>{
 const nodes=new Map(),root={hidden:true,querySelector:s=>{if(!nodes.has(s))nodes.set(s,{textContent:''});return nodes.get(s);}};
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:{getElementById:()=>root},configurable:true});
 try{
  const button={dataset:{},disabled:false},status={},entries=[['交易',{cutoff:Date.now()/1000-361}],['持仓',{cutoff:Date.now()/1000-899}]];
  const fresh={error:null,webhookRequired:false,snapshots:Object.fromEntries(['report','addresses','holders','depth'].map(k=>[k,{cutoff:Date.now()/1000-10}]))};
  setSnapshotHealth(fresh);showSnapshotStatus(status,button,entries,{realtime:true});assert.equal(root.hidden,false);
  button.disabled=true;setSnapshotHealth(fresh);assert.equal(root.hidden,true);assert.match(button.title,/正在读取最新快照/);
  setSnapshotHealth({...fresh,error:'WORKER_HEAP_EXHAUSTED'});assert.equal(root.hidden,false);
  setSnapshotHealth({...fresh,snapshots:{...fresh.snapshots,report:{cutoff:Date.now()/1000-901}}});assert.equal(root.hidden,false);
  setSnapshotHealth(fresh);assert.equal(root.hidden,true);
  showSnapshotStatus(status,button,entries,{realtime:true,retained:true});assert.equal(root.hidden,false);
  showSnapshotFailure();setSnapshotHealth(fresh);assert.equal(root.hidden,false);
  button.disabled=false;showSnapshotStatus(status,button,[['交易',{cutoff:Date.now()/1000-10}],['持仓',{cutoff:Date.now()/1000-20}]],{realtime:true});assert.equal(root.hidden,true);
 }finally{if(old)Object.defineProperty(globalThis,'document',old);else delete globalThis.document;setSnapshotHealth(null);}
});

test('a brief core lag stays visible as progress only after a recent successful publication',()=>{
 const entries=[['交易',{cutoff:now/1000-361}],['持仓',{cutoff:now/1000-60}]],health={lastProcessed:new Date(now-120000).toISOString()},options={now,realtime:true,health};
 const progress=snapshotStatus(entries,options);assert.equal(progress.warning,true);assert.equal(progress.alert.severity,'progress');assert.match(progress.alert.title,/进行中/);assert.match(progress.alert.reason,/交易数据超过 5 分钟.*6 分钟/);assert.match(progress.alert.recovery,/近 5 分钟.*发布/);
 for(const extra of [{health:{lastProcessed:new Date(now-301000).toISOString()}},{health:{...health,error:'WORKER_HEAP_EXHAUSTED'}},{health:{...health,unavailable:true}},{retained:true},{failed:true}])assert.equal(snapshotStatus(entries,{...options,...extra}).alert.severity,'error');
 for(const delayed of [[['交易',{cutoff:now/1000-901}],entries[1]],[entries[0],['持仓',{cutoff:now/1000-901}]]])assert.equal(snapshotStatus(delayed,options).alert.severity,'error');
});
