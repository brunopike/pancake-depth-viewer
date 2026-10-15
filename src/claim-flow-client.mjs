import {claimFlowWindow} from '../server/esim/claim-flow.mjs';
import {newerSourceInflow} from '../server/esim/source-inflows.mjs';

export const CLAIM_FLOW_URL='https://raw.githubusercontent.com/starkweng/pancake-depth-viewer/esim-cache/claim-flow.json';
const TOKEN='0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d',SOURCE='0x67b97c3845438f264965ca154ba13051c6c73416';
const address=value=>typeof value==='string'&&/^0x[0-9a-f]{40}$/.test(value);
const hash=value=>typeof value==='string'&&/^0x[0-9a-f]{64}$/.test(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const amount=value=>typeof value==='string'&&/^(0|[1-9][0-9]{0,77})$/.test(value)&&BigInt(value)<2n**256n;
const timestamp=(value,cutoff)=>Number.isFinite(value)&&value>=0&&value<=cutoff;
const compatibleSnapshot=data=>data?.version===1&&integer(data.block)&&hash(data.blockHash)&&Number.isFinite(data.cutoff)&&data.cutoff>=0&&(!data.token||data.token===TOKEN)&&(!data.source||data.source===SOURCE);

export function validClaimFlow(flow,snapshot){
 if(!compatibleSnapshot(snapshot)||flow?.version!==1||flow.method!=='proportional-v1'||flow.token!==TOKEN||flow.source!==SOURCE||!hash(flow.blockHash)||!integer(flow.throughBlock)||flow.throughBlock>snapshot.block||!Number.isFinite(flow.cutoff)||flow.cutoff<0||flow.cutoff>snapshot.cutoff||!Array.isArray(flow.sales)||flow.sales.length>1000000)return false;
 if(flow.throughBlock===snapshot.block&&flow.blockHash!==snapshot.blockHash)return false;
 const seen=new Set();
 const evidence=example=>example&&address(example.root)&&Array.isArray(example.path)&&example.path.length<=8&&example.path.every(address)&&Array.isArray(example.txs)&&example.txs.length<=8&&example.txs.every(hash)&&integer(example.hops)&&(example.truncated===undefined||typeof example.truncated==='boolean');
 const validSale=sale=>{
  if(!sale||!address(sale.address)||!hash(sale.tx)||!integer(sale.block)||sale.block>flow.throughBlock||!timestamp(sale.timestamp,flow.cutoff)||!['amount_wei','direct_wei','relay_wei'].every(key=>amount(sale[key]))||!Array.isArray(sale.examples)||!sale.examples.length||sale.examples.length>3||!sale.examples.every(evidence))return false;
  const tracked=BigInt(sale.direct_wei)+BigInt(sale.relay_wei),key=sale.tx+':'+sale.address;
  if(tracked<=0n||tracked>BigInt(sale.amount_wei)||seen.has(key))return false;
  seen.add(key);return true;
 };
 if(!flow.sales.every(validSale))return false;
 if(flow.unconfirmedFlows!==undefined&&(!Array.isArray(flow.unconfirmedFlows)||flow.unconfirmedFlows.length>1000000||!flow.unconfirmedFlows.every(pending=>pending&&hash(pending.tx)&&(pending.address===null||address(pending.address))&&integer(pending.block)&&pending.block<=flow.throughBlock&&(pending.timestamp===null||timestamp(pending.timestamp,flow.cutoff))&&amount(pending.amount_wei)&&BigInt(pending.amount_wei)>0n)))return false;
 return true;
}

function firstSales(flow,key){
 const times=new Map();
 for(const sale of flow.sales)if(BigInt(sale[key])>0n)times.set(sale.address,Math.min(times.get(sale.address)??Infinity,sale.timestamp));
 return times;
}
function enrichAddressRows(rows,end,direct,relay){
 return rows.map(row=>{
  if(!row)return row;
  const firstRelaySale=relay.get(row.address),firstReceivedSale=direct.get(row.address),extra={};
  if(firstRelaySale<end)Object.assign(extra,{relaySold:true,firstRelaySale});
  if(row.received===true&&firstReceivedSale<end)Object.assign(extra,{receivedSold:true,firstReceivedSale});
  return Object.keys(extra).length?{...row,...extra}:row;
 });
}
export function enrichClaimFlowSnapshot(kind,snapshot,flow){
 if(!validClaimFlow(flow,snapshot))return snapshot;
 if(kind==='holders'&&Array.isArray(snapshot.rows)){
  const relay=firstSales(flow,'relay_wei');
  const rows=snapshot.rows.map(row=>{
   if(!row||!(relay.get(row.address)<=snapshot.cutoff)||(row.tags||[]).some(tag=>tag.id==='received-relay-sold'))return row;
   return {...row,tags:[...(row.tags||[]),{id:'received-relay-sold',kind:'sold',text:'分发币转手卖出（估算）',evidence:'已识别的分发币转手路径与卖出成交；混币按余额比例估算，不证明共同控制。'}]};
  });
  return rows.some((row,i)=>row!==snapshot.rows[i])?{...snapshot,rows}:snapshot;
 }
 if(!['report','addresses'].includes(kind)||!snapshot.windows)return snapshot;
 const direct=firstSales(flow,'direct_wei'),relay=firstSales(flow,'relay_wei');
 let changed=false;
 const windows=Object.fromEntries(Object.entries(snapshot.windows).map(([key,window])=>{
  const end=Math.min(window?.end,snapshot.cutoff);
  if(!Number.isFinite(window?.start)||window.start<0||!Number.isFinite(end)||end<window.start)return [key,window];
  if(kind==='report'){
   const prior=window.claimFlow;
   if(prior?.throughBlock>flow.throughBlock||prior?.cutoff>flow.cutoff||prior?.throughBlock===flow.throughBlock&&(prior.modelRevision??1)>(flow.modelRevision??1))return [key,window];
   changed=true;return [key,{...window,claimFlow:claimFlowWindow(flow,window.start,end)}];
  }
  const next={...window};
  for(const mode of ['initiator','funding'])if(Array.isArray(window[mode]?.rows)){
   const rows=enrichAddressRows(window[mode].rows,end,direct,relay);
   if(rows.some((row,i)=>row!==window[mode].rows[i])){next[mode]={...window[mode],rows};changed=true;}
  }
  return [key,next];
 }));
 const sourceInflow=kind==='report'?newerSourceInflow(snapshot.sourceInflow,flow.sourceInflow,snapshot):null;
 return changed||sourceInflow&&sourceInflow!==snapshot.sourceInflow?{...snapshot,windows,...(kind==='report'?{sourceInflow}: {})}:snapshot;
}

export async function readClaimFlowSnapshot(kind,snapshot,{fetch:request=globalThis.fetch}={}){
 if(!compatibleSnapshot(snapshot))return snapshot;
 try{
  const response=await request(`${CLAIM_FLOW_URL}?t=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)return snapshot;
  return enrichClaimFlowSnapshot(kind,snapshot,await response.json());
 }catch{return snapshot;}
}
