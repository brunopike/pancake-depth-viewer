import {createReadStream} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Writable,Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGunzip} from 'node:zlib';
import parser from 'stream-json';
import Assembler from 'stream-json/assembler.js';
import filter from 'stream-json/filters/filter.js';
import {checkpointParts} from './checkpoint-chunks.mjs';

// Avoid holding the entire inflated JSON and its UTF-16 copy alongside the ledger.
async function parse(source,{metadataOnly=false,deferClaimFlow=false,claimFlowOnly=false}={}){
 const assembler=new Assembler(),addresses=new Map();
 const scalar=value=>value===null||typeof value==='boolean'||typeof value==='string'&&value.length<=2048||typeof value==='number'&&Number.isFinite(value)&&!Object.is(value,-0);
 const compact=value=>{
  const keys=Object.keys(value);
  if(keys.length>32||!keys.every(key=>key.length<=2048&&(scalar(value[key])||Array.isArray(value[key])&&value[key].length<=8&&value[key].every(scalar))))return value;
  // Native JSON records avoid dictionary-mode objects; never copy a large container.
  const row=JSON.parse(JSON.stringify(value));
  for(const key of keys){
   const address=row[key];
   if(typeof address!=='string'||!/^0x[0-9a-f]{40}$/i.test(address))continue;
   if(!addresses.has(address)){
    if(addresses.size>=100000)addresses.clear();
    addresses.set(address,address);
   }
   row[key]=addresses.get(address);
  }
  return row;
 };
 const fields=claimFlowOnly?/^(?:version|token|source|block|blockHash|cutoff|format|bytes|sha256|parts|claimFlow)$/:/^(?:version|token|source|block|blockHash|cutoff|format|bytes|sha256|parts)$/;
 // Retain only provenance ordering/source counters while its full replacement is read.
 const deferred=/^(?!claimFlow(?:\.|$)).+|^claimFlow\.(?:throughBlock|modelRevision|sourceInflow)$/;
 await pipeline(source,createGunzip(),parser({streamKeys:false,streamStrings:false,streamNumbers:false}),...(metadataOnly||claimFlowOnly?[filter.asStream({filter:fields,acceptObjects:true})]:[]),...(deferClaimFlow?[filter.asStream({filter:deferred,acceptObjects:true})]:[]),new Writable({objectMode:true,write(token,encoding,done){
  try{if(!metadataOnly&&token.name==='endObject')assembler.current=compact(assembler.current);if(assembler[token.name])assembler[token.name](token.value);done();}catch(error){done(error);}
 }}));
 if(!assembler.done||!assembler.current||Array.isArray(assembler.current))throw Error('INVALID_CHECKPOINT');
 return assembler.current;
}
export async function readCheckpoint(file,{loadPart,metadataOnly=false,deferClaimFlow=false,claimFlowOnly=false,onCompressedChunk}={}){
 const local=typeof file==='string'||file instanceof URL,input=local?createReadStream(file):file;
 const source=onCompressedChunk?Readable.from((async function*(){for await(const bytes of input){onCompressedChunk(bytes);yield bytes;}})(),{objectMode:false}):input;
 const view={metadataOnly,deferClaimFlow,claimFlowOnly},value=await parse(source,view);
 if(value.format!=='esim-gzip-chunks-v1')return value;
 if(!loadPart&&local){const root=dirname(file instanceof URL?fileURLToPath(file):file);loadPart=path=>readFile(resolve(root,path));}
 if(!loadPart)throw Error('CHECKPOINT_PARTS_UNAVAILABLE');
 return parse(Readable.from(checkpointParts(value,loadPart),{objectMode:false}),view);
}
