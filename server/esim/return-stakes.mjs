import {TOKEN,SOURCE} from './metrics.mjs';
import {TRANSFER,addr,eventKey} from './attribution.mjs';

// Reviewed against the historical implementation and the 82-address audit.
export const ESIM_STAKE_SELECTOR='0x2a52f8e6';
export const ESIM_STAKE_EVENT='0x492cc47ab15a29b394edf8b1cacdcb45d64a334b396c29be19a945a5bafd9392';
const ensure=(ok,code)=>{if(!ok)throw Error(code);};
const argument=input=>/^0x[0-9a-f]+$/i.test(input||'')&&input.length===266&&input.slice(0,10)===ESIM_STAKE_SELECTOR?BigInt('0x'+input.slice(10,74)):null;

export function verifyReturnTransaction(events,receipt,transaction,traces=[]){
 const first=events[0];
 ensure(first&&receipt?.status==='0x1'&&receipt.transactionHash===first.tx&&transaction?.hash===first.tx&&receipt.blockHash===transaction.blockHash&&(!first.blockHash||first.blockHash===receipt.blockHash)&&Number(BigInt(receipt.blockNumber))===first.order[0],'RETURN_RECEIPT_MISMATCH');
 const transferLogs=receipt.logs.filter(e=>e.address.toLowerCase()===TOKEN&&e.topics[0]===TRANSFER&&addr(e.topics[2])===SOURCE&&addr(e.topics[1])!==SOURCE&&BigInt(e.data)>0n);
 ensure(transferLogs.length===events.length&&events.every(e=>transferLogs.some(l=>eventKey(l)===e.id&&addr(l.topics[1])===e.from&&BigInt(l.data)===BigInt(e.value))),'RETURN_TRANSFER_MISMATCH');
 const successful=traces.filter(t=>t.type==='call'&&!t.error&&!traces.some(p=>p.error&&p.traceAddress.length<t.traceAddress.length&&p.traceAddress.every((n,i)=>n===t.traceAddress[i])));
 const calls=transaction.to?.toLowerCase()===SOURCE?[{from:transaction.from.toLowerCase(),input:transaction.input,value:transaction.value}]:successful.filter(t=>t.action?.to?.toLowerCase()===SOURCE).map(t=>t.action);
 const stakeLogs=receipt.logs.filter(e=>e.address.toLowerCase()===SOURCE&&e.topics[0]===ESIM_STAKE_EVENT);
 return events.map(e=>{
  const amount=BigInt(e.value),logs=stakeLogs.filter(l=>addr(l.topics[1])===e.from&&l.data.length>=130&&BigInt('0x'+l.data.slice(2,66))===amount);
  const matches=calls.filter(c=>c.from?.toLowerCase()===e.from&&BigInt(c.value||'0')===0n&&argument(c.input)===amount);
  // Ambiguous repeated calls/amounts remain explicitly unconfirmed.
  const same=events.filter(x=>x.from===e.from&&x.value===e.value);
  const verified=logs.length===same.length&&matches.length===same.length&&same.length>0;
  return {id:e.id,tx:e.tx,address:e.from,order:e.order,value_wei:e.value,verifiedStake:verified,reason:verified?'stake-input-event-transfer':logs.length?'stake-call-unconfirmed':'ordinary-transfer'};
 });
}

export async function collectReturnStakes(transfers,transport,{previous={},progress=()=>{}}={}){
 const groups=new Map();
 for(const e of transfers)if(e.to===SOURCE&&e.from!==SOURCE&&BigInt(e.value)>0n){if(!groups.has(e.tx))groups.set(e.tx,[]);groups.get(e.tx).push(e);}
 const proof={...previous},missing=[...groups.keys()].filter(tx=>!proof[tx]||proof[tx].blockHash!==groups.get(tx)[0].blockHash);
 progress({phase:'return-stake-evidence',transactions:missing.length});
 for(let i=0;i<missing.length;i+=80){
  const txs=missing.slice(i,i+80),receipts=await transport.batch(txs.map(tx=>['eth_getTransactionReceipt',[tx]])),transactions=await transport.batch(txs.map(tx=>['eth_getTransactionByHash',[tx]]));
  for(let j=0;j<txs.length;j++){
   const tx=txs[j],r=receipts[j],t=transactions[j];
   const needsTrace=t?.to?.toLowerCase()!==SOURCE&&r?.logs.some(l=>l.address.toLowerCase()===SOURCE&&l.topics[0]===ESIM_STAKE_EVENT);
   const traces=needsTrace?await transport.rpc('trace_transaction',[tx]):[];
   proof[tx]={blockHash:groups.get(tx)[0].blockHash,rows:verifyReturnTransaction(groups.get(tx),r,t,traces)};
  }
 }
 return {proof,rows:[...groups.keys()].flatMap(tx=>proof[tx].rows)};
}
