import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync} from 'node:zlib';
import {Readable} from 'node:stream';
import {readCheckpoint} from '../server/esim/state-reader.mjs';
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
