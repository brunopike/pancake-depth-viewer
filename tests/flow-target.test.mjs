import test from 'node:test';import assert from 'node:assert/strict';
import {flowTarget} from '../server/esim/flow-target.mjs';
const h=n=>'0x'+n.toString(16).padStart(64,'0');
test('bounded provenance recovery verifies and saves a complete prefix before advancing again',async()=>{
 const state={block:350,blockHash:h(350),cutoff:351,distributions:[{block:100},{block:200},{block:300}],trades:[{block:150},{block:250}]};
 const t={batch:async calls=>calls.map(([,p])=>{const n=Number(BigInt(p[0]));return {hash:h(n),parentHash:h(n-1),timestamp:'0x'+n.toString(16)};})};
 const prefix=await flowTarget(state,{throughBlock:150},t,100);assert.equal(prefix.block,250);assert.equal(prefix.blockHash,h(250));assert.equal(prefix.cutoff,251);assert.deepEqual(prefix.distributions,[{block:100},{block:200}]);assert.equal(state.block,350);
 assert.strictEqual(await flowTarget(state,{throughBlock:250},t,100),state);
 await assert.rejects(flowTarget(state,{throughBlock:150},{batch:async()=>[{hash:h(250)},{parentHash:h(2),timestamp:'0xfb'}]},100),/FLOW_BOUNDARY_CHANGED/);
 await assert.rejects(flowTarget(state,null,t,0),/INVALID_FLOW_WINDOW/);
});
