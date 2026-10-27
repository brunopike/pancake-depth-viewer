import {gunzipSync} from 'node:zlib';
import {readRealtime,readRealtimeMetadata} from './realtime-store.mjs';

// A warm function checks only the small revision row. Concurrent page requests
// share one decode; the database body is downloaded again only on a revision.
export function createSnapshotReader({read=readRealtime,metadata=readRealtimeMetadata,now=Date.now,ttl=15000}={}){
 const cache=new Map(),pending=new Map();
 return async function snapshot(kind){
  if(!['report','addresses','holders'].includes(kind))throw Error('INVALID_SNAPSHOT_KIND');
  const prior=cache.get(kind);
  if(prior&&now()-prior.checkedAt<ttl)return prior;
  if(pending.has(kind))return pending.get(kind);
  const request=(async()=>{
   if(prior){
    const revision=await metadata(kind);
    if(!revision)throw Error('SNAPSHOT_PENDING');
    if(Number(revision.block)<prior.data.block)throw Error('SNAPSHOT_REGRESSED');
    if(revision.etag===prior.etag){prior.checkedAt=now();return prior;}
   }
   const row=await read(kind);if(!row)throw Error('SNAPSHOT_PENDING');
   const data=JSON.parse(gunzipSync(Buffer.from(row.body,'base64')));
   if(data.version!==1||!Number.isSafeInteger(data.block)||data.block!==Number(row.block)||!Number.isFinite(data.cutoff)||prior&&data.block<prior.data.block)throw Error('INVALID_SNAPSHOT');
   const next={data,etag:row.etag,checkedAt:now()};cache.set(kind,next);return next;
  })();pending.set(kind,request);
  try{return await request;}finally{if(pending.get(kind)===request)pending.delete(kind);}
 };
}
export const readViewSnapshot=createSnapshotReader();
