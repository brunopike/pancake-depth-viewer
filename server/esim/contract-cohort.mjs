import {EXECUTION_LABELS} from './execution-categories.mjs';
const ZERO='0x0000000000000000000000000000000000000000';
const sum=(rows,key)=>rows.reduce((n,r)=>n+BigInt(r[key]),0n).toString();
const compare=(a,b)=>a.order[0]-b.order[0]||a.order[1]-b.order[1]||a.order[2]-b.order[2];
export function buildContractCohort({state,transfers,marketAddresses,openingBalances,closingBalances,sourceBalances,returnedFlows,returnStakes,excludeAddresses=[],terminalAddresses=[]}){
 const boundaries=new Set([ZERO,state.source,...marketAddresses,...excludeAddresses,...Object.entries(EXECUTION_LABELS).filter(([,v])=>['binance','pancake','okx'].includes(v.category)).map(([a])=>a),'0x07964f135f276412b3182a3b2407b8dd45000000']),terminal=new Set(terminalAddresses);
 const callers=new Set((state.calls||[]).map(c=>c.from)),recipients=new Set(state.distributions.map(d=>d.recipient));
 const roots=new Set([...callers,...recipients].filter(a=>!boundaries.has(a))),members=new Map([...roots].map(a=>[a,{address:a,role:'direct',via:null,viaTx:null}]));
 for(const e of [...transfers].sort(compare))if(BigInt(e.value)>0n&&e.from!==e.to&&members.has(e.from)&&!terminal.has(e.from)&&!boundaries.has(e.to)&&!members.has(e.to))members.set(e.to,{address:e.to,role:'downstream',via:e.from,viaTx:e.tx});
 const returns=new Map(returnedFlows.map(r=>[r.id,r])),stakes=new Map();
 for(const r of returnStakes){if(!members.has(r.address))continue;if(!stakes.has(r.address))stakes.set(r.address,{stake_wei:0n,source_stake_wei:0n,other_return_wei:0n,source_other_return_wei:0n,stake_txs:new Set()});const x=stakes.get(r.address),tracked=BigInt(returns.get(r.id)?.source_wei||'0');
  if(r.verifiedStake){x.stake_wei+=BigInt(r.value_wei);x.source_stake_wei+=tracked;x.stake_txs.add(r.tx);}else{x.other_return_wei+=BigInt(r.value_wei);x.source_other_return_wei+=tracked;}
 }
 const rows=[...members.values()].map(r=>{
  const balance=closingBalances[r.address]??openingBalances[r.address];if(balance==null)throw Error('COHORT_BALANCE_MISSING');
  const x=stakes.get(r.address);return {...r,interacted:callers.has(r.address),received:recipients.has(r.address),balance_wei:balance,source_balance_wei:sourceBalances[r.address]||'0',stake_wei:String(x?.stake_wei||0),source_stake_wei:String(x?.source_stake_wei||0),other_return_wei:String(x?.other_return_wei||0),stake_transactions:x?.stake_txs.size||0};
 }).sort((a,b)=>BigInt(a.balance_wei)>BigInt(b.balance_wei)?-1:BigInt(a.balance_wei)<BigInt(b.balance_wei)?1:a.address.localeCompare(b.address));
 const direct=rows.filter(r=>r.role==='direct'),downstream=rows.filter(r=>r.role==='downstream');
 return {version:1,method:'interaction-recipient-downstream-v1',throughBlock:state.block,blockHash:state.blockHash,cutoff:state.cutoff,rows,addressCount:rows.length,directCount:direct.length,downstreamCount:downstream.length,interactedCount:rows.filter(r=>r.interacted).length,receivedCount:rows.filter(r=>r.received).length,holdingCount:rows.filter(r=>BigInt(r.balance_wei)>0n).length,
  balance_wei:sum(rows,'balance_wei'),direct_balance_wei:sum(direct,'balance_wei'),downstream_balance_wei:sum(downstream,'balance_wei'),source_balance_wei:sum(rows,'source_balance_wei'),stake_wei:sum(rows,'stake_wei'),source_stake_wei:sum(rows,'source_stake_wei'),other_return_wei:sum(rows,'other_return_wei'),stakeTransactions:new Set(returnStakes.filter(r=>r.verifiedStake&&members.has(r.address)).map(r=>r.tx)).size,stakeAddresses:rows.filter(r=>BigInt(r.stake_wei)>0n).length};
}
export function cohortSummary(cohort){if(!cohort)return null;const {rows,...summary}=cohort;return summary;}
