import test from 'node:test';
import assert from 'node:assert/strict';
import {readSnapshot,readTradingReport} from '../src/snapshot-client.mjs';

const snapshot=(kind,block)=>({version:1,block,cutoff:block,token:'0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d',...(kind==='holders'?{rows:[]}:{windows:{}})});
test('all three pages select a newer background snapshot even while the website snapshot is available',async()=>{
 for(const kind of ['report','addresses','holders']){
  const calls=[];
  const result=await readSnapshot(kind,{fetch:async url=>{calls.push(url);return{ok:true,json:async()=>snapshot(kind,url.includes('raw.githubusercontent')?200:100)}}});
  assert.equal(result.data.block,200);assert.equal(result.source,'background');assert.equal(calls.length,2);
 }
});
test('equal blocks prefer the website report, preserving the report enriched during publication',async()=>{
 const result=await readSnapshot('report',{fetch:async url=>({ok:true,json:async()=>({...snapshot('report',200),enriched:!url.includes('raw.githubusercontent')})})});
 assert.equal(result.data.enriched,true);assert.equal(result.source,'published');
});
test('an unreachable background does not discard a valid website snapshot or fetch a bundled fallback',async()=>{
 const calls=[];
 const result=await readSnapshot('holders',{fetch:async url=>{calls.push(url);if(url.includes('raw.githubusercontent'))throw Error('offline');return{ok:true,json:async()=>snapshot('holders',200)}}});
 assert.equal(result.source,'published');assert.equal(calls.length,2);
});
test('a newer bundled fallback may advance retained data, while an older live answer cannot claim a live update',async()=>{
 const current=snapshot('report',100);
 const fallback=await readSnapshot('report',{current,fetch:async url=>{if(url.includes('current-')||url.includes('raw.githubusercontent'))throw Error('offline');return{ok:true,json:async()=>snapshot('report',200)}}});
 assert.equal(fallback.data.block,200);assert.equal(fallback.source,'bundled');
 const result=await readTradingReport({current,live:true,fetch:async()=>({ok:true,json:async()=>snapshot('report',200)}),queryLive:async()=>snapshot('report',150)});
 assert.equal(result.data.block,200);assert.equal(result.source,'retained');
});
