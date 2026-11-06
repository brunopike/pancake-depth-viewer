import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildReport} from '../server/esim/metrics.mjs';
import {buildAddressReport} from '../server/esim/addresses.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/report-context.json',import.meta.url),'utf8'));
const wire=value=>JSON.parse(JSON.stringify(value));
function counted(rows){let count=0;const iterate=rows[Symbol.iterator].bind(rows);rows[Symbol.iterator]=function(){count++;return iterate();};return()=>count;}

test('one report reuses caller history across all windows without changing its wire output',()=>{
 const state=structuredClone(fixture.state),passes=counted(state.calls);
 const report=buildReport(state,fixture.now);
 assert.deepEqual(wire(report),fixture.report);
 assert.equal(report.windows.history.bnb.balance_start_wei,'40');
 assert.equal(report.windows.history.bnb.balance_end_wei,'100');
 assert.equal(passes(),1);
});

test('one address report reuses sale history but keeps each window and subsequent invocation independent',()=>{
 const state=structuredClone(fixture.state),passes=counted(state.claimFlow.sales);
 assert.deepEqual(wire(buildAddressReport(state,fixture.now)),fixture.addresses);
 assert.equal(passes(),1);
 state.claimFlow.sales[0].timestamp=fixture.now+1;
 assert.notDeepEqual(wire(buildAddressReport(state,fixture.now)),fixture.addresses);
});
