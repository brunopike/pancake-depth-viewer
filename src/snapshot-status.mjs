export const SNAPSHOT_INTERVAL_MS=60*60000;
let liveHealth=null,lastDisplay=null;
export function setSnapshotHealth(health){
 liveHealth=health;
 if(lastDisplay)showSnapshotStatus(...lastDisplay);
}
export function snapshotStatus(entries,{retained=false,now=Date.now(),realtime=globalThis.location?.hostname==='esimonchain.imstark.site',health=liveHealth}={}){
 const missing=entries.some(([,value])=>!Number.isFinite(value?.cutoff));
 const times=entries.filter(([,value])=>Number.isFinite(value?.cutoff));
 const ageMinutes=times.length?Math.max(0,Math.floor((now-Math.min(...times.map(([,value])=>value.cutoff*1000)))/60000)):null;
 const stale=ageMinutes!==null&&ageMinutes>=(realtime?20:120);
 const reason=realtime&&(health?.unavailable?'实时通道暂不可用，正在尝试定时快照':health?.error==='BACKFILL_IN_PROGRESS'?'正在补齐停更期间的链上记录':health?.error==='RPC_CAPACITY_EXCEEDED'?'链上数据源额度受限，自动更新暂停':health?.error?'后台更新未完成，正在自动重试':'');
 const date=s=>new Date(s*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
 const prefix=stale?`快照已过期，最早距今 ${ageMinutes} 分钟`:retained?'更新未完成，保留已显示数据':reason?'当前显示上次核验快照':'已读取最新可用快照';
 const details=entries.map(([label,value])=>Number.isFinite(value?.cutoff)?`${label}截至 ${date(value.cutoff)}`:`${label}数据暂缺`);
 return {warning:!!(retained||missing||stale||reason),text:[prefix,reason,...details,realtime?'北京时间 · Webhook 触发核验；10 分钟兜底补查；每小时存档':'北京时间 · 后台目标每 60 分钟更新；页面刷新读取可用快照'].filter(Boolean).join(' · ')};
}
export function showSnapshotStatus(status,button,entries,options){
 lastDisplay=[status,button,entries,options];
 const result=snapshotStatus(entries,options);
 status.textContent=result.text;status.className=result.warning?'notice':'success';
 button.dataset.snapshotWarning=String(result.warning);button.title=result.text;
 if(!button.disabled)button.textContent=refreshButtonLabel(button);
}
export const refreshButtonLabel=button=>button.dataset.snapshotWarning==='true'?'刷新数据 · 待更新':'刷新数据';
