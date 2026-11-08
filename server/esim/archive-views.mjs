import {createHash} from 'node:crypto';
import {writeCheckpoint} from './state-writer.mjs';
import {readCheckpoint} from './state-reader.mjs';
import {TOKEN,SOURCE} from './metrics.mjs';
import {readState} from './store.mjs';

const directory='.goodway/esim-archive-views',producer=import.meta.url;
const day=seconds=>Math.floor((seconds+28800)/86400);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function readArchiveState(file){
 const hash=createHash('sha256');let bytes=0;
 const state=await readState(file,{onCompressedChunk:chunk=>{hash.update(chunk);bytes+=chunk.length;}});
 return {state,checkpointIdentity:{bytes,sha256:hash.digest('hex')}};
}
export async function prepareArchiveViews(state,report,addresses,{dir=directory,checkpointIdentity}={}){
 if(!Number.isSafeInteger(checkpointIdentity?.bytes)||checkpointIdentity.bytes<=0||!/^[0-9a-f]{64}$/.test(checkpointIdentity.sha256))throw Error('ARCHIVE_IDENTITY_REQUIRED');
 const metadata=Object.fromEntries(['version','token','source','block','blockHash','cutoff'].map(k=>[k,state[k]]));
 await writeCheckpoint({producer,checkpointIdentity,state:metadata,counts:{trades:state.trades.length,distributions:state.distributions.length},report,addresses},dir);
}
export async function readArchiveViews(bytes,{dir=directory,now=Date.now()/1000}={}){
 try{
  const cached=await readCheckpoint(`${dir}/state.json.gz`),state=cached.state;
  if(cached.producer!==producer||cached.checkpointIdentity?.bytes!==bytes.length||cached.checkpointIdentity?.sha256!==digest(bytes)||!state||!cached.counts)return null;
  if(state.version!==1||state.token!==TOKEN||state.source!==SOURCE||!Number.isSafeInteger(state.block)||!/^0x[0-9a-f]{64}$/.test(state.blockHash))return null;
  if(!['trades','distributions'].every(k=>Number.isSafeInteger(cached.counts[k])&&cached.counts[k]>=0))return null;
  if(![cached.report,cached.addresses].every(view=>view?.version===1&&Number.isFinite(view.generatedAt)&&['block','blockHash','cutoff'].every(k=>view[k]===state[k])&&day(view.generatedAt)===day(now)))return null;
  if(cached.report.generatedAt!==cached.addresses.generatedAt)return null;
  if(cached.report.token!==state.token||cached.report.source!==state.source)return null;
  return cached;
 }catch{return null;} // This optional cache never replaces the verified full-build fallback.
}
