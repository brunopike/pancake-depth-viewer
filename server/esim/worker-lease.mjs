import {randomUUID} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
import {realtimeSQL} from './realtime-store.mjs';
import {STALE_PROGRESS_SECONDS} from './worker-health.mjs';

export const LEASE_SECONDS=120;
function validate(job,owner,ttlSeconds=LEASE_SECONDS){
 if(!/^[a-z0-9-]{1,80}$/.test(job||'')||!/^[\w:-]{1,160}$/.test(owner||'')||!Number.isInteger(ttlSeconds)||ttlSeconds<30||ttlSeconds>900)throw Error('INVALID_WORKER_LEASE');
}
export async function acquireLease(job,owner,{sql=realtimeSQL(),ttlSeconds=LEASE_SECONDS,allowStaleVm=false}={}){
 validate(job,owner,ttlSeconds);
 if(typeof allowStaleVm!=='boolean'||allowStaleVm&&(!['core','depth'].includes(job)||!owner.startsWith('github:')))throw Error('INVALID_STALE_TAKEOVER');
 const [row]=await sql.query(`INSERT INTO esim_worker_leases(job,owner,fence,expires_at)
 VALUES($1,$2,1,clock_timestamp()+$3*interval '1 second')
 ON CONFLICT(job) DO UPDATE SET owner=excluded.owner,fence=esim_worker_leases.fence+1,
 expires_at=excluded.expires_at,updated_at=clock_timestamp()
 WHERE esim_worker_leases.expires_at<=clock_timestamp() OR
 ($4::boolean AND esim_worker_leases.owner LIKE 'vm:%' AND EXISTS(
  SELECT 1 FROM esim_realtime_snapshots WHERE kind=ANY(CASE WHEN $1='core' THEN ARRAY['report','addresses','holders'] ELSE ARRAY['depth'] END)
  AND updated_at<clock_timestamp()-$5*interval '1 second'))
 RETURNING job,owner,fence`,[job,owner,ttlSeconds,allowStaleVm,STALE_PROGRESS_SECONDS]);
 return row?{job:row.job,owner:row.owner,fence:String(row.fence)}:null;
}
export function leaseStatement(lease,sql){
 validate(lease?.job,lease?.owner);
 if(!/^[1-9][0-9]*$/.test(String(lease.fence)))throw Error('INVALID_WORKER_LEASE');
 return sql.query('SELECT esim_require_worker_lease($1,$2,$3)',[lease.job,lease.owner,String(lease.fence)]);
}
export async function requireLease(lease,{sql=realtimeSQL()}={}){
 try{await leaseStatement(lease,sql);}catch{throw Error('WORKER_LEASE_LOST');}
}
export async function renewLease(lease,{sql=realtimeSQL(),ttlSeconds=LEASE_SECONDS}={}){
 validate(lease.job,lease.owner,ttlSeconds);
 const rows=await sql.query(`UPDATE esim_worker_leases SET expires_at=clock_timestamp()+$4*interval '1 second',updated_at=clock_timestamp()
 WHERE job=$1 AND owner=$2 AND fence=$3 AND expires_at>clock_timestamp() RETURNING fence`,[lease.job,lease.owner,lease.fence,ttlSeconds]);
 return rows.length===1;
}
// Three bounded attempts fit inside the 120-second lease even after the
// 20-second heartbeat interval. An authoritative ownership loss is not retried.
export async function renewLeaseWithRetry(lease,{renew=()=>renewLease(lease),wait=sleep,timeoutMs=15000,onRetry=()=>{}}={}){
 for(let attempt=0;attempt<3;attempt++){
  let timer;
  try{return await Promise.race([renew(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('WORKER_LEASE_TIMEOUT')),timeoutMs);})]);}
  catch{if(attempt===2)throw Error('WORKER_LEASE_UNAVAILABLE');onRetry(attempt+1);}
  finally{clearTimeout(timer);}
  await wait(1000);
 }
}
export async function releaseLease(lease,{sql=realtimeSQL()}={}){
 const rows=await sql.query(`UPDATE esim_worker_leases SET expires_at=clock_timestamp(),updated_at=clock_timestamp()
 WHERE job=$1 AND owner=$2 AND fence=$3 RETURNING fence`,[lease.job,lease.owner,lease.fence]);return rows.length===1;
}
export function leaseFromEnvironment(){
 const {ESIM_LEASE_JOB:job,ESIM_LEASE_OWNER:owner,ESIM_LEASE_FENCE:fence}=process.env;
 if(!job&&!owner&&!fence)return null;
 validate(job,owner);if(!/^[1-9][0-9]*$/.test(fence||''))throw Error('INVALID_WORKER_LEASE');return {job,owner,fence};
}
export async function startLease(job,{sql=realtimeSQL(),onLost=()=>{},owner=`${process.env.GITHUB_RUN_ID?'github':'vm'}:${randomUUID()}`,allowStaleVm=false}={}){
 const lease=await acquireLease(job,owner,{sql,allowStaleVm});if(!lease)return null;
 let lost=false,renewing=false;
 const controller=new AbortController();
 const timer=setInterval(async()=>{
  if(renewing||lost)return;renewing=true;
  try{if(!await renewLeaseWithRetry(lease,{renew:()=>renewLease(lease,{sql}),onRetry:attempt=>console.warn(JSON.stringify({phase:'lease-renewal-retry',job,attempt}))}))throw Error('WORKER_LEASE_LOST');}
  catch(error){lost=true;controller.abort();onLost(error.message==='WORKER_LEASE_LOST'?'WORKER_LEASE_LOST':'WORKER_LEASE_UNAVAILABLE');}
  finally{renewing=false;}
 },20000);timer.unref();
 return {lease,signal:controller.signal,
  env:{ESIM_LEASE_JOB:lease.job,ESIM_LEASE_OWNER:lease.owner,ESIM_LEASE_FENCE:lease.fence},
  check:async()=>{if(lost)throw Error('WORKER_LEASE_LOST');await requireLease(lease,{sql});},
  close:async()=>{clearInterval(timer);controller.abort();try{await releaseLease(lease,{sql});}catch{}}
 };
}
