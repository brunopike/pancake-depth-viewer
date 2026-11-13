import {TOKEN,SOURCE} from './metrics.mjs';
import {TRANSFER,PCS,UNI,VAULT,addr,order,eventKey,signature} from './attribution.mjs';
import {readHolderBalances} from './holders.mjs';
import {traceClaimFlow} from './claim-flow.mjs';
import {SOURCE_INFLOW_SEED,buildSourceInflow} from './source-inflows.mjs';
import {MAX_TRACKED_ADDRESSES,MAX_FLOW_TRANSFERS} from '../../src/data-capacity.mjs';
import {createHash} from 'node:crypto';
const ZERO='0x0000000000000000000000000000000000000000',hex=n=>'0x'+n.toString(16);
const ensure=(ok,code)=>{if(!ok)throw Error(code);};
const lpEvents=new Set(['Mint(address,address,int24,int24,uint128,uint256,uint256)','Burn(address,int24,int24,uint128,uint256,uint256)','Collect(address,address,int24,int24,uint128,uint128)','Mint(address,uint256,uint256)','Burn(address,uint256,uint256,address)','ModifyLiquidity(bytes32,address,int24,int24,int256,bytes32)'].map(signature));
// The bfaa3bc and da0cac6 archives have the same 544545 tx groups; only group order changed.
// This exact legacy witness permits the verified migration; every other mismatch replays fully.
const legacyOrderWitness={"block":133204117,"blockHash":"0x7fda766f3a1f86c60013c4e5b1b17062e53712c3e5339f816e1346450d835b94","legacyInputHash":"a773a7a0a9d57bd6e3e5d5485c4da670f947990e9067c2fba7955bd09bbaf403","canonicalInputHash":"61115b7dd938ccf037b1fa03d66cc6f0691ac87fd86fc459c8020c985ee922d2"};
export function replayOrderWitnessMatches(previous,canonicalHash,witness){
 return !!witness&&previous?.replayState?.version===1&&(previous.replayState.inputHashVersion??1)===1&&previous.throughBlock===witness.block&&previous.blockHash===witness.blockHash&&previous.replayState.inputHash===witness.legacyInputHash&&canonicalHash===witness.canonicalInputHash;
}
export function replayInputHash(state,transfers,throughBlock,openingBalances,version=2){
 const hash=createHash('sha256');
 hash.update(JSON.stringify([state.token,state.source,Object.keys(state.pools).filter(a=>a.length===42).sort()]));
 hash.update(JSON.stringify(Object.entries(openingBalances).sort(([a],[b])=>a.localeCompare(b))));
 for(const e of transfers)if(e.order[0]<=throughBlock)hash.update(JSON.stringify(e));
 // Only independent tx groups may move; stable sorting retains every row within a tx.
 const trades=version===1?state.trades:state.trades.filter(t=>t.block<=throughBlock).sort((a,b)=>a.tx<b.tx?-1:a.tx>b.tx?1:0);
 for(const t of trades)if(t.block<=throughBlock)hash.update(JSON.stringify([t.tx,t.address,t.side,t.amount_wei,t.block,t.timestamp]));
 return hash.digest('hex');
}
export async function collectClaimFlow(state,transport,{previous,progress=()=>{},readBalances=readHolderBalances,sourceInflowSeed=SOURCE_INFLOW_SEED}={}){
 ensure(state.token===TOKEN&&state.source===SOURCE&&state.distributions.length,'FLOW_INVALID_SOURCE');
 const startBlock=state.distributions.reduce((n,r)=>Math.min(n,r.block),Infinity),openingBlock=startBlock-1;
 const markets=new Set([PCS,UNI,VAULT,...Object.keys(state.pools).filter(a=>a.length===42)]);
 const marketAddresses=[...markets].sort(),sameMarkets=JSON.stringify(previous?.marketAddresses)===JSON.stringify(marketAddresses);
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
 ensure(raw.length<=500000,'FLOW_EVENT_BATCH_LIMIT');
 ensure(raw.every(e=>!e.removed&&e.address.toLowerCase()===TOKEN&&e.topics[0]===TRANSFER&&e.topics.length===3&&order(e)[0]>=fromBlock&&order(e)[0]<=state.block),'FLOW_INVALID_LOGS');
 const seen=new Set(previous?.transfers.map(e=>e.id)||[]),added=[];
 for(const e of raw){const id=eventKey(e);ensure(!seen.has(id),'FLOW_DUPLICATE_LOG');seen.add(id);added.push({id,tx:e.transactionHash,blockHash:e.blockHash,order:order(e),timestamp:e.blockTimestamp?Number(BigInt(e.blockTimestamp)):null,from:addr(e.topics[1]),to:addr(e.topics[2]),value:BigInt(e.data).toString()});}
 const transfers=[...(previous?.transfers||[]),...added];ensure(transfers.length<=MAX_FLOW_TRANSFERS,'FLOW_EVENT_LIMIT');
 raw.length=0;seen.clear();
 const sourceEvents=new Map(transfers.filter(e=>e.from===SOURCE&&BigInt(e.value)>0n).map(e=>[e.id,e]));
 ensure(sourceEvents.size===state.distributions.length&&state.distributions.every(d=>{const e=sourceEvents.get(d.id);return e&&e.to===d.recipient&&e.value===d.value;}),'FLOW_DISTRIBUTION_MISMATCH');
 const addresses=[...new Set(transfers.flatMap(e=>[e.from,e.to]).filter(normal))].sort();ensure(addresses.length<=MAX_TRACKED_ADDRESSES,'FLOW_ADDRESS_LIMIT');
 const openingBalances={...(previous?.openingBalances||{})},missing=addresses.filter(a=>!Object.hasOwn(openingBalances,a));
 progress({phase:'claim-opening-balances',addresses:missing.length,openingBlock});
 const initial=await readBalances(missing,hex(openingBlock),transport);for(const [i,a]of missing.entries())openingBalances[a]=initial[i];
 const options={source:SOURCE,marketAddresses:[...markets],openingBalances,transfers,trades:state.trades};
 // Balance reconciliation cannot detect omitted net-zero transfers. Each proposed
 // sale is additionally checked against every ESIM Transfer in its receipt.
 // A newly recognized pool can make an old receipt an unsafe LP path.
 const proof=sameMarkets?{...(previous?.receiptProof||{})}:{};
 // Verify candidate fill receipts first; one provenance replay is sufficient.
 const txs=[...new Set(state.trades.filter(t=>t.side==='sell'&&t.address&&t.block>=startBlock&&t.block<=state.block).map(t=>t.tx))].filter(tx=>!proof[tx]);
 const byTx=new Map();for(const e of transfers){if(!byTx.has(e.tx))byTx.set(e.tx,[]);byTx.get(e.tx).push(e);}
 progress({phase:'claim-sale-receipts',transactions:txs.length});
 for(let offset=0;offset<txs.length;offset+=1000){
 const batch=txs.slice(offset,offset+1000),receipts=await transport.batch(batch.map(tx=>['eth_getTransactionReceipt',[tx]]));
 for(const [i,r]of receipts.entries()){
  const tx=batch[i],events=byTx.get(tx)||[];
  ensure(r?.transactionHash===tx&&r.status==='0x1'&&Number(BigInt(r.blockNumber))===events[0]?.order[0]&&(!events[0].blockHash||r.blockHash===events[0].blockHash),'FLOW_RECEIPT_MISMATCH');
  const logs=r.logs.filter(e=>e.address.toLowerCase()===TOKEN&&e.topics[0]===TRANSFER),indexed=new Map(events.map(e=>[e.id,e]));
  ensure(logs.length===events.length&&logs.every(e=>{const x=indexed.get(eventKey(e));return x&&x.from===addr(e.topics[1])&&x.to===addr(e.topics[2])&&x.value===BigInt(e.data).toString()&&x.order.every((n,j)=>n===order(e)[j]);}),'FLOW_RECEIPT_LOG_MISMATCH');
  proof[tx]={block:events[0].order[0],blockHash:r.blockHash,unsafe:r.logs.some(e=>markets.has(e.address.toLowerCase())&&lpEvents.has(e.topics[0]))};
 }
 }
 const replayVersion=previous?.replayState?.inputHashVersion??1;
 const compatible=previous?.replayState?.version===1&&Array.isArray(previous.replayWallets)&&sameMarkets&&[1,2].includes(replayVersion);
 const prefixHash=compatible?replayInputHash(state,transfers,previous.throughBlock,previous.openingBalances,replayVersion):null;
 const exactInput=compatible&&previous.replayState.inputHash===prefixHash;
 const migratedOrder=!exactInput&&compatible&&replayVersion===1&&replayOrderWitnessMatches(previous,replayInputHash(state,transfers,previous.throughBlock,previous.openingBalances),legacyOrderWitness);
 const resume=exactInput||migratedOrder;
 progress({phase:'claim-replay-mode',mode:resume?'incremental':'full',reason:resume?(migratedOrder?'verified-legacy-order':'checkpoint-match'):!previous?'first-run':!previous.replayState?'legacy-checkpoint':!Array.isArray(previous.replayWallets)?'missing-wallet-lots':!sameMarkets?'market-change':'history-input-change',previousBlock:previous?.throughBlock??null,transfers:resume?added.length:transfers.length});
 const traced=traceClaimFlow({...options,transfers:resume?added:transfers,previous:resume?{...previous.report,replayState:{...previous.replayState,wallets:previous.replayWallets}}:null,progress,unsafeTransactions:Object.keys(proof).filter(tx=>proof[tx].unsafe)});
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
 const {closingBalances,replayState:{wallets:replayWallets,...replayState},...report}=traced;
 replayState.inputHashVersion=2;
 replayState.inputHash=replayInputHash(state,transfers,state.block,openingBalances);
 // Revision 3 adds the reconciled all-history source inflow counter; the
 // proportional sale-attribution algorithm is unchanged.
 Object.assign(report,{modelRevision:3,replayCheckpointVersion:2,replayInputHash:replayState.inputHash,token:TOKEN,source:SOURCE,startBlock,openingBlock,openingBlockHash:opening.hash,throughBlock:state.block,blockHash:state.blockHash,cutoff:state.cutoff,sourceInflow,transferCount:transfers.length,addressCount:addresses.length,receiptCount:Object.keys(proof).length,coverage:'single-token-rpc-logs; sale-receipts-and-wallet-balances-reconciled; unknown-net-zero-transfers-depend-on-rpc-completeness'});
 return {version:1,token:TOKEN,source:SOURCE,startBlock,openingBlock,openingBlockHash:opening.hash,throughBlock:state.block,blockHash:state.blockHash,cutoff:state.cutoff,openingBalances,transfers,receiptProof:proof,blockTimes,marketAddresses,replayState,replayWallets,report};
}
