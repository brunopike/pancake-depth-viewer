export const SNAPSHOTS={
  report:['https://raw.githubusercontent.com/starkweng/pancake-depth-viewer/esim-cache/report.json','./data/esim-report.json'],
  addresses:['https://raw.githubusercontent.com/starkweng/pancake-depth-viewer/esim-cache/addresses.json','./data/esim-addresses.json'],
  holders:['https://raw.githubusercontent.com/starkweng/pancake-depth-viewer/holder-cache/holders.json','./data/esim-holders.json'],
};
export const newerSnapshot=(current,next)=>current&&next.block<current.block?current:next;
export async function readSnapshot(kind,{current,fetch:request=globalThis.fetch}={}) {
  for(const [i,url]of SNAPSHOTS[kind].entries())try{
    const response=await request(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(i?8000:15000)});
    if(!response.ok)throw Error('SNAPSHOT_UNAVAILABLE');
    const data=await response.json();
    if(data?.version!==1||!Number.isFinite(data.block)||!Number.isFinite(data.cutoff)||(kind==='holders'?!Array.isArray(data.rows):!data.windows))throw Error('INVALID_SNAPSHOT');
    if(kind!=='addresses'&&data.token!=='0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d')throw Error('WRONG_TOKEN');
    if(current&&data.block<current.block)return {data:current,source:'retained'};
    return {data,source:i?'bundled':'background'};
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
