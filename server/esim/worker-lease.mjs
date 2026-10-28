import {randomUUID} from 'node:crypto';
import {realtimeSQL} from './realtime-store.mjs';

export const LEASE_SECONDS=120;
function validate(job,owner,ttlSeconds=LEASE_SECONDS){
 if(!/^[a-z0-9-]{1,80}$/.test(job||'')||!/^[\w:-]{1,160}$/.test(owner||'')||!Number.isInteger(ttlSeconds)||ttlSeconds<30||ttlSeconds>900)throw Error('INVALID_WORKER_LEASE');
}
export async function acquireLease(job,owner,{sql=realtimeSQL(),ttlSeconds=LEASE_SECONDS}={}){
 validate(job,owner,ttlSeconds);
 const [row]=await sql.query(`INSERT INTO esim_worker_leases(job,owner,fence,expires_at)
 VALUES($1,$2,1,clock_timestamp()+$3*interval '1 second')
 ON CONFLICT(job) DO UPDATE SET owner=excluded.owner,fence=esim_worker_leases.fence+1,
 expires_at=excluded.expires_at,updated_at=clock_timestamp()
 WHERE esim_worker_leases.expires_at<=clock_timestamp() RETURNING job,owner,fence`,[job,owner,ttlSeconds]);
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
export async function releaseLease(lease,{sql=realtimeSQL()}={}){
 const rows=await sql.query(`UPDATE esim_worker_leases SET expires_at=clock_timestamp(),updated_at=clock_timestamp()
 WHERE job=$1 AND owner=$2 AND fence=$3 RETURNING fence`,[lease.job,lease.owner,lease.fence]);return rows.length===1;
}
export function leaseFromEnvironment(){
 const {ESIM_LEASE_JOB:job,ESIM_LEASE_OWNER:owner,ESIM_LEASE_FENCE:fence}=process.env;
 if(!job&&!owner&&!fence)return null;
 validate(job,owner);if(!/^[1-9][0-9]*$/.test(fence||''))throw Error('INVALID_WORKER_LEASE');return {job,owner,fence};
}
export async function startLease(job,{sql=realtimeSQL(),onLost=()=>{},owner=`${process.env.GITHUB_RUN_ID?'github':'vm'}:${randomUUID()}`}={}){
 const lease=await acquireLease(job,owner,{sql});if(!lease)return null;
 let lost=false,renewing=false;
 const controller=new AbortController();
 const timer=setInterval(async()=>{
  if(renewing||lost)return;renewing=true;
  let deadline;
  try{if(!await Promise.race([renewLease(lease,{sql}),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('WORKER_LEASE_TIMEOUT')),15000);})]))throw Error('WORKER_LEASE_LOST');}
  catch{lost=true;controller.abort();onLost();}
  finally{clearTimeout(deadline);renewing=false;}
 },20000);timer.unref();
 return {lease,signal:controller.signal,
  env:{ESIM_LEASE_JOB:lease.job,ESIM_LEASE_OWNER:lease.owner,ESIM_LEASE_FENCE:lease.fence},
  check:async()=>{if(lost)throw Error('WORKER_LEASE_LOST');await requireLease(lease,{sql});},
  close:async()=>{clearInterval(timer);controller.abort();try{await releaseLease(lease,{sql});}catch{}}
 };
}
