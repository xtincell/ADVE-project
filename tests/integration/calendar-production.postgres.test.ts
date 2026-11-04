/** Local-only receipt, without sending brand, image or publication requests. */
import { afterAll,beforeAll,describe,it,expect } from "vitest";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { calendarPreparation } from "@/domain/calendar-production";
import { calendarProductionRows, prepareCalendarBriefRows, readCalendarBriefSource } from "@/server/services/deliverable-orchestrator/calendar-production";
import { claimProductionPreview } from "@/server/services/deliverable-orchestrator/production-sources";

const run=randomUUID(), brand="cal-brand-"+run, foreign="cal-foreign-"+run,user="cal-user-"+run, source="cal-source-"+run;
const operator="calendar-op-"+run;
const asJSON=(v:unknown)=>v as Prisma.InputJsonValue;
let safe=false;
const post={date:"2026-10-14",format:"Story",platform:"Instagram",theme:"Adresse du marché",angle:"Connaître le prix",caption:"Copy exacte : 2 000 F.",illustration:"Laisser le texte en légende.",hashtags:["#Sortie"],family:"terrain",actionId:"terrain-pilote"};
const data={posts:[post],cadenceParCanal:{Instagram:{rythme:"1 post/sem",format:"Story",piliers:["Lieu"]}},themesParPhaseOverton:[{phase:"A",contenus:["Marché"]}]};
const doctrine={schema:"creative-direction/v1",sources:[{id:"da",label:"DA octobre",locator:"§4"}],families:[{id:"terrain",name:"Terrain",purpose:"Faire découvrir un lieu",signals:["adresse"],requirements:["Localiser sans inventer"],sources:["da"]}],rules:[{id:"copy",domain:"VOICE",usage:"KEEP",guidance:"La copy validée reste en légende.",sources:["da"],families:["terrain"]}]};
beforeAll(async()=>{
  const url=new URL(process.env.DATABASE_URL!);expect(["localhost","127.0.0.1"]).toContain(url.hostname);expect(url.pathname).toBe("/shinkiro_verify");safe=true;
  await db.operator.create({data:{id:operator,name:"Planning",slug:operator,status:"ACTIVE",licenseType:"TRIAL",licensedAt:new Date(),licenseExpiry:new Date(Date.now()+86400000)}});
  await db.user.create({data:{id:user,email:"planning-"+run+"@example.invalid",operatorId:operator}});
  await db.strategy.createMany({data:[{id:brand,userId:user,operatorId:operator,name:"Recette du planning"},{id:foreign,userId:user,name:"Autre marque"}]});
  await db.pillar.create({data:{strategyId:brand,key:"d",currentVersion:7,content:asJSON({directionArtistique:{doctrine}})}});
  await db.gloryOutput.create({data:{id:source,strategyId:brand,toolSlug:"content-calendar-strategist",output:data}});
});
afterAll(async()=>{
  if(!safe)return;
  await db.assetVersion.deleteMany({where:{strategyId:brand}});
  await db.generativeTask.deleteMany({where:{strategyId:brand}});
  await db.intentEmission.deleteMany({where:{strategyId:brand}});
  await db.brandAsset.updateMany({where:{strategyId:brand},data:{parentBrandAssetId:null,supersededById:null}});
  await db.brandAsset.deleteMany({where:{strategyId:brand}});
  await db.gloryOutput.deleteMany({where:{strategyId:brand}});
  await db.pillar.deleteMany({where:{strategyId:brand}});
  await db.strategy.deleteMany({where:{id:{in:[brand,foreign]}}});await db.user.deleteMany({where:{id:user}});await db.operator.deleteMany({where:{id:operator}});await db.$disconnect();
});
async function prepare(options?:number,correction?:{assetId:string,version:number,instruction:string,photoPolicy?:"LOCKED_MASTER"}){
  const {rows,calendarVersion}=await calendarProductionRows({strategyId:brand});
  const command=calendarPreparation.parse({strategyId:brand,calendarVersion,postKeys:[rows[0]!.key],optionsPerPost:options,correction});
  const intentId="cal-prepare-"+randomUUID();
  await db.intentEmission.create({data:{id:intentId,strategyId:brand,intentKind:"COMPOSE_DELIVERABLE",status:"PENDING",payload:asJSON({calendarPreparation:command})}});
  const result=await prepareCalendarBriefRows(command,user,intentId);
  await db.intentEmission.update({where:{id:intentId},data:{status:"OK",result:asJSON({output:result})}});
  expect(result.rows[0]?.error).toBeNull();return result.rows[0]!.briefs;
}
describe("Production depuis une ligne du calendrier",()=>{
  it("la lecture est sans effet ; la date proposée n’est pas la ligne éditoriale stockée",async()=>{
    const stored=await calendarProductionRows({strategyId:brand});
    const projected=await calendarProductionRows({strategyId:brand,startDate:"2027-04-01",weeks:2,projectDates:true});
    expect((await calendarProductionRows({strategyId:brand,startDate:"2027-04-01"})).rows[0]?.origin).toBe("STORED");
    expect(stored.rows[0]).toMatchObject({origin:"STORED",post:{date:post.date,caption:post.caption},briefs:[]});
    expect(projected.rows[0]?.origin).toBe("PROJECTED");expect(projected.rows[0]?.key).not.toBe(stored.rows[0]?.key);
    expect(await db.brandAsset.count({where:{strategyId:brand}})).toBe(0);
  });
  it("le bus Mestor prépare, scelle et rouvre une option ; une fondation non prête ne déclenche pas de génération",async()=>{
    const scope={strategyId:brand,startDate:"2027-04-01",weeks:2,projectDates:true};
    const {rows,calendarVersion}=await calendarProductionRows(scope);
    const cmd=calendarPreparation.parse({...scope,calendarVersion,postKeys:[rows[0]!.key],optionsPerPost:1});
    const {emitIntentTyped}=await import("@/server/services/mestor/intents");
    const out=await emitIntentTyped<Awaited<ReturnType<typeof prepareCalendarBriefRows>>>({kind:"COMPOSE_DELIVERABLE",strategyId:brand,
      operatorId:user,targetKind:"KV_VISUAL",previewOnly:true,calendarPreparation:cmd},{caller:"planning-test-local"});
    expect(out.rows[0]?.error).toBeNull();
    const b=out.rows[0]!.briefs[0]!;
    const source=await readCalendarBriefSource(brand,b.assetId,b.version);expect(source.text).toContain("PROJECTED");
    const {produceCalendarBrief}=await import("@/server/services/deliverable-orchestrator/calendar-production");
    const rec=await produceCalendarBrief({strategyId:brand,assetId:b.assetId,version:b.version},user);
    expect(rec.status).toBe("BLOCKED");expect(rec.previewIntentId).toBeTruthy();
    const {readProductionPreview}=await import("@/server/services/deliverable-orchestrator/production-sources");
    expect((await readProductionPreview(brand,rec.previewIntentId!)).upstreamSnapshot).toMatch(/^[a-f0-9]{64}$/);
    expect(await db.generativeTask.count({where:{strategyId:brand}})).toBe(0);
  });
  it("deux demandes simultanées créent deux pistes distinctes, réutilisées et gouvernées par D",async()=>{
    const [a,b]=await Promise.all([prepare(),prepare()]);expect(a.map(x=>x.assetId)).toEqual(b.map(x=>x.assetId));
    expect(a.map(x=>x.variant)).toEqual([1,2]);
    expect(await db.brandAsset.findUnique({where:{id:a[0]!.assetId},select:{operatorId:true,metadata:true}})).toMatchObject({operatorId:operator,metadata:{preparedByUserId:user}});
    const manifests=await Promise.all(a.map(x=>readCalendarBriefSource(brand,x.assetId,x.version)));
    const contents=manifests.map(p=>JSON.parse(p.text));
    expect(contents[0].treatment).not.toBe(contents[1].treatment);
    expect(contents[0]).toMatchObject({action:"terrain-pilote",family:"terrain",post:{caption:post.caption},direction:{source:"D.directionArtistique.doctrine",version:7}});
    expect(contents[0].direction.rules[0].guidance).toMatch(/légende/);await expect(readCalendarBriefSource(foreign,a[0]!.assetId,1)).rejects.toThrow(/disponible/);
  });
  it("quatre options possibles, correction d’une seule piste ; le replay conserve les versions",async()=>{
    const options=await prepare(4);expect(options.map(b=>b.variant)).toEqual([1,2,3,4]);const first=options[0]!;
    expect(await db.brandAsset.count({where:{strategyId:brand,id:{in:options.map(o=>o.assetId)},batchSize:4}})).toBe(4);
    const change={assetId:first.assetId,version:1,instruction:"Rapprocher le cadrage, préserver la copy."};
    const [corrected]=await prepare(undefined,change);
    expect(corrected).toMatchObject({variant:1,version:2});expect((await prepare(1,change))[0]?.assetId).toBe(corrected!.assetId);
    const rows=await calendarProductionRows({strategyId:brand});expect(rows.rows[0]?.briefs.map(b=>b.version)).toEqual([2,1,1,1]);
    await expect(readCalendarBriefSource(brand,first.assetId,1)).rejects.toThrow(/version/);
  });
  it("deux aperçus distincts ne peuvent attribuer deux fois la même option",async()=>{
    const [b]=await prepare(1);const j=[randomUUID(),randomUUID()], previews=[randomUUID(),randomUUID()];
    await db.intentEmission.createMany({data:[...j.map(id=>({id,status:"PENDING"})),...previews.map(id=>({id,status:"OK"}))].map(row=>({...row,strategyId:brand,intentKind:"COMPOSE_DELIVERABLE",payload:{}}))});
    const results=await Promise.allSettled(j.map((id,i)=>claimProductionPreview(brand,previews[i]!,id,b)));
    expect(results.filter(x=>x.status==="fulfilled")).toHaveLength(1);
    const rows=await calendarProductionRows({strategyId:brand});expect(rows.rows[0]?.briefs[0]?.generation?.status).toBe("PENDING");
  });
  it("le suivi liste les versions de la tâche sans transmettre ses octets ni son URL privée ; un fournisseur seul ne vaut pas réception",async()=>{
    const c=await calendarProductionRows({strategyId:brand});const b=c.rows[0]!.briefs[0]!, dispatch=b.generation!.dispatchIntentId!;
    const task=await db.generativeTask.create({data:{intentId:randomUUID(),strategyId:brand,operatorId:user,forgeKind:"image",provider:"test-local",providerModel:"fixture",status:"COMPLETED",promptHash:"f".repeat(64),parameters:{},pillarSource:"D",manipulationMode:"entertainer",estimatedCostUsd:0,webhookSecret:"fixture-only"}});
    await db.intentEmission.update({where:{id:dispatch},data:{status:"OK",result:{output:{generativeTaskId:task.id}}}});
    const ref=await db.assetVersion.create({data:{generativeTaskId:task.id,strategyId:brand,operatorId:user,kind:"image",url:"https://example.invalid/provider/private",metadata:{}}});
    const first=(await calendarProductionRows({strategyId:brand})).rows[0]!.briefs[0]!.generation!;
    expect(first.status).toBe("AWAITING_FILE");expect(first.materialVersions[0]).toMatchObject({id:ref.id,url:"/api/production/image/"+ref.id,status:"PROVIDER_ONLY"});expect(JSON.stringify(first)).not.toContain("example.invalid");
    const png=await db.assetVersion.create({data:{generativeTaskId:task.id,strategyId:brand,operatorId:user,kind:"image",url:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5b8AAAAASUVORK5CYII=",metadata:{}}});
    const second=(await calendarProductionRows({strategyId:brand})).rows[0]!.briefs[0]!.generation!;
    expect(second.status).toBe("FILE_STORED");expect(second.materialVersions.find(x=>x.id===png.id)?.url).toBe("/api/production/image/"+png.id);expect(JSON.stringify(second)).not.toContain("base64");
  });
  it("un échec Ptah sans sortie conserve la tâche de cette seule piste et ne prétend pas avoir reçu un fichier",async()=>{
    const b=(await calendarProductionRows({strategyId:brand})).rows[0]!.briefs[0]!;
    const dispatch=b.generation!.dispatchIntentId!;
    const failed=await db.generativeTask.create({data:{intentId:randomUUID(),sourceBrandAssetId:b.assetId,strategyId:brand,operatorId:user,forgeKind:"image",provider:"test-local",providerModel:"fixture",status:"FAILED",promptHash:"b".repeat(64),parameters:{},pillarSource:"D",manipulationMode:"entertainer",estimatedCostUsd:0,webhookSecret:"fixture-only"}});
    await db.intentEmission.update({where:{id:dispatch},data:{status:"FAILED",result:{output:{}}}});
    const read=(await calendarProductionRows({strategyId:brand})).rows[0]!.briefs[0]!.generation!;
    expect(read).toMatchObject({status:"FAILED",materialStatus:"FAILED",generativeTaskId:failed.id,materialVersions:[]});
  });
  it("le planning porte le master de cette marque jusqu’à la production et refuse sa substitution",async()=>{
    const {resolveProductionSources}=await import("@/server/services/deliverable-orchestrator/production-sources");
    const {materialHandoffBlock}=await import("@/domain/production-sources");
    const asset=await db.brandAsset.create({data:{strategyId:brand,operatorId:operator,kind:"KV_VISUAL",name:"Master verrouillé",mimeType:"image/svg+xml",metadata:{original:{state:"STORED",contentHash:"a".repeat(64)}}}});
    const artwork={assetId:asset.id,version:asset.version,originalHash:"a".repeat(64),photoLayerId:"photo",photoPolicy:"GENERATED_CANDIDATE"};
    const copy=await db.brandAsset.create({data:{strategyId:brand,operatorId:operator,kind:"SOCIAL_COPY",name:"Copie retenue",content:post.caption}});
    const sourcePins=[{assetId:copy.id,version:copy.version,role:"COPY"}];
    const newer=await db.gloryOutput.create({data:{strategyId:brand,toolSlug:"content-calendar-strategist",output:asJSON({...data,posts:[{...post,productionArtwork:artwork,productionSources:sourcePins}]})}});
    try {
      const [b]=await prepare(1);const ref={assetId:b!.assetId,version:b!.version};
      const m=await resolveProductionSources(brand,[],undefined,undefined,ref);expect(m.productionArtwork).toEqual(artwork);expect(materialHandoffBlock(m)).toBeNull();expect(m.sources.find(s=>s.role==="COPY")?.text).toBe(post.caption);
      const [next]=await prepare(1,{assetId:b!.assetId,version:b!.version,instruction:"Restituer le master original.",photoPolicy:"LOCKED_MASTER"});
      expect((await readCalendarBriefSource(brand,next!.assetId,next!.version)).sourcePins).toEqual(sourcePins);
      expect((await calendarProductionRows({strategyId:brand})).rows[0]!.briefs[0]!.history[0]?.assetId).toBe(b!.assetId);
      const current={assetId:next!.assetId,version:next!.version};
      expect((await resolveProductionSources(brand,[],undefined,undefined,current)).productionArtwork).toEqual({...artwork,photoPolicy:"LOCKED_MASTER"});
      expect(calendarPreparation.shape.correction.safeParse({...current,instruction:"Remplacer la photo.",photoPolicy:"GENERATED_CANDIDATE"}).success).toBe(false);
      await expect(resolveProductionSources(brand,[{assetId:asset.id,version:asset.version,role:"REFERENCE"}],undefined,undefined,current)).rejects.toThrow(/contredit/);
      await db.brandAsset.update({where:{id:asset.id},data:{state:"ARCHIVED"}});
      await expect(resolveProductionSources(brand,[],undefined,undefined,current)).rejects.toThrow(/relire/);
    } finally {await db.gloryOutput.update({where:{id:newer.id},data:{toolSlug:"recette-ligne-historique"}});}
  });
  it("une DA corrigée invalide le brief figé",async()=>{
    const rows=await calendarProductionRows({strategyId:brand});const b=rows.rows[0]!.briefs[0]!;
    await db.pillar.update({where:{strategyId_key:{strategyId:brand,key:"d"}},data:{currentVersion:8}});
    await expect(readCalendarBriefSource(brand,b.assetId,b.version)).rejects.toThrow(/doctrine/);
  });
});
