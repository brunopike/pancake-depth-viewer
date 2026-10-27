import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {readViewSnapshot} from '../server/esim/view-cache.mjs';
import {holderViewOptions,sellerViewOptions,buildHolderView,buildSellerView,buildHolderSummary,validateBalanceValues} from '../server/esim/views.mjs';
export const config={maxDuration:30};

export function createViewHandler(read=readViewSnapshot){return async function handler(req,res){
 if(!['GET','POST'].includes(req.method))return res.status(405).end();
 const kind=req.query?.kind;
 if(!['holders','sellers','summary'].includes(kind))return res.status(400).end();
 let body={},options,addresses=[],balanceValues;
 try{
  if(req.method==='POST'){
   if(Number(req.headers?.['content-length']||0)>2000000)throw Error('REQUEST_TOO_LARGE');
   body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
   if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>2000000)throw Error('INVALID_REQUEST');
  }
  options=kind==='holders'?holderViewOptions(req.query):sellerViewOptions(req.query);
  if(kind==='sellers')balanceValues=validateBalanceValues(body.balances);
  if(kind==='summary')addresses=String(req.query.addresses||'').split(',').filter(Boolean);
  if(addresses.length>50||addresses.some(a=>!/^0x[0-9a-f]{40}$/.test(a)))throw Error('INVALID_ADDRESSES');
 }catch{return res.status(400).json({error:'INVALID_REQUEST'});}
 res.setHeader('Cache-Control',req.method==='GET'?'public, max-age=0, s-maxage=15, stale-while-revalidate=30':'private, no-cache');
 try{
  const [holders,sellers]=await Promise.all([read('holders'),kind==='sellers'?read('addresses'):null]);
  const etag='"'+createHash('sha256').update(JSON.stringify([kind,holders.etag,sellers?.etag,options,addresses,body.balances||{}])).digest('hex')+'"';
  res.setHeader('ETag',etag);
  if(String(req.headers?.['if-none-match']||'').split(',').some(v=>[etag,'W/'+etag].includes(v.trim())))return res.status(304).end();
  const data=kind==='holders'?buildHolderView(holders.data,options):kind==='sellers'?buildSellerView(sellers.data,holders.data,options,balanceValues):buildHolderSummary(holders.data,addresses);
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Content-Encoding','gzip');
  return res.status(200).send(gzipSync(JSON.stringify(data)));
 }catch{res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'SNAPSHOT_UNAVAILABLE'});}
};}
export default createViewHandler();
