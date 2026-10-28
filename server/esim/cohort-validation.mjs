import {validExternalCohort} from './external-cohort-validation.mjs';
const address=v=>typeof v==='string'&&/^0x[0-9a-f]{40}$/.test(v);
const hash=v=>typeof v==='string'&&/^0x[0-9a-f]{64}$/.test(v);
const uint=v=>typeof v==='string'&&/^(0|[1-9][0-9]{0,77})$/.test(v);
const count=v=>Number.isSafeInteger(v)&&v>=0;
export function validCohort(c,flow){
 try{
  if(c?.external&&!validExternalCohort(c.external,c))return false;
  if(!c||!Number.isSafeInteger(c.throughBlock)||c.throughBlock<0||!hash(c.blockHash)||!Number.isFinite(c.cutoff)||c.cutoff<0||c.version!==1||c.method!=='interaction-recipient-downstream-v1'||c.throughBlock!==flow.throughBlock||c.cutoff!==flow.cutoff||c.blockHash!==flow.blockHash||!Array.isArray(c.rows)||c.rows.length>30000)return false;
  const seen=new Set(),fields=['balance_wei','source_balance_wei','stake_wei','source_stake_wei','other_return_wei'];
  for(const r of c.rows){
   if(!address(r.address)||seen.has(r.address)||!['direct','downstream'].includes(r.role)||typeof r.interacted!=='boolean'||typeof r.received!=='boolean'||!fields.every(k=>uint(r[k]))||!count(r.stake_transactions))return false;
   if(r.role==='direct'?!(r.interacted||r.received)||r.via!==null||r.viaTx!==null:!address(r.via)||!hash(r.viaTx)||r.interacted||r.received)return false;
   if(BigInt(r.source_balance_wei)>BigInt(r.balance_wei)||BigInt(r.source_stake_wei)>BigInt(r.stake_wei))return false;
   seen.add(r.address);
  }
  if(c.rows.some(r=>r.via&&!seen.has(r.via)))return false;
  if(!fields.every(k=>uint(c[k])&&BigInt(c[k])===c.rows.reduce((n,r)=>n+BigInt(r[k]),0n)))return false;
  const direct=c.rows.filter(r=>r.role==='direct'),downstream=c.rows.filter(r=>r.role==='downstream');
  if(!['direct_balance_wei','downstream_balance_wei'].every(k=>uint(c[k]))||BigInt(c.direct_balance_wei)!==direct.reduce((n,r)=>n+BigInt(r.balance_wei),0n)||BigInt(c.downstream_balance_wei)!==downstream.reduce((n,r)=>n+BigInt(r.balance_wei),0n))return false;
  return c.addressCount===c.rows.length&&c.directCount===direct.length&&c.downstreamCount===downstream.length&&c.interactedCount===c.rows.filter(r=>r.interacted).length&&c.receivedCount===c.rows.filter(r=>r.received).length&&c.holdingCount===c.rows.filter(r=>BigInt(r.balance_wei)>0n).length&&c.stakeAddresses===c.rows.filter(r=>BigInt(r.stake_wei)>0n).length&&count(c.stakeTransactions)&&c.stakeTransactions<=c.rows.reduce((n,r)=>n+r.stake_transactions,0);
 }catch{return false;}
}
