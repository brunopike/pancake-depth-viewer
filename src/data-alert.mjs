export function renderDataAlert(model,root=globalThis.document?.getElementById('data-alert')){
 if(!root)return;
 root.hidden=!model;
 if(!model)return;
 const progress=model.severity==='progress',warning=model.severity==='warning';
 if(root.dataset)root.dataset.severity=progress?'progress':warning?'warning':'error';
 root.setAttribute?.('role',progress||warning?'status':'alert');
 const labels={'.data-alert-heading strong':model.title||'ESIM 链上 · 数据更新异常','.data-alert-heading>span':progress?'·':'!','.data-alert-fields>div:nth-child(1)>dt':progress?'当前进度':warning?'历史统计状态':'异常原因','.data-alert-fields>div:nth-child(2)>dt':warning?'历史数据截至':'最后更新时间','.data-alert-fields>div:nth-child(3)>dt':warning?'更新状态':'恢复状态'};
 for(const [selector,value]of Object.entries(labels)){const node=root.querySelector(selector);if(node&&node.textContent!==value)node.textContent=value;}
 const time=Number.isFinite(Date.parse(model.lastUpdated))?new Date(model.lastUpdated).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})+'（北京时间，数据截至）':'暂无成功更新记录';
 root.title=progress?[model.reason,time,model.recovery].filter(Boolean).join('；'):'';
 for(const [field,value]of Object.entries({reason:model.reason,time,recovery:model.recovery})){
  const node=root.querySelector(`[data-alert-${field}]`);if(node&&node.textContent!==value)node.textContent=value;
 }
}
export function depthDataAlert(live,{failed=false,recovering=false,auto=true,now=Date.now()}={}){
 const stale=Number.isFinite(live?.timestamp)&&now-live.timestamp>=15*60000,partial=live?.failed?.length||0;
 if(!failed&&!stale&&!partial)return null;
 const reason=[failed?'本次深度读取失败，保留上次可用数据':null,stale?'深度数据超过 15 分钟未更新':null,partial?`${partial} 个资金池数据暂缺，深度统计不完整`:null].filter(Boolean).join('；');
 const progress=!failed&&!stale;
 return {severity:progress?'progress':'error',title:progress?(recovering?'深度数据补充进行中':'部分池子数据待补齐'):undefined,reason,lastUpdated:live?.pools?.length&&Number.isFinite(live.timestamp)?new Date(live.timestamp).toISOString():null,recovery:recovering?'正在恢复：正在读取池子与 LP 数据':auto?'本轮尚未恢复，等待下一轮自动刷新':'自动刷新已关闭，可点击“刷新数据”重试'};
}
