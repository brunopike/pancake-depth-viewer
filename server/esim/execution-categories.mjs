import {CONFIRMED_HOLDER_LABELS} from '../../src/holder-labels.mjs';
const OWN_EXECUTOR='0x21a0541e4122090c30fbc04e98cf27430608e007';
const valid=a=>typeof a==='string'&&/^0x[0-9a-f]{40}$/i.test(a)?a.toLowerCase():null;
const categories={own:'我方相关合约',binance:'币安路由',pancake:'Pancake 路由',okx:'OKX 路由',robot:'链上机器人（用户确认）',frequency:'高频交易地址',other:'其他合约 / 路径待核对'};
export const EXECUTION_LABELS={
 [OWN_EXECUTOR]:{category:'own',label:'我方做市执行合约',source:'用户指定执行合约'},
 ...Object.fromEntries(Object.entries(CONFIRMED_HOLDER_LABELS).map(([a,r])=>[a,{category:r.kind==='own'?'own':'robot',label:r.label,source:r.source}])),
 '0x6aba0315493b7e6989041c91181337b662fb1b90':{category:'binance',label:'币安 Alpha 2.0 路由',source:'BscScan 地址标签',sourceURL:'https://bscscan.com/address/0x6aba0315493b7e6989041c91181337b662fb1b90'},
 '0xb300000b72deaeb607a12d5f54773d1c19c7028d':{category:'binance',label:'币安 DEX 路由',source:'BscScan 地址标签',sourceURL:'https://bscscan.com/address/0xb300000b72deaeb607a12d5f54773d1c19c7028d'},
 '0xd9c500dff816a1da21a48a732d3498bf09dc9aeb':{category:'pancake',label:'Pancake Infinity 通用路由',source:'Pancake 官方部署表',sourceURL:'https://developer.pancakeswap.finance/contracts/universal-router/addresses'},
 '0x1a0a18ac4becddbd6389559687d1a73d8927e416':{category:'pancake',label:'Pancake V3 通用路由',source:'Pancake 官方部署表',sourceURL:'https://developer.pancakeswap.finance/contracts/universal-router/addresses'},
 '0x3156020dff8d99af1ddc523ebdfb1ad2018554a0':{category:'okx',label:'OKX DEX 路由',source:'OKX 官方部署表',sourceURL:'https://github.com/okxlabs/Web3-DEX-Router-EVM-V1/blob/main/DEPLOYMENT.md'},
};

// Refine execution paths inside the existing unattributed bucket. A public
// router is a trading channel; it does not establish the fund owner.
export function executionBreakdown(rows){
 const activity=new Map(),ownInitiators=new Set();
 for(const t of rows){const a=valid(t.initiator);if(!a)continue;if(valid(t.executor)===OWN_EXECUTOR)ownInitiators.add(a);
  const day=Math.floor((t.timestamp+28800)/86400),key=a+':'+day;if(!activity.has(key))activity.set(key,new Set());activity.get(key).add(t.tx);
 }
 const frequent=new Set([...activity].filter(([,tx])=>tx.size>=100).map(([key])=>key.slice(0,42)));
 const bins=new Map();
 for(const t of rows){if(t.group!=='remaining_unattributed')continue;
  let address,profile;
  for(const candidate of [t.executor,t.address]){const a=valid(candidate);if(a&&EXECUTION_LABELS[a]){address=a;profile=EXECUTION_LABELS[a];break;}}
  const initiator=valid(t.initiator);
  if(!profile&&initiator&&['own','robot'].includes(EXECUTION_LABELS[initiator]?.category)){address=initiator;profile=EXECUTION_LABELS[initiator];}
  if(!profile&&initiator&&frequent.has(initiator)&&!ownInitiators.has(initiator)&&!EXECUTION_LABELS[initiator]){address=initiator;profile={category:'frequency',label:'高频交易发起地址',source:'本时段内单个北京时间自然日至少100笔交易；身份待核对'};}
  if(!profile){address=valid(t.executor)||valid(t.address)||initiator;profile={category:'other',label:'身份待核对',source:'交易回执与已识别资金路径'};}
  const key=profile.category;if(!bins.has(key))bins.set(key,{id:key,label:categories[key],sold:0n,bought:0n,sells:new Set(),buys:new Set(),refs:new Map(),missing:false});
  const b=bins.get(key),value=BigInt(t.amount_wei);b[t.side==='sell'?'sold':'bought']+=value;b[t.side==='sell'?'sells':'buys'].add(t.tx);
  if(address){if(!b.refs.has(address))b.refs.set(address,{address,...profile,amount:0n});b.refs.get(address).amount+=value;}else b.missing=true;
 }
 return Object.keys(categories).filter(id=>bins.has(id)).map(id=>{const b=bins.get(id);return {id,label:b.label,sold_wei:b.sold.toString(),bought_wei:b.bought.toString(),net_sold_wei:(b.sold-b.bought).toString(),sell_txs:b.sells.size,buy_txs:b.buys.size,path_addresses:b.refs.size,path_addresses_lower_bound:b.missing,
  examples:[...b.refs.values()].sort((a,c)=>a.amount>c.amount?-1:a.amount<c.amount?1:0).slice(0,5).map(({amount,...r})=>r)};});
}
