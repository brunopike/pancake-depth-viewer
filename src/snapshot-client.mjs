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
  for(const [i,url]of SNAPSHOTS[kind].entries())try{
    const response=await request(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(i?8000:15000)});
    if(!response.ok)throw Error('SNAPSHOT_UNAVAILABLE');
    const data=await response.json();
    if(!validSnapshot(kind,data))throw Error('INVALID_SNAPSHOT');
    if(current&&data.block<current.block)return {data:current,source:'retained'};
    return {data,source:i===0?'published':i===1?'background':'bundled'};
  }catch{}
  if(current)return {data:current,source:'retained'};
  throw Error('数据暂时无法读取，请点击刷新重试。');
}

export async function readTradingReport({current,live=false,queryLive,fetch}={}){
  const saved=await readSnapshot('report',{current,fetch});
  if(!live||!queryLive)return saved;
  try{const data=await queryLive();if(!data?.windows||!Number.isFinite(data.block))throw Error('INVALID_REPORT');return {data:newerSnapshot(saved.data,data),source:'live'};}
  catch{return {...saved,source:'retained'};}
}
