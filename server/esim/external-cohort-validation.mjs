const address=a=>typeof a==='string'&&/^0x[0-9a-f]{40}$/.test(a),hash=h=>typeof h==='string'&&/^0x[0-9a-f]{64}$/.test(h),uint=n=>typeof n==='string'&&/^(0|[1-9][0-9]{0,77})$/.test(n),count=n=>Number.isSafeInteger(n)&&n>=0;
export function validExternalCohort(c,parent){
 try{
  if(!c||c.version!==1||c.scopeRevision!==2||c.method!=='external-indexed-wallets-v1'||c.throughBlock!==parent.throughBlock||c.blockHash!==parent.blockHash||c.cutoff!==parent.cutoff||!Array.isArray(c.rows)||c.rows.length>50000||!count(c.mmExcludedCount)||!count(c.ownExcludedCount)||c.ownExcludedCount<c.mmExcludedCount)return false;
  if(c.currentStake?.status!=='unavailable'||c.currentStake.amount_wei!==null||c.currentStake.reason!=='no-reconciled-per-address-esim-principal')return false;
  const seen=new Set();for(const r of c.rows){if(!address(r.address)||seen.has(r.address)||!['direct','downstream','other'].includes(r.role)||typeof r.mixed!=='boolean'||typeof r.interacted!=='boolean'||typeof r.received!=='boolean'||!uint(r.balance_wei)||!uint(r.wallet_balance_wei)||BigInt(r.balance_wei)>BigInt(r.wallet_balance_wei)||r.current_stake_wei!==null)return false;
   if(r.role==='direct'?!(r.interacted||r.received)||r.via!==null||r.viaTx!==null:r.role==='downstream'?!address(r.via)||!hash(r.viaTx)||r.interacted||r.received:r.via!==null||r.viaTx!==null||r.interacted||r.received)return false;seen.add(r.address);}
  if(c.rows.some(r=>r.via&&!seen.has(r.via)))return false;
  const groups=[['balance_wei',c.rows],['direct_balance_wei',c.rows.filter(r=>r.role==='direct')],['downstream_balance_wei',c.rows.filter(r=>r.role==='downstream')],['other_balance_wei',c.rows.filter(r=>r.role==='other')],['mixed_balance_wei',c.rows.filter(r=>r.mixed)]];
  if(groups.some(([k,rr])=>!uint(c[k])||BigInt(c[k])!==rr.reduce((n,r)=>n+BigInt(r.balance_wei),0n)))return false;
  return c.addressCount===c.rows.length&&c.directCount===groups[1][1].length&&c.downstreamCount===groups[2][1].length&&c.otherCount===groups[3][1].length&&c.holdingCount===c.rows.filter(r=>BigInt(r.balance_wei)>0n).length;
 }catch{return false;}
}
