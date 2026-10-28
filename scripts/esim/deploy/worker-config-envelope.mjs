import {randomBytes,createCipheriv,createDecipheriv,publicEncrypt,privateDecrypt,createPublicKey,createHash,constants} from 'node:crypto';
import {readFile,writeFile,chmod,rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const TARGET='sdweb3/asia-southeast1-c/esim-data-worker';
const fingerprint=key=>createHash('sha256').update(createPublicKey(key).export({type:'spki',format:'der'})).digest('hex');
const encode=b=>b.toString('base64'),decode=s=>Buffer.from(s,'base64');
function validate(config){
 if(!/^postgres(?:ql)?:\/\//.test(config.ESIM_REALTIME_DATABASE_URL||'')||/[\r\n]/.test(config.ESIM_REALTIME_DATABASE_URL)||!/^[A-Za-z0-9_-]{16,160}$/.test(config.ALCHEMY_API_KEY||''))throw Error('INVALID_WORKER_CONFIGURATION');
 return {ESIM_REALTIME_DATABASE_URL:config.ESIM_REALTIME_DATABASE_URL,ALCHEMY_API_KEY:config.ALCHEMY_API_KEY};
}
export function sealConfig(config,publicKey){
 const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 cipher.setAAD(Buffer.from(TARGET));
 const payload=Buffer.concat([cipher.update(JSON.stringify(validate(config))),cipher.final()]);
 const wrapped=publicEncrypt({key:publicKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},key);key.fill(0);
 return {version:1,target:TARGET,fingerprint:fingerprint(publicKey),iv:encode(iv),tag:encode(cipher.getAuthTag()),key:encode(wrapped),payload:encode(payload)};
}
export function openConfig(envelope,privateKey){
 if(envelope.version!==1||envelope.target!==TARGET||envelope.fingerprint!==fingerprint(privateKey))throw Error('WRONG_WORKER_CONFIGURATION_TARGET');
 const key=privateDecrypt({key:privateKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},decode(envelope.key));
 const cipher=createDecipheriv('aes-256-gcm',key,decode(envelope.iv));cipher.setAAD(Buffer.from(TARGET));cipher.setAuthTag(decode(envelope.tag));
 try{return validate(JSON.parse(Buffer.concat([cipher.update(decode(envelope.payload)),cipher.final()]).toString()));}finally{key.fill(0);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const [mode,input,output]=process.argv.slice(2);
  if(mode==='seal')await writeFile(output,JSON.stringify(sealConfig(process.env,await readFile(input))),{mode:0o600});
  else if(mode==='open'&&process.getuid?.()===0&&output==='/etc/esim-worker/worker.env'){
   const config=openConfig(JSON.parse(await readFile(input,'utf8')),await readFile('/etc/esim-worker/config-private.pem'));
   const contents=Object.entries(config).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n')+'\nGITHUB_REPOSITORY=brunopike/pancake-depth-viewer\nESIM_GIT_PUBLISH=true\nESIM_WORKER_DRY_RUN=true\n';
   await writeFile(output+'.tmp',contents,{mode:0o600});await chmod(output+'.tmp',0o600);await rename(output+'.tmp',output);
  }else throw Error('INVALID_CONFIGURATION_COMMAND');
  console.log('Worker configuration envelope processed without displaying credentials.');
 }catch{console.error('WORKER_CONFIGURATION_FAILED');process.exitCode=1;}
}
