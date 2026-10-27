import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {gzipSync} from 'node:zlib';
import {join} from 'node:path';
import {loadState} from '../server/esim/store.mjs';
import {TOKEN,SOURCE} from '../server/esim/metrics.mjs';

test('workers use the checked out checkpoint without downloading the large state again',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-checkpoint-')),file=join(dir,'state.gz');
 const state={version:1,token:TOKEN,source:SOURCE,block:500000000,blockHash:'0x'+'1'.repeat(64)};
 try{
  await writeFile(file,gzipSync(JSON.stringify(state)));
  const result=await loadState({checkpointFile:file,fetch:async url=>{assert(!url.includes('state.json.gz'));return {ok:false};}});
  assert.equal(result.block,state.block);
  const currentFile=join(dir,'current.gz');await writeFile(currentFile,gzipSync(JSON.stringify({...state,block:state.block+1})));
  const current=await loadState({checkpointFile:file,currentCheckpointFile:currentFile,fetch:async()=>({ok:false})});
  assert.equal(current.block,state.block+1);
  await assert.rejects(loadState({checkpointFile:join(dir,'missing'),fetch:()=>assert.fail('must not fall back to bootstrap')}),/WORKER_CHECKPOINT_UNAVAILABLE/);
 }finally{await rm(dir,{recursive:true});}
});

test('checkpoint loads complete compressed claim evidence and falls back only during migration',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-compressed-flow-')),file=join(dir,'state.gz');
 const state={version:1,token:TOKEN,source:SOURCE,block:500000000,blockHash:'0x'+'1'.repeat(64),cutoff:200};
 const flow={version:1,method:'proportional-v1',token:TOKEN,source:SOURCE,throughBlock:state.block,blockHash:state.blockHash,cutoff:200,sales:[],unconfirmedFlows:[],totals:{issued_wei:'7',sold_wei:'0',direct_wei:'0',relay_wei:'0',unconfirmed_pool_wei:'0',remaining_wei:'7',returned_wei:'0',burned_wei:'0'}};
 try{
  await writeFile(file,gzipSync(JSON.stringify(state)));
  const result=await loadState({checkpointFile:file,fetch:async()=>new Response(gzipSync(JSON.stringify(flow)))});assert.deepEqual(result.claimFlow,flow);
  const calls=[],migrated=await loadState({checkpointFile:file,fetch:async url=>{calls.push(url);return url.endsWith('.gz')?new Response('',{status:404}):Response.json(flow);}});
  assert.deepEqual(migrated.claimFlow,flow);assert.equal(calls.length,2);
  await writeFile(file,gzipSync(JSON.stringify({...state,claimFlow:flow})));
  const retained=await loadState({checkpointFile:file,fetch:async()=>new Response('invalid gzip')});assert.deepEqual(retained.claimFlow,flow);
 }finally{await rm(dir,{recursive:true});}
});
