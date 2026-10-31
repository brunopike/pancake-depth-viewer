import {readRealtime,realtimeStatus} from '../server/esim/realtime-store.mjs';
export const config={maxDuration:30};
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).end();
 const kind=req.query?.kind;
 res.setHeader('Cache-Control','public, max-age=0, s-maxage=15, stale-while-revalidate=30');
 try{
  if(kind==='status'){
   const s=await realtimeStatus();return res.status(200).json({pendingBlock:Number(s.pending_block),processedBlock:Number(s.processed_block),holderBlock:Number(s.holder_block||0),lastDelivery:s.last_delivery,lastProcessed:s.last_processed,error:s.last_error||null,snapshots:s.snapshots||{}});
  }
  if(!['report','addresses','holders','depth'].includes(kind))return res.status(400).end();
  const row=await readRealtime(kind);if(!row)return res.status(503).json({error:'SNAPSHOT_PENDING'});
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Content-Encoding','gzip');res.setHeader('ETag',`"${row.etag}"`);
  return res.status(200).send(Buffer.from(row.body,'base64'));
 }catch{res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'SNAPSHOT_UNAVAILABLE'});}
}
