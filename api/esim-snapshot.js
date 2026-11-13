import {readRealtimeHead,readRealtimePart,snapshotPartCount,realtimeStatus} from '../server/esim/realtime-store.mjs';
import {readAuxiliaryStatus,readAuxiliaryJobs} from '../server/esim/auxiliary-health.mjs';
export const config={maxDuration:30};
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).end();
 const kind=req.query?.kind;
 res.setHeader('Cache-Control','public, max-age=0, s-maxage=5, stale-while-revalidate=5');
 try{
  if(kind==='status'){
   const [s,auxiliary,auxiliaryJobs]=await Promise.all([realtimeStatus(),readAuxiliaryStatus(),readAuxiliaryJobs().catch(()=>null)]);return res.status(200).json({pendingBlock:Number(s.pending_block),processedBlock:Number(s.processed_block),holderBlock:Number(s.holder_block||0),lastDelivery:s.last_delivery,webhookRequired:process.env.ESIM_UPDATE_MODE!=='poll',lastProcessed:s.last_processed,error:s.last_error||null,snapshots:s.snapshots||{},auxiliary,auxiliaryJobs});
  }
  if(!['report','addresses','holders','depth'].includes(kind))return res.status(400).end();
  if(req.query.part!==undefined){
   const part=req.query.part,etag=req.query.etag;if(typeof part!=='string'||!/^(0|[1-9]\d?)$/.test(part)||Number(part)>=32||typeof etag!=='string'||!/^[0-9a-f]{64}$/.test(etag))return res.status(400).end();
   const body=await readRealtimePart(kind,etag,Number(part));res.setHeader('Content-Type','application/octet-stream');return res.status(200).send(Buffer.from(body,'base64'));
  }
  const row=await readRealtimeHead(kind);if(!row)return res.status(503).json({error:'SNAPSHOT_PENDING'});
  const parts=snapshotPartCount(row);if(parts)return res.status(200).json({version:1,chunked:true,kind,block:Number(row.block),cutoff:Number(row.cutoff),etag:row.etag,parts});
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Content-Encoding','gzip');res.setHeader('ETag',`"${row.etag}"`);
  return res.status(200).send(Buffer.from(row.body,'base64'));
 }catch{res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'SNAPSHOT_UNAVAILABLE'});}
}
