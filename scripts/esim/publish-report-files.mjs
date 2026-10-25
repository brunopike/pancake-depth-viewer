import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// Git's binary transport avoids the REST blob endpoint's JSON input-size limit.
// A private temporary index keeps the active branch and user's staging untouched.
export async function publishReportFiles(files,{cwd=process.cwd(),skip=()=>false,message}={}){
 const core=files.some(([path])=>path==='report.json');
 const allowed=core?['state.json.gz','report.json','addresses.json']:['claim-flow-state.json.gz','claim-flow.json'];
 if(files.length!==allowed.length||new Set(files.map(([path])=>path)).size!==allowed.length||files.some(([path])=>!allowed.includes(path)))throw Error('INVALID_PUBLICATION_FILES');
 const run=promisify(execFile),dir=await mkdtemp(join(tmpdir(),'esim-publish-'));
 let stage='FETCH';
 const git=async(args,isolated=false)=>(await run('git',args,{cwd,maxBuffer:134217728,timeout:120000,env:isolated?{...process.env,GIT_INDEX_FILE:join(dir,'index')}:process.env})).stdout.trim();
 try{
  await git(['fetch','--no-tags','--depth=1','origin','esim-cache']);
  stage='BUILD';
  const parent=await git(['rev-parse','FETCH_HEAD']);
  const prior=JSON.parse(await git(['show',`${parent}:${core?'report.json':'claim-flow.json'}`]));
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
  await git(['push','origin',`${commit}:refs/heads/esim-cache`]);
  return commit;
 }catch{throw Error(`CHECKPOINT_PUBLISH_${stage}_FAILED`);}
 finally{await rm(dir,{recursive:true,force:true});}
}
