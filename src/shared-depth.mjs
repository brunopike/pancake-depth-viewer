import {latestSharedURL} from './snapshot.mjs';

export async function readSharedDepth({signal,filename='esim-usdt.json',parse,fetch=globalThis.fetch,hostname=globalThis.location?.hostname,archiveURL=latestSharedURL}){
 const mirrored=hostname==='esimonchain.imstark.site'||hostname?.endsWith('.vercel.app');
 let prior=null;
 if(mirrored&&filename==='esim-usdt.json')try{
  const response=await fetch('./api/esim-snapshot?kind=depth',{cache:'no-store',signal});
  if(response.ok){
   const text=await response.text(),meta=JSON.parse(text),value=parse(text);
   prior={meta,value};
   if(Number.isFinite(meta.timestamp)&&Date.now()-meta.timestamp<600000)return value;
  }
 }catch{/* Preserve the independently published fallback on a database outage. */}
 try{
  const response=await fetch(await archiveURL(signal,filename),{cache:'no-store',signal});
  if(response.ok){const text=await response.text(),meta=JSON.parse(text),value=parse(text);
   if(!prior||BigInt(meta.blockNumber)>=BigInt(prior.meta.blockNumber))return value;
  }
 }catch{/* A verified previous snapshot is preferable to a blank page. */}
 return prior?.value??null;
}
