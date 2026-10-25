import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {validClaimFlow} from '../../server/esim/store.mjs';
import {projectRepository} from '../../server/esim/repository.mjs';
import {publishReportFiles} from './publish-report-files.mjs';
const token=process.env.GITHUB_TOKEN,repo=projectRepository(process.env.GITHUB_REPOSITORY);
if(!token||!repo)throw Error('INVALID_PUBLICATION_CONFIGURATION');
const bytes=await readFile('.goodway/claim-flow/state.json.gz'),checkpoint=JSON.parse(gunzipSync(bytes)),report=checkpoint.report;
if(!validClaimFlow({block:checkpoint.throughBlock,blockHash:checkpoint.blockHash,cutoff:checkpoint.cutoff},report))throw Error('FLOW_REPORT_INVALID');
for(let attempt=0;attempt<3;attempt++){
 try{
  const commit=await publishReportFiles([['claim-flow-state.json.gz',bytes],['claim-flow.json',JSON.stringify(report)]],{
   message:`Verified proportional ESIM claim flow at block ${checkpoint.throughBlock}`,
   skip:saved=>saved.throughBlock>checkpoint.throughBlock||saved.throughBlock===checkpoint.throughBlock&&(saved.modelRevision??1)>=(report.modelRevision??1),
  });
  console.log(commit?`Published ESIM claim flow at block ${checkpoint.throughBlock}.`:'Claim flow already current.');break;
 }catch(error){if(error.message!=='CHECKPOINT_PUBLISH_PUSH_FAILED'||attempt===2)throw error;}
}
