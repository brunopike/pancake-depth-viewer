import {spawn} from 'node:child_process';
import {leaseFromEnvironment,requireLease} from '../../server/esim/worker-lease.mjs';
try{
 const lease=leaseFromEnvironment();if(!lease)throw Error('WORKER_LEASE_REQUIRED');
 for(const file of ['claim-flow-refresh','claim-flow-publish']){
  await requireLease(lease);
  const child=spawn(process.execPath,[`scripts/esim/${file}.mjs`],{stdio:'inherit',env:process.env});
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
  if(code!==0)throw Error('PROVENANCE_JOB_FAILED');
 }
}catch{console.error('PROVENANCE_JOB_FAILED');process.exitCode=1;}
