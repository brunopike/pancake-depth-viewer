import {execFile} from 'node:child_process';
import {access} from 'node:fs/promises';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
import {runHourlyWorker,dispatchNextWorker} from '../hourly-worker.mjs';
import {validSnapshot} from '../../src/snapshot-client.mjs';
import {SNAPSHOT_INTERVAL_MS} from '../../src/snapshot-status.mjs';

// One timer owns both datasets. Each dataset has its own cutoff and failure boundary.
export async function refreshDueSnapshots({read,refresh,publishSite,now=Date.now,onError=()=>{}}){
 const due=[];let changed=false;
 for(const kind of ['report','holders']){
  try{
   const prior=await read(kind),next=prior.cutoff*1000+SNAPSHOT_INTERVAL_MS;
   if(!validSnapshot(kind,prior))throw Error('INVALID_SNAPSHOT');
   if(next>now()){due.push(next);continue;}
   await refresh(kind);
   const updated=await read(kind);
   if(!validSnapshot(kind,updated)||updated.block<=prior.block||updated.cutoff<=prior.cutoff)throw Error('SNAPSHOT_NOT_ADVANCED');
   changed=true;due.push(Math.max(now()+60000,updated.cutoff*1000+SNAPSHOT_INTERVAL_MS));
  }catch{onError(kind);due.push(now()+SNAPSHOT_INTERVAL_MS);}
 }
 if(changed)try{await publishSite();}catch{onError('website');}
 return Math.min(...due);
}

async function main(){
 const repo=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN,minutes=Number(process.env.SESSION_MINUTES||300);
 if(repo!=='starkweng/pancake-depth-viewer'||!token||!process.env.ALCHEMY_API_KEY)throw Error('INVALID_WORKER_CONFIGURATION');
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
  const {stdout}=await run(process.execPath,[`scripts/esim/${file}.mjs`],{timeout:1500000,maxBuffer:524288,env:{...process.env,ESIM_REMOTE_START:'true',ESIM_RPC_BUDGET:'600'}});
  process.stdout.write(stdout);
 };
 const refresh=async kind=>{
  if(kind==='report')try{await command('refresh');}finally{
   let checkpoint=false;try{await access('.goodway/esim-monitor/state.json.gz');checkpoint=true;}catch{}
   if(checkpoint)await command('publish');
  }
  else{await command('holders-refresh');await command('holders-publish');}
 };
 const publishSite=async()=>{
  const response=await fetch(`${root}/actions/workflows/pages.yml/dispatches`,{method:'POST',headers:{...headers,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({ref:'main',inputs:{refresh_data_only:true}}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('WEBSITE_DISPATCH_FAILED');console.log('Updated snapshots published; website refresh dispatched.');
 };
 console.log(`ESIM hourly worker started; bounded session ${minutes} minutes.`);
 await runHourlyWorker({sessionMs:minutes*60000,refresh:async()=>{
  const next=await refreshDueSnapshots({read,refresh,publishSite,onError:kind=>console.error(`ESIM ${kind} update failed; last verified data preserved; retry within 60 minutes.`)});
  console.log(`Next ESIM read: ${new Date(next).toISOString()}`);return next;
 },handoff:async()=>{
  for(let attempt=0;attempt<3;attempt++){
   try{const started=await dispatchNextWorker({repo,token,workflowId:'esim-report.yml'});console.log(started?'Next ESIM worker dispatched.':'ESIM worker stopped: workflow disabled or repository no longer public.');return;}
   catch{if(attempt===2)throw Error('WORKER_HANDOFF_FAILED');await sleep(5000*(attempt+1));}
  }
 }});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await main();}catch{console.error('ESIM worker stopped. Check configuration or restart the report workflow.');process.exitCode=1;}
}
