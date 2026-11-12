/** ADR-0228: scenarios choose source actions, independently of I preselection. */
import { describe, it, expect } from "vitest";
import { computePillarS, computeRoadmapRoutes } from "@/server/services/rtis-protocols/strategy";
const R1="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", R2="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const a="11111111-1111-4111-8111-111111111111", b="22222222-2222-4222-8222-222222222222", c="33333333-3333-4333-8333-333333333333";
const pillars=()=>({i:{catalogueParCanal:{DIGITAL:[
 {id:a,action:"Protect the journey",format:"Pilot",objectif:"Check activation",status:"RECOMMENDED",budget:1000,timeframe:"SPRINT_90",mitigatesRiskIds:[R1],targetsPersonaIds:[a],pilierImpact:"V",channel:"APP"},
 {id:b,action:"Accompany places",format:"Interviews",objectif:"Check value",preference:"FAVORITE",status:"DRAFT",budget:2000,timeframe:"LONG_TERM",mitigatesRiskIds:[R2],targetsPersonaIds:[b],pilierImpact:"E",channel:"DIRECT"},
 {id:c,action:"New channel",format:"Content",objectif:"Reach the same public",status:"RECOMMENDED",budget:4000,timeframe:"PHASE_2",targetsPersonaIds:[b],pilierImpact:"E",channel:"PRESS"},
]}},r:{probabilityImpactMatrix:[{id:R1,impact:"HIGH",probability:"HIGH"},{id:R2,impact:"LOW",probability:"LOW"}]},t:null,s:null} as Record<string,Record<string,unknown>|null>);
describe("canonical scenario dashboard",()=>{
 it("composes three nonempty subsets without any SELECTED_FOR_ROADMAP entry",()=>{
  const out=computePillarS(pillars());const routes=out.roadmapRoutes as Array<Record<string,unknown>>;
  expect(routes.map(r=>r.initiativeIds)).toEqual([[a],[a,b],[a,b,c]]);
  expect(routes.map(r=>r.totalBudget)).toEqual([1000,3000,7000]);
  expect(routes.map(r=>r.riskCoverage)).toEqual([50,100,100]);
  expect(out).toMatchObject({selectedRouteKey:"TARGET",selectedInitiativeCount:2,totalBudget:3000,budgetByPhase:{SPRINT_90:1000,LONG_TERM:2000}});
 });
 it("persists a current scenario and aggregates its exact membership",()=>{
  const p=pillars();p.s={computed:{selectedRouteKey:"CONSERVATIVE"}};
  expect(computePillarS(p)).toMatchObject({selectedRouteKey:"CONSERVATIVE",selectedInitiativeCount:1,totalBudget:1000});
  expect(computePillarS(p,{selectedRouteKey:"AMBITIOUS"})).toMatchObject({selectedRouteKey:"AMBITIOUS",selectedInitiativeCount:3,totalBudget:7000});
 });
 it("keeps unknown budgets and unassigned horizons distinct from zero",()=>{
  const p=pillars();const list=(p.i!.catalogueParCanal as {DIGITAL:Array<Record<string,unknown>>}).DIGITAL;
  delete list[1]!.budget;delete list[1]!.timeframe;
  const out=computePillarS(p);expect(out.totalBudget).toBeUndefined();
  expect(out.budgetSummary).toMatchObject({knownSubtotal:1000,unknownCount:1,unassignedTimeframeCount:1});
  expect(out.budgetByPhase).toEqual({SPRINT_90:1000});
 });
 it("derives perception from T and reports observations without inventing a coherence score",()=>{
  const p=pillars();p.t={overtonPosition:{currentPerception:"New"},perceptionGap:{targetPerception:"Trusted",gapScore:80}};p.r!.coherenceRisks=["Observation"];
  const out=computePillarS(p);expect(out.overtonPosition).toEqual({current:"New",target:"Trusted",gapScore:80});
  expect(typeof out.coherenceScore).toBe("number");expect(out.coherenceIssueCount).toBe(1);
  const before = out.coherenceScore;
  p.r!.coherenceRisks = Array.from({ length: 20 }, () => "Observation");
  expect(computePillarS(p).coherenceScore).toBe(before);
 });
 it("keeps missing pillars empty and falls back from an invalid route key",()=>{
  const out=computePillarS({i:null,r:null,t:null,s:{computed:{selectedRouteKey:"TURBO"}}});
  expect(out).toMatchObject({selectedRouteKey:"TARGET",selectedInitiativeCount:0,totalBudget:0});
  expect(out.riskCoverage).toBeUndefined();expect(out.roadmapRoutes).toHaveLength(3);
 });
 it("does not produce revenue, growth or an attachment target from an action count",()=>{
  for(const route of computeRoadmapRoutes({selectedInitiativeCount:12,riskCoverage:60,baseRevenue:100000000,baseCultIndex:80})){
   expect(route.projectedGrowthPct).toBeUndefined();expect(route.projectedRevenue).toBeUndefined();expect(route.targetCultIndex).toBeUndefined();
  }
 });
 it("keeps the same proposed routes when the current scenario changes",()=>{
  const read=(key:"TARGET"|"AMBITIOUS")=>(computePillarS(pillars(),{selectedRouteKey:key}).roadmapRoutes as Array<Record<string,unknown>>).map(r=>r.initiativeIds);
  expect(read("TARGET")).toEqual(read("AMBITIOUS"));
 });
});
