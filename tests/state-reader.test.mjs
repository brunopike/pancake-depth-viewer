import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,readdir} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {constants} from 'node:buffer';
import {pipeline} from 'node:stream/promises';
import {join,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {gzipSync,createGzip} from 'node:zlib';
import {Readable} from 'node:stream';
import {readCheckpoint} from '../server/esim/state-reader.mjs';
import {readState,readStateMetadata} from '../server/esim/store.mjs';
import {refreshCheckpoint} from '../scripts/esim/realtime-worker.mjs';
import {TOKEN,SOURCE} from '../server/esim/metrics.mjs';
test('checkpoint parser imports match the installed Linux filenames exactly',async()=>{
 const source=await readFile(new URL('../server/esim/state-reader.mjs',import.meta.url),'utf8');
 for(const [,specifier]of source.matchAll(/from ['"](stream-json[^'"]*)/g)){
  const file=fileURLToPath(import.meta.resolve(specifier));assert((await readdir(dirname(file))).includes(basename(file)),specifier);
 }
});
test('streamed checkpoint reads preserve JSON values and reject incomplete input',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-stream-')),file=join(dir,'state.gz');
 try{
  const value={unicode:'地址😀\\\"',number:1.234e-20,nullable:null,flag:true,metadata:{nested:[{},[],false]},rows:Array.from({length:20000},(_,i)=>({i,amount:String(BigInt(i)*10n**18n)}))};
  await writeFile(file,gzipSync(JSON.stringify(value)));assert.deepEqual(await readCheckpoint(file),value);
  assert.deepEqual(await readCheckpoint(Readable.fromWeb(new Response(gzipSync(JSON.stringify(value))).body)),value);
  await writeFile(file,gzipSync('{"rows":[1,2'));await assert.rejects(readCheckpoint(file));
  await writeFile(file,gzipSync('[1,2]'));await assert.rejects(readCheckpoint(file),/INVALID_CHECKPOINT/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('fallback and rollback metadata stream valid checkpoints beyond the Node string limit',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-large-reader-')),file=join(dir,'state.gz'),state={version:1,token:TOKEN,source:SOURCE,block:124,blockHash:'0x'+'a'.repeat(64),cutoff:1000};
 try{
  const padding=Buffer.alloc(65536,32);
  async function* pieces(){for(let left=constants.MAX_STRING_LENGTH+1;left>0;left-=padding.length)yield padding.subarray(0,Math.min(left,padding.length));yield JSON.stringify(state);}
  await pipeline(Readable.from(pieces()),createGzip({level:1}),createWriteStream(file));
  assert.deepEqual(await refreshCheckpoint({refresh:async()=>{},read:()=>readState(file),block:123}),{state,partial:false});
  assert.deepEqual(await readStateMetadata(file),state);
  await writeFile(file,gzipSync(JSON.stringify({...state,rows:[{block:999,version:42}],nested:{secret:'discard'}})));
  assert.deepEqual(await readStateMetadata(file),state);
  await writeFile(file,gzipSync(JSON.stringify({...state,token:'wrong'})));await assert.rejects(readStateMetadata(file),/INVALID_CHECKPOINT/);
  await writeFile(file,gzipSync(JSON.stringify(state).slice(0,-1)+',"ignored":['));await assert.rejects(readStateMetadata(file));
 }finally{await rm(dir,{recursive:true,force:true});}
});
