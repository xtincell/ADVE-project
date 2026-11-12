/** Exercise real Glory → Artemis sequence → Mestor vault → deliverable reads on isolated PostgreSQL. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { DEVOTION_LADDER_TIERS } from "@/domain/devotion-ladder";
import { db } from "@/lib/db";
import { gloryRouter } from "@/server/trpc/routers/glory";
import { sequenceVaultRouter } from "@/server/trpc/routers/sequence-vault";
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
import { executeSequence } from "@/server/services/artemis/tools/sequence-executor";
import { compileDeliverable, listCompilableDeliverables } from "@/server/services/artemis/tools/deliverable-compiler";
import { acceptExecution, getAcceptedExecution, checkPrerequisites, recordExecution } from "@/server/services/sequence-vault";

const gateway = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/llm-gateway", async importOriginal => ({ ...await importOriginal<typeof import("@/server/services/llm-gateway")>(), callLLM: gateway }));
vi.mock("@/server/services/advertis-scorer", () => ({ scoreObject: vi.fn(async () => ({})) }));
vi.mock("@/server/services/artemis/tools/quality-gate", () => ({ applySequenceQualityGate: vi.fn(async () => ({})), runQualityGateSoft: vi.fn(), runQualityGateHard: vi.fn() }));
vi.mock("@/server/services/auto-promotion", () => ({ getQualityGateMode: vi.fn(async () => "SOFT") }));
const brand = `glory-receipt-${randomUUID()}`, user = `operator-${randomUUID()}`, operator = `op-${randomUUID()}`, key = "DEVOTION-LADDER";
const outsider = `outside-${randomUUID()}`, otherOperator = `other-op-${randomUUID()}`;
function context(id = user) {
  return { db, headers: undefined, session: { user: { id, name: "Opératrice de recette", role: "USER" as const }, expires: new Date(Date.now()+60000).toISOString() } };
}
const tiers = DEVOTION_LADDER_TIERS.map(tier => tier.toLowerCase());
const levels = { devotion_levels: tiers.map(palier => ({ palier, definition: "Définition", trigger: "Signal", experience: "Parcours", conversionPct: 12, kpis: ["Mesure"], drifts: ["Risque"] })), summary: "Scénario de recette", distribution_note: "Cohorte fictive ; hypothèses à vérifier.", current_distribution: { spectateurs: 65, interesses: 14, participants: 9, engages: 6, ambassadeurs: 4, evangelistes: 2 } };
const rituals = { rituals_by_level: tiers.map(palier => ({ palier, rituals: [{name:"Rituel",description:"Proposition", frequency:"monthly",channel:"Communauté"}], codes: ["Code"], symbols: ["Symbole"], ceremonies: ["Transmission"] })), manifesto_extract: "Extrait de recette", implementation_priorities: [{priority:1,action:"Vérifier",owner:"Responsable de marque"}] };
const response = (data: unknown) => ({ text: JSON.stringify(data), model: "gpt-5.6-luna", provider: "openai-codex-oauth" });
let safe = false;
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname); expect(url.pathname).toBe("/shinkiro_verify"); safe = true;
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("Réseau interdit en recette"); }));
  await db.operator.create({ data: { id: operator, name: "Recette Glory", slug: operator, status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now()+86400000) } });
  await db.user.create({ data: { id: user, operatorId: operator, email: `${user}@example.invalid` } });
  await db.operator.create({ data: { id: otherOperator, name: "Autre espace", slug: otherOperator, status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now()+86400000) } });
  await db.user.create({ data: { id: outsider, operatorId: otherOperator, email: `${outsider}@example.invalid` } });
  await db.strategy.create({ data: { id: brand, name: "Marque fictive locale", userId: user, operatorId: operator,
    manipulationMix: { primary: "entertainer", peddler: .05, dealer: .05, facilitator: .30, entertainer: .60 } } });
  await db.pillar.createMany({data:[{strategyId:brand,key:"a",content:{noyauIdentitaire:"Bouche à oreille"}},{strategyId:brand,key:"d",content:{personas:["public"],tonDeVoix:{personnalite:"direct"}}},{strategyId:brand,key:"e",content:{rituels:["rituel"],touchpoints:["recommandation"]}}]});
});
afterAll(async () => {
  if (safe) {
    await db.signal.deleteMany({where:{strategyId:brand}});
    await db.intentEmission.deleteMany({where:{strategyId:brand}});
    await db.brandAsset.deleteMany({where:{strategyId:brand}});
    await db.gloryOutput.deleteMany({where:{strategyId:brand}});
    await db.sequenceExecution.deleteMany({where:{strategyId:brand}});
    await db.pillar.deleteMany({where:{strategyId:brand}});
    await db.strategy.deleteMany({where:{id:brand}});
    await db.user.deleteMany({where:{id:{in:[user,outsider]}}});
    await db.operator.deleteMany({where:{id:{in:[operator,otherOperator]}}});
  }
  vi.unstubAllGlobals(); await db.$disconnect();
});

describe("Réception locale d’une édition Devotion Ladder", () => {
  it("conserve l’échec sans document ni appel au designer dépendant, puis reçoit et relit une édition exacte", async () => {
    gateway.mockRejectedValue(new Error("Erreur transport simulée"));
    const failure = await executeSequence(key, brand);
    expect(failure.status).toBe("FAILED"); expect(failure.steps.map(s => s.status)).toEqual(["FAILED", "SKIPPED"]);
    expect(gateway).toHaveBeenCalledTimes(1);
    const empty = await compileDeliverable(brand, key);
    expect(empty.sections).toEqual([]); expect(empty.meta.generatedAt).toBeNull(); expect(empty.history).toHaveLength(1);
    await expect(acceptExecution(failure.executionId!, user)).rejects.toThrow();
    expect((await listCompilableDeliverables(brand)).find(row => row.sequenceKey === key)).toBeUndefined();

    gateway.mockReset().mockImplementation(async ({caller, prompt}: {caller:string;prompt:string}) => {
      if (caller.includes("devotion-levels-mapper")) return response(levels);
      expect(caller).toContain("devotion-rituals-designer"); expect(prompt).toContain("evangeliste"); expect(prompt).toContain("entertainer"); return response(rituals);
    });
    const done = await executeSequence(key, brand);
    expect(done.status).toBe("COMPLETED"); expect(gateway).toHaveBeenCalledTimes(2);
    const compiled = await compileDeliverable(brand, key);
    expect(compiled.isComplete).toBe(true); expect(compiled.sections).toHaveLength(2);
    for (const section of compiled.sections) expect(section.version).toMatchObject({executionId:done.executionId,author:"Luna",engine:"gpt-5.6-luna",approval:"PENDING"});
    expect(await getAcceptedExecution(brand,key)).toBeNull();
    const foreign = sequenceVaultRouter.createCaller(context(outsider));
    for (const request of [() => foreign.accept({executionId:done.executionId!}), () => foreign.reject({executionId:done.executionId!,reason:"Hors portée"}), () => foreign.delete({executionId:done.executionId!})]) {
      await expect(request()).rejects.toMatchObject({code:"FORBIDDEN"});
    }
    await sequenceVaultRouter.createCaller(context()).accept({executionId:done.executionId!}); const approved = await getAcceptedExecution(brand,key);
    expect(approved?.reviewedBy).toBe(user); expect(approved?.gloryOutputs).toHaveLength(2); expect(approved?.promotedAssets).toHaveLength(2);
    const owner = sequenceVaultRouter.createCaller(context());
    await expect(owner.reject({ executionId: done.executionId!, reason: "Rejet contradictoire" })).rejects.toThrow();
    await expect(owner.delete({ executionId: done.executionId! })).rejects.toThrow();
    const ids = compiled.sections.map(s=>s.version!.id);

    gateway.mockReset().mockImplementation(async ({caller}:{caller:string})=>{ if(caller.includes('rituals-designer')) throw new Error("Indisponibilité simulée"); return response({...levels, summary:"Nouvelle tentative partielle"}); });
    const partial = await executeSequence(key,brand); expect(partial.status).toBe("PARTIAL");
    await expect(acceptExecution(partial.executionId!, user)).rejects.toThrow();
    expect((await getAcceptedExecution(brand,key))?.id).toBe(done.executionId);
    expect((await checkPrerequisites(brand,[{type:"SEQUENCE",key,status:"ACCEPTED"}])).blocked).toBe(false);
    const stillReadable=await compileDeliverable(brand,key); expect(stillReadable.sections.map(s=>s.version!.id)).toEqual(ids);
    expect(stillReadable.meta.generatedAt).toEqual(compiled.meta.generatedAt); expect(stillReadable.history.filter(h=>!h.usable)).toHaveLength(2);
    const previousAssets = approved!.promotedAssets.map(a=>a.id);
    gateway.mockReset().mockImplementation(async ({caller}:{caller:string})=>response(caller.includes("rituals-designer") ? rituals : {...levels,summary:"Nouvelle édition"}));
    const replacement = await executeSequence(key,brand); expect(replacement.status).toBe("COMPLETED");
    await acceptExecution(replacement.executionId!,user);
    expect((await getAcceptedExecution(brand,key))?.id).toBe(replacement.executionId);
    expect(await db.brandAsset.count({where:{id:{in:previousAssets}}})).toBe(previousAssets.length);
    expect((await checkPrerequisites(brand,[{type:"SEQUENCE_ANY",tier:2,count:2}])).blocked).toBe(true);
    expect((await compileDeliverable(brand,key,{"devotion-levels-mapper":ids[0]!})).sections[0]?.version?.id).toBe(ids[0]);
  });
  it("relie la saisie manuelle à son auteur authentifié sans nouvelle génération",async()=>{
    const calls=gateway.mock.calls.length;
    const manual = await gloryRouter.createCaller(context()).executeHybrid({
      toolSlug:"devotion-levels-mapper",strategyId:brand,input:{},preferManual:true,manualEntry:levels,
    });
    expect(manual.path).toBe("manual");expect(gateway.mock.calls).toHaveLength(calls);
    const edition=await compileDeliverable(brand,key,{"devotion-levels-mapper":manual.outputId});
    expect(edition.sections[0]?.version).toMatchObject({id:manual.outputId, author:"Opératrice de recette",engine:null});
  });
  it("sérialise deux nouvelles versions concurrentes sans doubler le numéro courant", async()=>{
    const sequenceKey="private-concurrent-receipt";
    const runs=await Promise.all([1,2].map(()=>recordExecution({strategyId:brand,sequenceKey,tier:1,status:"FAILED",stepResults:[]})));
    const rows=await db.sequenceExecution.findMany({where:{id:{in:runs}},orderBy:{version:"asc"}});
    expect(rows.map(r=>r.version)).toEqual([1,2]);expect(rows.map(r=>r.isCurrent)).toEqual([false,true]);
  });
});
