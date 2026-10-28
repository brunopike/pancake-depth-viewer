import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdtemp,mkdir,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {acquireLease,renewLease,releaseLease,requireLease} from '../server/esim/worker-lease.mjs';
import {publishRealtime} from '../server/esim/realtime-store.mjs';
import {dueTask,recoverVmCheckpoint} from '../scripts/esim/vm-worker.mjs';

// Explicitly opt in to an isolated local PostgreSQL cluster, never DATABASE_URL.
const psql=process.env.ESIM_TEST_PSQL,run=promisify(execFile);
const enabled=psql&&process.env.ESIM_TEST_PGHOST?.startsWith('/');
const env={...process.env,PGHOST:process.env.ESIM_TEST_PGHOST,PGDATABASE:'postgres',PGPORT:process.env.ESIM_TEST_PGPORT||'5432'};
const exec=async q=>(await run(psql,['-XAt','-v','ON_ERROR_STOP=1','-c',q],{env})).stdout.trim();
const literal=v=>v===null?'NULL':typeof v==='number'?String(v):"'"+String(v).replaceAll("'","''")+"'";
const sql={query:async(q,p=[])=>{const stmt=q.replace(/\$(\d+)/g,(_,n)=>literal(p[Number(n)-1]));const out=await exec(`WITH result AS (${stmt}) SELECT coalesce(json_agg(result),'[]') FROM result`);return JSON.parse(out);}};

test('PostgreSQL leases allow one writer, fence stale owners, and preserve ownership on stale release',{skip:!enabled},async()=>{
 await exec(await readFile(new URL('../scripts/esim/worker-schema.sql',import.meta.url),'utf8'));
 const job='test-core-'+Date.now();
 const contenders=await Promise.all(['runner-a','runner-b'].map(owner=>acquireLease(job,owner,{sql,ttlSeconds:60})));
 const winner=contenders.find(Boolean);assert.equal(contenders.filter(Boolean).length,1);
 assert.equal(await renewLease(winner,{sql}),true);
 await exec(`UPDATE esim_worker_leases SET expires_at=now()-interval '1 second' WHERE job=${literal(job)}`);
 const next=await acquireLease(job,'runner-c',{sql});assert(next);assert(BigInt(next.fence)>BigInt(winner.fence));
 assert.equal(await renewLease(winner,{sql}),false);
 await assert.rejects(requireLease(winner,{sql}),/WORKER_LEASE_LOST/);
 assert.equal(await releaseLease(winner,{sql}),false);
 await requireLease(next,{sql});assert.equal(await releaseLease(next,{sql}),true);
});

test('lease coordinates are validated before any database operation',async()=>{
 const sql={query:()=>assert.fail('invalid coordinates must not query')};
 await assert.rejects(acquireLease('', 'worker',{sql}),/INVALID_WORKER_LEASE/);
 await assert.rejects(acquireLease('core','worker',{sql,ttlSeconds:0}),/INVALID_WORKER_LEASE/);
});

test('an expired PostgreSQL publisher cannot modify either snapshot or acknowledgement',{skip:!enabled},async()=>{
 await exec(await readFile(new URL('../scripts/esim/realtime-schema.sql',import.meta.url),'utf8'));
 await exec(await readFile(new URL('../scripts/esim/worker-schema.sql',import.meta.url),'utf8'));
 const job='test-publish-'+Date.now(),old=await acquireLease(job,'old',{sql});
 await exec(`UPDATE esim_worker_leases SET expires_at=now()-interval '1 second' WHERE job=${literal(job)}`);
 const next=await acquireLease(job,'next',{sql});
 const transactional={query:(q,p=[])=>q.replace(/\$(\d+)/g,(_,n)=>literal(p[Number(n)-1])),transaction:qs=>exec('BEGIN;'+qs.join(';')+';COMMIT;')};
 await publishRealtime([{kind:'report',data:{block:100,cutoff:1000}}],{processedBlock:100,sql:transactional,lease:next});
 await assert.rejects(publishRealtime([{kind:'report',data:{block:101,cutoff:1001}}],{processedBlock:101,sql:transactional,lease:old}),/WORKER_LEASE_LOST/);
 assert.equal(await exec("SELECT block FROM esim_realtime_snapshots WHERE kind='report'"),'100');
 assert.equal(await exec('SELECT processed_block FROM esim_realtime_control WHERE id=1'),'100');
});

test('VM scheduler prioritizes canonical catch-up and retains a notification-free fallback',()=>{
 const now=1000000,last={core:now-60001,holders:now-50000,archive:now,depth:now};
 assert.equal(dueTask({now,last,cutoff:now/1000,block:10,pendingBlock:11}),'core');
 assert.equal(dueTask({now,last,cutoff:now/1000-301,block:10,pendingBlock:0}),'core');
 assert.equal(dueTask({now,last:{...last,holders:now-180001},cutoff:now/1000,block:10,pendingBlock:10}),'holders');
 assert.equal(dueTask({now,last,cutoff:now/1000,block:10,pendingBlock:10}),null);
});

test('VM reorg recovery restores the prior prefix and quarantines orphaned RPC cache',async()=>{
 const root=await mkdtemp(join(tmpdir(),'esim-reorg-test-'));
 try{
  await writeFile(join(root,'vm-rollback.json.gz'),'verified-prior');
  await writeFile(join(root,'state.json.gz'),'orphaned-tip');
  await mkdir(join(root,'rpc-cache'));await writeFile(join(root,'rpc-cache/call'),'orphaned-response');
  await recoverVmCheckpoint(root);
  assert.equal(await readFile(join(root,'state.json.gz'),'utf8'),'verified-prior');
  const entries=await readdir(root);assert(!entries.includes('rpc-cache'));
  const quarantine=entries.find(n=>n.startsWith('rpc-cache-reorg-'));assert(quarantine);
  assert.equal(await readFile(join(root,quarantine,'call'),'utf8'),'orphaned-response');
 }finally{await rm(root,{recursive:true,force:true});}
});
