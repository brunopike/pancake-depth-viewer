import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotStatus} from '../src/snapshot-status.mjs';
test('the oldest dataset drives expiry and old data cannot be reported as a successful update',()=>{
 const now=1791918000000;
 const result=snapshotStatus([['交易',{cutoff:now/1000-7200}],['持仓',{cutoff:now/1000-60}]],{now});
 assert.equal(result.warning,true);assert.match(result.text,/快照已过期/);assert.match(result.text,/120 分钟/);assert.match(result.text,/交易截至/);assert.match(result.text,/持仓截至/);
});
test('missing and retained data are distinct from fresh complete snapshots',()=>{
 const now=1791918000000,entries=[['交易',{cutoff:now/1000-60}],['持仓',{cutoff:now/1000-60}]];
 assert.equal(snapshotStatus(entries,{now}).warning,false);
 assert.equal(snapshotStatus(entries,{now,retained:true}).warning,true);
 const missing=snapshotStatus([entries[0],['持仓',null]],{now});assert.equal(missing.warning,true);assert.match(missing.text,/持仓数据暂缺/);
});
