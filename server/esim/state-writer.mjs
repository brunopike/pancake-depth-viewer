import {createWriteStream} from 'node:fs';
import {mkdir,rename,rm} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGzip} from 'node:zlib';

// Checkpoints contain plain JSON records. Their large ledgers are top-level
// arrays: stringify one row at a time instead of allocating a second complete
// ledger string and UTF-8 buffer alongside the in-memory state.
function* pieces(state){
 yield '{';let first=true;
 for(const [key,value] of Object.entries(state)){
  const array=Array.isArray(value),encoded=array?null:JSON.stringify(value);
  if(!array&&encoded===undefined)continue;
  if(!first)yield ',';first=false;yield JSON.stringify(key)+':';
  if(!array){yield encoded;continue;}
  yield '[';
  for(let i=0;i<value.length;i++){if(i)yield ',';yield JSON.stringify(value[i])??'null';}
  yield ']';
 }
 yield '}';
}
export function* checkpointChunks(state){
 let parts=[],size=0;
 for(const part of pieces(state)){
  parts.push(part);size+=part.length;
  if(size>=65536){yield parts.join('');parts=[];size=0;}
 }
 if(parts.length)yield parts.join('');
}
export async function writeCheckpoint(state,dir){
 await mkdir(dir,{recursive:true});const temp=`${dir}/state.tmp`;
 try{
  await pipeline(Readable.from(checkpointChunks(state),{objectMode:false}),createGzip(),createWriteStream(temp,{mode:0o600}));
  await rename(temp,`${dir}/state.json.gz`);
 }catch(error){await rm(temp,{force:true});throw error;}
}
