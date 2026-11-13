import {neon} from '@neondatabase/serverless';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {leaseStatement,leaseFromEnvironment} from './worker-lease.mjs';

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
 const [row]=await sql.query("SELECT pending_block,processed_block,last_delivery,last_processed,last_error,(SELECT block FROM esim_realtime_snapshots WHERE kind='holders') AS holder_block,(SELECT json_object_agg(kind,json_build_object('block',block,'cutoff',cutoff,'updatedAt',updated_at)) FROM esim_realtime_snapshots) AS snapshots FROM esim_realtime_control WHERE id=1");
 return row||{pending_block:0,processed_block:0};
}
export function encodeSnapshot(kind,data){
 const depth=kind==='depth',block=depth?Number(data?.blockNumber):data?.block,cutoff=depth?data?.timestamp/1000:data?.cutoff;
 if(!['report','addresses','holders','depth'].includes(kind)||!Number.isSafeInteger(block)||block<1||!Number.isFinite(cutoff))throw Error('INVALID_REALTIME_SNAPSHOT');
 if(depth&&(data.version!==1||data.chainId!==56||data.base!=='0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d'||data.quote!=='0x55d398326f99059ff775485246999027b3197955'||!/^0x[0-9a-f]{64}$/i.test(data.blockHash)||!data.pools?.length||!Array.isArray(data.failed)))throw Error('INVALID_REALTIME_DEPTH');
 const bytes=gzipSync(JSON.stringify(data));
 if(bytes.length>64*1024*1024)throw Error('REALTIME_SNAPSHOT_TOO_LARGE');
 const snapshot={kind,block,cutoff,hash:createHash('sha256').update(bytes).digest('hex'),body:bytes.toString('base64')};
 // Each public response stays below the function limit as address history grows.
 if(bytes.length>4*1024*1024){snapshot.parts=[];for(let i=0;i<bytes.length;i+=2*1024*1024)snapshot.parts.push(bytes.subarray(i,i+2*1024*1024).toString('base64'));snapshot.body='chunks-v1:'+snapshot.parts.length;}
 return snapshot;
}
export async function publishRealtime(snapshots,{processedBlock,sql=realtimeSQL(),lease=leaseFromEnvironment()}={}){
 const queries=snapshots.flatMap(({kind,data})=>{
  const s=encodeSnapshot(kind,data);
  return [...(s.parts||[]).map((body,index)=>sql.query('INSERT INTO esim_realtime_snapshot_parts(kind,etag,part,body) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[s.kind,s.hash,index,body])),sql.query(`WITH published AS (INSERT INTO esim_realtime_snapshots (kind,block,cutoff,body,etag)
   VALUES ($1,$2,$3,$4,$5) ON CONFLICT (kind) DO UPDATE SET block=excluded.block,cutoff=excluded.cutoff,body=excluded.body,etag=excluded.etag,updated_at=now()
   WHERE excluded.block>=esim_realtime_snapshots.block RETURNING kind,etag)
   DELETE FROM esim_realtime_snapshot_parts p USING published s WHERE p.kind=s.kind AND p.etag<>s.etag`,[s.kind,s.block,s.cutoff,s.body,s.hash])];
 });
 if(processedBlock!==undefined)queries.push(sql.query(`UPDATE esim_realtime_control SET processed_block=greatest(processed_block,$1),last_processed=now(),last_error=NULL WHERE id=1`,[processedBlock]));
 // The check and all writes share one transaction and lock. Checking only
 // before an HTTP write would let a paused former owner overwrite its successor.
 await sql.transaction(lease?[leaseStatement(lease,sql),...queries]:queries);
}
export async function readRealtimeHead(kind,sql=realtimeSQL()){
 if(!['report','addresses','holders','depth'].includes(kind))throw Error('INVALID_SNAPSHOT_KIND');
 const [row]=await sql.query('SELECT block,cutoff,body,etag FROM esim_realtime_snapshots WHERE kind=$1',[kind]);return row;
}
export function snapshotPartCount(row){
 if(!row?.body?.startsWith('chunks-v1:'))return 0;
 const count=Number(row.body.slice(10));if(!Number.isInteger(count)||count<1||count>32||row.body!=='chunks-v1:'+count||!/^[0-9a-f]{64}$/.test(row.etag))throw Error('INVALID_SNAPSHOT_PARTS');return count;
}
export async function readRealtimePart(kind,etag,index,sql=realtimeSQL()){
 if(!['report','addresses','holders','depth'].includes(kind)||!/^[0-9a-f]{64}$/.test(etag)||!Number.isInteger(index)||index<0||index>=32)throw Error('INVALID_SNAPSHOT_PART');
 const [row]=await sql.query('SELECT p.body FROM esim_realtime_snapshot_parts p JOIN esim_realtime_snapshots s ON s.kind=p.kind AND s.etag=p.etag WHERE p.kind=$1 AND p.etag=$2 AND p.part=$3',[kind,etag,index]);
 if(!row||!row.body||row.body.length>3*1024*1024)throw Error('SNAPSHOT_PART_UNAVAILABLE');return row.body;
}
export async function readRealtime(kind,sql=realtimeSQL()){
 const row=await readRealtimeHead(kind,sql),count=snapshotPartCount(row);if(!count)return row;
 const parts=[];for(let i=0;i<count;i++)parts.push(Buffer.from(await readRealtimePart(kind,row.etag,i,sql),'base64'));
 const bytes=Buffer.concat(parts);if(createHash('sha256').update(bytes).digest('hex')!==row.etag)throw Error('SNAPSHOT_PART_HASH_MISMATCH');return {...row,body:bytes.toString('base64')};
}
export async function readRealtimeMetadata(kind,sql=realtimeSQL()){
 if(!['report','addresses','holders','depth'].includes(kind))throw Error('INVALID_SNAPSHOT_KIND');
 const [row]=await sql.query('SELECT block,cutoff,etag FROM esim_realtime_snapshots WHERE kind=$1',[kind]);return row;
}
export async function markRealtimeError(code,sql=realtimeSQL()){
 await sql.query('UPDATE esim_realtime_control SET last_error=$1 WHERE id=1',[/^[A-Z_]{3,80}$/.test(code)?code:'UPDATE_FAILED']);
}
