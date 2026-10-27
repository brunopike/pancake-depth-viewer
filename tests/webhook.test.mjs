import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {Readable} from 'node:stream';
import {gunzipSync,gzipSync} from 'node:zlib';
import {verifyWebhook,readWebhookBody,webhookHint,bodyDigest,MAX_WEBHOOK_BYTES} from '../server/esim/webhook.mjs';
import {encodeSnapshot,saveWebhook,publishRealtime} from '../server/esim/realtime-store.mjs';
import {refreshNeeded,refreshCheckpoint,assertRealtimeHealthy,FAST_INTERVAL,FALLBACK_INTERVAL} from '../scripts/esim/realtime-worker.mjs';
import {TOKEN,SOURCE} from '../server/esim/metrics.mjs';
import {readSnapshot} from '../src/snapshot-client.mjs';
const fixture=()=>({webhookId:'wh_test',id:'event_one',type:'GRAPHQL',event:{data:{block:{number:123,hash:'0x'+'a'.repeat(64),transfers:[{index:1,transaction:{hash:'0x'+'b'.repeat(64)}}]}}}});
test('HMAC validates the exact raw body and rejects tampering, missing keys and malformed signatures',()=>{
 const raw=Buffer.from(JSON.stringify(fixture())),key='test-signing-key',signature=createHmac('sha256',key).update(raw).digest('hex');
 assert(verifyWebhook(raw,signature,key));
 for(const s of [undefined,'','xyz',signature.slice(1),'0'.repeat(64)])assert.equal(verifyWebhook(raw,s,key),false);
 assert.equal(verifyWebhook(Buffer.concat([raw,Buffer.from(' ')]),signature,key),false);
 assert.equal(verifyWebhook(raw,signature,''),false);
});
test('body parser retains whitespace and enforces the byte limit before JSON decoding',async()=>{
 const input=[' {"id":', ' "x"} '].map(Buffer.from);assert.equal((await readWebhookBody(Readable.from(input))).toString(),' {"id": "x"} ');
 await assert.rejects(readWebhookBody(Readable.from([Buffer.alloc(MAX_WEBHOOK_BYTES),Buffer.from('x')])),/BODY_TOO_LARGE/);
});
test('filtered hints accept aliased logs without treating amounts as totals',()=>{
 const value=fixture();value.event.data.block.pcs=[{index:4}];
 assert.deepEqual(webhookHint(value,['wh_test']),{id:'event_one',webhook:'wh_test',block:123,events:2,kinds:'transfers,pcs'});
 value.event.data.block.transfers=[];value.event.data.block.pcs=[];assert.equal(webhookHint(value,['wh_test']),null);
});
test('unknown hooks and malformed block identity fail closed',()=>{
 assert.throws(()=>webhookHint(fixture(),[]),/UNKNOWN_WEBHOOK/);
 for(const number of [-1,0,1.5,'not-a-block']){const f=fixture();f.event.data.block.number=number;assert.throws(()=>webhookHint(f,['wh_test']),/INVALID_BLOCK/);}
 const f=fixture();f.event.data.block.hash='0x';assert.throws(()=>webhookHint(f,['wh_test']),/INVALID_BLOCK/);
});
test('BNB address activity accepts out-of-order rows but rejects another chain',()=>{
 const f={webhookId:'wh_test',id:'n',type:'ADDRESS_ACTIVITY',event:{network:'BNB_MAINNET',activity:[{blockNum:'0x20',hash:'0x'+'1'.repeat(64)},{blockNum:'0x10',hash:'0x'+'2'.repeat(64)}]}};
 assert.equal(webhookHint(f,['wh_test']).block,32);f.event.network='ETH_MAINNET';assert.throws(()=>webhookHint(f,['wh_test']),/WRONG_NETWORK/);
});
test('receipt and pending watermark commit in one statement; duplicates do not schedule new work',async()=>{
 const h={webhook:'wh_test',id:'event_one',block:123,events:1},digest=bodyDigest(Buffer.from('body'));
 let calls=0;
 const sql={query:async(q,p)=>{calls++;assert.match(q,/WITH receipt/);assert.match(q,/ON CONFLICT \(webhook,event_id\) DO NOTHING/);assert.match(q,/greatest\(esim_realtime_control.pending_block/);assert.deepEqual(p,['wh_test','event_one',digest,123,1,'']);return [{inserted:false,previous_hash:digest}];}};
 assert.equal(await saveWebhook(h,digest,sql),false);assert.equal(calls,1);
 await assert.rejects(saveWebhook(h,digest,{query:async()=>{throw Error('DB_DOWN');}}),/DB_DOWN/);
 await assert.rejects(saveWebhook(h,digest,{query:async()=>[{inserted:false,previous_hash:'other'}]}),/EVENT_ID_CONFLICT/);
});
test('snapshot compression round trips exact integer strings',()=>{
 const data={version:1,block:123,cutoff:1792955619.1,amount:'123456789012345678901234567890'};
 const encoded=encodeSnapshot('report',data);assert.deepEqual(JSON.parse(gunzipSync(Buffer.from(encoded.body,'base64'))),data);
 assert.throws(()=>encodeSnapshot('unknown',data),/INVALID_REALTIME_SNAPSHOT/);
});
test('core snapshots and acknowledgement are one transaction and cannot move backwards',async()=>{
 const statements=[],sql={query:(q,p)=>{statements.push({q,p});return {q,p};},transaction:async qs=>{assert.equal(qs.length,3);throw Error('COMMIT_FAILED');}};
 await assert.rejects(publishRealtime(['report','addresses'].map(kind=>({kind,data:{block:123,cutoff:100}})),{processedBlock:123,sql}),/COMMIT_FAILED/);
 assert(statements.slice(0,2).every(x=>x.q.includes('excluded.block>=esim_realtime_snapshots.block')));
 assert.match(statements[2].q,/greatest\(processed_block/);
});
test('worker coalesces duplicates, processes later events and recovers without notifications',()=>{
 const x={now:1000000,lastRun:1000000-FAST_INTERVAL,cutoff:990,pendingBlock:123,block:123};
 assert.equal(refreshNeeded(x),false);
 assert.equal(refreshNeeded({...x,pendingBlock:124}),true);
 assert.equal(refreshNeeded({...x,lastRun:999999,pendingBlock:124}),false);
 assert.equal(refreshNeeded({...x,cutoff:(x.now-FALLBACK_INTERVAL)/1000}),true);
 assert.equal(refreshNeeded({...x,lastRun:0}),true);
});
test('first-run RPC failure is not hidden by a missing checkpoint',async()=>{
 await assert.rejects(refreshCheckpoint({refresh:async()=>{throw Error('RPC_CAPACITY_EXCEEDED');},read:async()=>assert.fail('must preserve RPC error before reading missing file')}),/RPC_CAPACITY_EXCEEDED/);
 await assert.rejects(refreshCheckpoint({refresh:async()=>{throw Error('QUERY_LIMIT');},read:async()=>{throw Error('ENOENT');}}),/QUERY_LIMIT/);
});
test('only an advancing verified partial checkpoint can be published after budget exhaustion',async()=>{
 const state={version:1,token:TOKEN,source:SOURCE,block:124,blockHash:'0x'+'a'.repeat(64),cutoff:1000};
 const opts={refresh:async()=>{throw Error('QUERY_LIMIT');},read:async()=>gzipSync(JSON.stringify(state)),block:123};
 assert.deepEqual(await refreshCheckpoint(opts),{state,partial:true});
 await assert.rejects(refreshCheckpoint({...opts,block:124}),/QUERY_LIMIT/);
 await assert.rejects(refreshCheckpoint({...opts,refresh:async()=>{throw Error('SOURCE_INFLOW_CHECKPOINT_CHANGED');}}),/SOURCE_INFLOW_CHECKPOINT_CHANGED/);
});
test('session health rejects failed, missing or stale output even when handoff succeeded',()=>{
 const opts={failures:new Set(),cutoff:10000,holderCutoff:9999,now:10000001};
 assert.doesNotThrow(()=>assertRealtimeHealthy(opts));
 assert.throws(()=>assertRealtimeHealthy({...opts,failures:new Set(['core-refresh'])}),/SNAPSHOT_UPDATE_FAILED/);
 assert.throws(()=>assertRealtimeHealthy({...opts,holderCutoff:0}),/SNAPSHOT_STALE/);
 assert.throws(()=>assertRealtimeHealthy({...opts,holderCutoff:8000}),/SNAPSHOT_STALE/);
});
const snapshot=block=>({version:1,block,cutoff:Date.now()/1000,token:'0x7765a659c5b0cfbfd9fbc2ef2298b75a598f2d2d',windows:{}});
test('fresh realtime source avoids large fallback fetches',async()=>{
 let calls=0;const result=await readSnapshot('report',{realtime:true,fetch:async url=>{calls++;assert.match(url,/api\/esim-snapshot/);return {ok:true,json:async()=>snapshot(123)};}});
 assert.equal(result.data.block,123);assert.equal(result.source,'realtime');assert.equal(calls,1);
});
test('realtime outage preserves original independently published fallback',async()=>{
 const result=await readSnapshot('report',{realtime:true,fetch:async url=>{if(url.includes('/api/'))throw Error('DB_DOWN');return {ok:true,json:async()=>snapshot(url.includes('raw.githubusercontent')?124:123)};}});
 assert.equal(result.data.block,124);assert.equal(result.source,'background');
});
test('a stale realtime answer never replaces a newer published checkpoint',async()=>{
 const result=await readSnapshot('report',{realtime:true,fetch:async url=>({ok:true,json:async()=>url.includes('/api/')?{...snapshot(122),cutoff:1}:snapshot(124)})});
 assert.equal(result.data.block,124);
});
