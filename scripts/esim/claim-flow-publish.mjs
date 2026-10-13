import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {validClaimFlow} from '../../server/esim/store.mjs';
const token=process.env.GITHUB_TOKEN,repo=process.env.GITHUB_REPOSITORY;
if(!token||repo!=='starkweng/pancake-depth-viewer')throw Error('INVALID_PUBLICATION_CONFIGURATION');
const bytes=await readFile('.goodway/claim-flow/state.json.gz'),checkpoint=JSON.parse(gunzipSync(bytes)),report=checkpoint.report;
if(!validClaimFlow({block:checkpoint.throughBlock,blockHash:checkpoint.blockHash,cutoff:checkpoint.cutoff},report))throw Error('FLOW_REPORT_INVALID');
const root=`https://api.github.com/repos/${repo}`,headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json'};
async function api(path,body,method=body?'POST':'GET'){
 const response=await fetch(`${root}/${path}`,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
 if(response.status===404&&method==='GET')return null;
 if([409,422].includes(response.status)&&method==='PATCH')throw Error('PUBLICATION_RACE');
 if(!response.ok)throw Error('PUBLICATION_FAILED');return response.json();
}
const entries=[];
for(const [path,content,encoding]of [['claim-flow-state.json.gz',bytes.toString('base64'),'base64'],['claim-flow.json',JSON.stringify(report),'utf-8']]){
 const blob=await api('git/blobs',{content,encoding});entries.push({path,mode:'100644',type:'blob',sha:blob.sha});
}
for(let attempt=0;attempt<3;attempt++){
 try{
  const ref=await api('git/ref/heads/esim-cache');if(!ref)throw Error('CORE_CHECKPOINT_MISSING');
  const old=await api(`contents/claim-flow.json?ref=${ref.object.sha}`);
  if(old?.content&&JSON.parse(Buffer.from(old.content,'base64').toString()).throughBlock>=checkpoint.throughBlock){console.log('Claim flow already current.');break;}
  const prior=await api(`git/commits/${ref.object.sha}`),tree=await api('git/trees',{base_tree:prior.tree.sha,tree:entries});
  const commit=await api('git/commits',{message:`Verified proportional ESIM claim flow at block ${checkpoint.throughBlock}`,tree:tree.sha,parents:[ref.object.sha]});
  await api('git/refs/heads/esim-cache',{sha:commit.sha,force:false},'PATCH');
  console.log(`Published ESIM claim flow at block ${checkpoint.throughBlock}.`);break;
 }catch(error){if(error.message!=='PUBLICATION_RACE'||attempt===2)throw error;}
}
