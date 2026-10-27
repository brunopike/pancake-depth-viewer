import {realtimeHost} from './snapshot-client.mjs';
import {cachedData,cacheData} from './data-cache.mjs';
export const compactViewsEnabled=(manual={})=>realtimeHost()&&Object.keys(manual).length===0;
const queryFor=(kind,options={})=>new URLSearchParams({kind,...Object.fromEntries(Object.entries(options).filter(([,v])=>v!==null&&v!==undefined).map(([k,v])=>[k,Array.isArray(v)?v.join(','):String(v)]))});
const keyFor=(kind,options)=>'view-v1:'+queryFor(kind,options).toString();
export const viewBlock=data=>data?.report?.block??data?.block??0;
const holderBlock=data=>data?.holders?.block??data?.report?.block??data?.block??0;
export function validView(kind,data){
 const formats={holders:'holder-page-v1',sellers:'seller-page-v1',summary:'holder-summary-v1'},meta=kind==='holders'?data?.report:data;
 if(data?.format!==formats[kind]||!Number.isSafeInteger(viewBlock(data))||viewBlock(data)<=0||!Number.isFinite(meta?.cutoff))return false;
 if(kind==='summary')return Array.isArray(data.rows)&&!!data.insights&&!!data.ledger;
 if(kind==='holders')return !!data.ledger&&!!data.selected?.charts&&Array.isArray(data.selected.rows)&&Number.isInteger(data.selected.total)&&Number.isInteger(data.selected.page)&&typeof data.selected.balance==='string';
 return Array.isArray(data.rows)&&Array.isArray(data.groups)&&!!data.windows&&!!data.window&&!!data.totals&&Array.isArray(data.holders?.rows)&&Number.isSafeInteger(data.holders.block);
}

export async function cachedView(kind,options={}){const item=await cachedData(keyFor(kind,options));return validView(kind,item?.data)?item:null;}
export async function readView(kind,options={}, {fetch:request=globalThis.fetch,balances,current}={}){
 const key=keyFor(kind,options),cached=await cachedView(kind,options),headers={};
 if(cached?.etag)headers['If-None-Match']=cached.etag;
 const post=balances&&Object.keys(balances).length>0;if(post)headers['Content-Type']='application/json';
 const response=await request('./api/esim-view?'+queryFor(kind,options),{method:post?'POST':'GET',headers,cache:'no-cache',signal:AbortSignal.timeout(15000),...(post?{body:JSON.stringify({balances})}:{})});
 const data=response.status===304?cached?.data:response.ok?await response.json():null;
 if(!validView(kind,data))throw Error('紧凑快照暂时不可用。');
 const previous=validView(kind,current)?current:cached?.data;
 if(previous&&(viewBlock(data)<viewBlock(previous)||holderBlock(data)<holderBlock(previous)))return previous;
 void cacheData(key,data,response.headers.get('etag')||cached?.etag);return data;
}
