import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,mkdir,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {publishReportFiles} from '../scripts/esim/publish-report-files.mjs';

test('binary publication preserves the working branch, staged user edits and unrelated cache files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-publication-test-')),bare=join(dir,'remote'),cwd=join(dir,'checkout');
 const git=(args,options={})=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['pipe','pipe','pipe'],...options}).trim();
 try{
  await mkdir(cwd);execFileSync('git',['init','--bare',bare],{stdio:'ignore'});git(['init']);git(['config','user.name','Fixture']);git(['config','user.email','fixture@example.invalid']);git(['remote','add','origin',bare]);
  await writeFile(join(cwd,'report.json'),JSON.stringify({block:1}));await writeFile(join(cwd,'claim-flow.json'),'{"throughBlock":1}');await writeFile(join(cwd,'keep.txt'),'preserve');git(['add','.']);git(['commit','-m','seed']);git(['push','origin','HEAD:refs/heads/esim-cache']);
  const head=git(['rev-parse','HEAD']);await writeFile(join(cwd,'user.txt'),'staged draft');git(['add','user.txt']);const staged=git(['diff','--cached']);
  const bytes=Buffer.from([0,255,31,139,128,0]);
  const commit=await publishReportFiles([['state.json.gz',bytes],['report.json','{"block":2}'],['addresses.json','{"rows":[]}']],{cwd,message:'verified checkpoint',skip:prior=>prior.block>=2});
  assert.match(commit,/^[0-9a-f]{40}$/);assert.equal(git(['rev-parse','HEAD']),head);assert.equal(git(['diff','--cached']),staged);assert.equal(await readFile(join(cwd,'user.txt'),'utf8'),'staged draft');
  assert.equal(git(['show',`${commit}:keep.txt`]),'preserve');
  assert.deepEqual(execFileSync('git',['show',`${commit}:state.json.gz`],{cwd}),bytes);
  assert.equal(await publishReportFiles([['state.json.gz',bytes],['report.json','{"block":1}'],['addresses.json','{}']],{cwd,message:'old',skip:prior=>prior.block>=1}),false);
  const packed=gzipSync('{"throughBlock":2,"evidence":["complete evidence"]}');
  const flow=await publishReportFiles([['claim-flow-state.json.gz',bytes],['claim-flow.json.gz',packed]],{cwd,message:'verified flow',skip:prior=>prior.throughBlock>=2});
  assert.equal(git(['show',`${flow}:report.json`]),'{"block":2}');
  assert.equal(gunzipSync(execFileSync('git',['show',`${flow}:claim-flow.json.gz`],{cwd})).toString(),gunzipSync(packed).toString());
  assert.equal(git(['show',`${flow}:claim-flow.json`]),'{"throughBlock":1}','legacy copy remains available to old readers');
  assert.equal(await publishReportFiles([['claim-flow-state.json.gz',bytes],['claim-flow.json.gz',packed]],{cwd,message:'stale flow',skip:prior=>prior.throughBlock>=2}),false);
  const large=Buffer.alloc(65*1024*1024,7),largeCommit=await publishReportFiles([['state.json.gz',large],['report.json','{"block":3}'],['addresses.json','{}'],['archive-health.json','{"block":3}']],{cwd,message:'chunked checkpoint'});
  const manifest=JSON.parse(gunzipSync(execFileSync('git',['show',`${largeCommit}:state.json.gz`],{cwd}))),digest=createHash('sha256');
  assert.equal(manifest.parts.length,3);
  for(const part of manifest.parts){const content=execFileSync('git',['show',`${largeCommit}:${part.path}`],{cwd,maxBuffer:40*1024*1024});assert.equal(content.length,part.bytes);digest.update(content);}
  assert.equal(digest.digest('hex'),createHash('sha256').update(large).digest('hex'));
  const smallCommit=await publishReportFiles([['state.json.gz',bytes],['report.json','{"block":4}'],['addresses.json','{}']],{cwd,message:'replacement checkpoint'});
  assert.equal(git(['ls-tree','-r','--name-only',smallCommit,'checkpoint-parts/state.json.gz/']),'');
  assert.equal(git(['show',`${smallCommit}:keep.txt`]),'preserve');
  assert.equal(git(['rev-parse','HEAD']),head);assert.equal(git(['diff','--cached']),staged);
  for(const [branch,file] of [['holder-cache','holders.json'],['depth-cache','esim-usdt.json']]){
   git(['push','origin',`HEAD:refs/heads/${branch}`]);
   const first=await publishReportFiles([[file,'{"block":2,"blockNumber":"2"}']],{cwd,branch,message:'repository-key snapshot',skip:prior=>prior?.block>=2});
   assert.equal(git(['show',`${first}:keep.txt`]),'preserve');
   assert.equal(git(['show',`${first}:${file}`]),'{"block":2,"blockNumber":"2"}');
   const old=await publishReportFiles([[file,'{"block":1,"blockNumber":"1"}']],{cwd,branch,message:'older snapshot',skip:prior=>prior?.block>=1});
   assert.equal(old,false);
  }
  await assert.rejects(publishReportFiles([['holders.json','{}']],{cwd,branch:'main'}),/INVALID_PUBLICATION_BRANCH/);
  await assert.rejects(publishReportFiles([['../secret','{}']],{cwd,branch:'depth-cache'}),/INVALID_PUBLICATION_FILES/);
  assert.equal(git(['rev-parse','HEAD']),head);assert.equal(git(['diff','--cached']),staged);
 }finally{await rm(dir,{recursive:true,force:true});}
});
