import {holderLedger,selectHolderView,holderOverviewCharts,HOLDER_SCOPES} from '../../src/holder-overview.mjs';
import {holderInsights,sellerProfile,displayEsimBalance} from '../../src/holder-insights.mjs';
import {HOLDER_SORT_KEYS} from '../../src/holder-ranking.mjs';
import {SELLER_GROUPS,sellerSummaries} from '../../src/seller-summary.mjs';
import {filterSellerRows,rankSellerRows,sellerPage,SELLER_SORT_KEYS} from '../../src/seller-ranking.mjs';

const derived=new WeakMap();
const metadata=report=>{const {rows,contracts,...meta}=report;return meta;};
function holderDerived(report){
 let cached=derived.get(report);
 if(!cached){cached={ledger:holderLedger(report),insights:holderInsights(report),byAddress:new Map(report.rows.map(row=>[row.address,row]))};derived.set(report,cached);}
 return cached;
}
const value=(input,key,fallback='')=>typeof input[key]==='string'?input[key]:fallback;
const oneOf=(v,allowed,fallback)=>allowed.includes(v)?v:fallback;
const pageNumber=v=>Math.min(10000,Math.max(0,Number.isSafeInteger(Number(v))?Number(v):0));
export function holderViewOptions(input={}){
 return {scope:oneOf(value(input,'scope'),Object.keys(HOLDER_SCOPES),'all'),minimum:oneOf(value(input,'minimum'),['0','10000000000000000000000','100000000000000000000000','1000000000000000000000000'],'0'),search:value(input,'search').slice(0,64),filter:value(input,'tags').split(',').filter(Boolean).slice(0,30),cohort:oneOf(value(input,'cohort'),['held','sold-held','sold-zero','zero'],null),excludeOwn:value(input,'excludeOwn')==='1',includeZero:value(input,'includeZero')==='1',page:pageNumber(input.page),pageSize:oneOf(Number(input.pageSize),[50,100,200],100),sort:oneOf(value(input,'sort'),HOLDER_SORT_KEYS,'balance'),direction:oneOf(value(input,'direction'),['asc','desc'],'desc')};
}
export function sellerViewOptions(input={}){
 return {period:oneOf(value(input,'period'),['today','yesterday','history'],'today'),mode:oneOf(value(input,'mode'),['initiator','funding'],'initiator'),filter:oneOf(value(input,'filter'),SELLER_GROUPS.map(g=>g.id),'all'),search:value(input,'search').slice(0,42),tags:value(input,'tags').split(',').filter(Boolean).slice(0,30),page:pageNumber(input.page),sort:oneOf(value(input,'sort'),SELLER_SORT_KEYS,'sold'),direction:oneOf(value(input,'direction'),['asc','desc'],'desc')};
}
export function buildHolderSummary(report,addresses=[]){
 const x=holderDerived(report);
 return {format:'holder-summary-v1',...metadata(report),insights:x.insights,ledger:x.ledger,rows:addresses.flatMap(address=>x.byAddress.has(address)?[x.byAddress.get(address)]:[])};
}
export function buildHolderView(report,options){
 const selected=selectHolderView(report,options),x=holderDerived(report);
 return {format:'holder-page-v1',report:metadata(report),ledger:x.ledger,selected:{rows:selected.rows,total:selected.total,page:selected.page,balance:selected.all.reduce((sum,row)=>sum+BigInt(row.balance),0n).toString(),charts:holderOverviewCharts(selected.all)},options};
}
export function validateBalanceValues(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length>30000)throw Error('INVALID_BALANCES');
 const result=new Map();
 for(const [address,row]of Object.entries(input)){
  if(!/^0x[0-9a-f]{40}$/.test(address)||!row||!Number.isSafeInteger(row.block)||row.block<0||!Number.isFinite(row.timestamp)||!['esim','usdt','bnb'].every(key=>row[key]==null||typeof row[key]==='string'&&/^(0|[1-9][0-9]{0,77})$/.test(row[key])))throw Error('INVALID_BALANCES');
  result.set(address,{block:row.block,timestamp:row.timestamp,esim:row.esim??null,usdt:row.usdt??null,bnb:row.bnb??null});
 }
 return result;
}
export function buildSellerView(report,holders,options,balanceValues=new Map()){
 const {windows,...meta}=report,w=windows[options.period],data=w[options.mode],x=holderDerived(holders),profileCache=new Map();
 const profile=row=>{if(!profileCache.has(row.address))profileCache.set(row.address,sellerProfile(row,x.byAddress.get(row.address)));return profileCache.get(row.address);};
 const balance=(row,key)=>key==='esim'?displayEsimBalance(balanceValues.get(row.address),x.byAddress.get(row.address),holders).balance:balanceValues.get(row.address)?.[key]??null;
 const all=rankSellerRows(filterSellerRows(data.rows,options,profile),options.sort,options.direction,balance),pagination=sellerPage(all,options.page);
 const {initiator,funding,...window}=w;
 return {format:'seller-page-v1',...meta,windows:Object.fromEntries(Object.entries(windows).map(([key,{start,end,available}])=>[key,{start,end,available}])),window,groups:sellerSummaries([...data.rows,...(data.buyOnlyRows||[])],profile,{sold:data.missingSold,bought:data.missingBought}),activityComplete:Array.isArray(data.buyOnlyRows),totals:{sold:all.reduce((sum,row)=>sum+BigInt(row.sold),0n).toString(),bought:all.reduce((sum,row)=>sum+BigInt(row.bought),0n).toString(),own:all.filter(row=>profile(row).own).length},population:data.rows.length,missingSold:data.missingSold,missingBought:data.missingBought,...pagination,options,holders:{version:holders.version,block:holders.block,cutoff:holders.cutoff,tradeCutoff:holders.tradeCutoff,rows:pagination.rows.flatMap(row=>x.byAddress.has(row.address)?[x.byAddress.get(row.address)]:[])}};
}
