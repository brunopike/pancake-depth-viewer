import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,copyFile,access} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';
import {parseState} from '../../server/esim/store.mjs';
import {buildReport} from '../../server/esim/metrics.mjs';
import {buildAddressReport} from '../../server/esim/addresses.mjs';
import {isSourceInflowAligned} from '../../server/esim/source-inflows.mjs';
import {realtimeStatus,publishRealtime,markRealtimeError,realtimeSQL} from '../../server/esim/realtime-store.mjs';
import {dispatchNextWorker} from '../hourly-worker.mjs';
import {workerFailureCode,assertWorkerHealthy} from './hourly-worker.mjs';
export const FAST_INTERVAL=180000,FALLBACK_INTERVAL=600000,ARCHIVE_INTERVAL=3600000;
export function refreshNeeded({now,lastRun,cutoff,pendingBlock,block}){
 if(!lastRun)return true;
 if(now-lastRun<FAST_INTERVAL)return false;
 return pendingBlock>block||now-cutoff*1000>=FALLBACK_INTERVAL;
}
export async function publishCore(state,publish=publishRealtime){
 const report=buildReport(state);
 if(!isSourceInflowAligned(report.sourceInflow,report))throw Error('SOURCE_INFLOW_NOT_SYNCHRONIZED');
 await publish([{kind:'report',data:report},{kind:'addresses',data:buildAddressReport(state)}],{processedBlock:state.block});
}
// A failed refresh may not have created a local checkpoint yet. Preserve the
// provider error instead of replacing it with ENOENT. Only a verified partial
// QUERY_LIMIT checkpoint is publishable; every other failure stays fail-closed.
export async function refreshCheckpoint({refresh,read,block=0}){
 let failure;
 try{await refresh();}catch(error){failure=error;}
 if(failure&&failure.message!=='QUERY_LIMIT')throw failure;
 let state;
 try{state=parseState(await read());}catch(error){throw failure||error;}
 if(state.block<block||failure&&state.block<=block)throw failure||Error('SNAPSHOT_NOT_ADVANCED');
 return {state,partial:!!failure};
}
export function assertRealtimeHealthy({failures,cutoff,holderCutoff,now=Date.now()}){
 assertWorkerHealthy(failures);
 if(!cutoff||!holderCutoff||now-Math.min(cutoff,holderCutoff)*1000>=2*FALLBACK_INTERVAL)throw Error('SNAPSHOT_STALE');
}
async function main(){
 const minutes=Number(process.env.SESSION_MINUTES||300);
 if(!process.env.ESIM_REALTIME_DATABASE_URL||!process.env.GITHUB_TOKEN||!process.env.ALCHEMY_API_KEY||!Number.isInteger(minutes)||minutes<1||minutes>300)throw Error('INVALID_WORKER_CONFIGURATION');
 const end=Date.now()+minutes*60000,run=promisify(execFile),stateFile='.goodway/esim-monitor/state.json.gz';
 const command=async file=>{
  try{const pending=run(process.execPath,[`scripts/esim/${file}.mjs`],{timeout:1500000,maxBuffer:1048576,env:{...process.env,ESIM_REMOTE_START:'true',ESIM_RPC_BUDGET:'600'}});pending.child.stdout.on('data',chunk=>process.stdout.write(chunk));await pending;}
  catch(error){throw Error(workerFailureCode(error));}
 };
 let lastRun=0,lastCoreArchive=0,lastHolderArchive=0,block=0,cutoff=0,holderCutoff=0,flow=null,lastFlow=0,lastCleanup=0,retryAt=0;
 const outstanding=new Set();
 const coreArchive=async()=>{await command('publish');lastCoreArchive=Date.now();};
 const holderArchive=async()=>{await command('holders-publish');lastHolderArchive=Date.now();};
 console.log('ESIM webhook worker: canonical verification, 3-minute coalescing, 10-minute fallback, independent hourly archives.');
 while(Date.now()<end){
  let pendingBlock=0;
  try{const s=await realtimeStatus();pendingBlock=Number(s.pending_block);}catch{console.warn('Inbox unavailable; periodic backfill remains enabled.');}
  if(Date.now()>=retryAt&&refreshNeeded({now:Date.now(),lastRun,cutoff,pendingBlock,block})){
   lastRun=Date.now();const failures=[];
   const attempt=async(kind,task)=>{try{await task();outstanding.delete(kind);return true;}catch(error){const code=/^[A-Z_]+$/.test(error.message)?error.message:'UPDATE_FAILED';failures.push(code);outstanding.add(kind);console.warn(`Realtime ${kind} deferred: ${code}`);return false;}};
   let state,partial=false,previousBytes;
   try{previousBytes=await readFile(stateFile);}catch{}
   const coreReady=await attempt('core-refresh',async()=>{
    ({state,partial}=await refreshCheckpoint({refresh:()=>command('refresh'),read:()=>readFile(stateFile),block}));
    if(!partial&&previousBytes&&parseState(previousBytes).block<state.block)await writeFile('.goodway/esim-monitor/rollback.json.gz',previousBytes);
    block=state.block;cutoff=state.cutoff;
   });
   if(coreReady&&state&&state.block===block){
    await attempt('core-publish',async()=>{await publishCore(state);console.log(JSON.stringify({phase:'realtime-core-published',block,cutoff,pendingBlock}));});
    // Core archive must survive a holder or live database outage.
    if(Date.now()-lastCoreArchive>=ARCHIVE_INTERVAL)await attempt('core-archive',coreArchive);
    // Catch up the canonical ledger first. Rebuilding all holders and provenance
    // for every partial prefix needlessly delays recovery and consumes RPC quota.
    if(!partial)await attempt('holders-refresh',async()=>{
     await command('holders-refresh');
     const holders=JSON.parse(await readFile('.goodway/esim-holders/holders.json','utf8'));
     if(holders.tradeCutoff<state.cutoff||holders.block<state.block)throw Error('HOLDER_TRADES_BEHIND');
     await attempt('holders-publish',async()=>{await publishRealtime([{kind:'holders',data:holders}]);holderCutoff=Math.min(holders.cutoff,holders.tradeCutoff);console.log(JSON.stringify({phase:'realtime-holders-published',block:holders.block,cutoff:holders.cutoff,tradeCutoff:holders.tradeCutoff}));});
     if(Date.now()-lastHolderArchive>=ARCHIVE_INTERVAL)await attempt('holders-archive',holderArchive);
    });
    // Provenance runs independently and retains its own cutoff.
    if(!partial&&!flow&&Date.now()-lastFlow>=ARCHIVE_INTERVAL){
     lastFlow=Date.now();flow=(async()=>{await attempt('provenance',async()=>{await command('claim-flow-refresh');await command('claim-flow-publish');});flow=null;})();
    }
   }
   if(partial)failures.push('BACKFILL_IN_PROGRESS');
   if(failures.some(code=>['CHAIN_OR_CHECKPOINT_CHANGED','SOURCE_INFLOW_CHECKPOINT_CHANGED'].includes(code))){
    // Do not overwrite the rollback prefix with a failed/forked checkpoint.
    try{await access('.goodway/esim-monitor/rollback.json.gz');await copyFile('.goodway/esim-monitor/rollback.json.gz',stateFile);}catch{}
   }
   if(failures.length){try{await markRealtimeError(failures[0]);}catch{}retryAt=Date.now()+(failures.includes('RPC_CAPACITY_EXCEEDED')?900000:partial?60000:FAST_INTERVAL);if(partial)lastRun=0;}
   if(Date.now()-lastCleanup>=ARCHIVE_INTERVAL){
    // Only transient notification metadata expires. Canonical accounting and
    // historical archives remain; old replays cannot advance the ledger twice.
    try{await realtimeSQL().query("DELETE FROM esim_webhook_receipts WHERE received_at < now()-interval '7 days'");lastCleanup=Date.now();}catch{}
   }
  }
  await sleep(Math.min(30000,Math.max(0,end-Date.now())));
 }
 if(flow)await flow;
 try{if(block){await coreArchive();outstanding.delete('core-archive');}}catch{outstanding.add('core-archive');console.warn('Final core archive deferred; next runner replays from the prior prefix.');}
 try{if(holderCutoff){await holderArchive();outstanding.delete('holders-archive');}}catch{outstanding.add('holders-archive');console.warn('Final holder archive deferred.');}
 for(let attempt=0;attempt<3;attempt++){
  try{await dispatchNextWorker({repo:process.env.GITHUB_REPOSITORY,token:process.env.GITHUB_TOKEN,workflowId:'esim-report.yml'});break;}
  catch{if(attempt===2)throw Error('WORKER_HANDOFF_FAILED');await sleep(5000*(attempt+1));}
 }
 // Handoff still runs on failure, but a stalled session must not show green.
 assertRealtimeHealthy({failures:outstanding,cutoff,holderCutoff});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await main();}catch{console.error('ESIM realtime worker stopped; scheduled recovery retained.');process.exitCode=1;}
}
