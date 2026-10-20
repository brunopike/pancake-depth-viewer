import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { TOKEN, SOURCE } from './metrics.mjs';
import {validSourceInflow,newerSourceInflow} from './source-inflows.mjs';
export const CHECKPOINT_URL = 'https://raw.githubusercontent.com/brunopike/pancake-depth-viewer/esim-cache/state.json.gz';
export const CLAIM_FLOW_URL = 'https://raw.githubusercontent.com/brunopike/pancake-depth-viewer/esim-cache/claim-flow.json';
export function validClaimFlow(state,flow){
  try{
    const address=a=>/^0x[0-9a-f]{40}$/.test(a||''),hash=h=>/^0x[0-9a-f]{64}$/.test(h||''),uint=n=>typeof n==='string'&&/^\d+$/.test(n);
    if(!(flow?.version===1&&flow.method==='proportional-v1'&&flow.token===TOKEN&&flow.source===SOURCE&&hash(flow.blockHash)&&Number.isSafeInteger(flow.throughBlock)&&flow.throughBlock<=state.block&&Number.isFinite(flow.cutoff)&&flow.cutoff<=state.cutoff&&Array.isArray(flow.sales)&&Array.isArray(flow.unconfirmedFlows)))return false;
    if(flow.throughBlock===state.block&&flow.blockHash!==state.blockHash)return false;
    if(flow.sourceInflow&&!validSourceInflow(flow.sourceInflow,flow))return false;
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
export function parseState(bytes) {
  const state = JSON.parse(gunzipSync(bytes));
  if (state.version !== 1 || state.token !== TOKEN || state.source !== SOURCE || !Number.isSafeInteger(state.block) || !/^0x[0-9a-f]{64}$/.test(state.blockHash)) throw new Error('INVALID_CHECKPOINT');
  return state;
}
export async function loadState({ fetch: request = fetch, includeRemote = true } = {}) {
  let local = parseState(await readFile(new URL('./bootstrap.json.gz', import.meta.url)));
  if (includeRemote) try {
    const response = await request(`${CHECKPOINT_URL}?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (response.ok) {
      const remote = parseState(Buffer.from(await response.arrayBuffer()));
      if (remote.block > local.block) local=remote;
    }
  } catch { /* The bundled verified checkpoint remains usable. */ }
  if(includeRemote)try{const r=await request(CLAIM_FLOW_URL,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(r.ok)local=attachClaimFlow(local,await r.json());}catch{}
  return local;
}
export async function saveState(state, dir) {
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/state.tmp`, gzipSync(JSON.stringify(state)));
  await rename(`${dir}/state.tmp`, `${dir}/state.json.gz`);
}
