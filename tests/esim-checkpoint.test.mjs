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
