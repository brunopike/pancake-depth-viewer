import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {backfillClassicTrades} from '../server/esim/classic-pools.mjs';
import {TOKEN} from '../server/esim/metrics.mjs';
import {V2,V3,TRANSFER,topic} from '../server/esim/attribution.mjs';
const sample=JSON.parse(await readFile(new URL('./fixtures/esim-receipts.json',import.meta.url)))[5];
const id=Object.keys(sample.pools).find(x=>x.length===42),block=Number(BigInt(sample.receipt.blockNumber));
function fixture({badReceipt=false,badCheckpoint=false,unknownPool=false}={}){
 const receipt=structuredClone(sample.receipt),events=receipt.logs.filter(e=>e.address===id&&(e.topics[0]===V2||V3.has(e.topics[0])));
 const state={block:block+10,blockHash:'checkpoint',pools:Object.fromEntries(Object.entries(sample.pools).filter(([p])=>p!==id)),firstRecipient:sample.firstRecipient,trades:[{...sample.expected[0],amount_wei:'1'},{tx:'untouched',block:1}]};
 const added={[id]:{...sample.pools[id],historyFrom:block}};
 if(badReceipt)receipt.blockHash='incorrect';
 if(unknownPool){
  const unknown='0x'+'ef'.repeat(20);
  receipt.logs.push({...events[0],address:unknown,logIndex:'0xffff'});
  const transfer=receipt.logs.find(e=>e.address.toLowerCase()===TOKEN&&e.topics[0]===TRANSFER);
  receipt.logs.push({...transfer,topics:[TRANSFER,transfer.topics[1],topic(unknown)],logIndex:'0xfffe'});
 }
 const calls=[];
 const rpc=async(method,params)=>{calls.push([method,params]);
  if(method==='eth_getLogs')return events;
  if(method==='eth_getTransactionReceipt')return receipt;
  if(method==='eth_getCode')return '0x';
  if(params[0]==='0x'+state.block.toString(16))return {hash:badCheckpoint?'changed':'checkpoint'};
  const transactions=[];transactions[Number(BigInt(receipt.transactionIndex))]=receipt.transactionHash;
  return {number:receipt.blockNumber,hash:sample.receipt.blockHash,timestamp:'0x'+Math.floor(sample.legs[0].timestamp).toString(16),transactions};
 };
 return {state,added,calls,transport:{rpc,batch:entries=>Promise.all(entries.map(([m,p])=>rpc(m,p)))}};
}
test('historical discovery replaces the whole affected transaction and is idempotent',async()=>{
 const f=fixture(),rows=await backfillClassicTrades(f.state,f.added,f.transport);
 const expected=sample.expected.map(t=>({...t,timestamp:Math.floor(t.timestamp),initiator:sample.receipt.from.toLowerCase(),executor:sample.receipt.to?.toLowerCase()||null}));
 assert.deepEqual(rows.filter(t=>t.tx===sample.tx),expected);
 assert.equal(rows.filter(t=>t.tx==='untouched').length,1);
 assert.deepEqual(await backfillClassicTrades({...f.state,trades:rows},f.added,f.transport),rows);
 assert.ok(f.calls.filter(([m])=>m==='eth_getCode').every(([,p])=>p[1]==='0x'+f.state.block.toString(16)));
});
test('historical backfill fails closed on receipt or checkpoint mismatch',async()=>{
 for(const option of [{badReceipt:true},{badCheckpoint:true}]){
  const f=fixture(option);await assert.rejects(()=>backfillClassicTrades(f.state,f.added,f.transport),/RECEIPT_CANONICAL|CHAIN_OR_CHECKPOINT_CHANGED/);
 }
});
test('new pools without earlier activity do not scan old blocks',async()=>{
 const f=fixture();f.added[id].historyFrom=null;
 assert.strictEqual(await backfillClassicTrades(f.state,f.added,f.transport),f.state.trades);
 assert.equal(f.calls.length,0);
});

test('historical receipt cannot silently omit another unknown ESIM pool',async()=>{
 const f=fixture({unknownPool:true});
 await assert.rejects(()=>backfillClassicTrades(f.state,f.added,f.transport),/NEW_ESIM_POOL_HISTORY_REQUIRES_BACKFILL/);
});
