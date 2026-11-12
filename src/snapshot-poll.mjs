import {realtimeHost} from './snapshot-client.mjs';
import {setSnapshotHealth} from './snapshot-status.mjs';
import {expireClaimFlowCache} from './claim-flow-client.mjs';
// Poll only a small revision marker; fetch the larger datasets when changed.
// A failed live store still refreshes the independent scheduled fallback.
export function startSnapshotPolling(refresh){
 if(!realtimeHost())return;
 let revision='',flowRevision='',lastFallback=Date.now(),pending=false;
 const poll=async()=>{
  if(document.hidden||pending)return;
  pending=true;
  try{
   const response=await fetch('./api/esim-snapshot?kind=status',{cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error('STATUS_UNAVAILABLE');
   const data=await response.json(),published=data.auxiliary?.provenance?.publishedAt||'',next=`${data.processedBlock}:${data.holderBlock}:${data.error||''}:${published}:${data.auxiliary?.cohort?.publishedAt||''}`;
   if(published&&published!==flowRevision){expireClaimFlowCache();flowRevision=published;}
   setSnapshotHealth(data);
   if(next!==revision||Date.now()-lastFallback>=300000){const applied=await refresh();if(applied!==false){revision=next;lastFallback=Date.now();}}
  }catch{setSnapshotHealth({unavailable:true});if(Date.now()-lastFallback>=300000){try{const applied=await refresh();if(applied!==false)lastFallback=Date.now();}catch{}}}
  finally{pending=false;}
 };
 const timer=setInterval(poll,60000);
 document.addEventListener('visibilitychange',poll);
 window.addEventListener('pagehide',()=>{clearInterval(timer);document.removeEventListener('visibilitychange',poll);},{once:true});
 void poll();
}
