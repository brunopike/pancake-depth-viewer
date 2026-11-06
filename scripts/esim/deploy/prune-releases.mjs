import {readdir,readlink,lstat,rm} from 'node:fs/promises';
import {join,relative,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export async function pruneReleases({root,shared,current,previous='',proc='/proc'}){
 const valid=x=>/^[0-9a-f]{40}$/.test(x);
 if(!valid(current)||(previous&&!valid(previous)))throw Error('INVALID_RELEASE');
 if(current===previous)return [];
 const keep=new Set([current,previous]),removed=[];
 for(const pid of await readdir(proc))if(/^\d+$/.test(pid)){
  try{const cwd=await readlink(join(proc,pid,'cwd')),id=relative(root,cwd).split('/')[0];if(valid(id))keep.add(id);}
  catch(e){if(e.code!=='ENOENT')throw e;}
 }
 for(const entry of await readdir(root,{withFileTypes:true})){
  if(!valid(entry.name)||!entry.isDirectory()||keep.has(entry.name))continue;
  const path=join(root,entry.name);
  try{
   if(!(await lstat(join(path,'.goodway'))).isSymbolicLink()||await readlink(join(path,'.goodway'))!==shared)continue;
   if(!(await lstat(join(path,'.git'))).isDirectory()||!(await lstat(join(path,'scripts/esim/vm-worker.mjs'))).isFile())continue;
  }catch(e){if(e.code==='ENOENT')continue;throw e;}
  // Only reproducible installed code is retired; shared checkpoints are symlinked outside it.
  await rm(path,{recursive:true});removed.push(entry.name);
 }
 return removed.sort();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [current,previous='']=process.argv.slice(2);
 console.log(JSON.stringify({retired:await pruneReleases({root:'/opt/esim-worker/releases',shared:'/var/lib/esim-worker',current,previous})}));
}
