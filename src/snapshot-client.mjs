import {readClaimFlowSnapshot} from './claim-flow-client.mjs';
import {newerSourceInflow} from '../server/esim/source-inflows.mjs';
function retainSourceInflow(next,prior){
  const value=newerSourceInflow(prior?.sourceInflow,next.sourceInflow,next);
  return value===next.sourceInflow||value===null&&!Object.hasOwn(next,'sourceInflow')?next:{...next,sourceInflow:value};
}

export const SNAPSHOTS={
  report:['./data/current-esim-report.json','https://raw.githubusercontent.com/starkweng/pancake-depth-viewer/esim-cache/report.json','./data/esim-report.json'],
  addresses:['./data/current-esim-addresses.json','https://raw.githubusercontent.com/starkweng/pancake-depth-viewer/esim-cache/addresses.json','./data/esim-addresses.json'],
  holders:['./data/current-esim-holders.json','https://raw.githubusercontent.com/starkweng/pancake-depth-viewer/holder-cache/holders.json','./data/esim-holders.json'],
};
export function validSnapshot(kind,data){
  return data?.version===1&&Number.isSafeInteger(data.block)&&Number.isFinite(data.cutoff)&&(kind==='holders'?Array.isArray(data.rows):!!data.windows)&&(kind==='addresses'||data.token==='0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d');
}
export const newerSnapshot=(current,next)=>current&&next.block<current.block?current:next;
export async function readSnapshot(kind,{current,fetch:request=globalThis.fetch}={}) {
  const read=async(i)=>{const url=SNAPSHOTS[kind][i];
    const response=await request(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(i?8000:15000)});
    if(!response.ok)throw Error('SNAPSHOT_UNAVAILABLE');
    const data=await response.json();
    if(!validSnapshot(kind,data))throw Error('INVALID_SNAPSHOT');
    return {data,source:i===0?'published':i===1?'background':'bundled'};
  };
  // Compare both independently published sources; a successful old website file must not mask a newer checkpoint.
  const results=await Promise.allSettled([read(0),read(1)]);
  let selected;
  for(const result of results)if(result.status==='fulfilled'&&(!selected||result.value.data.block>selected.data.block))selected=result.value;
  if(!selected)try{selected=await read(2);}catch{}
  const result=selected&&(!current||selected.data.block>=current.block)?selected:current?{data:current,source:'retained'}:null;
  if(!result)throw Error('数据暂时无法读取，请点击刷新重试。');
  const data=kind==='report'?retainSourceInflow(result.data,current):result.data;
  return {...result,data:await readClaimFlowSnapshot(kind,data,{fetch:request})};
}

export async function readTradingReport({current,live=false,queryLive,fetch}={}){
  const saved=await readSnapshot('report',{current,fetch});
  if(!live||!queryLive)return saved;
  try{const data=await queryLive();if(!data?.windows||!Number.isFinite(data.block))throw Error('INVALID_REPORT');const selected=newerSnapshot(saved.data,data);return {data:retainSourceInflow(selected,saved.data),source:selected===data?'live':'retained'};}
  catch{return {...saved,source:'retained'};}
}
