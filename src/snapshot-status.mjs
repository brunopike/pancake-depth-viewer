export const SNAPSHOT_INTERVAL_MS=60*60000;
export function snapshotStatus(entries,{retained=false,now=Date.now()}={}){
 const missing=entries.some(([,value])=>!Number.isFinite(value?.cutoff));
 const times=entries.filter(([,value])=>Number.isFinite(value?.cutoff));
 const ageMinutes=times.length?Math.max(0,Math.floor((now-Math.min(...times.map(([,value])=>value.cutoff*1000)))/60000)):null;
 const stale=ageMinutes!==null&&ageMinutes>=120;
 const date=s=>new Date(s*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
 const prefix=retained?'更新未完成，保留已显示数据':stale?`快照已过期，最早距今 ${ageMinutes} 分钟`:'已读取最新可用快照';
 const details=entries.map(([label,value])=>Number.isFinite(value?.cutoff)?`${label}截至 ${date(value.cutoff)}`:`${label}数据暂缺`);
 return {warning:retained||missing||stale,text:[prefix,...details,globalThis.location?.hostname==='esimonchain.imstark.site'?'北京时间 · Webhook 触发分钟级核验；每小时定时核查；页面自动读取更新':'北京时间 · 后台目标每 60 分钟更新；页面刷新读取可用快照'].join(' · ')};
}
export function showSnapshotStatus(status,button,entries,options){
 const result=snapshotStatus(entries,options);
 status.textContent=result.text;status.className=result.warning?'notice':'success';
 button.dataset.snapshotWarning=String(result.warning);button.title=result.text;
 if(!button.disabled)button.textContent=refreshButtonLabel(button);
}
export const refreshButtonLabel=button=>button.dataset.snapshotWarning==='true'?'刷新数据 · 待更新':'刷新数据';
