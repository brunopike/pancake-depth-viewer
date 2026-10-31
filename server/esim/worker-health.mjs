export const STALE_PROGRESS_SECONDS=15*60;
export const checkpointPassComplete=(startedAt,now,persistent)=>persistent&&now-startedAt>=90000;
export const standbyMayTakeover=(job,file,githubActions)=>githubActions==='true'&&
 (job==='core'&&file==='scripts/esim/realtime-worker.mjs'||job==='depth'&&file==='scripts/hourly-worker.mjs');

export function snapshotIssues(status,now=Date.now()){
 const issues=[],snapshots=status?.snapshots||{};
 for(const kind of ['report','addresses','holders','depth']){
  const row=snapshots[kind];
  if(!row||!Number.isFinite(row.cutoff)||row.cutoff<=0){issues.push(kind+':MISSING');continue;}
  if(row.cutoff*1000>now+60000)issues.push(kind+':FUTURE_TIME');
  else if(now-row.cutoff*1000>STALE_PROGRESS_SECONDS*1000)issues.push(kind+':STALE');
 }
 if(snapshots.report&&snapshots.addresses&&(snapshots.report.block!==snapshots.addresses.block||snapshots.report.cutoff!==snapshots.addresses.cutoff))issues.push('core:VIEW_MISMATCH');
 if(status?.error)issues.push('core:'+status.error);
 const delivered=Date.parse(status?.lastDelivery);
 if(!Number.isFinite(delivered)||now-delivered>3600000)issues.push('webhook:SILENT');
 return issues;
}
