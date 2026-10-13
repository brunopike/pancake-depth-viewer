export const TAG_KEY='esim:holders:manual-tags:v1';
export const TAG_KINDS={own:'我方',lp:'我方 LP',exchange:'交易所',contract:'合约',frequency:'高频机器人（人工标记）',arbitrage:'套利机器人（人工标记）',external:'外部',custom:'自定义'};
export const GROUPS=[['lp','我方 LP','#9fc5e9'],['own','我方其他','#d9c593'],['exchange','交易所托管','#b49ada'],['dex','DEX / 资金池','#69c7a7'],['received','领币地址','#de92a2'],['frequency','高频 / 疑似套利','#d6a77b'],['contract','其他合约','#8297b2'],['other','其他地址','#4c6278']];
export const isAddress=a=>/^0x[0-9a-f]{40}$/.test(a||'');
export function validateManual(value){
 if(!value||!isAddress(value.address)||!Object.hasOwn(TAG_KINDS,value.kind)||typeof value.text!=='string'||!value.text.trim()||value.text.trim().length>32||/[\u0000-\u001f\u007f]/.test(value.text))throw new Error('标签需为 1～32 个字。');
 return {address:value.address,kind:value.kind,text:value.text.trim(),updatedAt:new Date().toISOString()};
}
export function readManual(raw){try{const v=JSON.parse(raw||'{}');if(!v||typeof v!=='object'||Array.isArray(v))return {};const out={};for(const [a,r]of Object.entries(v).slice(0,2000)){try{out[a]=validateManual({...r,address:a});}catch{}}return out;}catch{return {};}}
export function rowTags(row,manual){const tags=[...row.tags];const custom=manual[row.address];if(custom)tags.unshift({id:'manual',text:custom.text,kind:custom.kind,evidence:'当前浏览器手动标记',manual:true});return tags;}
export function category(row,manual){const m=manual[row.address];if(m&&['lp','own','exchange','contract','frequency','arbitrage'].includes(m.kind))return m.kind==='arbitrage'?'frequency':m.kind;
 const tags=row.tags;for(const key of ['lp','own','exchange','dex','received','frequency','arbitrage','contract'])if(tags.some(t=>t.kind===key))return key==='arbitrage'?'frequency':key;return 'other';}
export function selectHolders(report,{search='',filter='all',includeZero=false,page=0,pageSize=100}={},manual={}){
 const q=search.trim().toLowerCase();const rows=report.rows.filter(r=>(includeZero||BigInt(r.balance)>0n)&&(!q||r.address.includes(q)||rowTags(r,manual).some(t=>t.text.toLowerCase().includes(q)))&&(filter==='all'||filter==='manual'&&manual[r.address]||filter==='own'&&rowTags(r,manual).some(t=>['own','lp'].includes(t.kind))||rowTags(r,manual).some(t=>t.id===filter||t.kind===filter)));
 const current=Math.min(Math.max(0,page),Math.max(0,Math.ceil(rows.length/pageSize)-1));return{all:rows,total:rows.length,page:current,rows:rows.slice(current*pageSize,(current+1)*pageSize)};
}
export function groupHolders(rows,manual){const amounts=new Map(GROUPS.map(([k])=>[k,0n]));for(const r of rows){const k=category(r,manual);amounts.set(k,amounts.get(k)+BigInt(r.balance));}return GROUPS.map(([id,label,color])=>({id,label,color,balance:amounts.get(id).toString()})).filter(r=>BigInt(r.balance)>0n);}
export function changePercent(balance,prior){if(prior===null)return null;if(BigInt(prior)===0n)return BigInt(balance)>0n?'new':'0';return (Number(BigInt(balance)-BigInt(prior))/Number(BigInt(prior))*100).toString();}
