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
