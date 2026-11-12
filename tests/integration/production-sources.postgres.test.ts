/** Local synthetic PostgreSQL only. No gateway, image provider or social connector. */
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { composeDeliverable } from "@/server/services/deliverable-orchestrator/composer";
import { claimProductionPreview, getCurrentProductionPreview } from "@/server/services/deliverable-orchestrator/production-sources";

const suffix=randomUUID(), strategyId="av01-brand-"+suffix, foreignId="av01-foreign-"+suffix, userId="av01-operator-"+suffix;
const assetId="av01-copy-"+suffix, previewIntentId="av01-preview-"+suffix;
const request={strategyId,operatorId:userId,targetKind:"KV_VISUAL",previewOnly:true,pins:[{assetId,version:2,role:"COPY" as const}]};
let safe=false;
beforeAll(async()=>{
  const endpoint = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1","localhost"]).toContain(endpoint.hostname); expect(endpoint.pathname).toBe("/shinkiro_verify");
  safe=true;
  await db.user.create({data:{id:userId,email:"av01-"+suffix+"@example.invalid"}});
  await db.strategy.createMany({data:[{id:strategyId,userId,name:"Test de composition"},{id:foreignId,userId,name:"Autre marque de recette"}]});
  await db.brandAsset.create({data:{id:assetId,strategyId,name:"Légende de recette",version:2,kind:"SOCIAL_COPY",state:"CANDIDATE",content:"Texte retenu · version 2"}});
  const preview=await composeDeliverable({...request,sourceIntentId:previewIntentId});
  expect(preview.status).toBe("PREVIEW");
  await db.intentEmission.create({data:{id:previewIntentId,strategyId,intentKind:"COMPOSE_DELIVERABLE",status:"OK",
    payload:request,result:{output:preview} as unknown as Prisma.InputJsonValue}});
});
afterAll(async()=>{
  if (!safe) return;
  await db.intentEmission.deleteMany({where:{strategyId}});
  await db.brandAsset.deleteMany({where:{strategyId}});
  await db.strategy.deleteMany({where:{id:{in:[strategyId,foreignId]}}});
  await db.user.deleteMany({where:{id:userId}});
  await db.$disconnect();
});
describe("Source production : aperçu persistant et réservation",()=>{
  it("relit le vrai texte sans ADVE actif ; refuse la lecture depuis la marque voisine",async()=>{
    const state=await getCurrentProductionPreview(strategyId,previewIntentId);
    expect(state.sourceManifest.sources[0]?.text).toBe("Texte retenu · version 2");
    expect(state.missingPreconditions).toContain("MISSING_ACTIVE_ADVE_PILLAR");
    await expect(getCurrentProductionPreview(foreignId,previewIntentId)).rejects.toThrow(/inaccessible/);
  });
  it("deux lancements simultanés ne peuvent réserver qu’une tentative",async()=>{
    const jobs=["av01-run-a-"+suffix,"av01-run-b-"+suffix];
    await db.intentEmission.createMany({data:jobs.map(id=>({id,strategyId,intentKind:"COMPOSE_DELIVERABLE",status:"PENDING",payload:{previewIntentId}}))});
    const outcomes=await Promise.allSettled(jobs.map(id=>claimProductionPreview(strategyId,previewIntentId,id)));
    expect(outcomes.filter(o=>o.status==="fulfilled")).toHaveLength(1);
    expect(outcomes.filter(o=>o.status==="rejected")).toHaveLength(1);
    const saved=await getCurrentProductionPreview(strategyId,previewIntentId);
    expect(jobs).toContain(saved.dispatchReceipt?.intentId);
    expect(saved.dispatchReceipt?.status).toBe("PENDING");
  });
  it("l'archivage interdit toute nouvelle lecture de la copie figée",async()=>{
    await db.brandAsset.update({where:{id:assetId},data:{state:"ARCHIVED"}});
    await expect(getCurrentProductionPreview(strategyId,previewIntentId)).rejects.toThrow(/relire|archivée/);
  });
});
