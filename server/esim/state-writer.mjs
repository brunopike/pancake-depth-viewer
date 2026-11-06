import {createWriteStream} from 'node:fs';
import {mkdir,rename,rm} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGzip} from 'node:zlib';

const jsonValue=(value,key)=>typeof value?.toJSON==='function'?value.toJSON(key):value;
const omitted=value=>['undefined','function','symbol'].includes(typeof value);
// Provenance now contains large nested arrays too; never stringify a whole container.
function* pieces(value,parents=new Set()){
 if(value===null||typeof value!=='object'){yield JSON.stringify(value);return;}
 // Flat ledger rows are small; serialize them together, never a large container.
 const prototype=Object.getPrototypeOf(value);
 if((prototype===Object.prototype||prototype===null)&&!('toJSON' in value)){
  const keys=Object.keys(value);
  if(keys.length<=32&&keys.every(key=>{const d=Object.getOwnPropertyDescriptor(value,key);return key.length<=2048&&d&&'value' in d&&(d.value===null||['string','number','boolean','undefined'].includes(typeof d.value))&&(typeof d.value!=='string'||d.value.length<=2048);})){yield JSON.stringify(value);return;}
 }
 if(parents.has(value))throw TypeError('Circular checkpoint');
 parents.add(value);
 try{
  if(Array.isArray(value)){
   yield '[';for(let i=0;i<value.length;i++){if(i)yield ',';const item=jsonValue(value[i],String(i));yield* pieces(omitted(item)?null:item,parents);}yield ']';
  }else{
   yield '{';let first=true;
   for(const key of Object.keys(value)){const item=jsonValue(value[key],key);if(omitted(item))continue;if(!first)yield ',';first=false;yield JSON.stringify(key)+':';yield* pieces(item,parents);}
   yield '}';
  }
 }finally{parents.delete(value);}
}
export function* checkpointChunks(state){
 let parts=[],size=0;
 for(let part of pieces(jsonValue(state,''))){
  if(size+part.length>65536&&size){yield parts.join('');parts=[];size=0;}
  while(part.length>65536){let end=65536;if(/[\uD800-\uDBFF]/.test(part[end-1])&&/[\uDC00-\uDFFF]/.test(part[end]))end--;yield part.slice(0,end);part=part.slice(end);}
  parts.push(part);size+=part.length;
  if(size>=65536){yield parts.join('');parts=[];size=0;}
 }
 if(parts.length)yield parts.join('');
}
export async function writeCheckpoint(state,dir){
 await mkdir(dir,{recursive:true});const temp=`${dir}/state.tmp`;
 try{
  await pipeline(Readable.from(checkpointChunks(state),{objectMode:false}),createGzip({level:3}),createWriteStream(temp,{mode:0o600}));
  await rename(temp,`${dir}/state.json.gz`);
 }catch(error){await rm(temp,{force:true});throw error;}
}
