import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {leaseFromEnvironment,requireLease} from '../../server/esim/worker-lease.mjs';
import {packCheckpointFiles} from '../../server/esim/checkpoint-chunks.mjs';

// Git must not detach an unbounded GC while the next ledger task is running.
const gitLimits=['-c','gc.auto=0','-c','maintenance.auto=false','-c','pack.threads=1','-c','pack.windowMemory=64m','-c','pack.deltaCacheSize=32m'];

// Git's binary transport avoids the REST blob endpoint's JSON input-size limit.
// A disposable partial repository avoids retaining every historical checkpoint.
export async function publishReportFiles(files,{cwd=process.cwd(),skip=()=>false,message,branch='esim-cache'}={}){
 if(!['esim-cache','holder-cache','depth-cache'].includes(branch))throw Error('INVALID_PUBLICATION_BRANCH');
 const cohortOnly=branch==='esim-cache'&&files.some(([p])=>p==='cohort.json.gz')&&files.every(([p])=>['cohort.json.gz','cohort-health.json'].includes(p));
 const single=branch!=='esim-cache';
 const core=files.some(([path])=>path==='report.json');
 const allowed=cohortOnly?['cohort.json.gz',...(files.some(([p])=>p==='cohort-health.json')?['cohort-health.json']:[])]:branch==='holder-cache'?['holders.json']:branch==='depth-cache'&&files.length===1&&/^(?:esim-usdt|0x[0-9a-f]{40}-0x[0-9a-f]{40})\.json$/.test(files[0][0])?[files[0][0]]:branch==='esim-cache'?(core?['state.json.gz','report.json','addresses.json',...(files.some(([p])=>p==='archive-health.json')?['archive-health.json']:[])]:['claim-flow-state.json.gz','claim-flow.json.gz',...(files.some(([p])=>p==='provenance-health.json')?['provenance-health.json']:[])]):[];
 if(!allowed.length||files.length!==allowed.length||new Set(files.map(([path])=>path)).size!==allowed.length||files.some(([path])=>!allowed.includes(path)))throw Error('INVALID_PUBLICATION_FILES');
 const physical=files.flatMap(([path,content])=>['state.json.gz','claim-flow-state.json.gz'].includes(path)?packCheckpointFiles(path,content):[[path,content]]);
 if(physical.some(([,content])=>Buffer.byteLength(content)>100*1024*1024))throw Error('CHECKPOINT_FILE_TOO_LARGE');
 const run=promisify(execFile),dir=await mkdtemp(join(tmpdir(),'esim-publish-')),repository=join(dir,'repository.git');
 let stage='FETCH',transportEnv=process.env;
 const sourceGit=async args=>(await run('git',[...gitLimits,...args],{cwd,maxBuffer:1048576,timeout:120000})).stdout.trim();
 const git=async(args,isolated=false)=>(await run('git',[...gitLimits,...args],{cwd:repository,maxBuffer:134217728,timeout:120000,env:isolated?{...transportEnv,GIT_INDEX_FILE:join(dir,'index')}:transportEnv})).stdout.trim();
 try{
  const [fetchURL,pushURL]=await Promise.all([sourceGit(['remote','get-url','origin']),sourceGit(['remote','get-url','--push','origin'])]);
  const auth=(await sourceGit(['config','--local','--null','--list'])).split('\0').filter(Boolean).map(entry=>[entry.slice(0,entry.indexOf('\n')),entry.slice(entry.indexOf('\n')+1)]).filter(([key])=>/^(?:http(?:\..+)?\.extraheader|credential(?:\..+)?\.helper|core\.sshcommand)$/i.test(key));
  // Preserve checkout authentication in child environment, never command arguments or release files.
  transportEnv={...process.env};const count=Number(process.env.GIT_CONFIG_COUNT||0);
  for(let i=0;i<count;i++){transportEnv[`GIT_CONFIG_KEY_${i+auth.length}`]=process.env[`GIT_CONFIG_KEY_${i}`];transportEnv[`GIT_CONFIG_VALUE_${i+auth.length}`]=process.env[`GIT_CONFIG_VALUE_${i}`];}
  auth.forEach(([key,value],i)=>{transportEnv[`GIT_CONFIG_KEY_${i}`]=key;transportEnv[`GIT_CONFIG_VALUE_${i}`]=value;});transportEnv.GIT_CONFIG_COUNT=String(count+auth.length);
  await run('git',[...gitLimits,'init',repository],{cwd:dir,timeout:120000});
  await git(['remote','add','origin',fetchURL]);await git(['remote','set-url','--push','origin',pushURL]);
  await git(['config','remote.origin.promisor','true']);await git(['config','remote.origin.partialclonefilter','blob:none']);
  await git(['fetch','--filter=blob:none','--no-tags','--depth=1','origin',branch]);
  stage='BUILD';
  const parent=await git(['rev-parse','FETCH_HEAD']);
  let prior;
  if(cohortOnly){const names=await git(['ls-tree','--name-only',parent,'cohort.json.gz']);if(names){const {stdout}=await run('git',[...gitLimits,'show',`${parent}:cohort.json.gz`],{cwd:repository,env:transportEnv,encoding:'buffer',maxBuffer:134217728,timeout:120000});prior=JSON.parse(gunzipSync(stdout));}}
  else if(single){
   const names=await git(['ls-tree','--name-only',parent,files[0][0]]);
   if(names)prior=JSON.parse(await git(['show',`${parent}:${files[0][0]}`]));
  }else if(core)prior=JSON.parse(await git(['show',`${parent}:report.json`]));
  else{
   const names=await git(['ls-tree','--name-only',parent,'claim-flow.json.gz']);
   if(names){const {stdout}=await run('git',[...gitLimits,'show',`${parent}:claim-flow.json.gz`],{cwd:repository,env:transportEnv,encoding:'buffer',maxBuffer:134217728,timeout:120000});prior=JSON.parse(gunzipSync(stdout));}
   else prior=JSON.parse(await git(['show',`${parent}:claim-flow.json`]));
  }
  if(skip(prior))return false;
  await git(['read-tree',parent],true);
  for(const [path]of files)if(['state.json.gz','claim-flow-state.json.gz'].includes(path)){
   const old=await git(['ls-tree','-r','--name-only',parent,'checkpoint-parts/'+path+'/']);
   for(const name of old.split('\n').filter(Boolean))await git(['update-index','--force-remove',name],true);
  }
  for(const [path,content]of physical){
   const file=join(dir,path);await mkdir(dirname(file),{recursive:true});await writeFile(file,content);
   const sha=await git(['hash-object','-w',file]);
   await git(['update-index','--add','--cacheinfo',`100644,${sha},${path}`],true);
  }
  const tree=await git(['write-tree'],true);
  const commit=await git(['-c','user.name=ESIM Snapshot Worker','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit-tree',tree,'-p',parent,'-m',message]);
  // No force: a concurrent publication is preserved by the normal fast-forward check.
  stage='PUSH';
  const lease=leaseFromEnvironment();if(lease)await requireLease(lease);
  await git(['push','origin',`${commit}:refs/heads/${branch}`]);
  return commit;
 }catch(error){throw Error(stage==='PUSH'&&/exceeds GitHub's file size limit|exceeds.*100.*MB|GH001/.test(String(error.stderr))?'CHECKPOINT_FILE_TOO_LARGE':`CHECKPOINT_PUBLISH_${stage}_FAILED`);}
 finally{await rm(dir,{recursive:true,force:true});}
}
