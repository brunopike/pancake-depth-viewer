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

test('nested provenance arrays are emitted in bounded chunks without stringifying the whole object',()=>{
 const state={claimFlow:{version:1,sales:Array.from({length:20000},(_,i)=>({address:'0x'+String(i).padStart(40,'0'),amount_wei:String(BigInt(i)*10n**18n),examples:[{path:['source','relay'],confirmed:true}]})),totals:{issued_wei:'123456789012345678901234567890'}},longUnicode:'😀'.repeat(50000)};
 let count=0;const chunks=[];for(const chunk of checkpointChunks(state)){assert(chunk.length<66000);chunks.push(chunk);count++;}
 assert(count>20);assert.equal(chunks.join(''),JSON.stringify(state));
 const cycle={};cycle.self=cycle;assert.throws(()=>[...checkpointChunks(cycle)],/circular/i);
});

test('flat row acceleration preserves accessors, toJSON, omitted values and oversized strings',()=>{
 let reads=0;
 const row={a:1,b:undefined,c:NaN,d:()=>{},[Symbol('hidden')]:2};
 Object.defineProperty(row,'getter',{enumerable:true,get(){reads++;return reads;}});
 const converted={toJSON(){return {when:'converted',value:3};}};
 const longKey='😀'.repeat(40000),state={rows:[row,converted,Object.assign(Object.create(null),{n:4}),{[longKey]:'value'},{text:'😀'.repeat(40000)}]};
 const expected=JSON.stringify(state);reads=0;
 const chunks=[...checkpointChunks(state)];
 assert.equal(chunks.join(''),expected);
 assert.equal(reads,1);
 assert(chunks.every(c=>c.length<=65536));
});

test('custom scalar toJSON remains on the bounded recursive path',()=>{
 let reads=0;const rows=Array.from({length:20000},(_,i)=>({i,get value(){reads++;return 'amount';}}));
 const fn=()=>{};fn.toJSON=()=>({rows});
 const state={converted:fn},expected=JSON.stringify(state);reads=0;
 const iterator=checkpointChunks(state),first=iterator.next();
 assert(reads>0&&reads<rows.length,'first chunk must not traverse the whole custom container');
 const chunks=[first.value,...iterator];
 assert.equal(chunks.join(''),expected);
 assert(chunks.every(c=>c.length<=65536));
});

test('short row tuples preserve holes, accessors and custom array serialization',()=>{
 let reads=0;const accessed=[1,2];Object.defineProperty(accessed,'1',{get(){reads++;return 2;}});
 const custom=[1];custom.toJSON=()=>({rows:Array.from({length:20000},(_,i)=>({i}))});
 const state={rows:[{order:[1,,3]},{order:accessed},{order:custom},{order:Array(9).fill('value')}]};
 const expected=JSON.stringify(state);reads=0;
 const chunks=[...checkpointChunks(state)];
 assert.equal(chunks.join(''),expected);assert.equal(reads,1);assert(chunks.every(c=>c.length<=65536));
});

test('array holes cannot hide inherited large containers from the streaming writer',()=>{
 let reads=0;const payload={rows:Array.from({length:20000},(_,i)=>({get i(){reads++;return i;}}))};
 const prototype=Object.create(Array.prototype);prototype[0]=payload;
 const order=Array(1);Object.setPrototypeOf(order,prototype);
 const state={order},expected=JSON.stringify(state);reads=0;
 const iterator=checkpointChunks(state),first=iterator.next();
 assert(reads>0&&reads<20000);
 assert.equal([first.value,...iterator].join(''),expected);
});
