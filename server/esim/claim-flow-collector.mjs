import {TOKEN,SOURCE} from './metrics.mjs';
import {TRANSFER,PCS,UNI,VAULT,addr,order,eventKey,signature} from './attribution.mjs';
import {readHolderBalances} from './holders.mjs';
import {traceClaimFlow} from './claim-flow.mjs';
import {SOURCE_INFLOW_SEED,buildSourceInflow} from './source-inflows.mjs';
const ZERO='0x0000000000000000000000000000000000000000',hex=n=>'0x'+n.toString(16);
const ensure=(ok,code)=>{if(!ok)throw Error(code);};
const lpEvents=new Set(['Mint(address,address,int24,int24,uint128,uint256,uint256)','Burn(address,int24,int24,uint128,uint256,uint256)','Collect(address,address,int24,int24,uint128,uint128)','Mint(address,uint256,uint256)','Burn(address,uint256,uint256,address)','ModifyLiquidity(bytes32,address,int24,int24,int256,bytes32)'].map(signature));
export async function collectClaimFlow(state,transport,{previous,progress=()=>{},readBalances=readHolderBalances,sourceInflowSeed=SOURCE_INFLOW_SEED}={}){
 ensure(state.token===TOKEN&&state.source===SOURCE&&state.distributions.length,'FLOW_INVALID_SOURCE');
 const startBlock=state.distributions.reduce((n,r)=>Math.min(n,r.block),Infinity),openingBlock=startBlock-1;
 const markets=new Set([PCS,UNI,VAULT,...Object.keys(state.pools).filter(a=>a.length===42)]);
 const normal=a=>a!==SOURCE&&a!==ZERO&&!markets.has(a);
 if(previous)ensure(previous.version===1&&previous.token===TOKEN&&previous.source===SOURCE&&previous.startBlock===startBlock&&previous.throughBlock<=state.block,'FLOW_INVALID_CHECKPOINT');
 const checks=[['eth_chainId',[]],['eth_getBlockByNumber',[hex(openingBlock),false]],['eth_getBlockByNumber',[hex(state.block),false]]];
 if(previous)checks.push(['eth_getBlockByNumber',[hex(previous.throughBlock),false]]);
 const includeSource=state.block>=sourceInflowSeed.throughBlock;
 if(includeSource)checks.push(['eth_getBlockByNumber',[hex(sourceInflowSeed.throughBlock),false]]);
 const headers=await transport.batch(checks,{fresh:true}),[chain,opening,end,prior]=headers;
 ensure(chain==='0x38'&&end?.hash===state.blockHash&&opening?.hash,'FLOW_CHAIN_CHANGED');
 if(previous)ensure(previous.openingBlockHash===opening.hash&&previous.blockHash===prior?.hash,'FLOW_CHECKPOINT_CHANGED');
 if(includeSource)ensure(headers.at(-1)?.hash===sourceInflowSeed.blockHash,'SOURCE_INFLOW_CHECKPOINT_CHANGED');
 const fromBlock=previous?previous.throughBlock+1:startBlock;
 ensure(state.block-fromBlock<=3000000,'FLOW_BACKFILL_LIMIT');
 const queries=[];for(let b=fromBlock;b<=state.block;b+=3000)queries.push(['eth_getLogs',[{address:TOKEN,topics:[TRANSFER],fromBlock:hex(b),toBlock:hex(Math.min(b+2999,state.block))}]]);
 progress({phase:'claim-transfer-scan',fromBlock,toBlock:state.block,queries:queries.length});
 const raw=(await transport.batch(queries)).flat();
 ensure(raw.length<=500000&&raw.every(e=>!e.removed&&e.address.toLowerCase()===TOKEN&&e.topics[0]===TRANSFER&&e.topics.length===3&&order(e)[0]>=fromBlock&&order(e)[0]<=state.block),'FLOW_INVALID_LOGS');
 const seen=new Set(previous?.transfers.map(e=>e.id)||[]),added=[];
 for(const e of raw){const id=eventKey(e);ensure(!seen.has(id),'FLOW_DUPLICATE_LOG');seen.add(id);added.push({id,tx:e.transactionHash,blockHash:e.blockHash,order:order(e),timestamp:e.blockTimestamp?Number(BigInt(e.blockTimestamp)):null,from:addr(e.topics[1]),to:addr(e.topics[2]),value:BigInt(e.data).toString()});}
 const transfers=[...(previous?.transfers||[]),...added];ensure(transfers.length<=1000000,'FLOW_EVENT_LIMIT');
 const sourceEvents=new Map(transfers.filter(e=>e.from===SOURCE&&BigInt(e.value)>0n).map(e=>[e.id,e]));
 ensure(sourceEvents.size===state.distributions.length&&state.distributions.every(d=>{const e=sourceEvents.get(d.id);return e&&e.to===d.recipient&&e.value===d.value;}),'FLOW_DISTRIBUTION_MISMATCH');
 const addresses=[...new Set(transfers.flatMap(e=>[e.from,e.to]).filter(normal))].sort();ensure(addresses.length<=30000,'FLOW_ADDRESS_LIMIT');
 const openingBalances={...(previous?.openingBalances||{})},missing=addresses.filter(a=>!Object.hasOwn(openingBalances,a));
 progress({phase:'claim-opening-balances',addresses:missing.length,openingBlock});
 const initial=await readBalances(missing,hex(openingBlock),transport);for(const [i,a]of missing.entries())openingBalances[a]=initial[i];
 const options={source:SOURCE,marketAddresses:[...markets],openingBalances,transfers,trades:state.trades};
 // Balance reconciliation cannot detect omitted net-zero transfers. Each proposed
 // sale is additionally checked against every ESIM Transfer in its receipt.
 const proposed=traceClaimFlow(options),proof={...(previous?.receiptProof||{})};
 const txs=[...new Set(proposed.sales.map(s=>s.tx))].filter(tx=>!proof[tx]);
 const byTx=new Map();for(const e of transfers){if(!byTx.has(e.tx))byTx.set(e.tx,[]);byTx.get(e.tx).push(e);}
 progress({phase:'claim-sale-receipts',transactions:txs.length});
 const receipts=await transport.batch(txs.map(tx=>['eth_getTransactionReceipt',[tx]]));
 for(const [i,r]of receipts.entries()){
  const tx=txs[i],events=byTx.get(tx)||[];
  ensure(r?.transactionHash===tx&&r.status==='0x1'&&Number(BigInt(r.blockNumber))===events[0]?.order[0]&&(!events[0].blockHash||r.blockHash===events[0].blockHash),'FLOW_RECEIPT_MISMATCH');
  const logs=r.logs.filter(e=>e.address.toLowerCase()===TOKEN&&e.topics[0]===TRANSFER),indexed=new Map(events.map(e=>[e.id,e]));
  ensure(logs.length===events.length&&logs.every(e=>{const x=indexed.get(eventKey(e));return x&&x.from===addr(e.topics[1])&&x.to===addr(e.topics[2])&&x.value===BigInt(e.data).toString()&&x.order.every((n,j)=>n===order(e)[j]);}),'FLOW_RECEIPT_LOG_MISMATCH');
  proof[tx]={block:events[0].order[0],blockHash:r.blockHash,unsafe:r.logs.some(e=>markets.has(e.address.toLowerCase())&&lpEvents.has(e.topics[0]))};
 }
 const traced=traceClaimFlow({...options,unsafeTransactions:Object.keys(proof).filter(tx=>proof[tx].unsafe)});
 const missingTime=[...new Set(traced.unconfirmedFlows.filter(e=>e.timestamp===null).map(e=>e.block))],blockTimes={...(previous?.blockTimes||{})};
 const newTimes=missingTime.filter(b=>!Object.hasOwn(blockTimes,b));
 const blocks=await transport.batch(newTimes.map(b=>['eth_getBlockByNumber',[hex(b),false]]));
 for(const [i,b]of newTimes.entries()){const block=blocks[i];ensure(block?.hash&&block.timestamp,'FLOW_TIMESTAMP_MISSING');blockTimes[b]={timestamp:Number(BigInt(block.timestamp)),hash:block.hash};}
 for(const e of traced.unconfirmedFlows)if(e.timestamp===null){const time=blockTimes[e.block];ensure(time&&(!byTx.get(e.tx)[0].blockHash||time.hash===byTx.get(e.tx)[0].blockHash),'FLOW_TIMESTAMP_CHANGED');e.timestamp=time.timestamp;}
 progress({phase:'claim-closing-reconciliation',addresses:addresses.length,block:state.block});
 const closing=await readBalances(addresses,hex(state.block),transport);
 ensure(addresses.every((a,i)=>closing[i]===(traced.closingBalances[a]??openingBalances[a])),'FLOW_CLOSING_MISMATCH');
 let sourceInflow=null;
 if(includeSource){
  const [balance]=await readBalances([SOURCE],hex(state.block),transport);
  sourceInflow=buildSourceInflow({transfers,startBlock,throughBlock:state.block,blockHash:state.blockHash,cutoff:state.cutoff,balance,checkpoint:sourceInflowSeed});
 }
 const after=await transport.rpc('eth_getBlockByNumber',[hex(state.block),false],{fresh:true});ensure(after?.hash===end.hash,'FLOW_END_CHANGED');
 const {closingBalances,...report}=traced;
 // Revision 3 adds the reconciled all-history source inflow counter; the
 // proportional sale-attribution algorithm is unchanged.
 Object.assign(report,{modelRevision:3,token:TOKEN,source:SOURCE,startBlock,openingBlock,openingBlockHash:opening.hash,throughBlock:state.block,blockHash:state.blockHash,cutoff:state.cutoff,sourceInflow,transferCount:transfers.length,addressCount:addresses.length,receiptCount:Object.keys(proof).length,coverage:'single-token-rpc-logs; sale-receipts-and-wallet-balances-reconciled; unknown-net-zero-transfers-depend-on-rpc-completeness'});
 return {version:1,token:TOKEN,source:SOURCE,startBlock,openingBlock,openingBlockHash:opening.hash,throughBlock:state.block,blockHash:state.blockHash,cutoff:state.cutoff,openingBalances,transfers,receiptProof:proof,blockTimes,report};
}
