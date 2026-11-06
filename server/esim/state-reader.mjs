import {createReadStream} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Writable,Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGunzip} from 'node:zlib';
import parser from 'stream-json';
import Assembler from 'stream-json/assembler.js';
import filter from 'stream-json/filters/Filter.js';
import {checkpointParts} from './checkpoint-chunks.mjs';

// Avoid holding the entire inflated JSON and its UTF-16 copy alongside the ledger.
async function parse(source,metadataOnly=false){
 const assembler=new Assembler();
 await pipeline(source,createGunzip(),parser({streamKeys:false,streamStrings:false,streamNumbers:false}),...(metadataOnly?[filter.asStream({filter:/^(?:version|token|source|block|blockHash|cutoff|format|bytes|sha256|parts)$/,acceptObjects:true})]:[]),new Writable({objectMode:true,write(token,encoding,done){
  try{if(assembler[token.name])assembler[token.name](token.value);done();}catch(error){done(error);}
 }}));
 if(!assembler.done||!assembler.current||Array.isArray(assembler.current))throw Error('INVALID_CHECKPOINT');
 return assembler.current;
}
export async function readCheckpoint(file,{loadPart,metadataOnly=false}={}){
 const local=typeof file==='string'||file instanceof URL,value=await parse(local?createReadStream(file):file,metadataOnly);
 if(value.format!=='esim-gzip-chunks-v1')return value;
 if(!loadPart&&local){const root=dirname(file instanceof URL?fileURLToPath(file):file);loadPart=path=>readFile(resolve(root,path));}
 if(!loadPart)throw Error('CHECKPOINT_PARTS_UNAVAILABLE');
 return parse(Readable.from(checkpointParts(value,loadPart),{objectMode:false}),metadataOnly);
}
