import {validCohort} from '../server/esim/cohort-validation.mjs';
const mirrored=globalThis.location?.hostname==='esimonchain.imstark.site'||globalThis.location?.hostname?.endsWith('.vercel.app');
const directURL='https://raw.githubusercontent.com/brunopike/pancake-depth-viewer/esim-cache/cohort.json.gz';
export const COHORT_URL=mirrored?'./data/current-esim-cohort.json.gz':directURL;
const fits=(c,s)=>validCohort(c,c)&&c.throughBlock<=s.block&&c.cutoff<=s.cutoff&&(c.throughBlock!==s.block||c.blockHash===s.blockHash);
const cache=new WeakMap();
export function retainContractCohort(snapshot,cohort){
 if(cohort&&fits(cohort,snapshot)&&(!snapshot.cohort||cohort.throughBlock>=snapshot.cohort.throughBlock))return {...snapshot,cohort};
 return snapshot;
}
export async function readContractCohort(snapshot,{fetch:request=globalThis.fetch}={}){
 let {data:cached,at=0}=cache.get(request)||{};
 if(!cached||Date.now()-at>60000){
  for(const url of mirrored?[COHORT_URL,directURL]:[COHORT_URL])try{
   const r=await request(url+'?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)continue;
   const c=await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();
   if(fits(c,snapshot)&&(!cached||c.throughBlock>=cached.throughBlock)){cached=c;at=Date.now();cache.set(request,{data:cached,at});if(c.external?.scopeRevision===2||!mirrored)break;}
  }catch{}
 }
 return retainContractCohort(snapshot,cached);
}
