import test from 'node:test';
import assert from 'node:assert/strict';
import { sellerSummaries, matchesSellerGroup } from '../src/seller-summary.mjs';
import { sellerProfile } from '../src/holder-insights.mjs';

test('category amounts use full integer precision and overlapping labels are independent', () => {
  const rows = [
    {sold:'100000000000000000001',bought:'200000000000000000002',received:true,own:true},
    {sold:'300000000000000000003',bought:'100000000000000000001',received:true,frequency:true},
    {sold:'700000000000000000007',bought:'0',frequency:true},
  ];
  const groups = sellerSummaries(rows, row => row), get = id => groups.find(g=>g.id===id);
  assert.equal(get('all').count,3);
  assert.equal(get('all').sold,'1100000000000000000011');
  assert.equal(get('all').netSold,'800000000000000000008');
  assert.equal(get('received').count,2);
  assert.equal(get('received').bought,'300000000000000000003');
  assert.equal(get('own').netSold,'-100000000000000000001');
  assert.equal(get('other').sold,'700000000000000000007');
  assert.equal(get('frequency').count,2);
  for(const g of groups) assert.equal(g.count,rows.filter(r=>matchesSellerGroup(r,g.id)).length);
});

test('overview retains period receipt status and the same ownership precedence as ranking', () => {
  const rows=[
    {address:'0x'+'1'.repeat(40),sold:'5',bought:'2',received:false,own:true,highFrequency:true},
    {address:'0x'+'2'.repeat(40),sold:'7',bought:'3',received:true},
  ];
  const holder={address:rows[0].address,tags:[{id:'received',kind:'received',text:'领过币'}]};
  const groups=sellerSummaries(rows,row=>sellerProfile(row,row===rows[0]?holder:null));
  assert.equal(groups.find(g=>g.id==='received').count,1);
  assert.equal(groups.find(g=>g.id==='own').sold,'5');
  assert.equal(groups.find(g=>g.id==='frequency').count,0);
});

test('empty category overview still exposes all five categories with zero signed net amounts', () => {
  const groups=sellerSummaries([],()=>{throw Error('no rows');});
  assert.deepEqual(groups.map(g=>g.id),['received','all','own','other','frequency']);
  assert(groups.every(g=>g.count===0&&g.sold==='0'&&g.bought==='0'&&g.netSold==='0'));
});
