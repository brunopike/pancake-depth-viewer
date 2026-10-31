import {spawn} from 'node:child_process';
import {startLease} from '../../server/esim/worker-lease.mjs';

const [job,file]=process.argv.slice(2);
const allowed={cohort:['scripts/esim/cohort-refresh.mjs'],core:['scripts/esim/realtime-worker.mjs','scripts/esim/holders-job.mjs'],depth:['scripts/hourly-worker.mjs'],provenance:['scripts/esim/claim-flow-job.mjs']};
if(!allowed[job]?.includes(file))throw Error('INVALID_WORKER_COMMAND');
let guard,child;
const stop=()=>{if(child?.pid)try{process.kill(-child.pid,'SIGTERM');}catch{}};
try{
 guard=await startLease(job,{onLost:stop,allowStaleVm:process.env.GITHUB_ACTIONS==='true'&&['core','depth'].includes(job)});
 if(!guard)console.log(`Another ${job} worker owns the lease; scheduled fallback remains available.`);
 else{
  child=spawn(process.execPath,[file],{detached:true,stdio:'inherit',env:{...process.env,...guard.env},signal:guard.signal});
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,stop);
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code));});
  if(code!==0)process.exitCode=1;
 }
}catch{console.error('WORKER_LEASE_OR_PROCESS_FAILED');process.exitCode=1;}
finally{stop();if(guard)await guard.close();}
