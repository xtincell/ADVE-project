import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";
import {randomUUID} from "node:crypto";
vi.mock("@/lib/auth/config",()=>({auth:vi.fn()}));
vi.mock("next-auth",()=>({}));
import {db} from "@/lib/db";
import {strategyRouter} from "@/server/trpc/routers/strategy";
import {resolveProductionSources,requireReviewedManifest} from "@/server/services/deliverable-orchestrator/production-sources";
import {checkLawTwoPreconditions} from "@/server/services/deliverable-orchestrator/preconditions";

const strategyId="test-mix-"+randomUUID(),owner="test-owner-"+randomUUID(),other="test-other-"+randomUUID();
const safe=()=>{const u=new URL(process.env.DATABASE_URL!);return ["127.0.0.1","localhost"].includes(u.hostname)&&u.pathname==="/shinkiro_verify";};
const caller=(user:string)=>strategyRouter.createCaller({db,session:{user:{id:user,role:"USER",operatorId:null},expires:new Date(Date.now()+360000).toISOString()}} as never);
beforeAll(async()=>{
 expect(safe()).toBe(true);
 await db.user.createMany({data:[owner,other].map(id=>({id,email:id+"@example.invalid"}))});
 await db.strategy.create({data:{id:strategyId,name:"Mix de recette",userId:owner}});
 await db.pillar.create({data:{strategyId,key:"e",content:{promesseExperience:"Accompagner la décision culinaire."}}});
});
afterAll(async()=>{
 if(!safe())return;
 await db.intentEmission.deleteMany({where:{strategyId}});
 await db.pillar.deleteMany({where:{strategyId}});await db.strategy.deleteMany({where:{id:strategyId}});await db.user.deleteMany({where:{id:{in:[owner,other]}}});
 await db.$disconnect();
});
describe("Adoption via strategy.update · source et trace persistantes",()=>{
 it("bloque avant choix, retire le seul veto mix après accord et rejette la réutilisation d’un ancien aperçu",async()=>{
  const view=await caller(owner).productionMix({id:strategyId});
  expect(view.primary).toBe("facilitator");
  expect(await checkLawTwoPreconditions(strategyId)).toContain("MISSING_MANIPULATION_MIX_PRIMARY");
  const old=await resolveProductionSources(strategyId,[]);
  const proposal={expected:view.fingerprint,primary:"facilitator" as const,percent:{peddler:10,dealer:10,facilitator:65,entertainer:15},reason:"L’utilité du service guide le choix culinaire.",confirm:true as const};
  await expect(caller(other).productionMix({id:strategyId})).rejects.toThrow();
  await expect(caller(other).update({id:strategyId,productionMix:proposal})).rejects.toThrow();
  await caller(owner).update({id:strategyId,productionMix:proposal});
  const saved=(await db.strategy.findUniqueOrThrow({where:{id:strategyId}})).manipulationMix as {review:{intentId:string}};
  expect(saved).toMatchObject({primary:"facilitator",facilitator:0.65,review:{actorId:owner,version:1,status:"HUMAN_REVIEWED",basis:"ADVE"}});
  expect((await db.intentEmission.findUniqueOrThrow({where:{id:saved.review.intentId}})).intentKind).toBe("LEGACY_STRATEGY_UPDATE");
  expect(await checkLawTwoPreconditions(strategyId)).not.toContain("MISSING_MANIPULATION_MIX_PRIMARY");
  const fresh=await resolveProductionSources(strategyId,[]);
  expect(fresh.mixReview).toEqual({primary:"facilitator",version:1});
  expect(()=>requireReviewedManifest(old,fresh)).toThrow();
  await expect(caller(owner).update({id:strategyId,productionMix:proposal})).rejects.toThrow(/changé|relisez/i);
 });
});
