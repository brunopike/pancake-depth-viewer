import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
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
