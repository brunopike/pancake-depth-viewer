import {readFile} from 'node:fs/promises';
import {validateHolders} from '../../server/esim/holders.mjs';
import {leaseFromEnvironment,requireLease} from '../../server/esim/worker-lease.mjs';
const content=await readFile('.goodway/esim-holders/holders.json','utf8'),report=validateHolders(JSON.parse(content));
const token=process.env.GITHUB_TOKEN;if(!token)throw new Error('NO_GITHUB_TOKEN');
const root='https://api.github.com/repos/brunopike/pancake-depth-viewer/git';
async function api(path,body,method=body?'POST':'GET'){
 const response=await fetch(`${root}/${path}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 if(response.status===404&&method==='GET')return null;if(!response.ok)throw new Error(`PUBLICATION_${response.status}`);return response.json();
}
const ref=await api('ref/heads/holder-cache'),prior=ref?await api(`commits/${ref.object.sha}`):null;
// A delayed/recovered publisher must not replace a newer holder checkpoint.
if(prior){
 const response=await fetch(`https://raw.githubusercontent.com/brunopike/pancake-depth-viewer/${ref.object.sha}/holders.json`,{signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('HOLDER_PRIOR_UNAVAILABLE');
 const old=validateHolders(await response.json());if(old.block>report.block){console.log('Newer holder checkpoint already published.');process.exit(0);}
}
const blob=await api('blobs',{content,encoding:'utf-8'}),tree=await api('trees',{...(prior?{base_tree:prior.tree.sha}:{}),tree:[{path:'holders.json',mode:'100644',type:'blob',sha:blob.sha}]});
const commit=await api('commits',{message:`ESIM holders at block ${report.block}`,tree:tree.sha,parents:ref?[ref.object.sha]:[]});
const lease=leaseFromEnvironment();if(lease)await requireLease(lease);
if(ref)await api('refs/heads/holder-cache',{sha:commit.sha,force:false},'PATCH');else await api('refs',{ref:'refs/heads/holder-cache',sha:commit.sha});
console.log(`Published holders at ${report.block}`);
