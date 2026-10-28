import {buildContractCohort} from './contract-cohort.mjs';
import {EXECUTION_LABELS} from './execution-categories.mjs';
import {CONFIRMED_HOLDER_LABELS,HOLDER_BALANCE_SPLITS,HOLDER_CIRCULATION_EXCLUSIONS,splitHolderBalance} from '../../src/holder-labels.mjs';
import marketMaking from '../../src/mm-own-addresses.json' with {type:'json'};

export function externalScope(holderRows=[]){
 const own=new Set([...marketMaking.records.map(r=>r.address),...Object.entries(CONFIRMED_HOLDER_LABELS).filter(([,v])=>['own','lp'].includes(v.kind)).map(([a])=>a),...Object.entries(EXECUTION_LABELS).filter(([,v])=>v.category==='own').map(([a])=>a)]);
 for(const r of holderRows)if(!HOLDER_BALANCE_SPLITS[r.address]&&r.tags?.some(t=>['own','lp'].includes(t.kind)))own.add(r.address);
 return {own,excluded:new Set([...own,...Object.keys(HOLDER_CIRCULATION_EXCLUSIONS)]),mixed:new Set(Object.keys(HOLDER_BALANCE_SPLITS)),mmCount:new Set(marketMaking.records.map(r=>r.address)).size};
}
export function buildExternalCohort(inputs,holderRows=[]){
 const scope=externalScope(holderRows),c=buildContractCohort({...inputs,excludeAddresses:[...scope.excluded],terminalAddresses:[...scope.mixed]});
 const related=new Map(c.rows.map(r=>[r.address,r])),boundaries=new Set([...scope.excluded,inputs.state.source,'0x0000000000000000000000000000000000000000',...inputs.marketAddresses]);
 const rows=Object.entries(inputs.closingBalances).filter(([a])=>!boundaries.has(a)).map(([address,balance])=>{const r=related.get(address),split=splitHolderBalance(address,balance);return {address,role:r?.role||'other',via:r?.via||null,viaTx:r?.viaTx||null,interacted:r?.interacted||false,received:r?.received||false,mixed:!!split,balance_wei:split?.external??balance,wallet_balance_wei:balance,current_stake_wei:null};});
 const sum=rr=>rr.reduce((n,r)=>n+BigInt(r.balance_wei),0n).toString();
 return {version:1,scopeRevision:2,method:'external-indexed-wallets-v1',throughBlock:c.throughBlock,blockHash:c.blockHash,cutoff:c.cutoff,mmExcludedCount:scope.mmCount,ownExcludedCount:scope.own.size,
  addressCount:rows.length,directCount:rows.filter(r=>r.role==='direct').length,downstreamCount:rows.filter(r=>r.role==='downstream').length,otherCount:rows.filter(r=>r.role==='other').length,holdingCount:rows.filter(r=>BigInt(r.balance_wei)>0n).length,
  balance_wei:sum(rows),direct_balance_wei:sum(rows.filter(r=>r.role==='direct')),downstream_balance_wei:sum(rows.filter(r=>r.role==='downstream')),other_balance_wei:sum(rows.filter(r=>r.role==='other')),mixed_balance_wei:sum(rows.filter(r=>r.mixed)),
  currentStake:{status:'unavailable',amount_wei:null,reason:'no-reconciled-per-address-esim-principal'},rows};
}
