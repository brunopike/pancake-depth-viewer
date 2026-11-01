const hex=n=>'0x'+n.toString(16);
export async function flowTarget(state,previous,transport,maxBlocks=100000){
 if(!Number.isSafeInteger(maxBlocks)||maxBlocks<1||maxBlocks>3000000)throw Error('INVALID_FLOW_WINDOW');
 const start=previous?.throughBlock??state.distributions.reduce((n,r)=>Math.min(n,r.block),Infinity)-1;
 const end=Math.min(state.block,start+maxBlocks);
 if(end===state.block)return state;
 const [last,next]=await transport.batch([['eth_getBlockByNumber',[hex(end),false]],['eth_getBlockByNumber',[hex(end+1),false]]],{fresh:true});
 if(!last?.hash||next?.parentHash!==last.hash)throw Error('FLOW_BOUNDARY_CHANGED');
 const cutoff=Number(BigInt(next.milliTimestamp||next.timestamp))/(next.milliTimestamp?1000:1);
 return {...state,block:end,blockHash:last.hash,cutoff,distributions:state.distributions.filter(r=>r.block<=end),trades:state.trades.filter(r=>r.block<=end)};
}
