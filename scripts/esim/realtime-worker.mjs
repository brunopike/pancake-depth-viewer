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
import {workerFailureCode} from './hourly-worker.mjs';
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
async function main(){
 const minutes=Number(process.env.SESSION_MINUTES||300);
 if(!process.env.ESIM_REALTIME_DATABASE_URL||!process.env.GITHUB_TOKEN||!process.env.ALCHEMY_API_KEY||!Number.isInteger(minutes)||minutes<1||minutes>300)throw Error('INVALID_WORKER_CONFIGURATION');
 const end=Date.now()+minutes*60000,run=promisify(execFile),stateFile='.goodway/esim-monitor/state.json.gz';
 const command=async file=>{
  try{const {stdout}=await run(process.execPath,[`scripts/esim/${file}.mjs`],{timeout:1500000,maxBuffer:1048576,env:{...process.env,ESIM_REMOTE_START:'true',ESIM_RPC_BUDGET:'600'}});process.stdout.write(stdout);}
  catch(error){if(error.stdout)process.stdout.write(error.stdout);throw Error(workerFailureCode(error));}
 };
 let lastRun=0,lastCoreArchive=0,lastHolderArchive=0,block=0,cutoff=0,flow=null,lastFlow=0,lastCleanup=0,retryAt=0;
 const coreArchive=async()=>{await command('publish');lastCoreArchive=Date.now();};
 const holderArchive=async()=>{await command('holders-publish');lastHolderArchive=Date.now();};
 console.log('ESIM webhook worker: canonical verification, 3-minute coalescing, 10-minute fallback, independent hourly archives.');
 while(Date.now()<end){
  let pendingBlock=0;
  try{const s=await realtimeStatus();pendingBlock=Number(s.pending_block);}catch{console.warn('Inbox unavailable; periodic backfill remains enabled.');}
  if(Date.now()>=retryAt&&refreshNeeded({now:Date.now(),lastRun,cutoff,pendingBlock,block})){
   lastRun=Date.now();const failures=[];
   const attempt=async(task)=>{try{await task();return true;}catch(error){const code=/^[A-Z_]+$/.test(error.message)?error.message:'UPDATE_FAILED';failures.push(code);console.warn(`Realtime step deferred: ${code}`);return false;}};
   let state,refreshError,previousBytes;
   try{previousBytes=await readFile(stateFile);}catch{}
   const coreReady=await attempt(async()=>{
    try{await command('refresh');}catch(error){refreshError=error;}
    state=parseState(await readFile(stateFile));
    if(refreshError&&(refreshError.message!=='QUERY_LIMIT'||state.block<=block))throw refreshError;
    if(!refreshError&&previousBytes&&parseState(previousBytes).block<state.block)await writeFile('.goodway/esim-monitor/rollback.json.gz',previousBytes);
    block=state.block;cutoff=state.cutoff;
   });
   if(coreReady&&state&&state.block===block){
    await attempt(async()=>{await publishCore(state);console.log(JSON.stringify({phase:'realtime-core-published',block,cutoff,pendingBlock}));});
    // Core archive must survive a holder or live database outage.
    if(Date.now()-lastCoreArchive>=ARCHIVE_INTERVAL)await attempt(coreArchive);
    await attempt(async()=>{
     await command('holders-refresh');
     const holders=JSON.parse(await readFile('.goodway/esim-holders/holders.json','utf8'));
     if(holders.tradeCutoff<state.cutoff||holders.block<state.block)throw Error('HOLDER_TRADES_BEHIND');
     await attempt(async()=>{await publishRealtime([{kind:'holders',data:holders}]);console.log(JSON.stringify({phase:'realtime-holders-published',block:holders.block,cutoff:holders.cutoff,tradeCutoff:holders.tradeCutoff}));});
     if(Date.now()-lastHolderArchive>=ARCHIVE_INTERVAL)await attempt(holderArchive);
    });
    // Provenance runs independently and retains its own cutoff.
    if(!flow&&Date.now()-lastFlow>=ARCHIVE_INTERVAL){
     lastFlow=Date.now();flow=(async()=>{try{await command('claim-flow-refresh');await command('claim-flow-publish');}catch(error){console.warn(`Provenance deferred: ${error.message}`);}finally{flow=null;}})();
    }
   }
   if(refreshError)failures.push(refreshError.message);
   if(failures.some(code=>['CHAIN_OR_CHECKPOINT_CHANGED','SOURCE_INFLOW_CHECKPOINT_CHANGED'].includes(code))){
    // Do not overwrite the rollback prefix with a failed/forked checkpoint.
    try{await access('.goodway/esim-monitor/rollback.json.gz');await copyFile('.goodway/esim-monitor/rollback.json.gz',stateFile);}catch{}
   }
   if(failures.length){try{await markRealtimeError(failures[0]);}catch{}retryAt=Date.now()+(failures.includes('RPC_CAPACITY_EXCEEDED')?900000:FAST_INTERVAL);}
   if(Date.now()-lastCleanup>=ARCHIVE_INTERVAL){
    // Only transient notification metadata expires. Canonical accounting and
    // historical archives remain; old replays cannot advance the ledger twice.
    try{await realtimeSQL().query("DELETE FROM esim_webhook_receipts WHERE received_at < now()-interval '7 days'");lastCleanup=Date.now();}catch{}
   }
  }
  await sleep(Math.min(30000,Math.max(0,end-Date.now())));
 }
 if(flow)await flow;
 try{if(block)await coreArchive();}catch{console.warn('Final core archive deferred; next runner replays from the prior prefix.');}
 try{await holderArchive();}catch{console.warn('Final holder archive deferred.');}
 for(let attempt=0;attempt<3;attempt++){
  try{await dispatchNextWorker({repo:process.env.GITHUB_REPOSITORY,token:process.env.GITHUB_TOKEN,workflowId:'esim-report.yml'});return;}
  catch{if(attempt===2)throw Error('WORKER_HANDOFF_FAILED');await sleep(5000*(attempt+1));}
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await main();}catch{console.error('ESIM realtime worker stopped; scheduled recovery retained.');process.exitCode=1;}
}
