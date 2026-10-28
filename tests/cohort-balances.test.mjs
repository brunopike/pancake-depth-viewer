import test from 'node:test';import assert from 'node:assert/strict';import {cohortBalances} from '../server/esim/cohort-balances.mjs';
const transfer=(n,from,to,value)=>({id:String(n),tx:'tx'+n,order:[n,0,0],from,to,value:String(value)});
test('source flow pools conserve after cycles, mixed balances, repeated issue and market exits',()=>{
 const r=cohortBalances({source:'S',marketAddresses:['P'],openingBalances:{A:'100',B:'0'},transfers:[transfer(1,'S','A',100),transfer(2,'A','B',100),transfer(3,'B','S',50),transfer(4,'S','A',50),transfer(5,'B','P',50),transfer(6,'P','A',25)]});
 assert.deepEqual(r.closingBalances,{A:'175',B:'0'});assert.deepEqual(r.sourceBalances,{A:'100',B:'0'});assert.equal(r.returnedFlows[0].source_wei,'25');assert.deepEqual(r.conservation,{issued:'150',remaining:'100',returned:'25',pool:'25',burned:'0'});
});
test('full balance transfers preserve all source wei and underflow refuses publication',()=>{
 const r=cohortBalances({source:'S',marketAddresses:[],openingBalances:{A:'2',B:'0'},transfers:[transfer(1,'S','A',1),transfer(2,'A','B',3)]});assert.equal(r.sourceBalances.B,'1');
 assert.throws(()=>cohortBalances({source:'S',marketAddresses:[],openingBalances:{A:'0',B:'0'},transfers:[transfer(1,'A','B',1)]}),/UNDERFLOW/);
});
