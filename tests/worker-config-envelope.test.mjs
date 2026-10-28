import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtemp,writeFile,readFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {sealConfig,openConfig} from '../scripts/esim/deploy/worker-config-envelope.mjs';
test('worker configuration is encrypted for its target, rejects tampering and only carries the required credentials',()=>{
 const pair=generateKeyPairSync('rsa',{modulusLength:2048});
 const publicKey=pair.publicKey.export({type:'spki',format:'pem'}),privateKey=pair.privateKey.export({type:'pkcs8',format:'pem'});
 const config={ESIM_REALTIME_DATABASE_URL:'postgresql://fixture:synthetic@example.invalid/esim',ALCHEMY_API_KEY:'synthetic_fixture_key',UNRELATED:'not transferred'};
 const envelope=sealConfig(config,publicKey);
 assert(!JSON.stringify(envelope).includes('synthetic'));
 assert.deepEqual(openConfig(envelope,privateKey),{ESIM_REALTIME_DATABASE_URL:config.ESIM_REALTIME_DATABASE_URL,ALCHEMY_API_KEY:config.ALCHEMY_API_KEY});
 assert.throws(()=>openConfig({...envelope,target:'another-server'},privateKey),/WRONG_WORKER_CONFIGURATION_TARGET/);
 assert.throws(()=>openConfig({...envelope,tag:Buffer.alloc(16).toString('base64')},privateKey));
 assert.throws(()=>sealConfig({...config,ALCHEMY_API_KEY:'x\ny'},publicKey),/INVALID_WORKER_CONFIGURATION/);
});
test('configuration CLI executes through the current release symlink',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'worker-config-cli-'));
 try{
  const pair=generateKeyPairSync('rsa',{modulusLength:2048});
  const publicKey=pair.publicKey.export({type:'spki',format:'pem'}),privateKey=pair.privateKey.export({type:'pkcs8',format:'pem'});
  await writeFile(join(dir,'public.pem'),publicKey);
  await symlink(fileURLToPath(new URL('../scripts/esim/deploy/worker-config-envelope.mjs',import.meta.url)),join(dir,'current.mjs'));
  execFileSync(process.execPath,[join(dir,'current.mjs'),'seal',join(dir,'public.pem'),join(dir,'encrypted.json')],{env:{...process.env,ESIM_REALTIME_DATABASE_URL:'postgresql://synthetic@example.invalid/esim',ALCHEMY_API_KEY:'synthetic_fixture_key'}});
  assert.equal(openConfig(JSON.parse(await readFile(join(dir,'encrypted.json'),'utf8')),privateKey).ALCHEMY_API_KEY,'synthetic_fixture_key');
 }finally{await rm(dir,{recursive:true,force:true});}
});
