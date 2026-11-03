import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {stopVmProcess} from '../scripts/esim/vm-worker.mjs';

test('stopping a VM task waits for a TERM-resistant process group to exit',async()=>{
 const child=spawn(process.execPath,['-e',`process.on('SIGTERM',()=>{});require('node:child_process').spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{stdio:'inherit'});console.log('ready');setInterval(()=>{},1000);`],{detached:true,stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  await stopVmProcess(child,50);
  assert.equal(child.signalCode,'SIGKILL');
 }finally{try{process.kill(-child.pid,'SIGKILL');}catch{}}
});
