const address=v=>typeof v==='string'&&/^0x[0-9a-f]{40}$/.test(v);
const hash=v=>typeof v==='string'&&/^0x[0-9a-f]{64}$/.test(v);
const uint=v=>typeof v==='string'&&/^(0|[1-9][0-9]{0,77})$/.test(v);
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const fields=['balance_wei','source_balance_wei','stake_wei','source_stake_wei','other_return_wei'];
export function validContractCohort(c,flow){
 try{
  if(c?.version!==1||c.method!=='interaction-recipient-downstream-v1'||!integer(c.throughBlock)||!hash(c.blockHash)||c.throughBlock!==flow.throughBlock||c.blockHash!==flow.blockHash||c.cutoff!==flow.cutoff||!Array.isArray(c.rows)||c.rows.length>30000)return false;
  const seen=new Set();
  for(const r of c.rows){
   if(!address(r.address)||seen.has(r.address)||!['direct','downstream'].includes(r.role)||typeof r.interacted!=='boolean'||typeof r.received!=='boolean'||!fields.every(k=>uint(r[k]))||!integer(r.stake_transactions)||BigInt(r.source_balance_wei)>BigInt(r.balance_wei)||BigInt(r.source_stake_wei)>BigInt(r.stake_wei))return false;
   if(r.role==='direct'&&(!r.interacted&&!r.received||r.via!==null||r.viaTx!==null))return false;
   if(r.role==='downstream'&&(!address(r.via)||!hash(r.viaTx)||r.interacted||r.received))return false;
   seen.add(r.address);
  }
  if(c.rows.some(r=>r.via&&!seen.has(r.via)))return false;
  const sum=(rows,k)=>rows.reduce((n,r)=>n+BigInt(r[k]),0n).toString(),direct=c.rows.filter(r=>r.role==='direct'),down=c.rows.filter(r=>r.role==='downstream');
  return fields.every(k=>uint(c[k])&&c[k]===sum(c.rows,k))&&c.direct_balance_wei===sum(direct,'balance_wei')&&c.downstream_balance_wei===sum(down,'balance_wei')&&c.addressCount===c.rows.length&&c.directCount===direct.length&&c.downstreamCount===down.length&&c.interactedCount===c.rows.filter(r=>r.interacted).length&&c.receivedCount===c.rows.filter(r=>r.received).length&&c.holdingCount===c.rows.filter(r=>BigInt(r.balance_wei)>0n).length&&c.stakeAddresses===c.rows.filter(r=>BigInt(r.stake_wei)>0n).length&&integer(c.stakeTransactions)&&c.stakeTransactions<=c.rows.reduce((n,r)=>n+r.stake_transactions,0);
 }catch{return false;}
}
