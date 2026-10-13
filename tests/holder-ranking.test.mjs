import test from 'node:test';
import assert from 'node:assert/strict';
import {rankHolderRows} from '../src/holder-ranking.mjs';
import {selectHolders} from '../src/holder-model.mjs';
import {holderCharts} from '../src/holder-charts.mjs';

const row=(i,balance,extra={})=>({address:`0x${i.toString(16).padStart(40,'0')}`,balance,tags:[],change24h:null,day:{buyCount:0,sellCount:0,buyAmount:'0',sellAmount:'0'},history:{buyCount:0,sellCount:0,buyAmount:'0',sellAmount:'0'},...extra});
test('holder ranking uses exact integers and balance for value and share without changing source rows',()=>{
 const rows=[row(3,'900719925474099300000001'),row(2,'900719925474099300000002'),row(1,'900719925474099300000001')],before=structuredClone(rows);
 for(const key of ['balance','value','share'])assert.deepEqual(rankHolderRows(rows,key).map(r=>r.address),[rows[1].address,rows[2].address,rows[0].address]);
 assert.deepEqual(rankHolderRows(rows,'address','desc').map(r=>r.address),[rows[0].address,rows[1].address,rows[2].address]);
 assert.deepEqual(rows,before);
});
test('signed 24h changes keep unavailable rows last for both directions',()=>{
 const rows=[row(1,'1'),row(2,'1',{change24h:'0'}),row(3,'1',{change24h:'-5'}),row(4,'1',{change24h:'2'})];
 assert.deepEqual(rankHolderRows(rows,'change24h','asc').map(r=>r.change24h),['-5','0','2',null]);
 assert.deepEqual(rankHolderRows(rows,'change24h','desc').map(r=>r.change24h),['2','0','-5',null]);
});
test('day and history buy and sell counts and quantities sort independently',()=>{
 const fields=['BuyCount','SellCount','BuyAmount','SellAmount'];
 for(const scope of ['day','history'])for(const field of fields){
  const stat=field[0].toLowerCase()+field.slice(1),key=scope+field;
  const rows=[row(1,'30'),row(2,'10')];rows[0][scope][stat]=field.endsWith('Amount')?'900719925474099300000001':1;rows[1][scope][stat]=field.endsWith('Amount')?'900719925474099300000002':2;
  assert.equal(rankHolderRows(rows,key,'desc')[0].address,rows[1].address,key);
  assert.equal(rankHolderRows(rows,key,'asc')[0].address,rows[0].address,key);
 }
});
test('holder sort runs on all filtered rows before pagination and leaves top10 balance chart independent',()=>{
 const rows=Array.from({length:205},(_,i)=>row(i+1,String(i+1),{tags:[{kind:i%2?'own':'received',text:'tag'}],day:{buyCount:205-i,sellCount:0,buyAmount:'0',sellAmount:'0'}}));
 const selected=selectHolders({rows},{sort:'dayBuyCount',direction:'desc',page:1});
 assert.equal(selected.total,205);assert.equal(selected.rows.length,100);assert.equal(selected.rows[0].day.buyCount,105);
 const filtered=selectHolders({rows},{filter:['received'],sort:'balance',direction:'desc',page:1});
 assert.equal(filtered.total,103);assert.deepEqual(filtered.rows.map(r=>r.balance),['5','3','1']);
 assert.equal(holderCharts(selected.all).top[0].balance,'205');
 assert.equal(rows[0].balance,'1');
});
