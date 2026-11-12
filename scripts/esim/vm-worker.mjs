import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,rename,copyFile,access} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {startLease} from '../../server/esim/worker-lease.mjs';
import {realtimeStatus,realtimeSQL,markRealtimeError} from '../../server/esim/realtime-store.mjs';
import {workerFailureCode} from './hourly-worker.mjs';
import {pathToFileURL} from 'node:url';
import {readAuxiliaryStatus} from '../../server/esim/auxiliary-health.mjs';

// One heavy child at a time on the 4 GB VM. Provenance retains its independent
// GitHub job; a multi-minute attribution rebuild cannot block live processing.
export const provenanceMergeNeeded=({now,last,publishedFlowBlock=0})=>publishedFlowBlock>(last.flowBlock||0)&&now-(last.merge||0)>=60000;
export async function runCorePass(command,{remote,bootstrap,block,minimumBlock=block}){
 try{
  await command('scripts/esim/refresh.mjs',[],{extra:{ESIM_REMOTE_START:String(remote),ESIM_REMOTE_BOOTSTRAP:String(bootstrap),ESIM_INLINE_CORE_PUBLISH:'true',ESIM_MIN_BLOCK:String(Math.max(block,minimumBlock))}});
  return false;
 }catch(error){if(error.message!=='QUERY_LIMIT')throw error;}
 await command('scripts/esim/vm-task.mjs',['core'],{extra:{ESIM_MIN_BLOCK:String(Math.max(block+1,minimumBlock))}});
 return true;
}
export async function runDepthPass(command,{lease,dryRun}){
 if(!lease)throw Error('DEPTH_LEASE_UNAVAILABLE');
 await command('scripts/snapshot.mjs',[],{lease,extra:{ESIM_SNAPSHOT_INTERVAL_MS:'600000'},timeout:600000});
 if(!dryRun)await command('scripts/publish-snapshot.mjs',[],{lease,timeout:120000});
}
export async function manualSyncPending(sql){
 return (await sql.query("SELECT id FROM (SELECT id,status,state FROM esim_ledger.sync_runs WHERE source='manual' ORDER BY started_at DESC LIMIT 1) latest WHERE status IN ('queued','running') OR status='failed' AND state->>'retryable'='true'")).length>0;
}
export async function runMmPass(command,sql){
 if(!await manualSyncPending(sql))return JSON.stringify({phase:'mm-server-step',status:'idle',mode:'manual'});
 return command('server/mm-ledger/worker.mjs',[],{lease:null,timeout:210000,extra:{MM_STEP_MS:'40000'}});
}
function mmStepResult(output){
 for(const line of String(output).trim().split('\n').reverse())try{const row=JSON.parse(line);if(row.phase==='mm-server-step')return row;}catch{}
 return null;
}
export const mmStepPending=output=>!['complete','idle','paused'].includes(mmStepResult(output)?.status);
export function mmStepCutoff(output,now=Date.now()){
 const cutoff=Date.parse(mmStepResult(output)?.cutoff);
 return Number.isFinite(cutoff)&&cutoff>0&&cutoff<=now+60000?cutoff:0;
}
export function dueTask({now,last,cutoff,pendingBlock,block,publishedFlowBlock=0,retryAt={},coreAvailable=true}){
 const ready=task=>now>=(retryAt[task]||0)&&(coreAvailable||!['core','holders','archive'].includes(task));
 if(ready('core')&&!last.core)return 'core';
 const mmDue=last.mmPending===true&&now-(last.mm||0)>=60000;
 const due=[
  ['core',now-cutoff*1000>=120000||now-(last.core||0)>=60000&&(pendingBlock>block||provenanceMergeNeeded({now,last,publishedFlowBlock}))],
  ['holders',now-(last.holders||0)>=600000],['archive',now-(last.archive||0)>=3600000],
  ['depth',now-(last.depth||0)>=600000],['mm',mmDue]
 ].filter(([task,needed])=>needed&&ready(task)).map(([task])=>task);
 // An overdue core may yield one background pass, never the entire queue.
 if(due.includes('core')&&(last.backgroundAttemptAt||0)>(last.core||0))return 'core';
 // A long hourly archive must not jump ahead of already due live snapshots.
 const snapshots=due.filter(task=>['depth','holders'].includes(task)&&!(retryAt[task]>(last[task]||0)));
 if(snapshots.length)return snapshots.sort((a,b)=>(last[a]||0)-(last[b]||0))[0];
 return due.sort((a,b)=>Math.max(last[a]||0,retryAt[a]||0)-Math.max(last[b]||0,retryAt[b]||0))[0]||null;
}
const local='.goodway/vm';
export function restoredSchedule(saved,dryRun){
 // A dry-run archive was deliberately not published. Do not carry its timer
 // into live mode, where an immediate complete archive is required.
 return saved?.dryRun===dryRun?{...saved,core:0}:{dryRun,core:0};
}
export function remoteBootstrapNeeded({first,hasCheckpoint,block}){
 if(!first)return false;
 if(!hasCheckpoint||!block)return true;
 // Catch up a verified local prefix incrementally instead of retaining two full ledgers.
 return false;
}
async function json(file,fallback={}){try{return JSON.parse(await readFile(file,'utf8'));}catch{return fallback;}}
async function save(file,value){await writeFile(file+'.tmp',JSON.stringify(value));await rename(file+'.tmp',file);}
export async function recoverVmCheckpoint(root='.goodway/esim-monitor'){
 // Retain the rejected data as evidence. Cached fixed-block calls can belong
 // to the orphaned branch, so a replay must read them again from the provider.
 const suffix=Date.now();
 try{await rename(`${root}/rpc-cache`,`${root}/rpc-cache-reorg-${suffix}`);}catch(e){if(e.code!=='ENOENT')throw e;}
 await copyFile(`${root}/vm-rollback.json.gz`,`${root}/state.json.gz`);
}
export async function stopVmProcess(child,graceMs=5000){
 if(!child?.pid)return;
 const signal=sig=>{try{process.kill(-child.pid,sig);}catch{}};
 if(child.exitCode!==null||child.signalCode!==null){signal('SIGKILL');return;}
 const closed=new Promise(resolve=>child.once('close',resolve)),timer=setTimeout(()=>signal('SIGKILL'),graceMs);
 signal('SIGTERM');
 try{await closed;}finally{clearTimeout(timer);signal('SIGKILL');}
}
export async function main(){
 const dryRun=process.env.ESIM_WORKER_DRY_RUN==='true';
 if(!process.env.ESIM_REALTIME_DATABASE_URL||!process.env.ALCHEMY_API_KEY||(!dryRun&&!process.env.GITHUB_TOKEN&&process.env.ESIM_GIT_PUBLISH!=='true'))throw Error('INVALID_WORKER_CONFIGURATION');
 await mkdir(local,{recursive:true});
 let stopping=false,child,guard,depthGuard,activeLease,coreLost=false,depthLost=false;
 const stopChild=()=>stopVmProcess(child);
 const leaseLost=job=>error=>{console.error(JSON.stringify({phase:'vm-lease-lost',job,error}));if(job==='core')coreLost=true;else depthLost=true;if(activeLease===(job==='core'?guard:depthGuard))stopChild();};
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{stopping=true;stopChild();});
 const command=async(file,args=[],{lease=guard,extra={},timeout=1500000}={})=>{
  await lease?.check();const started=Date.now();activeLease=lease;
  child=spawn('/usr/bin/time',['-f','{"phase":"vm-resource","wallSeconds":%e,"userSeconds":%U,"systemSeconds":%S,"maxRssKiB":%M}',process.execPath,'--max-old-space-size=2048',file,...args],{detached:true,stdio:['ignore','pipe','pipe'],env:{...process.env,...lease?.env,ESIM_PERSISTENT_WORKER:'true',ESIM_RPC_BUDGET:'600',...extra}});
  let stderr='',stdout='';child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-8192);});
  child.stdout.on('data',chunk=>{stdout=(stdout+chunk).slice(-8192);});
  child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;stopChild();},timeout);
  const running=child;
  let code;
  try{code=await new Promise((resolve,reject)=>{running.once('error',reject);running.once('close',resolve);});}
  finally{clearTimeout(timer);await stopVmProcess(running);child=null;activeLease=null;}
  await lease?.check();if(code!==0||timedOut)throw Error(timedOut?'VM_TASK_TIMEOUT':workerFailureCode({stderr}));
  console.log(JSON.stringify({phase:'vm-task-finished',task:file,elapsedMs:Date.now()-started}));
  return stdout;
 };
 try{
  const lost=leaseLost('depth');
  depthGuard=await startLease(dryRun?'shadow-depth':'depth',{onLost:lost});
  const last=restoredSchedule(await json(`${local}/schedule.json`),dryRun),core=await json(`${local}/core.json`);
  const hasCheckpoint=await access('.goodway/esim-monitor/state.json.gz').then(()=>true,()=>false);
  let block=core.block||0,cutoff=core.cutoff||0,first=true,mmProbeAt=0;
  const retryAt={};
  // A new owner always verifies the canonical chain, even if local timing is recent.
  last.core=0;
  while(!stopping){
   if(coreLost){await guard?.close();guard=null;coreLost=false;}
   if(depthLost){await depthGuard?.close();depthGuard=null;depthLost=false;}
   // Core standby must not suspend independent depth and MM recovery.
   if(!guard){guard=await startLease(dryRun?'shadow-core':'core',{onLost:leaseLost('core')});if(guard){last.core=0;first=true;}}
   const now=Date.now(),[live,auxiliary]=await Promise.allSettled([realtimeStatus(),readAuxiliaryStatus()]);
   const status=live.status==='fulfilled'?live.value:{},publishedFlowBlock=auxiliary.status==='fulfilled'?auxiliary.value.provenance?.block||0:0;
   if(!dryRun&&now-mmProbeAt>=60000){mmProbeAt=now;try{last.mmPending=await manualSyncPending(realtimeSQL());}catch{console.error('MM_QUEUE_READ_DEFERRED');}}
   const task=dueTask({now,last,block,cutoff,pendingBlock:Number(status.pending_block)||0,publishedFlowBlock,retryAt,coreAvailable:!!guard});
   if(task){
    const started=Date.now();
    try{
     if(task==='core'){
      // Keep the previous successful prefix until its successor is verified.
      // Copying over rollback before a reorg check would preserve the bad tip.
      try{await copyFile('.goodway/esim-monitor/state.json.gz','.goodway/esim-monitor/vm-candidate.json.gz');}catch{}
      // New verified provenance merges promptly; normal cycles keep the local prefix.
      const remote=first||now-(last.merge||0)>=3600000||provenanceMergeNeeded({now,last,publishedFlowBlock});
      // A recent local prefix is revalidated against the chain. Do not keep
      // two full ledgers in RAM merely to restart this persistent worker.
      const bootstrap=remoteBootstrapNeeded({first,hasCheckpoint,block,cutoff,now,remoteBlock:Number(status.processed_block)});
      await runCorePass(command,{remote,bootstrap,block,minimumBlock:Number(status.processed_block)||block});
      if(remote)last.merge=now;first=false;
      const next=await json(`${local}/core.json`);
      last.flowBlock=next.flowBlock||0;
      if(next.block>block)try{await copyFile('.goodway/esim-monitor/vm-candidate.json.gz','.goodway/esim-monitor/vm-rollback.json.gz');}catch{}
      block=next.block;cutoff=next.cutoff;
     }else if(task==='holders'){
      await command('scripts/esim/holders-refresh.mjs',[],{extra:{ESIM_HOLDERS_INCREMENTAL:'true'}});
      await command('scripts/esim/vm-task.mjs',['holders']);
     }else if(task==='archive'){
      if(!dryRun){
       await command('scripts/esim/publish.mjs');await command('scripts/esim/holders-publish.mjs');
       await guard.check();await realtimeSQL().query("DELETE FROM esim_webhook_receipts WHERE received_at < now()-interval '7 days'");
      }
     }else if(task==='mm'){
      if(!dryRun){const output=await runMmPass(command,realtimeSQL());last.mmPending=mmStepPending(output);if(!last.mmPending)last.mmCutoff=mmStepCutoff(output);}
     }else if(task==='depth'){
      if(!depthGuard)depthGuard=await startLease(dryRun?'shadow-depth':'depth',{onLost:lost});
      await runDepthPass(command,{lease:depthGuard,dryRun});
     }
     last[task]=Date.now();await save(`${local}/schedule.json`,last);
     await save(`${local}/health.json`,{at:new Date().toISOString(),dryRun,task,block,cutoff,pendingBlock:Number(status.pending_block)||0,elapsedMs:Date.now()-started,error:null});
    }catch(error){
     if(stopping)break;
     if(['CHAIN_OR_CHECKPOINT_CHANGED','SOURCE_INFLOW_CHECKPOINT_CHANGED','END_HASH_CHANGED','BOUNDARY_CHANGED'].includes(error.message)){
      try{await realtimeSQL().query('UPDATE esim_ledger.rpc_cache_epoch SET valid_after=now() WHERE id=1');await recoverVmCheckpoint();}catch{console.error('VM_REORG_REQUIRES_REVIEW');}
      first=false;last.merge=Date.now();
     }
     // An MM accounting failure must not pause the live chain feed.
     if(task==='mm'){last.mm=Date.now();last.mmPending=true;await save(`${local}/schedule.json`,last);}
     else retryAt[task]=Date.now()+60000;
     const code=/^[A-Z_]{3,80}$/.test(error.message)?error.message:'VM_TASK_FAILED';
     if(task==='core')try{await markRealtimeError(code);}catch{}
     await save(`${local}/health.json`,{at:new Date().toISOString(),dryRun,task,block,cutoff,error:code});
     console.error(JSON.stringify({phase:'vm-task-deferred',task,error:code}));
    }
    if(task!=='core'){last.backgroundAttemptAt=Date.now();await save(`${local}/schedule.json`,last);}
   }
   if(!task)await sleep(20000);
  }
 }finally{await stopChild();if(depthGuard)await depthGuard.close();if(guard)await guard.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('VM_WORKER_STOPPED');process.exitCode=1;});
