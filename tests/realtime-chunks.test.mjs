import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {encodeSnapshot,publishRealtime,readRealtime} from '../server/esim/realtime-store.mjs';
import {readSnapshot} from '../src/snapshot-client.mjs';
import {readSharedDepth} from '../src/shared-depth.mjs';

const data={version:1,block:123,cutoff:Date.now()/1000,windows:{history:{exactAmount:'123456789012345678901234567890',payload:randomBytes(5*1024*1024).toString('hex')}}};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

test('growing snapshots use bounded parts without dropping any original data',()=>{
 const e=encodeSnapshot('addresses',data);
 assert(e.parts.length>=3);
 assert(e.parts.every(p=>Buffer.from(p,'base64').length<=2*1024*1024));
 const bytes=Buffer.concat(e.parts.map(p=>Buffer.from(p,'base64')));
 assert.equal(digest(bytes),e.hash);assert.deepEqual(JSON.parse(gunzipSync(bytes)),data);
 assert(e.body.startsWith('chunks-v1:'));assert(e.body.length<256);
});

test('small existing gzip snapshots remain compatible',()=>{
 const value={version:1,block:12,cutoff:100,windows:{},amount:'1000000000000000001'},e=encodeSnapshot('addresses',value);
 assert.equal(e.parts,undefined);assert.deepEqual(JSON.parse(gunzipSync(Buffer.from(e.body,'base64'))),value);
});

test('parts, revision and acknowledgement commit together with stale-writer protection',async()=>{
 const statements=[],sql={query:(q,p)=>{const s={q,p};statements.push(s);return s;},transaction:async statements=>{assert(statements.some(s=>s.q.includes('esim_realtime_snapshot_parts')));throw Error('COMMIT_FAILED');}};
 await assert.rejects(publishRealtime([{kind:'addresses',data}],{processedBlock:123,sql,lease:null}),/COMMIT_FAILED/);
 assert(statements.some(s=>s.q.includes('excluded.block>=esim_realtime_snapshots.block')));
 assert(statements.some(s=>s.q.includes('greatest(processed_block')));
});

test('server reconstructs one exact revision and rejects missing or corrupt parts',async()=>{
 const e=encodeSnapshot('addresses',data),head={kind:'addresses',block:123,cutoff:data.cutoff,body:e.body,etag:e.hash};
 const sql={query:async(q,p)=>q.includes('snapshot_parts')?[{body:e.parts[p[2]]}]:[head]};
 const row=await readRealtime('addresses',sql);assert.deepEqual(JSON.parse(gunzipSync(Buffer.from(row.body,'base64'))),data);
 await assert.rejects(readRealtime('addresses',{query:async(q,p)=>q.includes('snapshot_parts')?[]:[head]}),/SNAPSHOT_PART_UNAVAILABLE/);
 await assert.rejects(readRealtime('addresses',{query:async(q,p)=>q.includes('snapshot_parts')?[{body:randomBytes(5).toString('base64')}]:[head]}),/SNAPSHOT_PART_HASH_MISMATCH/);
});

test('browser receives the complete large revision and rejects mixed or corrupt parts',async()=>{
 const e=encodeSnapshot('addresses',data),manifest={version:1,chunked:true,kind:'addresses',block:123,cutoff:data.cutoff,etag:e.hash,parts:e.parts.length};
 let corrupt=false;const urls=[];
 const request=async url=>{urls.push(url);const u=new URL(url,'https://example.test');
  if(u.pathname.endsWith('/api/esim-snapshot')){if(!u.searchParams.has('part'))return new Response(JSON.stringify(manifest));
   assert.equal(u.searchParams.get('etag'),e.hash);const n=Number(u.searchParams.get('part'));return new Response(corrupt&&n===0?randomBytes(5):Buffer.from(e.parts[n],'base64'));
  }return new Response('',{status:503});
 };
 const result=await readSnapshot('addresses',{fetch:request,realtime:true});assert.equal(result.source,'realtime');assert.deepEqual(result.data,data);assert.equal(urls.length,e.parts.length+1);
 corrupt=true;await assert.rejects(readSnapshot('addresses',{fetch:request,realtime:true}),/数据暂时无法读取/);
});

test('large depth retains its existing caller parsing and original block fields',async()=>{
 const depth={...data,blockNumber:'123',timestamp:Date.now(),chainId:56,base:'0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d',quote:'0x55d398326f99059ff775485246999027b3197955',blockHash:'0x'+'a'.repeat(64),pools:[{liquidity:'123456789012345678901234567890'}],failed:[]};delete depth.block;delete depth.cutoff;
 const e=encodeSnapshot('depth',depth),manifest={version:1,chunked:true,kind:'depth',block:123,cutoff:depth.timestamp/1000,etag:e.hash,parts:e.parts.length};
 const request=async url=>{const u=new URL(url,'https://example.test');if(!u.pathname.endsWith('/api/esim-snapshot'))return new Response('',{status:503});return u.searchParams.has('part')?new Response(Buffer.from(e.parts[Number(u.searchParams.get('part'))],'base64')):new Response(JSON.stringify(manifest));};
 const result=await readSharedDepth({hostname:'esimonchain.imstark.site',parse:text=>{const v=JSON.parse(text);assert.equal(v.blockNumber,'123');assert.equal(v.pools[0].liquidity,'123456789012345678901234567890');return v;},archiveURL:async()=>'/unavailable',fetch:request});
 assert.deepEqual(result,depth);
});
