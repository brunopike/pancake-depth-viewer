import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {leaseFromEnvironment,requireLease} from '../../server/esim/worker-lease.mjs';

// Git's binary transport avoids the REST blob endpoint's JSON input-size limit.
// A private temporary index keeps the active branch and user's staging untouched.
export async function publishReportFiles(files,{cwd=process.cwd(),skip=()=>false,message,branch='esim-cache'}={}){
 if(!['esim-cache','holder-cache','depth-cache'].includes(branch))throw Error('INVALID_PUBLICATION_BRANCH');
 const cohortOnly=branch==='esim-cache'&&files.length===1&&files[0][0]==='cohort.json.gz';
 const single=branch!=='esim-cache';
 const core=files.some(([path])=>path==='report.json');
 const allowed=cohortOnly?['cohort.json.gz']:branch==='holder-cache'?['holders.json']:branch==='depth-cache'&&files.length===1&&/^(?:esim-usdt|0x[0-9a-f]{40}-0x[0-9a-f]{40})\.json$/.test(files[0][0])?[files[0][0]]:branch==='esim-cache'?(core?['state.json.gz','report.json','addresses.json']:['claim-flow-state.json.gz','claim-flow.json.gz',...(files.some(([path])=>path==='cohort.json.gz')?['cohort.json.gz']:[])]):[];
 if(!allowed.length||files.length!==allowed.length||new Set(files.map(([path])=>path)).size!==allowed.length||files.some(([path])=>!allowed.includes(path)))throw Error('INVALID_PUBLICATION_FILES');
 if(files.some(([,content])=>Buffer.byteLength(content)>100*1024*1024))throw Error('CHECKPOINT_FILE_TOO_LARGE');
 const run=promisify(execFile),dir=await mkdtemp(join(tmpdir(),'esim-publish-'));
 let stage='FETCH';
 const git=async(args,isolated=false)=>(await run('git',args,{cwd,maxBuffer:134217728,timeout:120000,env:isolated?{...process.env,GIT_INDEX_FILE:join(dir,'index')}:process.env})).stdout.trim();
 try{
  await git(['fetch','--no-tags','--depth=1','origin',branch]);
  stage='BUILD';
  const parent=await git(['rev-parse','FETCH_HEAD']);
  let prior;
  if(cohortOnly){const names=await git(['ls-tree','--name-only',parent,'cohort.json.gz']);if(names){const {stdout}=await run('git',['show',`${parent}:cohort.json.gz`],{cwd,encoding:'buffer',maxBuffer:134217728,timeout:120000});prior=JSON.parse(gunzipSync(stdout));}}
  else if(single){
   const names=await git(['ls-tree','--name-only',parent,files[0][0]]);
   if(names)prior=JSON.parse(await git(['show',`${parent}:${files[0][0]}`]));
  }else if(core)prior=JSON.parse(await git(['show',`${parent}:report.json`]));
  else{
   const names=await git(['ls-tree','--name-only',parent,'claim-flow.json.gz']);
   if(names){const {stdout}=await run('git',['show',`${parent}:claim-flow.json.gz`],{cwd,encoding:'buffer',maxBuffer:134217728,timeout:120000});prior=JSON.parse(gunzipSync(stdout));}
   else prior=JSON.parse(await git(['show',`${parent}:claim-flow.json`]));
  }
  if(skip(prior))return false;
  await git(['read-tree',parent],true);
  for(const [path,content]of files){
   const file=join(dir,path);await writeFile(file,content);
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
