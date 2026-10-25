import {execFile} from 'node:child_process';
import {access} from 'node:fs/promises';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
import {runHourlyWorker,dispatchNextWorker} from '../hourly-worker.mjs';
import {validSnapshot} from '../../src/snapshot-client.mjs';
import {SNAPSHOT_INTERVAL_MS} from '../../src/snapshot-status.mjs';
import {projectRepository} from '../../server/esim/repository.mjs';
import {isSourceInflowAligned} from '../../server/esim/source-inflows.mjs';

const failureCodes=['RPC_CAPACITY_EXCEEDED','RPC_RATE_LIMITED','RPC_UNAVAILABLE','RPC_MEMBER_FAILED','QUERY_LIMIT','SNAPSHOT_NOT_ADVANCED','INVALID_SNAPSHOT','CHECKPOINT_UNAVAILABLE','WEBSITE_DISPATCH_FAILED'];
export function workerFailureCode(error){
 return failureCodes.find(code=>error?.message===code||new RegExp(`\\b${code}\\b`).test(error?.stderr||''))||'UPDATE_FAILED';
}
export function assertWorkerHealthy(failures){if(failures.size)throw Error('SNAPSHOT_UPDATE_FAILED');}

// One timer owns both datasets. Each dataset has its own cutoff and failure boundary.
export async function refreshDueSnapshots({read,refresh,publishSite,now=Date.now,onError=()=>{},onSuccess=()=>{}}){
 const due=[];let changed=false,reportCheckpoint;
 for(const kind of ['report','holders']){
  try{
   const prior=await read(kind),next=prior.cutoff*1000+SNAPSHOT_INTERVAL_MS;
   if(!validSnapshot(kind,prior))throw Error('INVALID_SNAPSHOT');
   if(kind==='report')reportCheckpoint=prior;
   const needsInflow=kind==='report'&&!isSourceInflowAligned(prior.sourceInflow,prior);
   const needsTrades=kind==='holders'&&reportCheckpoint&&!(prior.tradeCutoff>=reportCheckpoint.cutoff);
   if(next>now()&&!needsInflow&&!needsTrades){due.push(next);onSuccess(kind);continue;}
   await refresh(kind);
   const updated=await read(kind);
   const synchronized=needsInflow&&updated.block===prior.block&&updated.cutoff===prior.cutoff&&updated.blockHash===prior.blockHash&&isSourceInflowAligned(updated.sourceInflow,updated);
   const tradesSynchronized=needsTrades&&updated.block>=prior.block&&updated.cutoff>=prior.cutoff&&updated.tradeCutoff>=reportCheckpoint.cutoff;
   if(!validSnapshot(kind,updated)||kind==='report'&&!isSourceInflowAligned(updated.sourceInflow,updated)||!synchronized&&!tradesSynchronized&&(updated.block<=prior.block||updated.cutoff<=prior.cutoff)||needsTrades&&!tradesSynchronized)throw Error('SNAPSHOT_NOT_ADVANCED');
   if(kind==='report')reportCheckpoint=updated;
   changed=true;onSuccess(kind);due.push(Math.max(now()+60000,updated.cutoff*1000+SNAPSHOT_INTERVAL_MS));
  }catch(error){onError(kind,error);due.push(now()+SNAPSHOT_INTERVAL_MS);}
 }
 if(changed)try{await publishSite();onSuccess('website');}catch(error){onError('website',error);}
 return Math.min(...due);
}

async function main(){
 const repo=projectRepository(process.env.GITHUB_REPOSITORY),token=process.env.GITHUB_TOKEN,minutes=Number(process.env.SESSION_MINUTES||300);
 if(!repo||!token||!process.env.ALCHEMY_API_KEY)throw Error('INVALID_WORKER_CONFIGURATION');
 if(!Number.isInteger(minutes)||minutes<1||minutes>300)throw Error('INVALID_WORKER_DURATION');
 const root=`https://api.github.com/repos/${repo}`,headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github.raw+json'};
 const read=async kind=>{
  const path=kind==='report'?'report.json?ref=esim-cache':'holders.json?ref=holder-cache';
  const response=await fetch(`${root}/contents/${path}`,{headers,cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('CHECKPOINT_UNAVAILABLE');
  const data=await response.json();
  if(!validSnapshot(kind,data))throw Error('INVALID_SNAPSHOT');
  console.log(JSON.stringify({phase:'snapshot',kind,block:data.block,cutoff:data.cutoff}));return data;
 };
 const run=promisify(execFile),command=async file=>{
  try{const {stdout}=await run(process.execPath,[`scripts/esim/${file}.mjs`],{timeout:1500000,maxBuffer:524288,env:{...process.env,ESIM_REMOTE_START:'true',ESIM_RPC_BUDGET:'600'}});process.stdout.write(stdout);}
  catch(error){throw Error(workerFailureCode(error));}
 };
 const refresh=async kind=>{
  let failure;
  if(kind==='report')try{await command('refresh');}catch(error){
   failure=error;throw error;
  }finally{
   let checkpoint=false;try{await access('.goodway/esim-monitor/state.json.gz');checkpoint=true;}catch{}
   if(checkpoint&&failure?.message!=='RPC_CAPACITY_EXCEEDED'){
    await command('publish');
    // Provenance has an independent failure boundary; verified trade totals survive.
    try{await command('claim-flow-refresh');await command('claim-flow-publish');}
    catch{console.error('ESIM claim flow update failed; last verified provenance preserved.');}
   }
  }
  else{await command('holders-refresh');await command('holders-publish');}
 };
 const publishSite=async()=>{
  const response=await fetch(`${root}/actions/workflows/pages.yml/dispatches`,{method:'POST',headers:{...headers,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({ref:'main',inputs:{refresh_data_only:true}}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('WEBSITE_DISPATCH_FAILED');console.log('Updated snapshots published; website refresh dispatched.');
 };
 console.log(`ESIM hourly worker started; bounded session ${minutes} minutes.`);
 const failures=new Set();
 await runHourlyWorker({sessionMs:minutes*60000,refresh:async()=>{
  const next=await refreshDueSnapshots({read,refresh,publishSite,onSuccess:kind=>failures.delete(kind),onError:(kind,error)=>{failures.add(kind);console.error(`ESIM ${kind} update failed: ${workerFailureCode(error)}; last verified data preserved; retry within 60 minutes.`);}});
  console.log(`Next ESIM read: ${new Date(next).toISOString()}`);return next;
 },handoff:async()=>{
  for(let attempt=0;attempt<3;attempt++){
   try{const started=await dispatchNextWorker({repo,token,workflowId:'esim-report.yml'});console.log(started?'Next ESIM worker dispatched.':'ESIM worker stopped: workflow disabled or repository no longer public.');return;}
   catch{if(attempt===2)throw Error('WORKER_HANDOFF_FAILED');await sleep(5000*(attempt+1));}
  }
 }});
 assertWorkerHealthy(failures);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await main();}catch{console.error('ESIM worker stopped. Check configuration or restart the report workflow.');process.exitCode=1;}
}
