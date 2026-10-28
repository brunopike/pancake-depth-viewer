import test from 'node:test';
import assert from 'node:assert/strict';
import {buildContractCohort} from '../server/esim/contract-cohort.mjs';
import {validCohort} from '../server/esim/cohort-validation.mjs';
import {verifyReturnTransaction,ESIM_STAKE_SELECTOR,ESIM_STAKE_EVENT} from '../server/esim/return-stakes.mjs';
import {TOKEN,SOURCE} from '../server/esim/metrics.mjs';
import {TRANSFER,topic} from '../server/esim/attribution.mjs';
import {renderCohort,filterCohort,cohortCSV} from '../src/report-cohort.mjs';
import {reportAmount} from '../src/report-number.mjs';
import {enrichClaimFlowSnapshot,validClaimFlow} from '../src/claim-flow-client.mjs';
const a=n=>'0x'+n.toString(16).padStart(40,'0'),h=n=>'0x'+n.toString(16).padStart(64,'0'),word=n=>BigInt(n).toString(16).padStart(64,'0');
function cohort(){
 const transfer=(id,from,to,value)=>({id:String(id),order:[id,0,0],tx:h(id),from,to,value:String(value)});
 return buildContractCohort({state:{source:SOURCE,block:99,blockHash:h(99),cutoff:100,calls:[{from:a(1)}],distributions:[{recipient:a(1)}]},transfers:[transfer(1,a(1),a(2),50),transfer(2,a(2),a(3),20),transfer(3,a(3),a(1),5),transfer(4,a(1),a(90),1),transfer(5,a(90),a(4),1)],marketAddresses:[a(90)],openingBalances:{},closingBalances:{[a(1)]:'100',[a(2)]:'30',[a(3)]:'15'},sourceBalances:{[a(1)]:'5',[a(2)]:'20',[a(3)]:'15'},returnedFlows:[{id:'8',source_wei:'20'},{id:'9',source_wei:'7'}],returnStakes:[{id:'8',address:a(2),tx:h(8),value_wei:'50',verifiedStake:true},{id:'9',address:a(2),tx:h(9),value_wei:'10',verifiedStake:false}]});
}
test('cohort deduplicates roots and cycles, stops at market boundaries and separates wallet stocks from source estimates and staking flows',()=>{
 const c=cohort();assert.equal(c.addressCount,3);assert.equal(c.directCount,1);assert.equal(c.downstreamCount,2);assert.equal(c.balance_wei,'145');assert.equal(c.source_balance_wei,'40');assert.equal(c.stake_wei,'50');assert.equal(c.source_stake_wei,'20');assert.equal(c.other_return_wei,'10');assert.equal(c.rows.find(r=>r.address===a(3)).via,a(2));assert(validCohort(c,c));
 for(const patch of [{balance_wei:'146'},{rows:[...c.rows,c.rows[0]]},{source_balance_wei:'146'},{downstreamCount:3},{rows:c.rows.map(r=>({...r,source_balance_wei:'999'}))}])assert(!validCohort({...c,...patch},c));
 assert(!validCohort(c,{...c,throughBlock:100}));
});
function proof(){
 const e={id:h(1)+':0x0',tx:h(1),blockHash:h(99),order:[99,0,0],from:a(1),to:SOURCE,value:'50'};
 const transfer={address:TOKEN,transactionHash:h(1),logIndex:'0x0',topics:[TRANSFER,topic(a(1)),topic(SOURCE)],data:'0x'+word(50)};
 const stake={address:SOURCE,topics:[ESIM_STAKE_EVENT,topic(a(1))],data:'0x'+word(50)+word(1)};
 const tx={hash:h(1),blockHash:h(99),to:SOURCE,from:a(1),value:'0x0',input:ESIM_STAKE_SELECTOR+word(50)+word(0)+word(100)+word(0)};
 return {e,tx,receipt:{transactionHash:h(1),blockHash:h(99),blockNumber:'0x63',status:'0x1',logs:[transfer,stake]}};
}
test('staking requires matching successful call, event and actual ESIM return',()=>{
 const {e,tx,receipt}=proof();assert(verifyReturnTransaction([e],receipt,tx)[0].verifiedStake);
 assert(!verifyReturnTransaction([e],{...receipt,logs:receipt.logs.slice(0,1)},tx)[0].verifiedStake);
 assert(!verifyReturnTransaction([e],receipt,{...tx,input:'0x4060e257'})[0].verifiedStake);
 assert(!verifyReturnTransaction([e],receipt,{...tx,value:'0x1'})[0].verifiedStake);
 assert.throws(()=>verifyReturnTransaction([e],{...receipt,status:'0x0'},tx),/MISMATCH/);
 assert.throws(()=>verifyReturnTransaction([{...e,value:'51'}],receipt,tx),/MISMATCH/);
});
test('internal staking only counts a successful trace and does not inherit a failed ancestor',()=>{
 const {e,tx,receipt}=proof(),outer={...tx,to:a(9)},trace={type:'call',traceAddress:[0,0],action:{from:a(1),to:SOURCE,input:tx.input,value:'0x0'}};
 assert(!verifyReturnTransaction([e],receipt,outer)[0].verifiedStake);
 assert(verifyReturnTransaction([e],receipt,outer,[trace])[0].verifiedStake);
 assert(!verifyReturnTransaction([e],receipt,outer,[{type:'call',traceAddress:[0],error:'reverted'},trace])[0].verifiedStake);
});
test('report uses full exact decimal numbers; cohort table filters and export contain every selected full address',()=>{
 assert.equal(reportAmount('1000000000000000000000000000'),'1,000,000,000.00');assert.equal(reportAmount('1999999999999999999'),'2.00');assert.equal(reportAmount('-1250000000000000000'),'−1.25');
 const c=cohort(),html=renderCohort(c,110);assert(!html.includes('万'));assert(html.includes('不是当前锁仓余额'));assert(html.includes('不能再相加'));assert(html.includes('早于页面交易时间'));
 assert.equal(filterCohort(c,{role:'downstream'}).length,2);assert.equal(filterCohort(c,{search:a(3)}).length,1);assert.equal(filterCohort(c,{sort:'stake_wei'})[0].address,a(2));const csv=cohortCSV(c.rows);for(const r of c.rows)assert(csv.includes(r.address));assert.equal(csv.split('\r\n').length,4);
});
test('cohort snapshot is accepted only with reconciled rows at the same source block and never regresses newer evidence',()=>{
 const c=cohort(),flow={version:1,modelRevision:4,method:'proportional-v1',token:TOKEN,source:SOURCE,throughBlock:99,blockHash:h(99),cutoff:100,sales:[],unconfirmedFlows:[],cohort:c},snapshot={version:1,block:100,blockHash:h(100),cutoff:110,token:TOKEN,source:SOURCE,windows:{history:{start:0,end:110}}};
 assert(validClaimFlow(flow,snapshot));assert.equal(enrichClaimFlowSnapshot('report',snapshot,flow).cohort,c);
 assert(!validClaimFlow({...flow,cohort:{...c,balance_wei:'999'}},snapshot));
 const newer={...c,throughBlock:100};assert.equal(enrichClaimFlowSnapshot('report',{...snapshot,cohort:newer},flow).cohort,newer);
});
