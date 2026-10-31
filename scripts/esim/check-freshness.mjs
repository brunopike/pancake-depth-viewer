import {appendFile} from 'node:fs/promises';
import {snapshotIssues,ledgerIssues} from '../../server/esim/worker-health.mjs';
const issues=[],summary={at:new Date().toISOString(),ledgers:{}};
try{
 const response=await fetch('https://esimonchain.imstark.site/api/esim-snapshot?kind=status&_fresh='+Date.now(),{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('HTTP_'+response.status);
 const status=await response.json();summary.snapshots=status.snapshots;summary.lastDelivery=status.lastDelivery;issues.push(...snapshotIssues(status));
}catch{issues.push('chain:HEALTH_UNAVAILABLE');}
for(const host of ['mmledger.imstark.site','mmreport.imstark.site']){
 try{
  const r=await fetch(`https://${host}/api/health`,{signal:AbortSignal.timeout(30000),cache:'no-store'});
  if(!r.ok)throw Error('HTTP_'+r.status);
  const h=await r.json();summary.ledgers[host]=h;issues.push(...ledgerIssues(h).map(x=>host+':'+x));
 }catch{issues.push(host+':HEALTH_UNAVAILABLE');}
}
summary.issues=issues;console.log(JSON.stringify(summary));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'## ESIM 与做市账本数据巡检\n\n```json\n'+JSON.stringify(summary,null,2)+'\n```\n');
for(const issue of issues)console.error('::error title=ESIM 数据更新异常::'+issue);
if(issues.length)process.exitCode=1;
