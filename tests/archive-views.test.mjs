import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {saveState} from '../server/esim/store.mjs';
import {writeCheckpoint} from '../server/esim/state-writer.mjs';
import {readCheckpoint} from '../server/esim/state-reader.mjs';
import {prepareArchiveViews,readArchiveViews,readArchiveState} from '../server/esim/archive-views.mjs';
import {createHash} from 'node:crypto';
import {TOKEN,SOURCE} from '../server/esim/metrics.mjs';

test('prepared archive retains the exact views and is tied to all checkpoint bytes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'esim-archive-views-')),dir=join(root,'views'),checkpointFile=join(root,'state.json.gz');
 const state={version:1,token:TOKEN,source:SOURCE,block:10,blockHash:'0x'+'a'.repeat(64),cutoff:100,trades:[{amount:'123'}],distributions:[{amount:'456'}]};
 const generatedAt=Date.now()/1000,report={version:1,token:state.token,source:state.source,block:state.block,blockHash:state.blockHash,cutoff:state.cutoff,generatedAt,windows:{today:{bought_wei:'123'}}};
 const addresses={version:1,block:state.block,blockHash:state.blockHash,cutoff:state.cutoff,generatedAt,rows:[{address:'unchanged',amount:'123'}]};
 try{
  const checkpointIdentity=await saveState(state,root),bytes=await readFile(checkpointFile);
  assert.deepEqual(checkpointIdentity,{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  const read=await readArchiveState(checkpointFile);assert.deepEqual(read.state,state);assert.deepEqual(read.checkpointIdentity,checkpointIdentity);
  assert.equal(await readArchiveViews(bytes,{dir}),null,'missing cache retains full-build fallback');
  await prepareArchiveViews(state,report,addresses,{dir,checkpointIdentity});
  const cached=await readArchiveViews(bytes,{dir});
  assert.deepEqual(cached.report,report);assert.deepEqual(cached.addresses,addresses);
  assert.deepEqual(cached.counts,{trades:1,distributions:1});
  assert.equal(cached.state.blockHash,state.blockHash);
  assert.equal(await readArchiveViews(bytes,{dir,now:generatedAt+86400}),null,'Beijing day rollover rebuilds the window views');
  await saveState({...state,trades:[{amount:'999'}]},root);
  await prepareArchiveViews(state,report,addresses,{dir,checkpointIdentity});
  assert.equal(await readArchiveViews(await readFile(checkpointFile),{dir}),null,'same block/hash but revised ledger bytes cannot reuse old views');
  const stored=await readCheckpoint(join(dir,'state.json.gz'));
  await writeCheckpoint({...stored,producer:'previous-code-release'},dir);
  assert.equal(await readArchiveViews(bytes,{dir}),null,'another release cannot reuse old report algorithms');
  stored.addresses.cutoff++;await writeCheckpoint(stored,dir);
  assert.equal(await readArchiveViews(bytes,{dir}),null,'mixed pinned views cannot be archived');
  await writeFile(join(dir,'state.json.gz'),'interrupted or corrupt cache');
  assert.equal(await readArchiveViews(bytes,{dir}),null,'corrupt optimization cache retains full-build fallback');
 }finally{await rm(root,{recursive:true,force:true});}
});
