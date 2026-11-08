import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,mkdir,rm,readFile,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {publishReportFiles} from '../scripts/esim/publish-report-files.mjs';

test('isolated publication does not accumulate snapshot objects in the installed release',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-publication-isolation-')),bare=join(dir,'remote'),cwd=join(dir,'checkout');
 const git=(args,where=cwd)=>execFileSync('git',args,{cwd:where,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 try{
  await mkdir(cwd);execFileSync('git',['init','--bare',bare],{stdio:'ignore'});git(['init']);git(['config','user.name','Fixture']);git(['config','user.email','fixture@example.invalid']);git(['remote','add','origin',bare]);
  await writeFile(join(cwd,'report.json'),'{"block":1}');git(['add','.']);git(['commit','-m','seed']);git(['push','origin','HEAD:refs/heads/esim-cache']);
  const before=git(['count-objects','-v']);
  for(const block of [2,3]){
   const commit=await publishReportFiles([['state.json.gz',Buffer.from('checkpoint-'+block)],['report.json',JSON.stringify({block})],['addresses.json','{}']],{cwd,message:'verified '+block});
   assert.equal(git(['show',`${commit}:report.json`],bare),JSON.stringify({block}));
   assert.equal(git(['count-objects','-v']),before,'publication must not grow the installed release Git database');
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('isolated publication retains checkout authentication without passing secrets in Git arguments',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-publication-auth-')),bare=join(dir,'remote'),cwd=join(dir,'checkout'),bin=join(dir,'bin'),savedPath=process.env.PATH;
 const realGit=execFileSync('which',['git'],{encoding:'utf8'}).trim(),git=args=>execFileSync(realGit,args,{cwd,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 try{
  await mkdir(cwd);await mkdir(bin);execFileSync(realGit,['init','--bare',bare],{stdio:'ignore'});git(['init']);git(['config','user.name','Fixture']);git(['config','user.email','fixture@example.invalid']);git(['remote','add','origin',bare]);
  await writeFile(join(cwd,'report.json'),'{}');git(['add','.']);git(['commit','-m','seed']);git(['push','origin','HEAD:refs/heads/esim-cache']);
  git(['config','http.https://github.com/.extraheader','AUTHORIZATION: fixture-only']);
  await writeFile(join(bin,'git'),`#!${process.execPath}\nconst{execFileSync}=require('node:child_process');const args=process.argv.slice(2),git=${JSON.stringify(realGit)};if(args.includes('fetch')||args.includes('push')){if(args.some(x=>x.includes('fixture-only')))process.exit(18);if(execFileSync(git,['config','--get','http.https://github.com/.extraheader'],{encoding:'utf8'}).trim()!=='AUTHORIZATION: fixture-only')process.exit(19);}try{process.stdout.write(execFileSync(git,args,{stdio:['inherit','pipe','pipe']}));}catch(e){process.stderr.write(e.stderr||'');process.exit(e.status||1);}`);
  await chmod(join(bin,'git'),0o755);process.env.PATH=bin+':'+savedPath;
  assert.match(await publishReportFiles([['state.json.gz',Buffer.from('checkpoint')],['report.json','{"block":2}'],['addresses.json','{}']],{cwd,message:'authenticated publication'}),/^[0-9a-f]{40}$/);
 }finally{process.env.PATH=savedPath;await rm(dir,{recursive:true,force:true});}
});

test('binary publication preserves the working branch, staged user edits and unrelated cache files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esim-publication-test-')),bare=join(dir,'remote'),cwd=join(dir,'checkout');
 const git=(args,options={})=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['pipe','pipe','pipe'],...options}).trim();
 const published=(args,options={})=>execFileSync('git',args,{cwd:bare,encoding:'utf8',stdio:['pipe','pipe','pipe'],...options}).trim();
 try{
  await mkdir(cwd);execFileSync('git',['init','--bare',bare],{stdio:'ignore'});git(['init']);git(['config','user.name','Fixture']);git(['config','user.email','fixture@example.invalid']);git(['remote','add','origin',bare]);
  await writeFile(join(cwd,'report.json'),JSON.stringify({block:1}));await writeFile(join(cwd,'claim-flow.json'),'{"throughBlock":1}');await writeFile(join(cwd,'keep.txt'),'preserve');git(['add','.']);git(['commit','-m','seed']);git(['push','origin','HEAD:refs/heads/esim-cache']);
  const head=git(['rev-parse','HEAD']);await writeFile(join(cwd,'user.txt'),'staged draft');git(['add','user.txt']);const staged=git(['diff','--cached']);
  const bytes=Buffer.from([0,255,31,139,128,0]);
  const trace=join(dir,'git-trace.jsonl'),savedTrace=process.env.GIT_TRACE2_EVENT,savedParams=process.env.GIT_TRACE2_CONFIG_PARAMS;
  let commit;
  try{
   process.env.GIT_TRACE2_EVENT=trace;process.env.GIT_TRACE2_CONFIG_PARAMS='gc.auto,maintenance.auto,pack.threads,pack.windowMemory,pack.deltaCacheSize,core.compression,pack.compression,pack.window';
   commit=await publishReportFiles([['state.json.gz',bytes],['report.json','{"block":2}'],['addresses.json','{"rows":[]}']],{cwd,message:'verified checkpoint',skip:prior=>prior.block>=2});
  }finally{
   for(const[k,v]of Object.entries({GIT_TRACE2_EVENT:savedTrace,GIT_TRACE2_CONFIG_PARAMS:savedParams}))if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
  const config=Object.fromEntries((await readFile(trace,'utf8')).trim().split('\n').map(JSON.parse).filter(e=>e.event==='def_param').map(e=>[e.param,e.value]));
  for(const[k,v]of Object.entries({'gc.auto':'0','maintenance.auto':'false','pack.threads':'1','pack.windowmemory':'64m','pack.deltacachesize':'32m','core.compression':'0','pack.compression':'0','pack.window':'0'}))assert.equal(config[k],v,k);
  assert.match(commit,/^[0-9a-f]{40}$/);assert.equal(git(['rev-parse','HEAD']),head);assert.equal(git(['diff','--cached']),staged);assert.equal(await readFile(join(cwd,'user.txt'),'utf8'),'staged draft');
  assert.equal(published(['show',`${commit}:keep.txt`]),'preserve');
  assert.deepEqual(execFileSync('git',['show',`${commit}:state.json.gz`],{cwd:bare}),bytes);
  assert.equal(await publishReportFiles([['state.json.gz',bytes],['report.json','{"block":1}'],['addresses.json','{}']],{cwd,message:'old',skip:prior=>prior.block>=1}),false);
  const packed=gzipSync('{"throughBlock":2,"evidence":["complete evidence"]}');
  const flow=await publishReportFiles([['claim-flow-state.json.gz',bytes],['claim-flow.json.gz',packed]],{cwd,message:'verified flow',skip:prior=>prior.throughBlock>=2});
  assert.equal(published(['show',`${flow}:report.json`]),'{"block":2}');
  assert.equal(gunzipSync(execFileSync('git',['show',`${flow}:claim-flow.json.gz`],{cwd:bare})).toString(),gunzipSync(packed).toString());
  assert.equal(published(['show',`${flow}:claim-flow.json`]),'{"throughBlock":1}','legacy copy remains available to old readers');
  assert.equal(await publishReportFiles([['claim-flow-state.json.gz',bytes],['claim-flow.json.gz',packed]],{cwd,message:'stale flow',skip:prior=>prior.throughBlock>=2}),false);
  const large=Buffer.alloc(65*1024*1024,7),largeCommit=await publishReportFiles([['state.json.gz',large],['report.json','{"block":3}'],['addresses.json','{}'],['archive-health.json','{"block":3}']],{cwd,message:'chunked checkpoint'});
  const manifest=JSON.parse(gunzipSync(execFileSync('git',['show',`${largeCommit}:state.json.gz`],{cwd:bare}))),digest=createHash('sha256');
  assert.equal(manifest.parts.length,3);
  for(const part of manifest.parts){const content=execFileSync('git',['show',`${largeCommit}:${part.path}`],{cwd:bare,maxBuffer:40*1024*1024});assert.equal(content.length,part.bytes);digest.update(content);}
  assert.equal(digest.digest('hex'),createHash('sha256').update(large).digest('hex'));
  const smallCommit=await publishReportFiles([['state.json.gz',bytes],['report.json','{"block":4}'],['addresses.json','{}']],{cwd,message:'replacement checkpoint'});
  assert.equal(published(['ls-tree','-r','--name-only',smallCommit,'checkpoint-parts/state.json.gz/']),'');
  assert.equal(published(['show',`${smallCommit}:keep.txt`]),'preserve');
  assert.equal(git(['rev-parse','HEAD']),head);assert.equal(git(['diff','--cached']),staged);
  for(const [branch,file] of [['holder-cache','holders.json'],['depth-cache','esim-usdt.json']]){
   git(['push','origin',`HEAD:refs/heads/${branch}`]);
   let first;
   const plainTrace=join(dir,branch+'-trace.jsonl');
   try{
    process.env.GIT_TRACE2_EVENT=plainTrace;process.env.GIT_TRACE2_CONFIG_PARAMS='core.compression,pack.compression,pack.window';
    first=await publishReportFiles([[file,'{"block":2,"blockNumber":"2"}']],{cwd,branch,message:'repository-key snapshot',skip:prior=>prior?.block>=2});
   }finally{
    for(const[k,v]of Object.entries({GIT_TRACE2_EVENT:savedTrace,GIT_TRACE2_CONFIG_PARAMS:savedParams}))if(v===undefined)delete process.env[k];else process.env[k]=v;
   }
   const overrides=(await readFile(plainTrace,'utf8')).trim().split('\n').map(JSON.parse).filter(e=>e.event==='def_param'&&e.scope==='command'&&['core.compression','pack.compression','pack.window'].includes(e.param));
   assert.deepEqual(overrides,[],'plain JSON snapshots retain Git compression and delta defaults');
   assert.equal(published(['show',`${first}:keep.txt`]),'preserve');
   assert.equal(published(['show',`${first}:${file}`]),'{"block":2,"blockNumber":"2"}');
   const old=await publishReportFiles([[file,'{"block":1,"blockNumber":"1"}']],{cwd,branch,message:'older snapshot',skip:prior=>prior?.block>=1});
   assert.equal(old,false);
  }
  await assert.rejects(publishReportFiles([['holders.json','{}']],{cwd,branch:'main'}),/INVALID_PUBLICATION_BRANCH/);
  await assert.rejects(publishReportFiles([['../secret','{}']],{cwd,branch:'depth-cache'}),/INVALID_PUBLICATION_FILES/);
  assert.equal(git(['rev-parse','HEAD']),head);assert.equal(git(['diff','--cached']),staged);
 }finally{await rm(dir,{recursive:true,force:true});}
});
