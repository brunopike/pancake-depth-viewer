import {encodeFunctionData,parseAbi} from 'viem';
import {TOKEN} from './metrics.mjs';
import {V2,V3,addr} from './attribution.mjs';

const FACTORY='0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865';
const abi=parseAbi(['function getPool(address,address,uint24) view returns (address)']);
const hex=n=>'0x'+n.toString(16);
const word=value=>{if(!/^0x[0-9a-f]{64}$/i.test(value||''))throw Error('CLASSIC_POOL_METADATA_MISSING');return value;};

export async function discoverClassicPools(events,pools,{batch,rpc},checkpoint,end){
 const unknown=[...new Set(events.filter(e=>(V3.has(e.topics[0])||e.topics[0]===V2)&&!pools[e.address.toLowerCase()]).map(e=>e.address.toLowerCase()))];
 if(!unknown.length)return {};
 const tokens=await batch(unknown.flatMap(to=>['0x0dfe1681','0xd21220a7'].map(data=>['eth_call',[{to,data},hex(end)]])));
 const added={};
 for(const [i,id] of unknown.entries()){
  const token0=addr(word(tokens[i*2])),token1=addr(word(tokens[i*2+1]));
  if(![token0,token1].includes(TOKEN))continue;
  if(!events.some(e=>e.address.toLowerCase()===id&&V3.has(e.topics[0])))throw Error('NEW_ESIM_POOL_REQUIRES_SYNC');
  const [factory,feeWord]=await batch(['0xc45a0155','0xddca3f43'].map(data=>['eth_call',[{to:id,data},hex(end)]]));
  if(addr(word(factory))!==FACTORY)throw Error('NEW_ESIM_POOL_REQUIRES_SYNC');
  const fee=Number(BigInt(word(feeWord)));
  if(!Number.isSafeInteger(fee)||fee<=0||fee>0xffffff)throw Error('CLASSIC_POOL_METADATA_MISSING');
  const canonical=await rpc('eth_call',[{to:FACTORY,data:encodeFunctionData({abi,functionName:'getPool',args:[token0,token1,fee]})},hex(end)]);
  if(addr(word(canonical))!==id)throw Error('CLASSIC_POOL_IDENTITY_MISMATCH');
  // A newly discovered old pool cannot silently bypass earlier trading history.
  for(const field of ['fromAddress','toAddress']){
   const history=await rpc('alchemy_getAssetTransfers',[{fromBlock:'0x0',toBlock:hex(checkpoint),[field]:id,contractAddresses:[TOKEN],category:['erc20'],excludeZeroValue:true,maxCount:'0x1',order:'asc'}]);
   if(!Array.isArray(history?.transfers))throw Error('INDEX_INCOMPLETE');
   if(history.transfers.length||history.pageKey)throw Error('NEW_ESIM_POOL_HISTORY_REQUIRES_BACKFILL');
  }
  added[id]={id,manager:id,token0,token1,fee,verified:'Pancake V3 factory; no earlier ESIM activity',discoveredAfter:checkpoint};
 }
 return added;
}
