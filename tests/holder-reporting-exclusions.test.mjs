import test from 'node:test';
import assert from 'node:assert/strict';
import {CONFIRMED_HOLDER_LABELS,HOLDER_TOKEN_BLACKLIST,HOLDER_PLATFORM_LABELS} from '../src/holder-labels.mjs';
import {holderLedger,holderAppearance,selectHolderView} from '../src/holder-overview.mjs';
import {ownershipAmounts,rowTags} from '../src/holder-model.mjs';
import {externalScope} from '../server/esim/external-cohort.mjs';

test('new activity reserve stays non-external while blacklist is separately included in external holdings',()=>{
 const reserve='0x543714f349970cd3b02d6dc6a85ac8641f2bb3a3',blocked='0x54403ec2c1035295e81172e1bf381d01df135f67',outside='0x'+'3'.repeat(40);
 const rows=[{address:reserve,balance:'15000',tags:[]},{address:blocked,balance:'1200',tags:[{id:'known-external',kind:'external',text:'外部'}]},{address:outside,balance:'500',tags:[]}];
 const original=structuredClone(rows),report={rows,totalSupply:'16700'},ledger=holderLedger(report);
 assert.equal(ledger.external,'1700');assert.equal(ledger.own,'0');assert.equal(ledger.nonExternal,'15000');assert.equal(BigInt(ledger.external)+BigInt(ledger.nonExternal),BigInt(ledger.indexed));
 assert.equal(selectHolderView(report,{scope:'external-stat',includeZero:true}).total,2);
 assert.equal(holderAppearance(rows[0]),'excluded');assert(externalScope().excluded.has(reserve));
 assert.equal(holderAppearance(rows[1]),'blacklist');assert(!externalScope().excluded.has(blocked));
 for(const r of rows.slice(0,2))assert.equal(ownershipAmounts(r).own,'0');
 assert.deepEqual(ledger.externalBreakdown.blacklist,{balance:'1200',addresses:1});
 assert(rowTags(rows[0],{}).some(t=>t.kind==='reserve'));assert(rowTags(rows[1],{}).some(t=>t.kind==='blacklist'));assert.deepEqual(rows,original);
});

test('all seven chain-verified blacklists override overlapping exchange and participation categories',()=>{
 assert.equal(Object.keys(HOLDER_TOKEN_BLACKLIST).length,7);
 const rows=Object.keys(HOLDER_TOKEN_BLACKLIST).map(address=>({address,balance:'1000000000000000001',externalRole:'downstream',tags:[{id:'received',kind:'received',text:'领币'},{id:'exchange',kind:'exchange',text:'交易所'}]}));
 const ledger=holderLedger({rows,totalSupply:'10000000000000000000'});
 assert.deepEqual(ledger.externalBreakdown.blacklist,{balance:'7000000000000000007',addresses:7});
 assert.equal(Object.values(ledger.externalBreakdown).reduce((s,r)=>s+BigInt(r.balance),0n),BigInt(ledger.external));
 for(const role of ['direct','downstream','exchange','other'])assert.equal(selectHolderView({rows},{scope:'external-stat',externalRole:role}).total,0);
 assert.equal(selectHolderView({rows},{scope:'external-stat',externalRole:'blacklist'}).total,7);
 for(const row of rows){assert.equal(holderAppearance(row),'blacklist');assert(rowTags(row,{}).some(t=>t.kind==='blacklist'&&t.evidence.includes('132402041')));}
 assert(!Object.hasOwn(HOLDER_TOKEN_BLACKLIST,'0x85f5fb571049f9c73aeec2d55e1f06fd194a44f1'));
});

test('five external groups, drilldowns and chart reconcile with own, reserve, mixed and exchange-user balances',()=>{
 const a=n=>'0x'+n.toString(16).padStart(40,'0'),tag=kind=>({kind,id:kind,text:kind}),row=(n,b,tags=[],externalRole=null)=>({address:a(n),balance:String(b),tags,externalRole});
 const rows=[row(1,10,[tag('received')]),row(2,20,[],'downstream'),row(3,30,[tag('exchange'),tag('received')]),row(4,40,[tag('blacklist'),tag('exchange')]),row(5,50),row(6,60,[tag('exchange-user')]),row(7,70,[tag('own')]),
  {address:'0x543714f349970cd3b02d6dc6a85ac8641f2bb3a3',balance:'80',tags:[tag('received')]},
  {address:'0x588177775e6fba9e752d0c9dfd5bbb562e8f016a',balance:'500000000000000000000000',tags:[tag('received')]}];
 const report={rows,totalSupply:'1000000000000000000000000'},ledger=holderLedger(report);
 const groups=[['direct','participants'],['downstream','downstream'],['exchange','exchange'],['blacklist','blacklist'],['other','other']],seen=[];
 for(const [role,id]of groups){const selected=selectHolderView(report,{scope:'external-stat',externalRole:role});assert.equal(selected.total,ledger.externalBreakdown[id].addresses);assert.equal(selected.all.reduce((s,r)=>s+BigInt(r.balance),0n).toString(),ledger.externalBreakdown[id].balance);seen.push(...selected.all.map(r=>r.address));}
 assert.equal(seen.length,new Set(seen).size);assert.equal(seen.length,7);
 assert.equal(ledger.externalBreakdown.other.balance,'110');assert.equal(ledger.externalBreakdown.exchange.addresses,1);
 assert.equal(BigInt(ledger.external)+BigInt(ledger.nonExternal),BigInt(ledger.indexed));
 assert.equal(Object.values(ledger.externalBreakdown).reduce((s,r)=>s+BigInt(r.balance),0n),BigInt(ledger.external));
});

test('KuCoin stays an exchange label, separate from own ownership and wallet activity',()=>{
 const address='0x53f78a071d04224b8e254e243fffc6d9f2f3fa23',r={address,balance:'42',tags:[],history:{sellAmount:'7'}};
 assert.equal(CONFIRMED_HOLDER_LABELS[address].kind,'exchange');assert(rowTags(r,{}).some(t=>t.kind==='exchange'&&t.text==='KuCoin: Hot Wallet 2'));assert.equal(ownershipAmounts(r).own,'0');assert.equal(r.history.sellAmount,'7');
});

test('Binance platform proxy is counted with exchange-related holdings while retaining its contract type',()=>{
 const address='0x73d8bd54f7cf5fab43fe4ef40a62d390644946db',r={address,balance:'5459300375753108007474501',tags:[],externalRole:'other'};
 assert.equal(Object.keys(HOLDER_PLATFORM_LABELS).length,4);assert.equal(CONFIRMED_HOLDER_LABELS[address].kind,'dex');
 const report={rows:[r],totalSupply:'1000000000000000000000000000'},ledger=holderLedger(report);
 assert.equal(ledger.externalBreakdown.exchange.balance,r.balance);assert.equal(ledger.externalBreakdown.other.balance,'0');
 assert.equal(selectHolderView(report,{scope:'external-stat',externalRole:'exchange'}).rows[0].address,address);assert.equal(holderAppearance(r),'exchange');
 assert(rowTags(r,{}).some(t=>t.kind==='dex'&&t.text.includes('Router Proxy')));
});

test('both newly verified USDT ESIM pools move from external holdings to non-external without becoming own',()=>{
 const rows=['0xbf4dc3116ba2490ba860849b2cd3399932e843bc','0xcd06956a47164ea866c3e9601085777e89cffad5'].map(address=>({address,balance:'1000000000000000001',tags:[]}));
 const report={rows,totalSupply:'3000000000000000000'},ledger=holderLedger(report);
 assert.equal(ledger.external,'0');assert.equal(ledger.nonExternal,'2000000000000000002');assert.equal(ledger.own,'0');
 assert.equal(selectHolderView(report,{scope:'external-stat'}).total,0);assert.equal(selectHolderView(report,{scope:'excluded'}).total,2);
 for(const r of rows){assert(externalScope().excluded.has(r.address));assert(rowTags(r,{}).some(t=>t.evidence.includes('getPool')));}
});
