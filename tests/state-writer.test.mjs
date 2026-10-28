import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {checkpointChunks,writeCheckpoint} from '../server/esim/state-writer.mjs';

test('chunked checkpoints preserve every JSON field and ledger row exactly',async()=>{
 const state={version:1,empty:[],omitted:undefined,unicode:'地址\n"\\',number:1.234e-20,missing:[undefined,null,,NaN],metadata:{value:'123456789012345678901234567890'},trades:Array.from({length:20000},(_,i)=>({id:i,amount_wei:String(BigInt(i)*10n**18n),side:i%2?'sell':'buy'}))};
 const chunks=[...checkpointChunks(state)];assert(chunks.length>5);assert(chunks.every(x=>x.length<66000));
 const expected=JSON.stringify(state);assert.equal(chunks.join(''),expected);
 const dir=await mkdtemp(join(tmpdir(),'esim-checkpoint-'));
 try{
  await writeCheckpoint(state,dir);
  assert.equal(gunzipSync(await readFile(join(dir,'state.json.gz'))).toString(),expected);
  await assert.rejects(writeCheckpoint({rows:[{invalid:1n}]},dir));
  assert.equal(gunzipSync(await readFile(join(dir,'state.json.gz'))).toString(),expected,'failed write must preserve last complete checkpoint');
 }finally{await rm(dir,{recursive:true,force:true});}
});
