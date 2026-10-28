import {cohortPathSummary} from './cohort-paths.mjs';
import {validExternalCohort} from '../server/esim/external-cohort-validation.mjs';

export const EXTERNAL_HOLDER_GROUPS=[
 {id:'participants',role:'direct',label:'直接交互 / 领币地址',tone:'received'},
 {id:'downstream',role:'downstream',label:'下游地址',tone:'downstream'},
 {id:'other',role:'other',label:'其他外部地址',tone:'external'},
];
const enriched=new WeakMap();
// Use the same verified relationship snapshot as the contract report, while
// retaining this holder snapshot's balances and trading data without alteration.
export function withHolderCohort(report,cohort){
 const c=cohort?.external;
 if(!c||!validExternalCohort(c,c)||c.throughBlock>report.block||c.cutoff>report.cutoff||c.throughBlock===report.block&&c.blockHash!==report.blockHash)return report;
 const cached=enriched.get(report);if(cached?.cohort===c)return cached.report;
 const related=new Map(c.rows.map(r=>[r.address,r]));
 const {depths,...tracking}=cohortPathSummary(c.rows);
 const rows=report.rows.map(row=>{
  const relation=related.get(row.address);
  return {...row,externalRole:relation?.role||null,externalVia:relation?.via||null,externalViaTx:relation?.viaTx||null,externalDepth:depths.get(row.address)??null};
 });
 const result={...report,rows,externalClassification:{block:c.throughBlock,blockHash:c.blockHash,cutoff:c.cutoff,tracking}};
 enriched.set(report,{cohort:c,report:result});return result;
}
