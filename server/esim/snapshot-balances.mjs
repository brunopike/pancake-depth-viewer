import {readViewSnapshot} from './view-cache.mjs';
import {queryVerifiedBalances} from './balances.mjs';
const allowlists=new WeakMap();
export function snapshotTradingAddresses(report){
 if(allowlists.has(report))return allowlists.get(report);
 const history=report?.windows?.history;
 if(report?.version!==1||!history?.available||!['initiator','funding'].every(mode=>Array.isArray(history[mode]?.rows)&&Array.isArray(history[mode]?.buyOnlyRows)))throw Error('TRADING_SNAPSHOT_UNAVAILABLE');
 const known=new Set(['initiator','funding'].flatMap(mode=>[...history[mode].rows,...history[mode].buyOnlyRows]).map(row=>row.address).filter(a=>/^0x[0-9a-f]{40}$/.test(a)));
 allowlists.set(report,known);return known;
}
export async function readSnapshotBalances(addresses,transport,{read=readViewSnapshot}={}){
 const snapshot=await read('addresses');
 return queryVerifiedBalances(snapshotTradingAddresses(snapshot.data),addresses,transport);
}

// Compatibility for already-open pages using /api/esim. A read or refresh must
// never rehydrate the historical collector inside a small serverless function.
export function snapshotAddressResponse(report,options,dataset=false){
 const w=report.windows[options.period],data=w[options.mode];
 const base={version:report.version,cutoff:report.cutoff,block:report.block,blockHash:report.blockHash,ownProgramCount:report.ownProgramCount,ownExecutor:report.ownExecutor,window:{start:w.start,end:w.end,available:w.available},population:data.rows.length,missingSold:data.missingSold};
 if(dataset)return {...base,ownExecutors:report.ownExecutors,missingBought:data.missingBought,rows:data.rows,buyOnlyRows:data.buyOnlyRows};
 const o=options,rows=data.rows.filter(r=>(!o.search||r.address.includes(o.search))&&(o.filter==='all'||o.filter==='own'&&r.own||o.filter==='received'&&r.received||o.filter==='other'&&!r.own&&!r.received||o.filter==='frequency'&&r.highFrequency)).sort((a,b)=>{const x=BigInt(a[o.sort]),y=BigInt(b[o.sort]);return x===y?a.address.localeCompare(b.address):x>y?-1:1;});
 const page=Math.min(o.page,Math.max(0,Math.ceil(rows.length/25)-1));
 return {...base,generatedAt:report.generatedAt,highFrequencyThreshold:report.highFrequencyThreshold,total:rows.length,totals:{sold:rows.reduce((n,r)=>n+BigInt(r.sold),0n).toString(),bought:rows.reduce((n,r)=>n+BigInt(r.bought),0n).toString(),own:rows.filter(r=>r.own).length},page,pageSize:25,options:o,rows:rows.slice(page*25,(page+1)*25)};
}
