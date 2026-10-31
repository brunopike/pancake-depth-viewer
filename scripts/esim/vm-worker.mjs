import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,rename,copyFile,access} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {startLease} from '../../server/esim/worker-lease.mjs';
import {realtimeStatus,realtimeSQL,markRealtimeError} from '../../server/esim/realtime-store.mjs';
import {workerFailureCode} from './hourly-worker.mjs';
import {pathToFileURL} from 'node:url';

// One heavy child at a time on the 4 GB VM. Provenance retains its independent
// GitHub job; a multi-minute attribution rebuild cannot block live processing.
export function dueTask({now,last,cutoff,pendingBlock,block,retryAt={}}){
 const ready=task=>now>=(retryAt[task]||0);
 if(ready('core')&&(!last.core||now-last.core>=60000&&(pendingBlock>block||now-cutoff*1000>=300000)))return 'core';
 if(ready('holders')&&now-(last.holders||0)>=180000)return 'holders';
 if(ready('archive')&&now-(last.archive||0)>=3600000)return 'archive';
 if(ready('depth')&&now-(last.depth||0)>=300000)return 'depth';
 if(ready('mm')&&now-(last.mm||0)>=60000)return 'mm';
 return null;
}
const local='.goodway/vm';
export function restoredSchedule(saved,dryRun){
 // A dry-run archive was deliberately not published. Do not carry its timer
 // into live mode, where an immediate complete archive is required.
 return saved?.dryRun===dryRun?{...saved,core:0}:{dryRun,core:0};
}
export function remoteBootstrapNeeded({first,hasCheckpoint,block,cutoff,now}){
 return first&&(!hasCheckpoint||!block||now/1000-cutoff>=3600);
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
export async function main(){
 const dryRun=process.env.ESIM_WORKER_DRY_RUN==='true';
 if(!process.env.ESIM_REALTIME_DATABASE_URL||!process.env.ALCHEMY_API_KEY||(!dryRun&&!process.env.GITHUB_TOKEN&&process.env.ESIM_GIT_PUBLISH!=='true'))throw Error('INVALID_WORKER_CONFIGURATION');
 await mkdir(local,{recursive:true});
 let stopping=false,child,guard,depthGuard;
 const stopChild=()=>{if(child?.pid)try{process.kill(-child.pid,'SIGTERM');}catch{}};
 const leaseLost=job=>error=>{console.error(JSON.stringify({phase:'vm-lease-lost',job,error}));stopping=true;stopChild();};
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{stopping=true;stopChild();});
 const command=async(file,args=[],{lease=guard,extra={},timeout=1500000}={})=>{
  await lease.check();const started=Date.now();
  child=spawn('/usr/bin/time',['-f','{"phase":"vm-resource","wallSeconds":%e,"userSeconds":%U,"systemSeconds":%S,"maxRssKiB":%M}',process.execPath,'--max-old-space-size=2304',file,...args],{detached:true,stdio:['ignore','pipe','pipe'],env:{...process.env,...lease.env,ESIM_PERSISTENT_WORKER:'true',ESIM_RPC_BUDGET:'600',...extra}});
  let stderr='';child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-8192);});
  child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;stopChild();},timeout);
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});clearTimeout(timer);child=null;
  await lease.check();if(code!==0||timedOut)throw Error(timedOut?'VM_TASK_TIMEOUT':workerFailureCode({stderr}));
  console.log(JSON.stringify({phase:'vm-task-finished',task:file,elapsedMs:Date.now()-started}));
 };
 try{
  while(!stopping&&!guard){guard=await startLease(dryRun?'shadow-core':'core',{onLost:leaseLost('core')});if(!guard){console.log('Core lease is owned by another worker; standing by.');await sleep(30000);}}
  if(!guard)return;
  const lost=leaseLost('depth');
  depthGuard=await startLease(dryRun?'shadow-depth':'depth',{onLost:lost});
  const last=restoredSchedule(await json(`${local}/schedule.json`),dryRun),core=await json(`${local}/core.json`);
  const hasCheckpoint=await access('.goodway/esim-monitor/state.json.gz').then(()=>true,()=>false);
  let block=core.block||0,cutoff=core.cutoff||0,first=true;
  const retryAt={};
  // A new owner always verifies the canonical chain, even if local timing is recent.
  last.core=0;
  while(!stopping){
   const now=Date.now();let status={};try{status=await realtimeStatus();}catch{}
   const task=dueTask({now,last,block,cutoff,pendingBlock:Number(status.pending_block)||0,retryAt});
   if(task){
    const started=Date.now();
    try{
     if(task==='core'){
      // Keep the previous successful prefix until its successor is verified.
      // Copying over rollback before a reorg check would preserve the bad tip.
      try{await copyFile('.goodway/esim-monitor/state.json.gz','.goodway/esim-monitor/vm-candidate.json.gz');}catch{}
      // Remote bootstrap/merge once per takeover, then hourly to attach the
      // independently verified provenance. Normal cycles use the local prefix.
      const remote=first||now-(last.merge||0)>=3600000;
      let partial=false;
      // A recent local prefix is revalidated against the chain. Do not keep
      // two full ledgers in RAM merely to restart this persistent worker.
      const bootstrap=remoteBootstrapNeeded({first,hasCheckpoint,block,cutoff,now});
      try{await command('scripts/esim/refresh.mjs',[],{extra:{ESIM_REMOTE_START:String(remote),ESIM_REMOTE_BOOTSTRAP:String(bootstrap)}});}
      catch(error){if(error.message!=='QUERY_LIMIT')throw error;partial=true;}
      if(remote)last.merge=now;first=false;
      await command('scripts/esim/vm-task.mjs',['core'],{extra:{ESIM_MIN_BLOCK:String(block+(partial?1:0))}});
      const next=await json(`${local}/core.json`);
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
      if(!dryRun)await command('server/mm-ledger/worker.mjs',[],{timeout:210000});
     }else if(task==='depth'){
      if(!depthGuard)depthGuard=await startLease(dryRun?'shadow-depth':'depth',{onLost:lost});
      if(depthGuard){await command('scripts/snapshot.mjs',[],{lease:depthGuard,extra:{ESIM_SNAPSHOT_INTERVAL_MS:'300000'},timeout:600000});if(!dryRun)await command('scripts/publish-snapshot.mjs',[],{lease:depthGuard,timeout:120000});}
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
     if(task==='mm'){last.mm=Date.now();await save(`${local}/schedule.json`,last);}
     else retryAt[task]=Date.now()+60000;
     const code=/^[A-Z_]{3,80}$/.test(error.message)?error.message:'VM_TASK_FAILED';
     if(task==='core')try{await markRealtimeError(code);}catch{}
     await save(`${local}/health.json`,{at:new Date().toISOString(),dryRun,task,block,cutoff,error:code});
     console.error(JSON.stringify({phase:'vm-task-deferred',task,error:code}));
    }
   }
   await sleep(20000);
  }
 }finally{stopChild();if(depthGuard)await depthGuard.close();if(guard)await guard.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('VM_WORKER_STOPPED');process.exitCode=1;});
