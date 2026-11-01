import {createReadStream} from 'node:fs';
import {Writable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGunzip} from 'node:zlib';
import parser from 'stream-json';
import Assembler from 'stream-json/assembler.js';

// Avoid holding the entire inflated JSON and its UTF-16 copy alongside the ledger.
export async function readCheckpoint(file){
 const assembler=new Assembler();
 await pipeline(typeof file==='string'||file instanceof URL?createReadStream(file):file,createGunzip(),parser({streamKeys:false,streamStrings:false,streamNumbers:false}),new Writable({objectMode:true,write(token,encoding,done){
  try{if(assembler[token.name])assembler[token.name](token.value);done();}catch(error){done(error);}
 }}));
 if(!assembler.done||!assembler.current||Array.isArray(assembler.current))throw Error('INVALID_CHECKPOINT');
 return assembler.current;
}
