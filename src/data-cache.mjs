// Only public, compact read models are cached here. Manual labels keep their
// existing localStorage key and are never sent to the server or removed.
const memory=new Map();let connection;
function database(){
 if(!globalThis.indexedDB)return Promise.resolve(null);
 return connection??=new Promise(resolve=>{
  const timeout=setTimeout(()=>resolve(null),1000);
  const done=value=>{clearTimeout(timeout);resolve(value);};
  const request=indexedDB.open('esim-public-views',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('views',{keyPath:'key'});
  request.onsuccess=()=>done(request.result);request.onerror=()=>done(null);request.onblocked=()=>done(null);
 });
}
export async function cachedData(key){
 if(memory.has(key))return memory.get(key);
 try{const db=await database();if(!db)return null;return await new Promise(resolve=>{
  let settled=false;const done=item=>{if(settled)return;settled=true;clearTimeout(timeout);if(item)memory.set(key,item);resolve(item);};
  const timeout=setTimeout(()=>done(null),1000),tx=db.transaction('views');
  const request=tx.objectStore('views').get(key);
  request.onsuccess=()=>done(request.result||null);request.onerror=tx.onabort=tx.onerror=()=>done(null);
 });}catch{return null;}
}
export async function cacheData(key,data,etag){
 try{
  if(JSON.stringify(data).length>3000000)return;
  const item={key,data,etag,savedAt:Date.now()};memory.delete(key);memory.set(key,item);while(memory.size>16)memory.delete(memory.keys().next().value);
  const db=await database();if(!db)return;
  await new Promise(resolve=>{const tx=db.transaction('views','readwrite'),store=tx.objectStore('views');store.put(item);
   let settled=false;const done=()=>{if(settled)return;settled=true;clearTimeout(timeout);resolve();};
   const timeout=setTimeout(()=>{done();try{tx.abort();}catch{}},1000);
   const read=store.getAll();read.onsuccess=()=>{for(const old of read.result.sort((a,b)=>b.savedAt-a.savedAt).slice(16))store.delete(old.key);};
   tx.oncomplete=tx.onerror=tx.onabort=done;
  });
 }catch{/* A storage failure cannot hide live data or affect manual labels. */}
}
