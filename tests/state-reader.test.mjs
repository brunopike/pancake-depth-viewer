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
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
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

test('checkpoint records retain JSON number and property edge cases',async()=>{
 const json='{"rows":[{"__proto__":{"safe":true},"negative":-0,"overflow":1e309,"unicode":"\\ud800","tuple":[-0,1e309,null]},{"address":"0x'+'a'.repeat(40)+'","value":"'+'x'.repeat(2049)+'"}],"duplicate":1,"duplicate":2}',dir=await mkdtemp(join(tmpdir(),'esim-record-values-')),file=join(dir,'state.gz');
 try{
  await writeFile(file,gzipSync(json));assert.deepEqual(await readCheckpoint(file),JSON.parse(json));
  const compact='{"rows":[{"__proto__":"own","unicode":"\\ud800","tuple":[true,null,42,"\\udfff"]}]}';
  await writeFile(file,gzipSync(compact));assert.deepEqual(await readCheckpoint(file),JSON.parse(compact));
 }
 finally{await rm(dir,{recursive:true,force:true});}
});

test('wide ledger records load within a bounded 128 MiB heap',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-reader-memory-')),file=join(dir,'state.gz'),count=100005;
 try{
  async function* pieces(){
   yield '{"rows":[';
   for(let i=0;i<count;i++){
    if(i)yield ',';
    yield JSON.stringify({address:'0x'+i.toString(16).padStart(40,'0'),...Object.fromEntries(Array.from({length:24},(_,k)=>['k'+k,i+k]))});
   }
   yield ']}';
  }
  await pipeline(Readable.from(pieces()),createGzip({level:1}),createWriteStream(file));
  const script=`import {readCheckpoint} from ${JSON.stringify(new URL('../server/esim/state-reader.mjs',import.meta.url).href)};import assert from 'node:assert/strict';const s=await readCheckpoint(process.argv[1]);assert.equal(s.rows.length,${count});for(const [i,r]of s.rows.entries()){assert.equal(r.address,'0x'+i.toString(16).padStart(40,'0'));assert.equal(r.k23,i+23);}console.log('verified');`;
  const {stdout}=await promisify(execFile)(process.execPath,['--max-old-space-size=128','--input-type=module','-e',script,file],{timeout:60000,maxBuffer:65536});
  assert.equal(stdout.trim(),'verified');
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
