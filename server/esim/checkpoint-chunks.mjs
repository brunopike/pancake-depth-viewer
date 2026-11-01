import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function packCheckpointFiles(name,bytes,partSize=32*1024*1024){
 if(!['state.json.gz','claim-flow-state.json.gz'].includes(name)||!Buffer.isBuffer(bytes)||!Number.isSafeInteger(partSize)||partSize<1||partSize>32*1024*1024)throw Error('INVALID_CHECKPOINT_CHUNKS');
 if(bytes.length<=partSize*2)return [[name,bytes]];
 const files=[],parts=[];
 for(let offset=0;offset<bytes.length;offset+=partSize){
  const content=bytes.subarray(offset,offset+partSize),sha256=hash(content),path=`checkpoint-parts/${name}/${String(parts.length).padStart(4,'0')}-${sha256}.part`;
  parts.push({path,bytes:content.length,sha256});files.push([path,content]);
 }
 return [[name,gzipSync(JSON.stringify({format:'esim-gzip-chunks-v1',bytes:bytes.length,sha256:hash(bytes),parts}))],...files];
}
export function validateCheckpointChunks(value){
 if(value?.format!=='esim-gzip-chunks-v1'||!Number.isSafeInteger(value.bytes)||value.bytes<1||!/^[0-9a-f]{64}$/.test(value.sha256)||!Array.isArray(value.parts)||!value.parts.length||value.parts.length>1024)throw Error('INVALID_CHECKPOINT_CHUNKS');
 const paths=new Set();let total=0;
 for(const [i,p]of value.parts.entries()){
  if(!/^checkpoint-parts\/(?:state|claim-flow-state)\.json\.gz\/\d{4}-[0-9a-f]{64}\.part$/.test(p.path)||!p.path.split('/').at(-1).startsWith(String(i).padStart(4,'0')+'-')||paths.has(p.path)||!Number.isSafeInteger(p.bytes)||p.bytes<1||p.bytes>32*1024*1024||!/^[0-9a-f]{64}$/.test(p.sha256)||!p.path.endsWith(p.sha256+'.part'))throw Error('INVALID_CHECKPOINT_CHUNKS');
  paths.add(p.path);total+=p.bytes;
 }
 if(total!==value.bytes)throw Error('INVALID_CHECKPOINT_CHUNKS');
 return value;
}
export async function* checkpointParts(manifest,load){
 validateCheckpointChunks(manifest);const digest=createHash('sha256');
 for(const part of manifest.parts){
  const bytes=Buffer.from(await load(part.path));
  if(bytes.length!==part.bytes||hash(bytes)!==part.sha256)throw Error('CHECKPOINT_PART_CHANGED');
  digest.update(bytes);yield bytes;
 }
 if(digest.digest('hex')!==manifest.sha256)throw Error('CHECKPOINT_PART_CHANGED');
}
