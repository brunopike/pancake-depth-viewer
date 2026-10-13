import {CONFIRMED_HOLDER_LABELS} from './holder-labels.mjs';
import {rankHolderRows} from './holder-ranking.mjs';
export const TAG_KEY='esim:holders:manual-tags:v1';
export const TAG_KINDS={own:'我方',lp:'我方 LP',exchange:'交易所',contract:'合约',frequency:'高频机器人（人工标记）',arbitrage:'套利机器人（人工标记）',external:'外部',custom:'自定义'};
export const GROUPS=[['lp','我方 LP','#9fc5e9'],['own','我方其他','#d9c593'],['exchange','交易所托管','#b49ada'],['dex','DEX / 资金池','#69c7a7'],['received','领币地址','#de92a2'],['frequency','高频 / 疑似套利','#d6a77b'],['contract','其他合约','#8297b2'],['other','其他地址','#4c6278']];
export const isAddress=a=>/^0x[0-9a-f]{40}$/.test(a||'');
export function validateManual(value){
 if(!value||!isAddress(value.address)||!Object.hasOwn(TAG_KINDS,value.kind)||typeof value.text!=='string'||!value.text.trim()||value.text.trim().length>32||/[\u0000-\u001f\u007f]/.test(value.text))throw new Error('标签需为 1～32 个字。');
 return {address:value.address,kind:value.kind,text:value.text.trim(),updatedAt:new Date().toISOString()};
}
export function readManual(raw){try{const v=JSON.parse(raw||'{}');if(!v||typeof v!=='object'||Array.isArray(v))return {};const out={};for(const [a,r]of Object.entries(v).slice(0,2000)){try{out[a]=validateManual({...r,address:a});}catch{}}return out;}catch{return {};}}
export function customLabelOptions(manual){
 const counts=new Map();for(const label of Object.values(manual))counts.set(label.text,(counts.get(label.text)||0)+1);
 return [...counts].sort(([a],[b])=>a.localeCompare(b,'zh-CN')).map(([text,count])=>({text,count,value:`label:${text}`}));
}
export function matchesTagFilters(tags,filter='all',manualLabel){
 const filters=Array.isArray(filter)?filter:[filter];
 return !filters.length||filters.includes('all')||filters.some(f=>
  f==='manual'?!!manualLabel:f.startsWith('label:')?manualLabel?.text===f.slice(6):
  f==='own'?tags.some(t=>['own','lp'].includes(t.kind)):
  f==='cleared'?tags.some(t=>t.id==='cleared'):tags.some(t=>t.id===f||t.kind===f));
}
export function rowTags(row,manual){
 const known=CONFIRMED_HOLDER_LABELS[row.address];
 const tags=known?[{id:`known-${known.kind}`,text:known.label,kind:known.kind,evidence:known.source},...row.tags.filter(t=>!t.id?.startsWith('known-')&&!['frequency','arbitrage'].includes(t.kind))]:[...row.tags];
 const custom=manual[row.address];if(custom)tags.unshift({id:'manual',text:custom.text,kind:custom.kind,evidence:'当前浏览器添加的标签',manual:true});return tags.some(t=>['own','lp'].includes(t.kind))?tags.filter(t=>!['frequency','arbitrage'].includes(t.kind)):tags;
}
export function category(row,manual){const tags=rowTags(row,manual),m=tags.find(t=>t.manual);if(m&&['lp','own','exchange','contract','frequency','arbitrage'].includes(m.kind))return m.kind==='arbitrage'?'frequency':m.kind;
 for(const key of ['lp','own','exchange','dex','received','frequency','arbitrage','contract'])if(tags.some(t=>t.kind===key))return key==='arbitrage'?'frequency':key;return 'other';}
export function recipientState(row,manual={}){
 const tags=rowTags(row,manual);if(!tags.some(t=>t.id==='received'||t.kind==='received'))return null;
 const sold=tags.some(t=>['received-sold','cleared'].includes(t.id));
 return sold?(BigInt(row.balance)>0n?'sold-held':'sold-zero'):(BigInt(row.balance)>0n?'held':'zero');
}
export function selectHolders(report,{search='',filter='all',cohort=null,excludeOwn=false,includeZero=false,page=0,pageSize=100,sort,direction='desc'}={},manual={}){
 const q=search.trim().toLowerCase();
 const filtered=report.rows.filter(r=>{
  const tags=rowTags(r,manual);
  return (!excludeOwn||!tags.some(t=>['own','lp'].includes(t.kind)))&&(includeZero||BigInt(r.balance)>0n)&&(!cohort||recipientState(r,manual)===cohort)&&(!q||r.address.includes(q)||tags.some(t=>t.text.toLowerCase().includes(q)))&&matchesTagFilters(tags,filter,manual[r.address]);
 });
 const rows=sort?rankHolderRows(filtered,sort,direction):filtered;
 const current=Math.min(Math.max(0,page),Math.max(0,Math.ceil(rows.length/pageSize)-1));return{all:rows,total:rows.length,page:current,rows:rows.slice(current*pageSize,(current+1)*pageSize)};
}
export function groupHolders(rows,manual){const amounts=new Map(GROUPS.map(([k])=>[k,0n]));for(const r of rows){const k=category(r,manual);amounts.set(k,amounts.get(k)+BigInt(r.balance));}return GROUPS.map(([id,label,color])=>({id,label,color,balance:amounts.get(id).toString()})).filter(r=>BigInt(r.balance)>0n);}
export function changePercent(balance,prior){if(prior===null)return null;if(BigInt(prior)===0n)return BigInt(balance)>0n?'new':'0';return (Number(BigInt(balance)-BigInt(prior))/Number(BigInt(prior))*100).toString();}
