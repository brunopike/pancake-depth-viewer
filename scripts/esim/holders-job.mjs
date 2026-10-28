import {spawn} from 'node:child_process';
import {leaseFromEnvironment,requireLease} from '../../server/esim/worker-lease.mjs';
try{
 const lease=leaseFromEnvironment();if(!lease)throw Error('WORKER_LEASE_REQUIRED');
 for(const file of ['holders-refresh','holders-publish']){
  await requireLease(lease);
  const child=spawn(process.execPath,[`scripts/esim/${file}.mjs`],{stdio:'inherit',env:process.env});
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
  if(code!==0)throw Error('HOLDERS_JOB_FAILED');
 }
}catch{console.error('HOLDERS_JOB_FAILED');process.exitCode=1;}
