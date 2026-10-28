import {keccak256} from 'viem';
import {TOKEN} from './metrics.mjs';

// BscScan exact-match DEPINSIMToken + ERC20Upgradeable source, reviewed at
// block 130294037. All balance changes in this implementation emit Transfer.
// https://bscscan.com/address/0xa936365df925adbcd0746cc4554ad5c230ece97d#code
export const BALANCE_IMPLEMENTATION = {
 address:'0xa936365df925adbcd0746cc4554ad5c230ece97d',
 proxyHash:'0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6',
 codeHash:'0x4acb3cb6eb3ec59502958f44acea63fa0dd4d77f99c0d3c249450773f933dfd5',
};
const SLOT='0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const UPGRADED='0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b';
const hex=n=>'0x'+n.toString(16);

export async function canReuseHolderBalances(transport,previous,end,priorEnd){
 // A new/unknown implementation, any upgrade within either interval, or an
 // unavailable guard read forces full balanceOf reads. It never reuses data.
 try{
  const bounds=[previous.block,end,previous.priorBlock,priorEnd];
  if(bounds.some(n=>!Number.isSafeInteger(n)||n<0))return false;
  const calls=bounds.map(n=>['eth_getStorageAt',[TOKEN,SLOT,hex(n)]]);
  calls.push(['eth_getCode',[TOKEN,hex(end)]],['eth_getCode',[BALANCE_IMPLEMENTATION.address,hex(end)]]);
  for(const [from,to] of [[previous.block+1,end],[previous.priorBlock+1,priorEnd]]){
   for(let n=from;n<=to;n+=3000)calls.push(['eth_getLogs',[{address:TOKEN,topics:[UPGRADED],fromBlock:hex(n),toBlock:hex(Math.min(n+2999,to))}]]);
  }
  const values=await transport.batch(calls);
  return values.length===calls.length
   &&values.slice(0,4).every(v=>v==='0x'+BALANCE_IMPLEMENTATION.address.slice(2).padStart(64,'0'))
   &&keccak256(values[4])===BALANCE_IMPLEMENTATION.proxyHash
   &&keccak256(values[5])===BALANCE_IMPLEMENTATION.codeHash
   &&values.slice(6).every(v=>Array.isArray(v)&&v.length===0);
 }catch{return false;}
}
