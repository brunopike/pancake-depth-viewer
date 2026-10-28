// Depth follows the first chronological discovery path saved by the indexer.
// Work iteratively so even very long paths do not hit the JS call-stack limit.
export function cohortPathSummary(rows){
 const byAddress=new Map(rows.map(row=>[row.address,row])),depths=new Map();
 for(const row of rows)if(row.role!=='downstream')depths.set(row.address,row.role==='direct'?0:null);
 for(const row of rows){
  if(depths.has(row.address))continue;
  const path=[],seen=new Set();let current=row;
  while(current&&!depths.has(current.address)&&!seen.has(current.address)){
   seen.add(current.address);path.push(current);current=byAddress.get(current.via);
  }
  let depth=current&&depths.has(current.address)?depths.get(current.address):null;
  for(let i=path.length-1;i>=0;i--){if(depth!==null)depth++;depths.set(path[i].address,depth);}
 }
 const depthCounts={};let maxDepth=0,unresolvedCount=0,downstreamCount=0;
 for(const row of rows)if(row.role==='downstream'){
  downstreamCount++;const depth=depths.get(row.address);
  if(depth===null){unresolvedCount++;continue;}
  maxDepth=Math.max(maxDepth,depth);depthCounts[depth]=(depthCounts[depth]||0)+1;
 }
 return {depths,maxDepth,depthCounts,downstreamCount,unresolvedCount};
}
export function cohortTrackingNote(summary){
 const deepest=summary?.maxDepth>0?`当前最深第 ${summary.maxDepth} 层（首次识别路径）。`:'暂无已识别下游路径。';
 const unresolved=summary?.unresolvedCount?`${summary.unresolvedCount} 个地址的完整上游路径待核验。`:'';
 return `下游不设固定层数上限，按已索引转账逐级追踪；${deepest}${unresolved}到达我方、混合钱包、分发合约或公共路由 / 资金池时停止扩散，不代表这些地址没有后续转账。`;
}
