import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const run=promisify(execFile),psql=process.env.ESIM_TEST_PSQL;
const enabled=!!(psql&&process.env.ESIM_TEST_PGHOST?.startsWith('/'));
const env={...process.env,PGHOST:process.env.ESIM_TEST_PGHOST,PGDATABASE:'postgres',PGPORT:process.env.ESIM_TEST_PGPORT||'5432'};
const exec=async q=>(await run(psql,['-XAt','-v','ON_ERROR_STOP=1','-c',q],{env})).stdout.trim();
const charge=(id,task,amount,mode='enforce')=>exec(`SELECT admitted FROM esim_ledger.reserve_rpc_cu('${id}','${task}',${amount},1,'{"eth_call":1}','${mode}',100,20)`);

test('real PostgreSQL serializes competing writers, reserves core capacity, and replays an ambiguous reservation once',{skip:!enabled},async()=>{
 const migration=new URL('../scripts/esim/cu-budget-schema.sql',import.meta.url);
 await exec(await readFile(migration,'utf8'));
 await exec('TRUNCATE esim_ledger.rpc_cu_attempts,esim_ledger.rpc_cu_days');
 const ids=[randomUUID(),randomUUID()];
 const outcomes=await Promise.all(ids.map(id=>charge(id,'mm',60)));
 assert.deepEqual(outcomes.sort(),['f','t']);
 // Repeating an uncertain DB acknowledgement must not debit the budget twice.
 const accepted=await exec('SELECT request_id FROM esim_ledger.rpc_cu_attempts LIMIT 1');
 assert.equal(await charge(accepted,'mm',60),'t');
 assert.equal(await charge(randomUUID(),'core',40),'t');
 assert.equal(await charge(randomUUID(),'core',1),'f');
 assert.equal(await exec('SELECT used FROM esim_ledger.rpc_cu_days'),'100');
 assert.equal(await exec('SELECT count(*) FROM esim_ledger.rpc_cu_attempts'),'2');
 await assert.rejects(charge(accepted,'mm',61),/CU_RESERVATION_CONFLICT/);
});

test('observe mode counts over-budget attempts without blocking and detects policy disagreement',{skip:!enabled},async()=>{
 await exec(await readFile(new URL('../scripts/esim/cu-budget-schema.sql',import.meta.url),'utf8'));
 await exec('TRUNCATE esim_ledger.rpc_cu_attempts,esim_ledger.rpc_cu_days');
 assert.equal(await charge(randomUUID(),'mm',150,'observe'),'t');
 assert.equal(await exec('SELECT used FROM esim_ledger.rpc_cu_days'),'150');
 assert.equal(await exec("SELECT day::text=(clock_timestamp() AT TIME ZONE 'UTC')::date::text FROM esim_ledger.rpc_cu_days"),'t');
 await assert.rejects(exec(`SELECT * FROM esim_ledger.reserve_rpc_cu('${randomUUID()}','core',1,1,'{}','enforce',101,20)`),/CU_POLICY_MISMATCH/);
});
