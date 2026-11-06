import test from 'node:test';import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join,dirname} from 'node:path';
import {Readable} from 'node:stream';
import {packCheckpointFiles,validateCheckpointChunks} from '../server/esim/checkpoint-chunks.mjs';
import {readCheckpoint} from '../server/esim/state-reader.mjs';
test('large gzip checkpoints round-trip through bounded parts and verify every byte',async()=>{
 const value={version:1,rows:Array.from({length:1000},(_,i)=>({i,amount:String(BigInt(i)*10n**18n)}))},bytes=gzipSync(JSON.stringify(value)),files=packCheckpointFiles('state.json.gz',bytes,256),map=new Map(files),manifest=JSON.parse(gunzipSync(files[0][1]));
 assert(files.length>3);assert(files.slice(1).every(([,b])=>b.length<=256));assert.equal(validateCheckpointChunks(manifest),manifest);
 const load=path=>{assert(map.has(path));return map.get(path);};
 assert.deepEqual(await readCheckpoint(Readable.from([files[0][1]]),{loadPart:load}),value);
 assert.deepEqual(await readCheckpoint(Readable.from([files[0][1]]),{loadPart:load,metadataOnly:true}),{version:1});
 const dir=await mkdtemp(join(tmpdir(),'esim-chunks-'));
 try{for(const [path,data]of files){const file=join(dir,path);await mkdir(dirname(file),{recursive:true});await writeFile(file,data);}assert.deepEqual(await readCheckpoint(join(dir,'state.json.gz')),value);}
 finally{await rm(dir,{recursive:true,force:true});}
 const first=manifest.parts[0].path,mapBad=new Map(map);mapBad.set(first,Buffer.alloc(manifest.parts[0].bytes));
 await assert.rejects(readCheckpoint(Readable.from([files[0][1]]),{loadPart:path=>mapBad.get(path)}),/CHECKPOINT_PART_CHANGED/);
 await assert.rejects(readCheckpoint(Readable.from([files[0][1]]),{loadPart:path=>mapBad.get(path),metadataOnly:true}),/CHECKPOINT_PART_CHANGED/);
 assert.throws(()=>validateCheckpointChunks({...manifest,parts:[{...manifest.parts[0],path:'../secret'},...manifest.parts.slice(1)]}),/INVALID_CHECKPOINT_CHUNKS/);
 const last=manifest.parts.at(-1);await assert.rejects(readCheckpoint(Readable.from([files[0][1]]),{loadPart:path=>path===last.path?Buffer.alloc(0):load(path)}),/CHECKPOINT_PART_CHANGED/);
 assert.deepEqual(packCheckpointFiles('state.json.gz',bytes),[['state.json.gz',bytes]]);
});
