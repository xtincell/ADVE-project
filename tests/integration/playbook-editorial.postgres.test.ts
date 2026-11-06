import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { composeGloryDeterministic } from "@/server/services/artemis/tools/glory-composers";
import { prepareEditorialEvidence, readEditorialSources } from "@/server/services/artemis/tools/editorial-references";
import { readActiveCalendar } from "@/server/services/deliverable-orchestrator/active-calendar";
import { contentCalendarOutputSchema } from "@/server/services/artemis/tools/launch-social-schemas";

const run = randomUUID();
const brand = "editorial-" + run, foreign = "other-editorial-" + run, user = "owner-" + run;
const month = new Date().toISOString().slice(0,7);
const snapshot = month+"-19T18:00:00.000Z | instagram | buffer-42\nStatut : scheduled\nUne vraie légende.\n\nAvec deux paragraphes.";
let safe = false;

async function document(strategyId:string, name:string, tags:string[], text:string, status="REFERENCE") {
  return db.brandDataSource.create({data:{
    strategyId,sourceType:"FILE",fileName:name,fileType:"TXT",processingStatus:"EXTRACTED",rawContent:text,
    rawData:{_document:{schema:"document-edition-v1",edition:1,family:name,label:name,kind:"STRATEGY",status,tags,changeSummary:"Recette",recordedAt:new Date().toISOString()}},
  }});
}
beforeAll(async()=>{
  const url = new URL(process.env.DATABASE_URL!);
  expect(["localhost","127.0.0.1"].includes(url.hostname) && url.pathname === "/shinkiro_verify").toBe(true); safe = true;
  await db.user.create({data:{id:user,email:run+"@example.invalid"}});
  await db.strategy.createMany({data:[brand,foreign].map(id=>({id,userId:user,name:id}))});
});
afterAll(async()=>{
  if (!safe) return;
  await db.gloryOutput.deleteMany({where:{strategyId:brand}});
  await db.sequenceExecution.deleteMany({where:{strategyId:brand}});
  await db.brandDataSource.deleteMany({where:{strategyId:{in:[brand,foreign]}}});
  await db.strategy.deleteMany({where:{id:{in:[brand,foreign]}}});
  await db.user.delete({where:{id:user}});
  await db.$disconnect();
});

describe("Lecture des références réelles du Playbook",()=>{
  it("ne reprend que les sources actuelles de cette marque et les transmet à la sortie validée",async()=>{
    const tags=["Calendrier social","Versions programmées"];
    const kept = await document(brand,"Diffusions.txt",tags,snapshot);
    await document(brand,"Archive.txt",tags,snapshot+" archivé","ARCHIVED");
    await document(brand,"Hypothèse.txt",tags,snapshot+" proposé","PROPOSED");
    await document(foreign,"Autre marque.txt",tags,snapshot+" confidentiel");
    await document(brand,"Accès.txt",["Canaux officiels"],"Site officiel déclaré : https://atelier.example/\nAndroid disponible par téléchargement direct.");
    const sources=await readEditorialSources(brand);
    expect(sources.map(s=>s.label).sort()).toEqual(["Accès.txt","Diffusions.txt"]);
    const evidence=prepareEditorialEvidence(sources,month);
    const calendar=await composeGloryDeterministic("content-calendar-strategist",brand,{},evidence);
    const parsed=contentCalendarOutputSchema.parse(calendar.output);
    expect(parsed.posts).toHaveLength(1);
    expect(parsed.posts[0]).toMatchObject({externalPostId:"buffer-42",caption:"Une vraie légende.\n\nAvec deux paragraphes.",source:{sourceId:kept.id}});
    expect(evidence.brief).toContain("Android disponible");
  });
  it("reçoit le planning opérationnel initial malgré une édition legacy Playbook et plusieurs lectures documentaires plus récentes",async()=>{
    const active=await db.gloryOutput.create({data:{strategyId:brand,toolSlug:"content-calendar-strategist",output:{posts:[]},createdAt:new Date("2020-01-01T00:00:00Z")}});
    const edition=await db.sequenceExecution.create({data:{strategyId:brand,sequenceKey:"PLAYBOOK-E",tier:1,status:"COMPLETED",stepResults:[]}});
    await db.gloryOutput.create({data:{strategyId:brand,executionId:edition.id,toolSlug:"content-calendar-strategist",output:{posts:[]}}});
    await db.gloryOutput.createMany({data:Array.from({length:10},()=>({strategyId:brand,toolSlug:"content-calendar-strategist",output:{calendarRole:"EXTERNAL_SCHEDULE_SNAPSHOT",posts:[]}}))});
    expect((await readActiveCalendar(brand,db))?.id).toBe(active.id);
    expect(await db.brandAction.count({where:{strategyId:brand}})).toBe(0);
  });
});
