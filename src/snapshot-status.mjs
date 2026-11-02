import {renderDataAlert} from './data-alert.mjs';
import {auxiliaryIssues} from '../server/esim/worker-health.mjs';
export const SNAPSHOT_INTERVAL_MS=60*60000;
let liveHealth=null,lastDisplay=null,readFailed=false;
const failures={RPC_RATE_LIMITED:'链上数据源请求频率受限',RPC_UNAVAILABLE:'链上数据接口暂时不可用',RPC_MEMBER_FAILED:'部分链上查询暂时失败',QUERY_LIMIT:'本轮链上查询达到上限，记录尚未补齐',SNAPSHOT_NOT_ADVANCED:'数据尚未推进到新的区块',INVALID_SNAPSHOT:'数据快照核验未通过',CHECKPOINT_UNAVAILABLE:'历史核验断点暂时无法读取',NEW_ESIM_POOL_REQUIRES_SYNC:'发现新的交易池，相关历史数据尚未补齐',VM_TASK_TIMEOUT:'后台更新任务超时'};
export function chainFailureReason(code){
 if(failures[code])return failures[code];
 if(/^CHECKPOINT_PUBLISH_/.test(code||''))return '已核验结果暂时无法发布';
 if(/^(CHAIN_OR_CHECKPOINT_CHANGED|END_HASH_CHANGED|BOUNDARY_CHANGED|SOURCE_INFLOW_CHECKPOINT_CHANGED)$/.test(code||''))return '链上区块发生变化，需要重新核验';
 return '后台更新任务未完成';
}
export function setSnapshotHealth(health){
 liveHealth=health;
 if(lastDisplay)showSnapshotStatus(...lastDisplay.slice(0,3),{...lastDisplay[3],failed:readFailed});
 else if(readFailed)showSnapshotFailure();
}
export function snapshotStatus(entries,{retained=false,failed=false,now=Date.now(),realtime=globalThis.location?.hostname==='esimonchain.imstark.site',health=liveHealth}={}){
 const missing=entries.some(([,value])=>!Number.isFinite(value?.cutoff));
 const times=entries.filter(([,value])=>Number.isFinite(value?.cutoff));
 const ageMinutes=times.length?Math.max(0,Math.floor((now-Math.min(...times.map(([,value])=>value.cutoff*1000)))/60000)):null;
 const stale=ageMinutes!==null&&ageMinutes>=(realtime?15:120);
 const auxiliary=auxiliaryIssues(health?.auxiliary,now),labels={provenance:'分发币跨地址追踪',cohort:'外部地址关系及余额核验',archive:'历史断点存档'};
 const running=kind=>health?.auxiliaryJobs?.[kind]?.running===true;
 const auxiliaryReason=auxiliary.map(issue=>{const kind=issue.split(':')[0];return labels[kind]+(issue.endsWith(':FUTURE_TIME')?'数据时间异常':running(kind)?'正在补算，已发布结果尚未更新':issue.endsWith(':PENDING')?'尚未完成':'已发布数据超过两小时未更新');}).join('；');
 const future=times.some(([,value])=>value.cutoff*1000>now+60000);
 const historyOnly=realtime&&auxiliary.length>0&&!retained&&!failed&&!missing&&!stale&&!future&&!health?.error&&!health?.unavailable&&!auxiliary.some(i=>i.endsWith(':FUTURE_TIME'));
 const historyRunning=auxiliary.some(i=>running(i.split(':')[0]));
 const reason=realtime&&[health?.unavailable?'实时通道暂不可用，将使用定时快照补查':health?.error==='BACKFILL_IN_PROGRESS'?'正在补齐停更期间的链上记录':health?.error==='RPC_CAPACITY_EXCEEDED'?'链上数据源额度受限，自动更新暂停':health?.error?chainFailureReason(health.error):'',auxiliaryReason].filter(Boolean).join('；');
 const date=s=>new Date(s*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
 const prefix=historyOnly?entries.map(([label])=>label).join('和')+'已更新，部分历史统计待更新':stale?`快照已过期，最早距今 ${ageMinutes} 分钟`:retained||failed?'更新未完成，保留已显示数据':reason?'当前显示上次核验快照':'已读取最新可用快照';
 const details=entries.map(([label,value])=>Number.isFinite(value?.cutoff)?`${label}截至 ${date(value.cutoff)}`:`${label}数据暂缺`);
 const warning=!!(retained||failed||missing||stale||future||reason);
 const causes=[future?'数据截止时间超前，需核验时钟或数据':null,failed?'当前页面读取失败':null,stale?`数据超过 ${realtime?15:120} 分钟未更新（最早距今 ${ageMinutes} 分钟）`:null,missing?entries.filter(([,v])=>!Number.isFinite(v?.cutoff)).map(([label])=>label+'数据暂缺').join('、'):null,reason,retained&&!failed?'本次未取得完整更新，保留上次已核验数据':null].filter(Boolean);
 let recovery='暂未确认正在恢复，等待后台定时补查';
 if(!realtime)recovery='等待下一轮定时快照；页面可刷新重试';
 else if(health?.unavailable)recovery='恢复进度暂无法确认；页面每分钟重试连接';
 else if(health?.error==='RPC_CAPACITY_EXCEEDED')recovery='更新已暂停，需要恢复数据源额度';
 else if(health?.error==='BACKFILL_IN_PROGRESS')recovery='正在恢复：补齐停更期间的链上记录';
 else if(health?.error)recovery='等待后台自动重试；原有已核验数据保留';
 else if(auxiliary.length)recovery=historyRunning?'对应后台历史核验任务正在运行；结果完成后自动更新，主交易和持仓独立更新':'等待对应后台核验任务完成；主交易和持仓更新独立运行';
 else if(Number(health?.pendingBlock)>Number(health?.processedBlock)&&now-Date.parse(health?.lastProcessed)<300000)recovery='正在恢复：后台正在补齐后续区块';
 const updates=[...times.map(([,v])=>v.cutoff),...auxiliary.map(issue=>health.auxiliary[issue.split(':')[0]]?.cutoff).filter(Number.isFinite)];
 const lastUpdated=updates.length&&!auxiliary.some(issue=>issue.endsWith(':PENDING'))?new Date(Math.min(...updates)*1000).toISOString():null;
 return {warning,alert:warning?{severity:historyOnly?'warning':'error',scope:historyOnly?'history':'core',title:historyOnly?'ESIM 链上 · 历史统计待更新':'ESIM 链上 · 数据更新异常',reason:causes.join('；')||'数据更新状态异常',lastUpdated,recovery}:null,text:[prefix,reason,...details,warning?recovery:null,realtime?'北京时间 · Webhook 触发核验；10 分钟兜底补查；每小时存档':'北京时间 · 后台目标每 60 分钟更新；页面刷新读取可用快照'].filter(Boolean).join(' · ')};
}
export function showSnapshotStatus(status,button,entries,options){
 readFailed=options?.failed===true;
 lastDisplay=[status,button,entries,options];
 const result=snapshotStatus(entries,options);
 status.textContent=result.text;status.className=result.warning?'notice':'success';
 renderDataAlert(result.alert);
 button.dataset.snapshotWarning=String(result.warning);button.title=result.text;
 if(!button.disabled)button.textContent=refreshButtonLabel(button);
}
export function showSnapshotFailure(){
 readFailed=true;
 const entries=lastDisplay?.[2]||[];
 renderDataAlert(snapshotStatus(entries,{...lastDisplay?.[3],failed:true,retained:true}).alert);
}
export const refreshButtonLabel=button=>button.dataset.snapshotWarning==='true'?'刷新数据 · 待更新':'刷新数据';
