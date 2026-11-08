import {HOLDER_CIRCULATION_EXCLUSIONS} from './holder-labels.mjs';
import {ownershipAmounts,rowTags,selectHolders} from './holder-model.mjs';
import {holderCharts} from './holder-charts.mjs';
import {EXTERNAL_HOLDER_GROUPS} from './holder-cohort.mjs';

export const HOLDER_SCOPES={all:'全部地址',own:'我方地址','external-stat':'外部流通',received:'领币地址',excluded:'统计排除'};
export const HOLDER_TONES={
 own:{label:'我方',color:'#80c5ad'},mixed:{label:'混合归属',color:'#d9c593'},
 received:{label:'网体参与地址',color:'#de92a2'},downstream:{label:'网体下游地址',color:'#82bada'},
 exchange:{label:'交易所热钱包',color:'#b49ada'},blacklist:{label:'黑名单',color:'#e6ab7d'},institution:{label:'DEX / 路由',color:'#9fc5e9'},
 excluded:{label:'统计排除',color:'#baa3dd'},external:{label:'剩余外部',color:'#91a4b8'},
};
const excluded=row=>Object.hasOwn(HOLDER_CIRCULATION_EXCLUSIONS,row.address)||row.tags.some(t=>t.id==='pool');
const received=(row,manual)=>rowTags(row,manual).some(t=>t.kind==='received'||t.id==='received');
const participant=(row,manual)=>rowTags(row,manual).some(t=>['received','interaction'].includes(t.kind)||['received','interacted'].includes(t.id));

export function holderAppearance(row,manual={}){
 if(excluded(row))return 'excluded';
 const parts=ownershipAmounts(row,manual),tags=rowTags(row,manual);
 if(parts.mixed)return 'mixed';
 if(tags.some(t=>['own','lp'].includes(t.kind)))return 'own';
 const role=externalHolderRole(row,manual);
 if(role==='blacklist'||role==='exchange')return role;
 if(tags.some(t=>t.kind==='dex'))return 'institution';
 return role==='direct'?'received':role==='downstream'?'downstream':'external';
}

// The four buckets reconcile to indexed balances. Unindexed supply is separate;
// exclusions describe reporting scope and never establish whole-Vault ownership.
export function externalHolderRole(row,manual={}){
 const tags=rowTags(row,manual);
 if(tags.some(t=>t.kind==='blacklist'))return 'blacklist';
 if(tags.some(t=>t.kind==='exchange'))return 'exchange';
 return participant(row,manual)||row.externalRole==='direct'?'direct':row.externalRole==='downstream'?'downstream':'other';
}

export function holderLedger(report,manual={}){
 let own=0n,external=0n,indexed=0n;
 const externalBreakdown=Object.fromEntries(EXTERNAL_HOLDER_GROUPS.map(g=>[g.id,{balance:0n,addresses:0}]));
 const exclusions=Object.entries(HOLDER_CIRCULATION_EXCLUSIONS).map(([address,rule])=>({address,...rule,balance:'0'}));
 for(const row of report.rows)if(!Object.hasOwn(HOLDER_CIRCULATION_EXCLUSIONS,row.address)&&row.tags.some(t=>t.id==='pool')&&BigInt(row.balance)>0n)exclusions.push({address:row.address,label:'底池 '+row.address.slice(0,8)+'…'+row.address.slice(-6),source:'已核验 ESIM 池合约；池中余额从外部钱包持仓排除。',balance:'0'});
 const byAddress=new Map(exclusions.map(r=>[r.address,r]));
 for(const row of report.rows){
  const balance=BigInt(row.balance);indexed+=balance;
  if(excluded(row)){const bucket=byAddress.get(row.address);if(bucket)bucket.balance=balance.toString();continue;}
  const parts=ownershipAmounts(row,manual);own+=BigInt(parts.own);external+=BigInt(parts.external);
  if(BigInt(parts.external)>0n){
   const role=externalHolderRole(row,manual),group=externalBreakdown[role==='direct'?'participants':role];
   group.balance+=BigInt(parts.external);group.addresses++;
  }
 }
 return {own:own.toString(),nonExternal:(indexed-external).toString(),external:external.toString(),indexed:indexed.toString(),
  unindexed:(BigInt(report.totalSupply)-indexed).toString(),exclusions,
  externalBreakdown:Object.fromEntries(Object.entries(externalBreakdown).map(([id,group])=>[id,{...group,balance:group.balance.toString()}]))};
}

export function selectHolderView(report,{scope='all',minimum='0',externalRole='all',...options}={},manual={}){
 const threshold=BigInt(minimum);
 const rows=report.rows.filter(row=>{
  if(scope==='external-stat'&&externalRole!=='all'&&externalHolderRole(row,manual)!==externalRole)return false;
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
   const parts=ownershipAmounts(row,manual),role=externalHolderRole(row,manual);add('own',parts.own);add(role==='direct'?'received':role==='other'?'external':role,parts.external);
  }else add(tone,row.balance);
 }
 const total=BigInt(model.total);
 const groups=Object.entries(HOLDER_TONES).filter(([id])=>(amounts.get(id)||0n)>0n).map(([id,tone])=>({id,...tone,balance:amounts.get(id).toString(),share:total?Number(amounts.get(id)*100000000n/total)/1000000:0}));
 const countGroups=Object.entries(HOLDER_TONES).filter(([id])=>counts.has(id)).map(([id,tone])=>({id,...tone,count:counts.get(id)}));
 return {...model,groups,countGroups};
}
