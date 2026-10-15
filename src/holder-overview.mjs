import {HOLDER_CIRCULATION_EXCLUSIONS} from './holder-labels.mjs';
import {ownershipAmounts,rowTags,selectHolders} from './holder-model.mjs';
import {holderCharts} from './holder-charts.mjs';

export const HOLDER_SCOPES={all:'全部地址',own:'我方地址','external-stat':'外部流通',received:'领币地址',excluded:'统计排除'};
export const HOLDER_TONES={
 own:{label:'我方',color:'#80c5ad'},mixed:{label:'混合归属',color:'#d9c593'},
 received:{label:'外部 · 领币',color:'#de92a2'},institution:{label:'平台 / DEX',color:'#9fc5e9'},
 excluded:{label:'统计排除',color:'#baa3dd'},external:{label:'其他外部',color:'#91a4b8'},
};
const excluded=row=>Object.hasOwn(HOLDER_CIRCULATION_EXCLUSIONS,row.address);
const received=(row,manual)=>rowTags(row,manual).some(t=>t.kind==='received'||t.id==='received');

export function holderAppearance(row,manual={}){
 if(excluded(row))return 'excluded';
 const parts=ownershipAmounts(row,manual),tags=rowTags(row,manual);
 if(parts.mixed)return 'mixed';
 if(tags.some(t=>['own','lp'].includes(t.kind)))return 'own';
 if(tags.some(t=>['exchange','dex'].includes(t.kind)))return 'institution';
 return received(row,manual)?'received':'external';
}

// The four buckets reconcile to indexed balances. Unindexed supply is separate;
// exclusions describe reporting scope and never establish whole-Vault ownership.
export function holderLedger(report,manual={}){
 let own=0n,external=0n,indexed=0n;
 const exclusions=Object.entries(HOLDER_CIRCULATION_EXCLUSIONS).map(([address,rule])=>({address,...rule,balance:'0'}));
 const byAddress=new Map(exclusions.map(r=>[r.address,r]));
 for(const row of report.rows){
  const balance=BigInt(row.balance);indexed+=balance;
  if(excluded(row)){byAddress.get(row.address).balance=balance.toString();continue;}
  const parts=ownershipAmounts(row,manual);own+=BigInt(parts.own);external+=BigInt(parts.external);
 }
 return {own:own.toString(),nonExternal:(indexed-external).toString(),external:external.toString(),indexed:indexed.toString(),
  unindexed:(BigInt(report.totalSupply)-indexed).toString(),exclusions};
}

export function selectHolderView(report,{scope='all',minimum='0',...options}={},manual={}){
 const threshold=BigInt(minimum);
 const rows=report.rows.filter(row=>{
  if(scope==='excluded'&&!excluded(row))return false;
  if(scope==='external-stat'&&excluded(row))return false;
  if(scope==='own'&&holderAppearance(row,manual)!=='own'&&!ownershipAmounts(row,manual).mixed)return false;
  if(scope==='received'&&!received(row,manual))return false;
  const balance=scope==='external-stat'?ownershipAmounts(row,manual).external:row.balance;
  return BigInt(balance)>=threshold;
 });
 // Keep legacy scope=external drilldowns unchanged. The new external-stat scope
 // additionally excludes activity reserves and the shared Vault.
 return selectHolders({...report,rows},{...options,excludeOwn:scope==='external-stat'||options.excludeOwn},manual);
}

export function holderOverviewCharts(rows,manual={}){
 const model=holderCharts(rows,manual),amounts=new Map(),counts=new Map();
 const add=(id,balance)=>amounts.set(id,(amounts.get(id)||0n)+BigInt(balance));
 for(const row of rows.filter(r=>BigInt(r.balance)>0n)){
  const tone=holderAppearance(row,manual);counts.set(tone,(counts.get(tone)||0)+1);
  if(tone==='mixed'){
   const parts=ownershipAmounts(row,manual);add('own',parts.own);add(received(row,manual)?'received':'external',parts.external);
  }else add(tone,row.balance);
 }
 const total=BigInt(model.total);
 const groups=Object.entries(HOLDER_TONES).filter(([id])=>(amounts.get(id)||0n)>0n).map(([id,tone])=>({id,...tone,balance:amounts.get(id).toString(),share:total?Number(amounts.get(id)*100000000n/total)/1000000:0}));
 const countGroups=Object.entries(HOLDER_TONES).filter(([id])=>counts.has(id)).map(([id,tone])=>({id,...tone,count:counts.get(id)}));
 return {...model,groups,countGroups};
}
