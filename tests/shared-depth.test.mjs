import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {readSharedDepth} from '../src/shared-depth.mjs';
import {encodeSnapshot} from '../server/esim/realtime-store.mjs';
const value=(block,timestamp=Date.now())=>({blockNumber:String(block),timestamp});
const response=data=>({ok:true,text:async()=>JSON.stringify(data)});
const opts={hostname:'esimonchain.imstark.site',parse:JSON.parse,archiveURL:async()=>'/archive'};
test('fresh default depth uses Neon without fetching the archive',async()=>{
 const calls=[],data=value(123);assert.deepEqual(await readSharedDepth({...opts,fetch:async url=>{calls.push(url);return response(data);}}),data);assert.deepEqual(calls,['./api/esim-snapshot?kind=depth']);
});
test('database failure or malformed depth retains the archive fallback',async()=>{
 for(const broken of [async()=>{throw Error('offline')},async()=>response({blockNumber:'bad'}),async()=>({ok:false})]){
  const data=value(124);assert.deepEqual(await readSharedDepth({...opts,parse:text=>{const x=JSON.parse(text);BigInt(x.blockNumber);return x;},fetch:url=>url.includes('/api/')?broken():response(data)}),data);
 }
});
test('stale depth selects the newer verified source without moving backwards',async()=>{
 for(const archived of [123,125]){const old=value(124,1),other=value(archived,1);assert.deepEqual(await readSharedDepth({...opts,fetch:async url=>response(url.includes('/api/')?old:other)}),archived===123?old:other);}
});
test('other pairs never receive the default ESIM depth',async()=>{
 const calls=[];await readSharedDepth({...opts,filename:'other.json',fetch:async url=>{calls.push(url);return response(value(123));}});assert.deepEqual(calls,['/archive']);
});
test('depth snapshot validates the pair and retains original integer strings',()=>{
 const data={...value(123),version:1,chainId:56,base:'0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d',quote:'0x55d398326f99059ff775485246999027b3197955',blockHash:'0x'+'a'.repeat(64),pools:[{liquidity:'123456789012345678901234567890'}],failed:[]};
 const x=encodeSnapshot('depth',data);assert.equal(x.block,123);assert.equal(x.cutoff,data.timestamp/1000);assert.deepEqual(JSON.parse(gunzipSync(Buffer.from(x.body,'base64'))),data);
 assert.throws(()=>encodeSnapshot('depth',{...data,base:data.quote}),/INVALID_REALTIME_DEPTH/);
});
