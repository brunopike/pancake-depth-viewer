import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {gzipSync,createGzip} from 'node:zlib';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readCheckpoint} from '../server/esim/state-reader.mjs';
import {loadState} from '../server/esim/store.mjs';
import {TOKEN,SOURCE} from '../server/esim/metrics.mjs';
import {remoteBootstrapNeeded,runCorePass} from '../scripts/esim/vm-worker.mjs';

const hash='0x'+'1'.repeat(64);
const state={version:1,token:TOKEN,source:SOURCE,block:123,blockHash:hash,cutoff:200,trades:[{amount_wei:'7'}]};
const flow={version:1,method:'proportional-v1',token:TOKEN,source:SOURCE,throughBlock:123,blockHash:hash,cutoff:200,sales:[],unconfirmedFlows:[],totals:{issued_wei:'7',sold_wei:'0',direct_wei:'0',relay_wei:'0',unconfirmed_pool_wei:'0',remaining_wei:'7',returned_wei:'0',burned_wei:'0'}};

test('checkpoint views separate provenance without deleting ledger fields or nested names',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-flow-views-')),file=join(dir,'state.gz');
 const value={...state,nested:{claimFlow:'retain nested field'},claimFlow:flow};
 try{
  await writeFile(file,gzipSync(JSON.stringify(value)));
  assert.deepEqual(await readCheckpoint(file,{deferClaimFlow:true}),{...state,nested:{claimFlow:'retain nested field'},claimFlow:{throughBlock:123}});
  assert.deepEqual(await readCheckpoint(file,{claimFlowOnly:true}),{version:1,token:TOKEN,source:SOURCE,block:123,blockHash:hash,cutoff:200,claimFlow:flow});
  assert.deepEqual(await readCheckpoint(file),value);
  await writeFile(file,gzipSync(JSON.stringify(value).slice(0,-1)));
  await assert.rejects(readCheckpoint(file,{deferClaimFlow:true}));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('omitted provenance falls back to the verified disk copy on invalid or future remote evidence',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-flow-fallback-')),file=join(dir,'state.gz');
 try{
  await writeFile(file,gzipSync(JSON.stringify({...state,claimFlow:flow})));
  const load=fetch=>loadState({currentState:state,includeRemoteCore:false,claimFlowCheckpointFile:file,fetch});
  for(const fetch of [async()=>new Response('invalid gzip'),async()=>new Response(gzipSync(JSON.stringify({...flow,throughBlock:124})))]){
   const loaded=await load(fetch);assert.equal(loaded.trades,state.trades);assert.deepEqual(loaded.claimFlow,flow);
  }
  const deferred=await readCheckpoint(file,{deferClaimFlow:true});
  const older=await loadState({currentState:deferred,includeRemoteCore:false,claimFlowCheckpointFile:file,fetch:async()=>new Response(gzipSync(JSON.stringify({...flow,throughBlock:122,cutoff:199})))});
  assert.deepEqual(older.claimFlow,flow,'older remote provenance must not replace the verified disk prefix');
  const newer={...flow,modelRevision:2};
  const loaded=await loadState({currentState:state,includeRemoteCore:false,claimFlowCheckpointFile:join(dir,'missing'),fetch:async()=>new Response(gzipSync(JSON.stringify(newer)))});
  assert.deepEqual(loaded.claimFlow,newer);assert.equal(loaded.trades,state.trades);
  await writeFile(file,gzipSync('{"version":1'));
  await assert.rejects(load(async()=>new Response('bad')),/WORKER_FLOW_CHECKPOINT_UNAVAILABLE/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('large superseded provenance is streamed past within a 64 MiB heap',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-flow-memory-')),file=join(dir,'state.gz');
 try{
  async function* pieces(){
   yield JSON.stringify(state).slice(0,-1)+',"claimFlow":{"throughBlock":123,"sales":[';
   const row=JSON.stringify({address:'0x'+'a'.repeat(40),evidence:'x'.repeat(1024)});
   for(let i=0;i<100000;i++)yield(i?',':'')+row;
   yield ']}}';
  }
  await pipeline(Readable.from(pieces()),createGzip({level:1}),createWriteStream(file));
  const script=`import {readCheckpoint} from ${JSON.stringify(new URL('../server/esim/state-reader.mjs',import.meta.url).href)};import assert from 'node:assert/strict';const s=await readCheckpoint(process.argv[1],{deferClaimFlow:true});assert.deepEqual(s,${JSON.stringify({...state,claimFlow:{throughBlock:123}})});console.log('verified');`;
  const {stdout}=await promisify(execFile)(process.execPath,['--max-old-space-size=64','--input-type=module','-e',script,file],{timeout:60000,maxBuffer:65536});
  assert.equal(stdout.trim(),'verified');
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('restart catches up from local evidence without loading a second whole ledger or publishing below remote tip',async()=>{
 assert.equal(remoteBootstrapNeeded({first:true,hasCheckpoint:true,block:100,remoteBlock:300}),false);
 assert.equal(remoteBootstrapNeeded({first:true,hasCheckpoint:false,block:0,remoteBlock:300}),true);
 const calls=[];
 await runCorePass(async(file,args,options)=>{calls.push({file,options});if(calls.length===1)throw Error('QUERY_LIMIT');},{remote:true,bootstrap:false,block:100,minimumBlock:300});
 assert.equal(calls[0].options.extra.ESIM_MIN_BLOCK,'300');
 assert.equal(calls[1].options.extra.ESIM_MIN_BLOCK,'300');
});
