import {readContractCohort} from '../../src/cohort-client.mjs';
import {withHolderCohort} from '../../src/holder-cohort.mjs';
const request=(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(4000)});
export async function readHolderCohort(report){
 const next=await readContractCohort(report,{fetch:request});
 return withHolderCohort(report,next.cohort);
}
