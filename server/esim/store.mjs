import {validCohort} from './cohort-validation.mjs';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import {writeCheckpoint} from './state-writer.mjs';
import {readCheckpoint} from './state-reader.mjs';
import {Readable} from 'node:stream';
import { TOKEN, SOURCE } from './metrics.mjs';
import {validSourceInflow,newerSourceInflow} from './source-inflows.mjs';
export const CHECKPOINT_URL = 'https://raw.githubusercontent.com/brunopike/pancake-depth-viewer/esim-cache/state.json.gz';
export const CLAIM_FLOW_URL = 'https://raw.githubusercontent.com/brunopike/pancake-depth-viewer/esim-cache/claim-flow.json.gz';
export function validClaimFlow(state,flow){
  try{
    const address=a=>/^0x[0-9a-f]{40}$/.test(a||''),hash=h=>/^0x[0-9a-f]{64}$/.test(h||''),uint=n=>typeof n==='string'&&/^\d+$/.test(n);
    if(!(flow?.version===1&&flow.method==='proportional-v1'&&flow.token===TOKEN&&flow.source===SOURCE&&hash(flow.blockHash)&&Number.isSafeInteger(flow.throughBlock)&&flow.throughBlock<=state.block&&Number.isFinite(flow.cutoff)&&flow.cutoff<=state.cutoff&&Array.isArray(flow.sales)&&Array.isArray(flow.unconfirmedFlows)))return false;
    if(flow.throughBlock===state.block&&flow.blockHash!==state.blockHash)return false;
    if(flow.sourceInflow&&!validSourceInflow(flow.sourceInflow,flow))return false;
    if((flow.cohort||(flow.modelRevision??1)>=4)&&!validCohort(flow.cohort,flow))return false;
    if(!flow.sales.every(r=>address(r.address)&&hash(r.tx)&&Number.isFinite(r.timestamp)&&r.timestamp<flow.cutoff&&Number.isSafeInteger(r.block)&&r.block<=flow.throughBlock&&['amount_wei','direct_wei','relay_wei'].every(k=>uint(r[k]))&&BigInt(r.direct_wei)+BigInt(r.relay_wei)<=BigInt(r.amount_wei)&&Array.isArray(r.examples)))return false;
    if(!flow.unconfirmedFlows.every(r=>hash(r.tx)&&(r.address===null||address(r.address))&&(r.timestamp===null||Number.isFinite(r.timestamp)&&r.timestamp<flow.cutoff)&&uint(r.amount_wei)))return false;
    const t=flow.totals;if(!t||!Object.values(t).every(uint))return false;
    const sum=(rows,k)=>rows.reduce((n,r)=>n+BigInt(r[k]),0n);
    return sum(flow.sales,'direct_wei')===BigInt(t.direct_wei)&&sum(flow.sales,'relay_wei')===BigInt(t.relay_wei)&&sum(flow.unconfirmedFlows,'amount_wei')===BigInt(t.unconfirmed_pool_wei)&&BigInt(t.sold_wei)===BigInt(t.direct_wei)+BigInt(t.relay_wei)&&BigInt(t.issued_wei)===BigInt(t.sold_wei)+BigInt(t.unconfirmed_pool_wei)+BigInt(t.remaining_wei)+BigInt(t.returned_wei)+BigInt(t.burned_wei);
  }catch{return false;}
}
export function attachClaimFlow(state,flow){
  const prior=state.claimFlow;
  if(validClaimFlow(state,flow)&&(!prior||prior.throughBlock<flow.throughBlock||prior.throughBlock===flow.throughBlock&&(prior.modelRevision??1)<=(flow.modelRevision??1))){
    const sourceInflow=newerSourceInflow(prior?.sourceInflow,flow.sourceInflow,flow);
    return {...state,claimFlow:sourceInflow&&sourceInflow!==flow.sourceInflow?{...flow,sourceInflow}:flow};
  }
  return state;
}
// The trading ledger can already be ahead while the slower provenance job has
// just published. Merge that verified evidence without regressing core trades.
export function mergeCheckpointState(current,candidate){
  return candidate.block>current.block?candidate:attachClaimFlow(current,candidate.claimFlow);
}
export function parseState(bytes) {
  const state = JSON.parse(gunzipSync(bytes));
  return validateState(state);
}
function validateState(state){
  if (state.version !== 1 || state.token !== TOKEN || state.source !== SOURCE || !Number.isSafeInteger(state.block) || !/^0x[0-9a-f]{64}$/.test(state.blockHash)) throw new Error('INVALID_CHECKPOINT');
  return state;
}
export async function readState(file,options){return validateState(await readCheckpoint(file,options));}
export async function readStateMetadata(file){return validateState(await readCheckpoint(file,{metadataOnly:true}));}
export async function loadState({ fetch: request = fetch, includeRemote = true, includeRemoteCore=true, currentState, checkpointFile=process.env.ESIM_CHECKPOINT_FILE, currentCheckpointFile='.goodway/esim-monitor/state.json.gz',claimFlowCheckpointFile } = {}) {
  let local = currentState||await readState(new URL('./bootstrap.json.gz', import.meta.url));
  if(checkpointFile){
    let checked;try{checked=await readState(checkpointFile);}catch{throw Error('WORKER_CHECKPOINT_UNAVAILABLE');}
    if(checked.block>local.block)local=checked;
    // The same session may already have advanced beyond its startup checkout.
    try{const current=await readState(currentCheckpointFile);if(current.block>local.block)local=current;}catch(error){if(error.code!=='ENOENT')throw Error('WORKER_CHECKPOINT_UNAVAILABLE');}
  }
  if (includeRemote&&includeRemoteCore&&!checkpointFile) try {
    const response = await request(`${CHECKPOINT_URL}?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(process.env.ESIM_PERSISTENT_WORKER==='true'?120000:15000) });
    if (response.ok) {
      const remote = validateState(await readCheckpoint(Readable.fromWeb(response.body),{loadPart:async path=>{
        const part=await request(new URL(path,CHECKPOINT_URL),{cache:'no-store',signal:AbortSignal.timeout(120000)});
        if(!part.ok)throw Error('CHECKPOINT_PARTS_UNAVAILABLE');return Buffer.from(await part.arrayBuffer());
      }}));
      if (remote.block > local.block) local=remote;
    }
  } catch { /* The bundled verified checkpoint remains usable. */ }
  if(includeRemote)try{
    const options={cache:'no-store',signal:AbortSignal.timeout(120000)},stamp='?t='+Date.now(),r=await request(CLAIM_FLOW_URL+stamp,options);
    if(r.ok)local=attachClaimFlow(local,await readCheckpoint(Readable.fromWeb(r.body)));
    else if(r.status===404){const legacy=await request(CLAIM_FLOW_URL.slice(0,-3)+stamp,options);if(legacy.ok)local=attachClaimFlow(local,await legacy.json());}
  }catch{}
  // A refresh streams past old provenance before loading its replacement; restore
  // only that disk field if the remote report is unavailable, invalid or ahead.
  if(claimFlowCheckpointFile&&!validClaimFlow(local,local.claimFlow)){
    try{local=attachClaimFlow(local,(await readState(claimFlowCheckpointFile,{claimFlowOnly:true})).claimFlow);}
    catch{throw Error('WORKER_FLOW_CHECKPOINT_UNAVAILABLE');}
  }
  return local;
}
export async function saveState(state, dir) {
  return writeCheckpoint(state,dir);
}
