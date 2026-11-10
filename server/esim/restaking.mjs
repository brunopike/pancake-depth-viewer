import {ESIM_STAKE_EVENT} from './return-stakes.mjs';
import {TRANSFER,addr,eventKey,order} from './attribution.mjs';
const DAY=86400,dayStart=t=>Math.floor((t+28800)/DAY)*DAY-28800;
const date=t=>new Date((t+28800)*1000).toISOString().slice(0,10);
const uint=v=>typeof v==='string'&&/^(0|[1-9][0-9]*)$/.test(v)&&BigInt(v)<2n**256n;
const hash=v=>/^0x[0-9a-f]{64}$/.test(v||'');
const ensure=(ok,code)=>{if(!ok)throw Error(code);};

// One actual token receipt may satisfy only one staking event. Plain returns stay out.
export function matchRestakingLogs(stakes,transfers,{token,source}){
 const receipts=new Map(),seen=new Set(),key=(tx,a,v)=>`${tx}:${a}:${v}`;
 for(const l of transfers){
  ensure(!l.removed&&l.address?.toLowerCase()===token&&l.topics?.length===3&&l.topics.every(hash)&&l.topics[0]===TRANSFER&&addr(l.topics[2])===source&&/^0x[0-9a-f]{64}$/i.test(l.data)&&hash(l.transactionHash)&&hash(l.blockHash),'RESTAKING_INVALID_TRANSFER');
  const id=eventKey(l);ensure(!seen.has(id),'RESTAKING_DUPLICATE_LOG');seen.add(id);
  const k=key(l.transactionHash,addr(l.topics[1]),BigInt(l.data));
  if(!receipts.has(k))receipts.set(k,[]);receipts.get(k).push(l);
 }
 const used=new Set();seen.clear();
 return stakes.map(l=>{
  ensure(!l.removed&&l.address?.toLowerCase()===source&&l.topics?.length===4&&l.topics.every(hash)&&l.topics[0]===ESIM_STAKE_EVENT&&/^0x(?:[0-9a-f]{64}){3}$/i.test(l.data)&&hash(l.transactionHash)&&hash(l.blockHash),'RESTAKING_INVALID_EVENT');
  const id=eventKey(l),at=order(l),account=addr(l.topics[1]),value=BigInt('0x'+l.data.slice(2,66));
  ensure(!seen.has(id)&&at.every(n=>Number.isSafeInteger(n)&&n>=0)&&account!==source&&value>0n,'RESTAKING_DUPLICATE_OR_INVALID_EVENT');seen.add(id);
  const match=(receipts.get(key(l.transactionHash,account,value))||[]).find(t=>!used.has(eventKey(t))&&t.blockHash===l.blockHash&&order(t)[0]===at[0]&&order(t)[1]===at[1]);
  ensure(match,'RESTAKING_TRANSFER_MISMATCH');used.add(eventKey(match));
  return {id,tx:l.transactionHash,address:account,block:at[0],blockHash:l.blockHash,value_wei:value.toString()};
 });
}

export function validRestaking(value,snapshot){
 try{
  if(value?.version!==1||value.method!=='stake-event-matched-transfer-v1'||value.token!==snapshot.token||value.source!==snapshot.source||value.origin!==snapshot.origin||!Number.isSafeInteger(value.seedBlock)||!Number.isSafeInteger(value.throughBlock)||value.throughBlock<value.seedBlock||value.throughBlock>snapshot.block||!hash(value.blockHash)||value.throughBlock===snapshot.block&&value.blockHash!==snapshot.blockHash||!Number.isFinite(value.cutoff)||value.cutoff<=value.origin||value.cutoff>snapshot.cutoff||!Array.isArray(value.days)||!uint(value.total_wei)||!Number.isSafeInteger(value.events)||value.events<0)return false;
  let total=0n,events=0,t=dayStart(value.origin);
  for(const d of value.days){if(d.date!==date(t)||t>=value.cutoff||!uint(d.total_wei)||!Number.isSafeInteger(d.events)||d.events<0)return false;total+=BigInt(d.total_wei);events+=d.events;t+=DAY;}
  return t>=value.cutoff&&total===BigInt(value.total_wei)&&events===value.events;
 }catch{return false;}
}

export function advanceRestaking(checkpoint,events,{startBlock,block,blockHash,cutoff}){
 ensure(startBlock===checkpoint.throughBlock+1&&block>=checkpoint.throughBlock&&cutoff>=checkpoint.cutoff&&hash(blockHash),'RESTAKING_LEDGER_GAP');
 const days=checkpoint.days.map(d=>({...d})),byDate=new Map(days.map(d=>[d.date,d]));
 for(let t=dayStart(checkpoint.origin);t<cutoff;t+=DAY)if(!byDate.has(date(t))){const d={date:date(t),total_wei:'0',events:0};days.push(d);byDate.set(d.date,d);}
 const seen=new Set();let total=BigInt(checkpoint.total_wei),count=checkpoint.events;
 for(const e of events){
  ensure(!seen.has(e.id)&&Number.isSafeInteger(e.block)&&e.block>=startBlock&&e.block<=block&&Number.isFinite(e.timestamp)&&e.timestamp>=checkpoint.cutoff&&e.timestamp<cutoff&&uint(e.value_wei)&&BigInt(e.value_wei)>0n,'RESTAKING_EVENT_RANGE');seen.add(e.id);
  const d=byDate.get(date(e.timestamp));ensure(d,'RESTAKING_DAY_MISSING');d.total_wei=String(BigInt(d.total_wei)+BigInt(e.value_wei));d.events++;total+=BigInt(e.value_wei);count++;
 }
 return {...checkpoint,throughBlock:block,blockHash,cutoff,days,total_wei:String(total),events:count};
}

export function restakingWindow(value,start,end){
 const unknown={total_wei:null,events:null,complete:false,availableThrough:null};
 if(!value||start>=value.cutoff||start<value.origin||start!==value.origin&&start!==dayStart(start)||end<value.cutoff&&end!==dayStart(end))return unknown;
 const rows=value.days.filter(d=>d.date>=date(start)&&d.date<=date(Math.min(end,value.cutoff)-0.001));
 return {total_wei:String(rows.reduce((n,d)=>n+BigInt(d.total_wei),0n)),events:rows.reduce((n,d)=>n+d.events,0),complete:value.cutoff>=end,availableThrough:Math.min(end,value.cutoff)};
}
