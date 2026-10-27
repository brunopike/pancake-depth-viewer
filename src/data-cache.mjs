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
  const request=db.transaction('views').objectStore('views').get(key);
  request.onsuccess=()=>{const item=request.result||null;if(item)memory.set(key,item);resolve(item);};request.onerror=()=>resolve(null);
 });}catch{return null;}
}
export async function cacheData(key,data,etag){
 try{
  if(JSON.stringify(data).length>3000000)return;
  const item={key,data,etag,savedAt:Date.now()};memory.delete(key);memory.set(key,item);while(memory.size>16)memory.delete(memory.keys().next().value);
  const db=await database();if(!db)return;
  await new Promise(resolve=>{const tx=db.transaction('views','readwrite'),store=tx.objectStore('views');store.put(item);
   const read=store.getAll();read.onsuccess=()=>{for(const old of read.result.sort((a,b)=>b.savedAt-a.savedAt).slice(16))store.delete(old.key);};tx.oncomplete=resolve;tx.onerror=resolve;tx.onabort=resolve;
  });
 }catch{/* A storage failure cannot hide live data or affect manual labels. */}
}
