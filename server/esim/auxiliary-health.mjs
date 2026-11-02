import {realtimeSQL} from './realtime-store.mjs';
const kinds=['provenance','cohort','archive'],root='https://raw.githubusercontent.com/brunopike/pancake-depth-viewer/esim-cache/';
let cached,pending,checkedAt=0;
function valid(row,kind){return row?.version===1&&row.kind===kind&&Number.isSafeInteger(row.block)&&row.block>0&&Number.isFinite(row.cutoff)&&row.cutoff>0&&Number.isFinite(Date.parse(row.publishedAt))&&row.counts&&Object.values(row.counts).every(n=>Number.isSafeInteger(n)&&n>=0);}
export function auxiliaryFile(kind,block,cutoff,counts={}){
 const row={version:1,kind,block,cutoff,publishedAt:new Date().toISOString(),counts};
 if(!kinds.includes(kind)||!valid(row,kind))throw Error('INVALID_AUXILIARY_HEALTH');
 return [kind+'-health.json',JSON.stringify(row)];
}
export async function readAuxiliaryStatus(){
 if(cached&&Date.now()-checkedAt<60000)return cached;
 if(pending)return pending;
 pending=Promise.all(kinds.map(async kind=>{
  try{const r=await fetch(root+kind+'-health.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(3000)});if(!r.ok)throw Error('UNAVAILABLE');const row=await r.json();if(!valid(row,kind))throw Error('INVALID');return [kind,row];}
  catch{return [kind,cached?.[kind]||null];}
 })).then(rows=>{checkedAt=Date.now();cached=Object.fromEntries(rows);return cached;}).finally(()=>{pending=null;});
 return pending;
}

export async function readAuxiliaryJobs(sql=realtimeSQL()){
 const rows=await sql.query("SELECT job,expires_at>clock_timestamp() AS running,updated_at FROM esim_worker_leases WHERE job IN ('provenance','cohort')");
 return Object.fromEntries(rows.filter(r=>['provenance','cohort'].includes(r.job)).map(r=>[r.job,{running:r.running===true,lastHeartbeat:r.updated_at}]));
}
