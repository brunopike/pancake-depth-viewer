import test from 'node:test';import assert from 'node:assert/strict';
import {validateManual,readManual,selectHolders,groupHolders,changePercent,rowTags,category} from '../src/holder-model.mjs';
import {CONFIRMED_HOLDER_LABELS} from '../src/holder-labels.mjs';
const a='0x'+'1'.repeat(40),b='0x'+'2'.repeat(40);const row=(address,balance,tags=[])=>({address,balance,tags});
test('default page contains 100 and quantity ordering is retained',()=>{const report={rows:Array.from({length:205},(_,i)=>row('0x'+(i+1).toString(16).padStart(40,'0'),String(205-i)))};assert.equal(selectHolders(report).rows.length,100);assert.equal(selectHolders(report,{page:2}).rows.length,5);assert.equal(selectHolders(report,{page:50}).page,2);});
test('zero holders are only visible when enabled, cleared filter can include them',()=>{const report={rows:[row(a,'1'),row(b,'0',[{id:'cleared',kind:'cleared',text:'清仓'}])]};assert.equal(selectHolders(report).total,1);assert.equal(selectHolders(report,{includeZero:true,filter:'cleared'}).rows[0].address,b);});
test('manual labels validated and malformed storage ignored',()=>{assert.throws(()=>validateManual({address:'0xNO',kind:'own',text:'A'}));assert.throws(()=>validateManual({address:a,kind:'own',text:' '}));assert.throws(()=>validateManual({address:a,kind:'own',text:'a'.repeat(33)}));assert.deepEqual(readManual('{no'),{});assert.deepEqual(readManual('{"__proto__":{"text":"bad"}}'),{});const value=validateManual({address:a,kind:'lp',text:' 做市 A '});assert.equal(value.text,'做市 A');});
test('overlapping tags do not double-count chart; manual category takes priority',()=>{const rows=[row(a,'100',[{id:'own-lp',kind:'lp',text:'LP'},{id:'known',kind:'own',text:'我方'}]),row(b,'40',[{id:'received',kind:'received',text:'领币'}])];assert.equal(groupHolders(rows,{}).reduce((n,r)=>n+BigInt(r.balance),0n),140n);const manual={[b]:validateManual({address:b,kind:'own',text:'我方 B'})};assert.equal(groupHolders(rows,manual).find(g=>g.id==='own').balance,'40');assert.equal(selectHolders({rows},{filter:'own'},manual).total,2);assert.equal(selectHolders({rows},{search:'我方 B'},manual).total,1);});
test('change percent handles zero, missing and withdrawals',()=>{assert.equal(changePercent('10',null),null);assert.equal(changePercent('10','0'),'new');assert.equal(changePercent('0','0'),'0');assert.equal(changePercent('0','10'),'-100');});

test('multiple filters match any selected tag and never duplicate a holder',()=>{
 const report={rows:[row(a,'100',[{id:'own-lp',kind:'lp',text:'LP'},{id:'known',kind:'own',text:'我方'}]),row(b,'40',[{id:'frequency',kind:'frequency',text:'高频'}]),row('0x'+'3'.repeat(40),'10',[])]};
 assert.deepEqual(selectHolders(report,{filter:['own','lp','frequency']}).rows.map(r=>r.address),[a,b]);
 assert.equal(selectHolders(report,{filter:[]}).total,3);
 assert.equal(selectHolders(report,{filter:['lp','frequency'],search:'高频'}).rows[0].address,b);
 assert.equal(selectHolders(report,{filter:['lp','frequency'],pageSize:1,page:1}).rows[0].address,b);
 assert.equal(groupHolders(selectHolders(report,{filter:['own','lp']}).all,{}).reduce((n,g)=>n+BigInt(g.balance),0n),100n);
});
test('own tags suppress stale and manual robot tags in display, filters, search and chart',()=>{
 const tags=[{id:'frequency',kind:'frequency',text:'高频机器人'},{id:'arbitrage',kind:'arbitrage',text:'套利机器人'}],r=row(a,'100',tags);
 const manual={[a]:{kind:'lp',text:'我方 LP'}};
 assert.deepEqual(rowTags(r,manual).map(t=>t.kind),['lp']);
 assert.equal(selectHolders({rows:[r]},{filter:['frequency','arbitrage']},manual).total,0);
 assert.equal(selectHolders({rows:[r]},{search:'机器人'},manual).total,0);
 assert.equal(category(r,manual),'lp');
 const own=row(b,'40',[...tags,{id:'own-execution',kind:'own',text:'我方执行'}]);
 assert.deepEqual(rowTags(own,{}).map(t=>t.kind),['own']);
 assert.equal(category(own,{[b]:{kind:'frequency',text:'人工机器人'}}),'own');
 assert.equal(rowTags(r,{}).length,2);
});
test('confirmed contract labels apply to old snapshots, search, filters and chart without duplicates',()=>{
 const addresses=['0xe1de6ac2ee058df5d3be8edeb62a8815fd13ff5a','0xda537697845c1da9e639274fc011caf6ee89b33c','0x218c18d02f0723291ce93aa5c0e5eb709903179a'];
 const rows=addresses.map(address=>row(address,'100',[{id:'frequency',kind:'frequency',text:'高频机器人（疑似）'}]));
 assert.deepEqual(selectHolders({rows},{filter:['own']}).rows.map(r=>r.address),[addresses[0]]);
 assert.deepEqual(selectHolders({rows},{filter:['frequency']}).rows.map(r=>r.address),addresses.slice(1));
 assert.equal(selectHolders({rows},{search:'跨池'}).rows[0].address,addresses[1]);
 assert.equal(category(rows[0],{}),'own');
 assert.equal(groupHolders(rows,{}).find(g=>g.id==='frequency').balance,'200');
 for(const r of rows){const tags=rowTags(r,{});assert.equal(tags.length,1);assert.match(tags[0].evidence,/用户确认/);assert.equal(rowTags({...r,tags},{}).length,1);}
});

test('named custom label filters deduplicate options and combine with automatic tags', async()=>{
 const {customLabelOptions}=await import('../src/holder-model.mjs');
 const c='0x'+'3'.repeat(40),d='0x'+'4'.repeat(40);
 const manual={[a]:{text:'做市 A',kind:'own'},[b]:{text:'做市 A',kind:'lp'},[c]:{text:'标签: "B"',kind:'custom'}};
 const options=customLabelOptions(manual);assert.equal(options.length,2);assert.equal(options.find(x=>x.text==='做市 A').count,2);
 const report={rows:[row(a,'10'),row(b,'20'),row(c,'30'),row(d,'40',[{kind:'received',text:'做市 A'}])]};
 assert.deepEqual(selectHolders(report,{filter:['label:做市 A']},manual).rows.map(x=>x.address),[a,b]);
 assert.deepEqual(selectHolders(report,{filter:['label:做市 A','received']},manual).rows.map(x=>x.address),[a,b,d]);
 assert.equal(selectHolders(report,{filter:['label:标签: "B"']},manual).rows[0].address,c);
 assert.equal(selectHolders(report,{filter:['all']},manual).total,4);
 const renamed={...manual,[a]:{...manual[a],text:'做市新标签'}};
 assert.equal(selectHolders(report,{filter:['label:做市 A']},renamed).total,1);
 delete renamed[b];assert.equal(selectHolders(report,{filter:['label:做市 A']},renamed).total,0);
 assert.ok(!customLabelOptions(renamed).some(x=>x.text==='做市 A'));
});
