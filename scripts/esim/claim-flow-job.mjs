import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {leaseFromEnvironment,requireLease} from '../../server/esim/worker-lease.mjs';
try{
 const lease=leaseFromEnvironment();if(!lease)throw Error('WORKER_LEASE_REQUIRED');
 for(let pass=0;pass<8;pass++){
  for(const file of ['claim-flow-refresh','claim-flow-publish']){
   await requireLease(lease);
   const child=spawn(process.execPath,[`scripts/esim/${file}.mjs`],{stdio:'inherit',env:process.env});
   const stop=()=>child.kill('SIGTERM');
   for(const signal of ['SIGINT','SIGTERM'])process.once(signal,stop);
   let code;
   try{code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});}
   finally{for(const signal of ['SIGINT','SIGTERM'])process.removeListener(signal,stop);}
   if(code!==0)throw Error('PROVENANCE_JOB_FAILED');
  }
  const progress=JSON.parse(await readFile('.goodway/claim-flow/progress.json','utf8'));
  if(progress.throughBlock>=progress.targetBlock)break;
  if(pass===7)throw Error('PROVENANCE_BACKFILL_IN_PROGRESS');
 }
}catch{console.error('PROVENANCE_JOB_FAILED');process.exitCode=1;}
