import test from 'node:test';
import assert from 'node:assert/strict';

test('a stalled public cache read times out and its late result cannot replace newer data',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const original=globalThis.indexedDB,reads=[];
 const db={transaction(){const tx={objectStore(){return {get(){const r={};reads.push(r);return r;},put(){},getAll(){return {};}};},abort(){this.onabort?.();}};return tx;}};
 globalThis.indexedDB={open(){const request={result:db};queueMicrotask(()=>request.onsuccess());return request;}};
 try{
  const {cachedData,cacheData}=await import('../src/data-cache.mjs?stalled-cache-test');
  const pending=cachedData('public');await new Promise(setImmediate);assert.equal(reads.length,1);
  const save=cacheData('public',{version:2});await new Promise(setImmediate);
  t.mock.timers.tick(1001);assert.equal(await pending,null);await save;
  reads[0].result={key:'public',data:{version:1}};reads[0].onsuccess();
  assert.equal((await cachedData('public')).data.version,2);
 }finally{globalThis.indexedDB=original;}
});

test('an aborted cache transaction returns a miss instead of blocking live reads',async()=>{
 const original=globalThis.indexedDB;
 globalThis.indexedDB={open(){const request={result:{transaction(){const tx={objectStore(){return {get(){queueMicrotask(()=>tx.onabort());return {};}};}};return tx;}}};queueMicrotask(()=>request.onsuccess());return request;}};
 try{const {cachedData}=await import('../src/data-cache.mjs?aborted-cache-test');assert.equal(await cachedData('public-aborted'),null);}finally{globalThis.indexedDB=original;}
});
