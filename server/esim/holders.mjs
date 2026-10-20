import { readFile } from 'node:fs/promises';
import { encodeFunctionData, decodeFunctionResult, parseAbi } from 'viem';
import { TOKEN, SOURCE, beijingDate } from './metrics.mjs';
import { OWN_EXECUTOR } from './addresses.mjs';
import { TRANSFER } from './attribution.mjs';
import { CONFIRMED_HOLDER_LABELS, HOLDER_IMPORT, applyHolderLabels } from '../../src/holder-labels.mjs';
const seedFile = JSON.parse(await readFile(new URL('./holder-seed.json', import.meta.url)));
export const SEED = {...seedFile, addresses:[...new Set([...seedFile.addresses,...HOLDER_IMPORT.records.map(r=>r.address)])], supplement:{source:HOLDER_IMPORT.source,capturedAt:HOLDER_IMPORT.capturedAt,block:HOLDER_IMPORT.block,count:HOLDER_IMPORT.count}, labels:{...seedFile.labels,...CONFIRMED_HOLDER_LABELS}};
export const HOLDER_CACHE = 'https://raw.githubusercontent.com/brunopike/pancake-depth-viewer/holder-cache/holders.json';
const ZERO = '0x0000000000000000000000000000000000000000';
const valid = a => /^0x[0-9a-f]{40}$/.test(a || '') && a !== ZERO;
const hex = n => `0x${n.toString(16)}`, num = n => Number(BigInt(n));
const assert = (ok, code) => { if (!ok) throw new Error(code); };
const multiABI = parseAbi(['function aggregate3((address target,bool allowFailure,bytes callData)[] calls) payable returns ((bool success,bytes returnData)[] returnData)']);
const clABI = parseAbi(['function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)']);
const MULTICALL = '0xca11bde05977b3631167028862be2a173976ca11';
const MANAGER = '0xa0ffb9c1ce1fe56963b0321b32e7a0302114058b';
const PRICE_POOL = '0x24d01c45d3fc828e99c6c34cf6ddb9a39260b7fb2bc849833195caac3c987176';
const balanceCall = a => ({target:TOKEN,allowFailure:false,callData:`0x70a08231${a.slice(2).padStart(64,'0')}`});

export async function blockAtOrBefore(rpc, timestamp, head) {
  let low=0, high=num(head.number);
  while(low<high){const mid=Math.ceil((low+high)/2);const b=await rpc('eth_getBlockByNumber',[hex(mid),false]);assert(b,'MISSING_BLOCK');if(num(b.timestamp)<=timestamp)low=mid;else high=mid-1;}
  const block=await rpc('eth_getBlockByNumber',[hex(low),false]);
  assert(timestamp-num(block.timestamp)<120,'HISTORICAL_BOUNDARY_TOO_OLD');return block;
}
export async function readHolderBalances(addresses, block, transport) {
  const chunks=[];for(let i=0;i<addresses.length;i+=400)chunks.push(addresses.slice(i,i+400));
  const calls=chunks.map(chunk=>['eth_call',[{to:MULTICALL,data:encodeFunctionData({abi:multiABI,functionName:'aggregate3',args:[chunk.map(balanceCall)]})},block]]);
  // Encoded multicalls are large; keep HTTP request bodies below provider limits.
  const encoded=[];for(let i=0;i<calls.length;i+=2)encoded.push(...await transport.batch(calls.slice(i,i+2)));
  return encoded.flatMap((raw,i)=>{
    const values=decodeFunctionResult({abi:multiABI,functionName:'aggregate3',data:raw});
    assert(values.length===chunks[i].length&&values.every(v=>v.success&&/^0x[0-9a-f]{64}$/i.test(v.returnData)),'HOLDER_BALANCE_INCOMPLETE');
    return values.map(v=>BigInt(v.returnData).toString());
  });
}
const blankStats=()=>({buyAmount:0n,sellAmount:0n,buys:new Set(),sells:new Set()});
const packed=s=>({buyAmount:s.buyAmount.toString(),sellAmount:s.sellAmount.toString(),buyCount:s.buys.size,sellCount:s.sells.size});
export function holderBehavior(state, cutoff) {
  const rows=new Map(), get=a=>{if(!rows.has(a))rows.set(a,{history:blankStats(),day:blankStats(),days:new Map(),roundTrips:new Map(),receivedSold:false,ownExecution:false});return rows.get(a);};
  for(const t of state.trades){
    if(t.timestamp>cutoff)continue;
    if(valid(t.initiator)){
      const r=get(t.initiator), day=beijingDate(t.timestamp); if(!r.days.has(day))r.days.set(day,new Set());r.days.get(day).add(t.tx);
      if(t.executor===OWN_EXECUTOR)r.ownExecution=true;
      if(!r.roundTrips.has(t.tx))r.roundTrips.set(t.tx,new Set());r.roundTrips.get(t.tx).add(t.side);
      // Trading activity belongs to the initiator; ownership attribution is separate.
      for(const window of ['history',...(t.timestamp>=cutoff-86400?['day']:[])]){
        const s=r[window];s[t.side==='buy'?'buyAmount':'sellAmount']+=BigInt(t.amount_wei);s[t.side==='buy'?'buys':'sells'].add(t.tx);
      }
    }
    if(!valid(t.address))continue;const r=get(t.address);
    const claim=state.firstRecipient[t.address];
    // Attribution already checked exact receipt/log order for same-timestamp claims.
    if(t.side==='sell'&&claim&&(t.group==='source_recipients'||claim.timestamp<t.timestamp))r.receivedSold=true;
  }
  const callers=new Set(state.calls.filter(c=>c.timestamp<=cutoff).map(c=>c.from));
  return {rows,callers,get};
}
function label(id,text,kind,evidence){return {id,text,kind,evidence};}
export function buildHolderReport({state,addresses,balances,priorBalances,contracts={},block,priorBlock,totalSupply,price,discovery,seed=SEED}) {
  assert(addresses.length===balances.length&&(!priorBalances||priorBalances.length===addresses.length),'HOLDER_BALANCE_INCOMPLETE');
  assert(new Set(addresses).size===addresses.length&&addresses.every(valid),'INVALID_HOLDER_ADDRESSES');
  const cutoff=num(block.timestamp),tradeCutoff=Math.min(state.cutoff,cutoff),behavior=holderBehavior(state,tradeCutoff),ownLP=new Set(seed.lpAddresses), pools=new Set(Object.keys(state.pools).filter(a=>a.length===42));
  const relaySales=new Set((state.claimFlow?.sales||[]).filter(t=>t.timestamp<=tradeCutoff&&BigInt(t.relay_wei)>0n).map(t=>t.address));
  const rows=addresses.map((address,i)=>{
    const balance=BigInt(balances[i]);assert(balance>=0n,'NEGATIVE_HOLDER_BALANCE');
    const r=behavior.rows.get(address),prior=priorBalances?.[i]??null,known=seed.labels[address],tags=[];
    if(relaySales.has(address))tags.push(label('received-relay-sold','分发币转手卖出（估算）','sold','已识别的分发币转手路径与卖出成交；混币按余额比例估算，不证明共同控制。'));
    if(known)tags.push(label(`known-${known.kind}`,known.label,known.kind,known.source));
    if(address===SOURCE)tags.push(label('own-contract','我方合约','own','用户指定的分发合约'));
    if(ownLP.has(address))tags.push(label('own-lp','我方 LP','lp','用户指定的流动性地址；此表数量为钱包余额，不含 LP 仓位'));
    if(r?.ownExecution||address===OWN_EXECUTOR)tags.push(label('own-execution','我方执行','own',`调用用户确认的执行合约 ${OWN_EXECUTOR}`));
    if(pools.has(address)&&!known?.label.includes('LP'))tags.push(label('pool','流动性池','dex','已核对的 ESIM 池合约'));
    const recipient=state.firstRecipient[address];
    if(recipient&&recipient.timestamp<=cutoff){
      tags.push(label('received','领过币','received','收到我方合约的 ESIM 转账'));
      if(r?.receivedSold)tags.push(label('received-sold','领币后卖出','sold','已识别领取之后发生的卖出；不推断具体卖出的是哪批币'));
      if(balance===0n)tags.push(label(r?.receivedSold?'cleared':'received-zero',r?.receivedSold?'领币后卖出 · 当前清仓':'领过币 · 当前零持仓','cleared','当前固定区块 balanceOf 为 0；转出也可能造成余额归零'));
    }
    if(behavior.callers.has(address))tags.push(label('interacted','交互过我方合约','interaction','已核对向我方合约发起的成功调用'));
    const peak=r?Math.max(0,...[...r.days.values()].map(s=>s.size)):0;
    const own=tags.some(t=>['own','lp','mixed'].includes(t.kind));
    if(peak>=100&&!own&&!tags.some(t=>['frequency','arbitrage'].includes(t.kind)))tags.push(label('frequency','高频机器人（疑似）','frequency',`单个北京时间自然日交易至少 ${peak} 笔；频率不能证明机器人身份`));
    const roundTrips=r?[...r.roundTrips.values()].filter(s=>s.size===2).length:0;
    if(roundTrips>=3&&!own&&!['frequency','arbitrage'].includes(known?.kind))tags.push(label('arbitrage','套利机器人（疑似）','arbitrage',`${roundTrips} 笔交易中同时出现 ESIM 买入和卖出；未核实盈利或控制人`));
    if(contracts[address]===true&&!tags.some(t=>['dex','contract'].includes(t.kind)))tags.push(label('contract','合约地址','contract','固定区块 eth_getCode 返回非空代码'));
    return {address,balance:balance.toString(),priorBalance:prior,change24h:prior===null?null:(balance-BigInt(prior)).toString(),tags:applyHolderLabels(address,tags),
      history:packed(r?.history||blankStats()),day:packed(r?.day||blankStats()),peakDailyTrades:peak};
  }).sort((a,b)=>BigInt(a.balance)===BigInt(b.balance)?a.address.localeCompare(b.address):BigInt(a.balance)>BigInt(b.balance)?-1:1);
  const sum=rows.reduce((n,r)=>n+BigInt(r.balance),0n);assert(sum<=BigInt(totalSupply),'HOLDER_SUPPLY_MISMATCH');
  return {version:1,token:TOKEN,decimals:18,cutoff,block:num(block.number),blockHash:block.hash,priorCutoff:priorBlock?num(priorBlock.timestamp):null,priorBlock:priorBlock?num(priorBlock.number):null,
    totalSupply,price,priceSource:'Pancake Infinity ESIM/USDT 池现价',pricePool:PRICE_POOL,tradeCutoff,tradeWindowStart:tradeCutoff-86400,historyStart:state.origin,
    coverage:{seedTop:seed.seedLimit,seedAt:seed.capturedAt,source:seed.source,reportedHolders:seed.reportedHolders,supplement:seed.supplement,tracked:rows.length,holding:rows.filter(r=>BigInt(r.balance)>0n).length,balance:sum.toString(),exhaustive:false,discovery},contracts,rows};
}
export async function collectHolders(state, transport, {previous,progress=()=>{}}={}) {
  const {rpc,batch}=transport;
  assert(await rpc('eth_chainId',[])==='0x38','WRONG_CHAIN');
  const latest=num(await rpc('eth_blockNumber',[])), block=await rpc('eth_getBlockByNumber',[hex(latest-20),false]);
  const cutoff=num(block.timestamp),end=num(block.number),priorBlock=await blockAtOrBefore(rpc,cutoff-86400,block);
  const known=new Set([...SEED.addresses,...Object.keys(SEED.labels),...SEED.lpAddresses,SOURCE,OWN_EXECUTOR,...Object.keys(state.firstRecipient),...state.calls.map(c=>c.from),...state.trades.flatMap(t=>[t.address,t.initiator]),...(previous?.rows||[]).map(r=>r.address)].filter(valid));
  // ESIM Transfer only; discover new participants without a whole-chain scan.
  const start=previous?.block&&previous.block<end?previous.block+1:num(priorBlock.number)+1;
  assert(end-start<800000,'HOLDER_DISCOVERY_GAP');
  const calls=[];for(let a=start;a<=end;a+=3000)calls.push(['eth_getLogs',[{address:TOKEN,topics:[TRANSFER],fromBlock:hex(a),toBlock:hex(Math.min(a+2999,end))}]]);
  const logs=(await batch(calls)).flat();
  assert(logs.every(e=>!e.removed&&e.address.toLowerCase()===TOKEN&&e.topics[0]===TRANSFER&&num(e.blockNumber)>=start&&num(e.blockNumber)<=end),'INVALID_TRANSFER_DISCOVERY');
  for(const e of logs)for(const t of e.topics.slice(1,3)){const a=`0x${t.slice(-40)}`.toLowerCase();if(valid(a))known.add(a);}
  const addresses=[...known].sort();assert(addresses.length<=30000,'HOLDER_ADDRESS_LIMIT');progress({phase:'holders',addresses:addresses.length,logs:logs.length,block:end});
  const [supply,decimals,slot]=await batch([['eth_call',[{to:TOKEN,data:'0x18160ddd'},hex(end)]],['eth_call',[{to:TOKEN,data:'0x313ce567'},hex(end)]],['eth_call',[{to:MANAGER,data:encodeFunctionData({abi:clABI,functionName:'getSlot0',args:[PRICE_POOL]})},hex(end)]]]);
  assert(num(decimals)===18,'WRONG_TOKEN_DECIMALS');
  const sqrt=decodeFunctionResult({abi:clABI,functionName:'getSlot0',data:slot})[0];
  // Verified pool has USDT token0 and ESIM token1, both 18 decimals.
  const price=1/(Number(sqrt)/2**96)**2;assert(Number.isFinite(price)&&price>0,'INVALID_HOLDER_PRICE');
  const balances=await readHolderBalances(addresses,hex(end),transport);
  let priorBalances=null;try{priorBalances=await readHolderBalances(addresses,priorBlock.number,transport);}catch{progress({phase:'historical-balances-unavailable'});}
  const contracts={...(previous?.contracts||{})};
  // Type lookup is supplementary. Prioritize the largest holders, cap cost, and
  // leave unknown types unclassified rather than discarding verified balances.
  const missing=addresses.map((a,i)=>({a,b:BigInt(balances[i])})).filter(r=>!(r.a in contracts)).sort((a,b)=>a.b>b.b?-1:a.b<b.b?1:0).slice(0,500).map(r=>r.a);
  for(let start=0;start<missing.length;start+=20){
    const chunk=missing.slice(start,start+20);
    try{const codes=await batch(chunk.map(a=>['eth_getCode',[a,hex(end)]]));for(let i=0;i<chunk.length;i++)contracts[chunk[i]]=codes[i]!=='0x';}
    catch{progress({phase:'contract-types-partial'});break;}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  const after=await rpc('eth_getBlockByNumber',[hex(end),false],{fresh:true});assert(after?.hash===block.hash,'HOLDER_BLOCK_CHANGED');
  if(previous?.block&&start===previous.block+1){const old=await rpc('eth_getBlockByNumber',[hex(previous.block),false],{fresh:true});assert(old?.hash===previous.blockHash,'HOLDER_CHECKPOINT_CHANGED');}
  return buildHolderReport({state,addresses,balances,priorBalances,contracts,block,priorBlock:priorBalances?priorBlock:null,totalSupply:BigInt(supply).toString(),price,discovery:{fromBlock:start,toBlock:end,transfers:logs.length}});
}
export function validateHolders(report){
  assert(report?.version===1&&report.token===TOKEN&&Number.isSafeInteger(report.block)&&Array.isArray(report.rows)&&report.rows.length<=30000,'INVALID_HOLDER_REPORT');return report;
}
export async function loadHolders({remote=true}={}) {
  if(remote)try{const response=await fetch(HOLDER_CACHE,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(response.ok)return validateHolders(await response.json());}catch{}
  return validateHolders(JSON.parse(await readFile(new URL('../../public/data/esim-holders.json',import.meta.url))));
}
