import {neon} from '@neondatabase/serverless';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

let client;
export function realtimeSQL(){
 if(!process.env.ESIM_REALTIME_DATABASE_URL)throw Error('REALTIME_NOT_CONFIGURED');
 return client??=neon(process.env.ESIM_REALTIME_DATABASE_URL,{fetchOptions:{signal:undefined}});
}
export async function saveWebhook(hint,digest,sql=realtimeSQL()){
 // One statement commits the receipt and monotonic watermark together. A crash
 // cannot acknowledge a receipt without its pending work being durable.
 const rows=await sql.query(`WITH receipt AS (
 INSERT INTO esim_webhook_receipts (webhook,event_id,body_hash,block,event_count,event_kinds)
 VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (webhook,event_id) DO NOTHING RETURNING block
 ), updated AS (
 INSERT INTO esim_realtime_control (id,pending_block,last_delivery)
 SELECT 1,block,now() FROM receipt
 ON CONFLICT (id) DO UPDATE SET pending_block=greatest(esim_realtime_control.pending_block,excluded.pending_block),last_delivery=now()
 RETURNING pending_block)
 SELECT EXISTS(SELECT 1 FROM receipt) AS inserted,
 (SELECT body_hash FROM esim_webhook_receipts WHERE webhook=$1 AND event_id=$2) AS previous_hash`,[hint.webhook,hint.id,digest,hint.block,hint.events,hint.kinds||'']);
 const result=rows[0];if(!result.inserted&&result.previous_hash&&result.previous_hash!==digest)throw Error('EVENT_ID_CONFLICT');
 return result.inserted;
}
export async function realtimeStatus(sql=realtimeSQL()){
 const [row]=await sql.query("SELECT pending_block,processed_block,last_delivery,last_processed,last_error,(SELECT block FROM esim_realtime_snapshots WHERE kind='holders') AS holder_block FROM esim_realtime_control WHERE id=1");
 return row||{pending_block:0,processed_block:0};
}
export function encodeSnapshot(kind,data){
 if(!['report','addresses','holders'].includes(kind)||!Number.isSafeInteger(data?.block)||!Number.isFinite(data.cutoff))throw Error('INVALID_REALTIME_SNAPSHOT');
 const bytes=gzipSync(JSON.stringify(data));
 if(bytes.length>4*1024*1024)throw Error('REALTIME_SNAPSHOT_TOO_LARGE');
 return {kind,block:data.block,cutoff:data.cutoff,hash:createHash('sha256').update(bytes).digest('hex'),body:bytes.toString('base64')};
}
export async function publishRealtime(snapshots,{processedBlock,sql=realtimeSQL()}={}){
 const queries=snapshots.map(({kind,data})=>{
  const s=encodeSnapshot(kind,data);
  return sql.query(`INSERT INTO esim_realtime_snapshots (kind,block,cutoff,body,etag)
   VALUES ($1,$2,$3,$4,$5) ON CONFLICT (kind) DO UPDATE SET block=excluded.block,cutoff=excluded.cutoff,body=excluded.body,etag=excluded.etag,updated_at=now()
   WHERE excluded.block>=esim_realtime_snapshots.block`,[s.kind,s.block,s.cutoff,s.body,s.hash]);
 });
 if(processedBlock!==undefined)queries.push(sql.query(`UPDATE esim_realtime_control SET processed_block=greatest(processed_block,$1),last_processed=now(),last_error=NULL WHERE id=1`,[processedBlock]));
 await sql.transaction(queries);
}
export async function readRealtime(kind,sql=realtimeSQL()){
 if(!['report','addresses','holders'].includes(kind))throw Error('INVALID_SNAPSHOT_KIND');
 const [row]=await sql.query('SELECT block,cutoff,body,etag FROM esim_realtime_snapshots WHERE kind=$1',[kind]);return row;
}
export async function markRealtimeError(code,sql=realtimeSQL()){
 await sql.query('UPDATE esim_realtime_control SET last_error=$1 WHERE id=1',[/^[A-Z_]{3,80}$/.test(code)?code:'UPDATE_FAILED']);
}
