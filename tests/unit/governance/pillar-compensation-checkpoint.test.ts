/** Adversarial history semantics; pure domain of the existing versioning service. */
import { describe, expect, it } from "vitest";
import { createCheckpoint, planCompensation, type PillarMetadata } from "@/server/services/pillar-versioning/checkpoint";
const meta:PillarMetadata={sources:null,fieldCertainty:null,confidence:0.4,validationStatus:"AI_PROPOSED",staleAt:null};
function revert(before:Record<string,unknown>, applied:Record<string,unknown>, current:Record<string,unknown>, b=meta,a=meta,c=meta){
 return planCompensation({beforeContent:before,checkpoint:createCheckpoint(before,applied,b,a,2,[]),currentContent:current,currentMetadata:c,currentVersion:3,later:[]});
}
describe("checkpoint compensation",()=>{
 it("distinguishes an explicit null from a missing value",()=>{
  expect(revert({value:null},{},{other:1}).content).toEqual({value:null,other:1});
  expect(revert({},{value:null},{value:null,other:1}).content).toEqual({other:1});
 });
 it("keeps a later independent leaf in a newly created object",()=>{
  expect(revert({},{nested:{first:1}},{nested:{first:1,later:2}}).content).toEqual({nested:{later:2}});
 });
 it("restores deleted leaves without discarding new object leaves",()=>{
  expect(revert({nested:{first:1,keep:2}},{nested:{keep:2}},{nested:{keep:2,later:3}}).content).toEqual({nested:{first:1,keep:2,later:3}});
 });
 it("refuses conflicting array edits instead of guessing item identity",()=>{
  expect(()=>revert({items:[1]},{items:[2]},{items:[2,3]})).toThrow("RESTORE_CONFLICT");
 });
 it("preserves later certainties when the original map was null",()=>{
  const a={...meta,fieldCertainty:{first:"INFERRED"}},c={...meta,fieldCertainty:{first:"INFERRED",later:"INFERRED"}};
  expect(revert({}, {}, {},meta,a,c).metadata.fieldCertainty).toEqual({later:"INFERRED"});
 });
 it("never reintroduces a historical global validation over later content",()=>{
  const before={...meta,validationStatus:"VALIDATED" as const,confidence:0.9};
  expect(revert({first:1},{first:2},{first:2,later:3},before,meta,meta).metadata).toEqual(meta);
 });
});
