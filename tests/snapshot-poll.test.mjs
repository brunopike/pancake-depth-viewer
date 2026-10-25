import test from 'node:test';
import assert from 'node:assert/strict';
import {startSnapshotPolling} from '../src/snapshot-poll.mjs';

function harness(t,{refresh=async()=>{},status=async()=>({ok:true,json:async()=>({processedBlock:123,holderBlock:124})})}={}){
 let now=1000000,poll,requests=0,refreshes=0;
 const descriptors=new Map();
 const replace=(name,value)=>{descriptors.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,writable:true,configurable:true});};
 const document={hidden:false,addEventListener(){},removeEventListener(){}};
 replace('location',{hostname:'esimonchain.imstark.site'});
 replace('document',document);
 replace('window',{addEventListener(){}});
 replace('setInterval',(callback,interval)=>{assert.equal(interval,60000);poll=callback;return 1;});
 replace('fetch',async()=>{requests++;return status();});
 t.mock.method(Date,'now',()=>now);
 t.after(()=>{for(const [name,descriptor]of descriptors){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}});
 startSnapshotPolling(async()=>{refreshes++;return refresh();});
 assert.equal(typeof poll,'function');
 return {poll,document,advance:ms=>{now+=ms;},get requests(){return requests;},get refreshes(){return refreshes;}};
}

test('unchanged successful status still refreshes snapshots every five minutes',async t=>{
 const h=harness(t);
 await h.poll();assert.equal(h.refreshes,1);
 h.advance(299999);await h.poll();assert.equal(h.refreshes,1);
 h.advance(1);await h.poll();assert.equal(h.refreshes,2);
 h.advance(300000);await h.poll();assert.equal(h.refreshes,3);
 assert.equal(h.requests,4);
});

test('hidden pages do not request status or refresh snapshots',async t=>{
 const h=harness(t);h.document.hidden=true;h.advance(600000);
 await h.poll();assert.equal(h.requests,0);assert.equal(h.refreshes,0);
 h.document.hidden=false;await h.poll();assert.equal(h.requests,1);assert.equal(h.refreshes,1);
});

test('failed status requests retain the independent five-minute fallback',async t=>{
 let failure='network';
 const h=harness(t,{status:async()=>{if(failure==='network')throw Error('STATUS_OFFLINE');return {ok:false};}});
 await h.poll();assert.equal(h.refreshes,0);
 h.advance(300000);await h.poll();assert.equal(h.refreshes,1);
 h.advance(299999);await h.poll();assert.equal(h.refreshes,1);
 failure='http';h.advance(1);await h.poll();assert.equal(h.refreshes,2);
});

test('a busy refresh returning false does not acknowledge the revision',async t=>{
 let busy=true;
 const h=harness(t,{refresh:async()=>busy?false:undefined});
 await h.poll();assert.equal(h.refreshes,1);
 busy=false;h.advance(60000);await h.poll();assert.equal(h.refreshes,2);
 h.advance(60000);await h.poll();assert.equal(h.refreshes,2);
});

test('failed status retries a busy fallback at the next poll',async t=>{
 let busy=true;
 const h=harness(t,{status:async()=>({ok:false}),refresh:async()=>busy?false:undefined});
 h.advance(300000);await h.poll();assert.equal(h.refreshes,1);
 busy=false;h.advance(60000);await h.poll();assert.equal(h.refreshes,2);
 h.advance(60000);await h.poll();assert.equal(h.refreshes,2);
});
