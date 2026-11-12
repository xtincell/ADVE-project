import { describe,it,expect } from "vitest";
import { routeInitiativeSet,computeRoadmapRoutes } from "@/lib/strategy/roadmap-routes";
const actions = [
 { id:"a",action:"Sécuriser le parcours",preference:"NEUTRAL",status:"RECOMMENDED",budget:100,mitigatesRiskIds:["risk"],pilierImpact:"V",channel:"DIGITAL",targetsPersonaIds:["traffic"] },
 { id:"b",action:"Accompagner les lieux",preference:"FAVORITE",status:"RECOMMENDED",budget:200,pilierImpact:"E",channel:"DIRECT",targetsPersonaIds:["client"] },
 { id:"c",action:"Programme des relais",preference:"NEUTRAL",status:"DRAFT",budget:300,pilierImpact:"E",channel:"COMMUNITY",devotionImpact:"AMBASSADEUR",targetsPersonaIds:["partner"] },
 { id:"d",action:"Autre activation dans le même canal",preference:"NEUTRAL",status:"RECOMMENDED",budget:900,pilierImpact:"E",channel:"DIRECT",targetsPersonaIds:["client"] },
 { id:"e",action:"Format écarté",preference:"REJECTED",status:"RECOMMENDED",budget:0,pilierImpact:"A",channel:"OOH" },
 { id:"f",action:"Extension de canal",preference:"NEUTRAL",status:"RECOMMENDED",budget:400,pilierImpact:"E",channel:"PRESS",targetsPersonaIds:["client"] },
];
const riskMatrix=[{id:"risk",severity:90,impact:"HIGH",probability:"HIGH"}];
describe("strategy composes scenarios from catalogue preferences",()=>{
 it("produces useful nested selections without any action manually selected for the plan",()=>{
  const sets=["CONSERVATIVE","TARGET","AMBITIOUS"].map(k=>routeInitiativeSet(k as "TARGET",actions,{riskMatrix}).map(a=>a.id));
  expect(sets[0]).toEqual(["a"]);
  expect(sets[1]).toEqual(["a","b","c"]);
  expect(sets[2]).toEqual(["a","b","c","f"]);
 });
 it("does not include rejected actions or redundant costly variants even in ambitious",()=>{
  const ids=routeInitiativeSet("AMBITIOUS",actions,{riskMatrix}).map(a=>a.id);
  expect(ids).not.toContain("e");expect(ids).not.toContain("d");
 });
 it("gives a favorite precedence among actions covering the same need without forcing every favorite",()=>{
  const ids=routeInitiativeSet("TARGET",[...actions,{...actions[1],id:"other-favorite",preference:"FAVORITE",budget:500}],{riskMatrix}).map(a=>a.id);
  expect(ids).toContain("b");expect(ids).not.toContain("other-favorite");
 });
 it("is stable under catalogue ordering and does not mutate preferences",()=>{
  const before=structuredClone(actions);
  expect(routeInitiativeSet("TARGET",actions,{riskMatrix})).toEqual(routeInitiativeSet("TARGET",[...actions].reverse(),{riskMatrix}));
  expect(actions).toEqual(before);
 });
 it("does not manufacture sales growth from an action count",()=>{
  const routes=computeRoadmapRoutes({selectedInitiativeCount:0,initiatives:actions,riskMatrix});
  expect(routes.every(r=>r.projectedGrowthPct===undefined&&r.projectedRevenue===undefined&&r.targetCultIndex===undefined)).toBe(true);
  expect(routes[1]?.selectionReasons).toBeDefined();
 });
});
