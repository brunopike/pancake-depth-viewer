import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,access,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pruneReleases} from '../scripts/esim/deploy/prune-releases.mjs';

test('release retention preserves current, rollback, running processes, shared data and unknown directories',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-releases-')),root=join(dir,'releases'),shared=join(dir,'data'),proc=join(dir,'proc');
 const ids='abcdef'.split('').map(x=>x.repeat(40));
 try{
  await Promise.all([mkdir(root),mkdir(shared),mkdir(proc)]);await writeFile(join(shared,'checkpoint'),'keep');
  for(const id of ids){const p=join(root,id);await mkdir(join(p,'scripts/esim'),{recursive:true});await writeFile(join(p,'scripts/esim/vm-worker.mjs'),'');await mkdir(join(p,'.git'));await symlink(shared,join(p,'.goodway'));}
  await mkdir(join(proc,'42'));await symlink(join(root,ids[2],'scripts'),join(proc,'42/cwd'));
  await rm(join(root,ids[4],'.goodway'));await mkdir(join(root,ids[4],'.goodway'));
  await rm(join(root,ids[5]),{recursive:true});await symlink(shared,join(root,ids[5]));await mkdir(join(root,'unrecognized'));
  assert.deepEqual(await pruneReleases({root,shared,current:ids[0],previous:ids[0],proc}),[],'reinstalling the current commit must retain the existing rollback');await access(join(root,ids[3]));
  assert.deepEqual(await pruneReleases({root,shared,current:ids[0],previous:ids[1],proc}),[ids[3]]);
  for(const p of [ids[0],ids[1],ids[2],ids[4],ids[5],'unrecognized'])await access(join(root,p));
  await access(join(shared,'checkpoint'));await assert.rejects(access(join(root,ids[3])));
  await assert.rejects(pruneReleases({root,shared,current:'bad',previous:ids[1],proc}),/INVALID_RELEASE/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
