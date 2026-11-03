import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function recoveryAdmission(runtime,meminfo){
 const available=/^MemAvailable:\s+(\d+)\s+kB$/m.exec(meminfo);
 if(!available)return 'HOST_MEMORY_UNKNOWN';
 if(BigInt(available[1])*1024n<1280n*1024n*1024n)return 'HOST_MEMORY_LOW';
 if(!['active','activating','reloading','deactivating','inactive','failed'].includes(runtime.ActiveState))return 'PRIMARY_STATE_UNKNOWN';
 if(/^\d+$/.test(runtime.MemoryCurrent||'')){
  if(BigInt(runtime.MemoryCurrent)>2100n*1024n*1024n)return 'PRIMARY_MEMORY_HIGH';
 }else if(!['inactive','failed'].includes(runtime.ActiveState))return 'PRIMARY_MEMORY_UNKNOWN';
 return null;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const output=execFileSync('systemctl',['show','esim-worker','--property=ActiveState,MemoryCurrent'],{encoding:'utf8',timeout:5000});
  const runtime=Object.fromEntries(output.trim().split('\n').map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
  const reason=recoveryAdmission(runtime,readFileSync('/proc/meminfo','utf8'));
  if(reason){console.log('MM_RECOVERY_DEFERRED '+reason);process.exitCode=1;}
 }catch{console.error('MM_RECOVERY_PREFLIGHT_UNAVAILABLE');process.exitCode=1;}
}
