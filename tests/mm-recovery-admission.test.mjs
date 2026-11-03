import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryAdmission} from '../scripts/esim/mm-recovery-preflight.mjs';
const mem=kib=>`MemTotal: 4000000 kB\nMemAvailable: ${kib} kB\n`;
test('MM fallback preserves host headroom and defers while the primary is heavy',()=>{
 const idle={ActiveState:'active',MemoryCurrent:String(1500*1024*1024)};
 assert.equal(recoveryAdmission(idle,mem(1600000)),null);
 assert.equal(recoveryAdmission({...idle,MemoryCurrent:String(2200*1024*1024)},mem(1600000)),'PRIMARY_MEMORY_HIGH');
 assert.equal(recoveryAdmission(idle,mem(1000000)),'HOST_MEMORY_LOW');
 assert.equal(recoveryAdmission({ActiveState:'inactive',MemoryCurrent:'[not set]'},mem(1600000)),null);
 assert.equal(recoveryAdmission({ActiveState:'active',MemoryCurrent:'[not set]'},mem(1600000)),'PRIMARY_MEMORY_UNKNOWN');
 assert.equal(recoveryAdmission(idle,''),'HOST_MEMORY_UNKNOWN');
 assert.equal(recoveryAdmission({},mem(1600000)),'PRIMARY_STATE_UNKNOWN');
});
