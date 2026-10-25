import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,mkdir,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {publishReportFiles} from '../scripts/esim/publish-report-files.mjs';

test('binary publication preserves the working branch, staged user edits and unrelated cache files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-publication-test-')),bare=join(dir,'remote'),cwd=join(dir,'checkout');
 const git=(args,options={})=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['pipe','pipe','pipe'],...options}).trim();
 try{
  await mkdir(cwd);execFileSync('git',['init','--bare',bare],{stdio:'ignore'});git(['init']);git(['config','user.name','Fixture']);git(['config','user.email','fixture@example.invalid']);git(['remote','add','origin',bare]);
  await writeFile(join(cwd,'report.json'),JSON.stringify({block:1}));await writeFile(join(cwd,'keep.txt'),'preserve');git(['add','.']);git(['commit','-m','seed']);git(['push','origin','HEAD:refs/heads/esim-cache']);
  const head=git(['rev-parse','HEAD']);await writeFile(join(cwd,'user.txt'),'staged draft');git(['add','user.txt']);const staged=git(['diff','--cached']);
  const bytes=Buffer.from([0,255,31,139,128,0]);
  const commit=await publishReportFiles([['state.json.gz',bytes],['report.json','{"block":2}'],['addresses.json','{"rows":[]}']],{cwd,message:'verified checkpoint',skip:prior=>prior.block>=2});
  assert.match(commit,/^[0-9a-f]{40}$/);assert.equal(git(['rev-parse','HEAD']),head);assert.equal(git(['diff','--cached']),staged);assert.equal(await readFile(join(cwd,'user.txt'),'utf8'),'staged draft');
  assert.equal(git(['show',`${commit}:keep.txt`]),'preserve');
  assert.deepEqual(execFileSync('git',['show',`${commit}:state.json.gz`],{cwd}),bytes);
  assert.equal(await publishReportFiles([['state.json.gz',bytes],['report.json','{"block":1}'],['addresses.json','{}']],{cwd,message:'old',skip:prior=>prior.block>=1}),false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
