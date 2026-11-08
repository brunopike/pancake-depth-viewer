import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {saveState} from '../server/esim/store.mjs';
import {buildReport,ORIGIN} from '../server/esim/metrics.mjs';
import {buildAddressReport} from '../server/esim/addresses.mjs';
import {prepareArchiveViews} from '../server/esim/archive-views.mjs';
import {SOURCE_INFLOW_SEED as seed} from '../server/esim/source-inflows.mjs';

test('real archive CLI reuses exact prepared views without reading or rebuilding the large ledger',async()=>{
 const root=await mkdtemp(join(tmpdir(),'esim-prepared-publication-')),bare=join(root,'remote'),cwd=join(root,'checkout'),coverage=join(root,'coverage');
 const git=(args,where=cwd)=>execFileSync('git',args,{cwd:where,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 const state={version:1,token:seed.token,source:seed.source,origin:ORIGIN,block:seed.throughBlock,blockHash:seed.blockHash,cutoff:seed.cutoff,sourceInflow:{...seed,seedBlock:seed.throughBlock,reconciled:true},trades:[],calls:[],native:[],distributions:[],firstRecipient:{},coverage:{}};
 try{
  await mkdir(cwd);execFileSync('git',['init','--bare',bare],{stdio:'ignore'});git(['init']);git(['config','user.name','Fixture']);git(['config','user.email','fixture@example.invalid']);git(['remote','add','origin',bare]);
  await writeFile(join(cwd,'report.json'),'{"block":0}');git(['add','.']);git(['commit','-m','seed']);git(['push','origin','HEAD:refs/heads/esim-cache']);
  const checkpointDir=join(cwd,'.goodway/esim-monitor'),dir=join(cwd,'.goodway/esim-archive-views');
  const checkpointIdentity=await saveState(state,checkpointDir),now=Date.now()/1000,report=buildReport(state,now),addresses=buildAddressReport(state,now);
  await prepareArchiveViews(state,report,addresses,{dir,checkpointIdentity});
  const cli=fileURLToPath(new URL('../scripts/esim/publish.mjs',import.meta.url));
  const env={PATH:process.env.PATH,ESIM_GIT_PUBLISH:'true',ESIM_PERSISTENT_WORKER:'true',NODE_V8_COVERAGE:coverage};
  const output=execFileSync(process.execPath,[cli],{cwd,env,encoding:'utf8'});
  assert.match(output,/"prepared":true/);
  assert.deepEqual(JSON.parse(git(['show','esim-cache:report.json'],bare)),report);
  assert.deepEqual(JSON.parse(git(['show','esim-cache:addresses.json'],bare)),addresses);
  assert.deepEqual(execFileSync('git',['show','esim-cache:state.json.gz'],{cwd:bare}),await readFile(join(checkpointDir,'state.json.gz')));
  const scriptCoverage=(await Promise.all((await readdir(coverage)).map(async file=>JSON.parse(await readFile(join(coverage,file),'utf8'))))).flatMap(x=>x.result);
  for(const [path,name]of [['server/esim/store.mjs','readState'],['server/esim/metrics.mjs','buildReport'],['server/esim/addresses.mjs','buildAddressReport'],['server/esim/shared-data.mjs','loadSharedRegistry']]){
   const covered=scriptCoverage.find(x=>x.url===new URL('../'+path,import.meta.url).href);
   assert(covered,path);assert.equal(covered.functions.find(x=>x.functionName===name).ranges[0].count,0,name+' must not run in the archive fast path');
  }
  const before=git(['rev-parse','esim-cache'],bare);await rm(join(dir,'state.json.gz'));
  assert.throws(()=>execFileSync(process.execPath,[cli],{cwd,env,stdio:['pipe','pipe','pipe']}),error=>/VM_ARCHIVE_VIEWS_UNAVAILABLE/.test(error.stderr.toString()));
  assert.equal(git(['rev-parse','esim-cache'],bare),before,'missing prepared views defer without publishing a partial archive');
 }finally{await rm(root,{recursive:true,force:true});}
});
