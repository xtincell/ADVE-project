/** Existing amendment, real persistence and documentary fences; isolated DB only. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { model as planningModel, projection as audienceProjection } from "../fixtures/strategy-planning";
import { financialModelFixture } from "../fixtures/financial-model";
import { resolveUnitEconomics } from "@/domain/unit-economics";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/services/oracle-section", () => ({ markAllSectionsStale: vi.fn(async () => ({})) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import * as gateway from "@/server/services/pillar-gateway";
import { operatorAmendPillar } from "@/server/services/mestor/operator-amend";
import { resolveBrandSource, setSourceUse } from "@/server/services/ingestion-pipeline/source-usage";
import type { Intent } from "@/server/services/mestor/intents";
import { pillarRouter } from "@/server/trpc/routers/pillar";
import { mapContexteDefi, mapPropositionValeur } from "@/server/services/strategy-presentation/section-mappers";
import { fieldStatusFor, inferredFieldPaths } from "@/domain/field-provenance";
import { serializePillar } from "@/server/services/utils/pillar-context";
type Amend = Extract<Intent, { kind: "OPERATOR_AMEND_PILLAR" }>;
let userId: string, operatorId: string;
const strategies: string[] = [];
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname); expect(url.pathname).toBe("/shinkiro_verify");
  operatorId = (await db.operator.create({ data: {
    name: "Amendement source — opérateur isolé", slug: `amend-source-${randomUUID()}`,
    status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(),
    licenseExpiry: new Date(Date.now() + 86_400_000),
  } })).id;
  userId = (await db.user.create({ data: { email: `amend-source-${randomUUID()}@example.test`, role: "ADMIN", operatorId } })).id;
});
afterAll(async () => {
  if (strategies.length) {
    const scope = { strategyId: { in: strategies } };
    await db.recommendation.deleteMany({ where: scope });
    await db.brandSourceUse.deleteMany({ where: scope });
    await db.brandDataSource.deleteMany({ where: scope });
    await db.scoreSnapshot.deleteMany({ where: scope });
    await db.intentEmission.deleteMany({ where: scope });
    await db.costDecision.deleteMany({ where: scope });
    await db.pillar.deleteMany({ where: scope });
    await db.strategy.deleteMany({ where: { id: { in: strategies } } });
  }
  if (userId) await db.user.delete({ where: { id: userId } });
  if (operatorId) await db.operator.delete({ where: { id: operatorId } });
  await db.$disconnect();
});
async function fixture(human = false) {
  const brand = await db.strategy.create({ data: { name: "Amendement source — recette isolée", userId, operatorId } });
  strategies.push(brand.id);
  const pillar = await db.pillar.create({ data: { strategyId: brand.id, key: "v", content: {
    promesseDeValeur: "Valeur précédente", _fieldProvenance: { promesseDeValeur: human ? "HUMAN" : "INFERRED" },
  } } });
  const source = await db.brandDataSource.create({ data: { strategyId: brand.id, sourceType: "MANUAL_INPUT",
    fileName: "PRD de recette", rawContent: "Une offre prévue, aucune publication reçue.", certainty: "DECLARED", processingStatus: "EXTRACTED" } });
  const receipt = { sourceId: source.id, contentHash: (await resolveBrandSource(source.id, brand.id)).contentHash };
  const intent = { kind: "OPERATOR_AMEND_PILLAR", strategyId: brand.id, operatorId: userId, pillarKey: "v",
    mode: "PATCH_DIRECT", field: "promesseDeValeur", proposedValue: "Offre prévue, publication non reçue.",
    reason: "Réconciliation documentaire de recette, sans décision humaine inventée.", viaAgent: true,
    expectedVersion: 1, sourceReceipts: [receipt] } satisfies Amend;
  return { brand, pillar, source, receipt, intent };
}
async function financialFixture() {
  const f = await fixture();
  await db.pillar.update({ where: { id: f.pillar.id }, data: { content: { unitEconomics: { cac: null, ltv: null, ltvCacRatio: null }, _fieldProvenance: { unitEconomics: "HUMAN" } } } });
  const d = await db.pillar.create({ data: { strategyId: f.brand.id, key: "d", content: { personas: [{ id: "payer-fixture", name: "Client payeur de recette", actorRoles: ["PAYER"] }] } } });
  await db.brandDataSource.update({ where: { id: f.source.id }, data: { fileType: "JSON", rawData: { _document: {
    schema: "document-edition-v1", family: "Modèle financier de recette", kind: "FINANCE", label: "v1", status: "PROPOSED", edition: 1,
    recordedAt: new Date().toISOString(), changeSummary: "Prémisses synthétiques, aucun argent réel" } } } });
  const receipt = { sourceId: f.source.id, contentHash: (await resolveBrandSource(f.source.id, f.brand.id)).contentHash };
  const model = financialModelFixture(); model.source = receipt;
  const intent: Amend = { ...f.intent, field: "financialModel", proposedValue: model, sourceReceipts: undefined, mode: "STRATEGIC_REWRITE" };
  return { ...f, d, receipt, model, intent };
}

describe("financial premises through the existing governed amendment", () => {
  it("admet les prémisses avec leur source et calcule en lecture sans écraser les anciennes valeurs humaines", async () => {
    const f = await financialFixture();
    const result = await operatorAmendPillar(f.intent);
    expect(result).toMatchObject({ status: "OK" });
    const after = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    const value = after.content as Record<string, unknown>;
    expect(value.unitEconomics).toEqual({ cac: null, ltv: null, ltvCacRatio: null });
    expect(value._fieldProvenance).toMatchObject({ unitEconomics: "HUMAN", financialModel: "INFERRED" });
    expect(resolveUnitEconomics(value)).toMatchObject({ cac: 7000, caVise: 11700000 });
    expect(after.sources).toContainEqual(f.receipt);
    expect(after.currentVersion).toBe(2);
    expect((await db.pillar.findUniqueOrThrow({ where: { id: f.d.id } })).currentVersion).toBe(1);
    expect(await db.pillarVersion.count({ where: { pillarId: f.pillar.id } })).toBe(1);
    expect(await db.aICostLog.count({ where: { strategyId: f.brand.id } })).toBe(0);
    expect(await db.campaign.count({ where: { strategyId: f.brand.id } })).toBe(0);
  });
  it("refuse un reçu périmé sans créer de recommandation ni de version", async () => {
    const f = await financialFixture(); f.model.source.contentHash = "b".repeat(64);
    const result = await operatorAmendPillar(f.intent);
    expect(result).toMatchObject({ status: "VETOED", reason: "FINANCIAL_REFERENCE_CHANGED" });
    expect(await db.recommendation.count({ where: { strategyId: f.brand.id } })).toBe(0);
    expect(await db.pillarVersion.count({ where: { pillarId: f.pillar.id } })).toBe(0);
  });
  it("refuse de calculer la cohorte payeuse sur le profil trafic", async () => {
    const f = await financialFixture();
    await db.pillar.update({ where: { id: f.d.id }, data: { content: { personas: [{ id: "payer-fixture", actorRoles: ["USER", "COMMUNICATION_AUDIENCE"] }] } } });
    const result = await operatorAmendPillar(f.intent);
    expect(result).toMatchObject({ status: "VETOED", reason: "FINANCIAL_PAYER_REQUIRED" });
    expect(await db.recommendation.count({ where: { strategyId: f.brand.id } })).toBe(0);
  });
  it("abandonne le modèle si les profils D changent après leur lecture", async () => {
    const f = await financialFixture();
    const realWrite = gateway.writePillarAndScore;
    const writer = vi.spyOn(gateway, "writePillarAndScore").mockImplementationOnce(async request => {
      await db.pillar.update({ where: { id: f.d.id }, data: { currentVersion: { increment: 1 } } });
      return realWrite(request);
    });
    try {
      const result = await operatorAmendPillar(f.intent);
      expect(result).toMatchObject({ status: "FAILED" });
      expect(result.summary).toContain("PILLAR_SOURCE_VERSION_CONFLICT");
      expect((await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } })).currentVersion).toBe(1);
      expect(await db.pillarVersion.count({ where: { pillarId: f.pillar.id } })).toBe(0);
      expect(await db.recommendation.count({ where: { strategyId: f.brand.id, status: "APPLIED" } })).toBe(0);
    } finally { writer.mockRestore(); }
  });
  it("renvoie un amendement du résultat calculé vers les prémisses", async () => {
    const f = await financialFixture();
    expect((await operatorAmendPillar(f.intent)).status).toBe("OK");
    const result = await operatorAmendPillar({ ...f.intent, field: "unitEconomics.cac", proposedValue: 1, expectedVersion: 2 });
    expect(result).toMatchObject({ status: "VETOED", reason: "FINANCIAL_PREMISES_REQUIRED" });
    expect((await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } })).currentVersion).toBe(2);
  });
});

describe("planning premises use the same documentary fences", () => {
  it("persists the budget model and refuses partial or missing-version amendments", async () => {
    const f = await fixture();
    const intent: Amend = { ...f.intent, field: "strategyBudgetModel", proposedValue: { ...planningModel, source: f.receipt }, mode: "STRATEGIC_REWRITE" };
    expect(await operatorAmendPillar({ ...intent, sourceReceipts: undefined, expectedVersion: undefined })).toMatchObject({ status: "VETOED", reason: "PLANNING_MODEL_INCOMPLETE" });
    expect(await operatorAmendPillar({ ...intent, field: "strategyBudgetModel.horizonMonths", proposedValue: 3 })).toMatchObject({ status: "VETOED", reason: "PLANNING_MODEL_WHOLE_REQUIRED" });
    expect(await operatorAmendPillar(intent)).toMatchObject({ status: "OK" });
    const after = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    expect(after.currentVersion).toBe(2); expect(after.sources).toContainEqual(f.receipt);
    expect(after.content).toMatchObject({ strategyBudgetModel: intent.proposedValue, promesseDeValeur: "Valeur précédente" });
  });
  it("refuses a payer as audience then admits the correctly qualified audience without observed people", async () => {
    const f = await financialFixture();
    const e = await db.pillar.create({ data: { strategyId: f.brand.id, key: "e", content: {} } });
    const intent: Amend = { ...f.intent, pillarKey: "e", field: "devotionProjection", proposedValue: { ...audienceProjection, source: f.receipt, cohortPersonaId: "payer-fixture" } };
    expect(await operatorAmendPillar(intent)).toMatchObject({ status: "VETOED", reason: "PLANNING_AUDIENCE_REQUIRED" });
    await db.pillar.update({ where: { id: f.d.id }, data: { content: { personas: [{ id: "audience-fixture", actorRoles: ["USER", "COMMUNICATION_AUDIENCE"] }] } } });
    intent.proposedValue = { ...audienceProjection, source: f.receipt, cohortPersonaId: "audience-fixture" };
    expect(await operatorAmendPillar(intent)).toMatchObject({ status: "OK" });
    const after = await db.pillar.findUniqueOrThrow({ where: { id: e.id } });
    expect(after.currentVersion).toBe(2); expect(after.content).toMatchObject({ devotionProjection: intent.proposedValue, _fieldProvenance: { devotionProjection: "INFERRED" } });
    expect(await db.campaign.count({ where: { strategyId: f.brand.id } })).toBe(0);
  });
});

describe("documentary amendments through Mestor", () => {
  it("completes a human product cell and confirms only that cell with real history and fences", async () => {
    const f = await fixture();
    const path = "produitsCatalogue[0].gainClientConcret";
    const catalogue = [{ id: randomUUID(), nom: "Offre de recette", gainClientConcret: "", gainClientAbstrait: "Confiance" }];
    await db.pillar.update({ where: { id: f.pillar.id }, data: { content: {
      produitsCatalogue: catalogue, _fieldProvenance: { produitsCatalogue: "HUMAN" },
    } } });
    const result = await operatorAmendPillar({ ...f.intent, field: path, proposedValue: "Réduire le temps de recherche" });
    expect(result.status).toBe("OK");
    const after = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    expect(after.currentVersion).toBe(2);
    const content = after.content as Record<string, unknown>;
    expect(content.produitsCatalogue).toEqual([{ ...catalogue[0], gainClientConcret: "Réduire le temps de recherche" }]);
    expect(content._fieldProvenance).toEqual({ produitsCatalogue: "HUMAN", [path]: "INFERRED" });
    expect(inferredFieldPaths(content, {}, "v")).toEqual([path]);
    expect(fieldStatusFor({}, "v", content._fieldProvenance)(path)).toBe("INFERRED");
    expect(serializePillar("v", content)).toContain("Ces cellules portent leur propre origine");
    const history = await db.pillarVersion.findFirstOrThrow({ where: { pillarId: f.pillar.id }, orderBy: { version: "desc" } });
    expect(history).toBeTruthy();
    const reco = await db.recommendation.findFirstOrThrow({ where: { strategyId: f.brand.id } });
    expect(reco.currentSnapshot).toBe(""); expect(reco.reviewedBy).toBeNull();
    const caller = pillarRouter.createCaller({ db, headers: undefined, session: { user: { id: userId, role: "ADMIN" }, expires: new Date(Date.now() + 60_000).toISOString() } });
    expect(await caller.confirmInferredField({ strategyId: f.brand.id, pillarKey: "V", fieldPath: path, expectedVersion: 2 })).toMatchObject({ ok: true, provenanceLocked: path });
    const confirmed = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    expect((confirmed.content as Record<string, unknown>)._fieldProvenance).toEqual({ produitsCatalogue: "HUMAN", [path]: "HUMAN" });
    const refused = await operatorAmendPillar({ ...f.intent, field: path, proposedValue: "Une promesse différente", expectedVersion: 3 });
    expect(refused.status).toBe("FAILED"); expect(refused.summary).toContain("FIELD_PROVENANCE_REFUSED");
    expect((await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } })).currentVersion).toBe(3);
    expect(await db.campaign.count({ where: { strategyId: f.brand.id } })).toBe(0);
    expect(await db.aICostLog.count({ where: { strategyId: f.brand.id } })).toBe(0);
  });
  it("amende les rôles et échanges par la route gouvernée sans transformer un profil en contrat", async () => {
    const f = await fixture();
    const profiles = [
      { name: "Audience des blogueurs", motivations: "Découvrir des lieux", actorRoles: ["COMMUNICATION_AUDIENCE", "USER"] },
      { name: "Blogueurs foodies", motivations: "Partager leurs découvertes", actorRoles: ["PARTNER", "PRESCRIBER"] },
      { name: "Restaurateurs", motivations: "Être découverts", actorRoles: ["PAYER"] },
    ];
    await db.pillar.create({ data: { strategyId: f.brand.id, key: "d", content: { personas: profiles.map(({ actorRoles: _, ...p }) => p) } } });
    const caller = pillarRouter.createCaller({ db, headers: undefined, session: { user: { id: userId, role: "ADMIN" }, expires: new Date(Date.now() + 60_000).toISOString() } });
    const common = { strategyId: f.brand.id, mode: "STRATEGIC_REWRITE" as const,
      reason: "Instruction humaine de recette : distinguer public, clients et partenaires, sans contrat ou revenu inventé.", expectedVersion: 1 };
    expect((await caller.amend({ ...common, pillarKey: "D", field: "personas", proposedValue: profiles })).status).toBe("OK");
    const exchange = { personaName: "Blogueurs foodies", productNames: [], valueToBrand: ["Audience et contenus"], valueToActor: ["Contreparties à définir"], dependencyConditions: ["Accord gagnant-gagnant à établir"] };
    expect((await caller.amend({ ...common, pillarKey: "V", field: "personaSegmentMap", proposedValue: [exchange] })).status).toBe("OK");
    const pillars = await db.pillar.findMany({ where: { strategyId: f.brand.id } });
    expect(pillars.find(p => p.key === "d")?.content).toMatchObject({ personas: profiles });
    expect(pillars.find(p => p.key === "v")?.content).toMatchObject({ personaSegmentMap: [exchange], promesseDeValeur: "Valeur précédente" });
    const presentation = { pillars, campaigns: [], gloryOutputs: [], businessContext: {} };
    expect(mapContexteDefi(presentation).personas[1]?.actorRoles).toContain("Partenaire");
    expect(mapPropositionValeur(presentation).valueExchanges?.[0]?.valueToBrand).toEqual(["Audience et contenus"]);
    expect(await db.contract.count({ where: { strategyId: f.brand.id } })).toBe(0);
    expect(await db.aICostLog.count({ where: { strategyId: f.brand.id } })).toBe(0);
    expect(await db.intentEmission.count({ where: { strategyId: f.brand.id, intentKind: "OPERATOR_AMEND_PILLAR" } })).toBe(2);
  });
  it("persists the read source version without inventing human review or source grounding", async () => {
    const f = await fixture(); const result = await operatorAmendPillar(f.intent);
    expect(result.status).toBe("OK");
    const pillar = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    expect(pillar.sources).toEqual([f.receipt]); expect(pillar.currentVersion).toBe(2);
    expect((pillar.content as Record<string, unknown>)._fieldProvenance).toMatchObject({ promesseDeValeur: "INFERRED" });
    const reco = await db.recommendation.findFirstOrThrow({ where: { strategyId: f.brand.id } });
    expect(reco).toMatchObject({ agent: "MESTOR", reviewedBy: null, reviewedAt: null, status: "APPLIED", sourceReceipts: [f.receipt] });
    expect(reco.groundingScore).toBeNull(); expect(reco.groundedSourceIds).toEqual([]);
  });
  it("rejects a corrected source before any pillar value, version or source attachment changes", async () => {
    const f = await fixture(); await db.brandDataSource.update({ where: { id: f.source.id }, data: { rawContent: "Source corrigée après lecture." } });
    const result = await operatorAmendPillar(f.intent);
    expect(result.status).toBe("FAILED"); expect(result.summary).toContain("SOURCE_CHANGED");
    const pillar = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    expect(pillar.content).toEqual(f.pillar.content); expect(pillar.sources).toEqual(f.pillar.sources); expect(pillar.currentVersion).toBe(1);
    expect(await db.pillarVersion.count({ where: { pillarId: f.pillar.id } })).toBe(0);
    expect(await db.recommendation.count({ where: { strategyId: f.brand.id, status: "APPLIED" } })).toBe(0);
  });
  it("rejects a revoked shared document instead of applying its old receipt", async () => {
    const f = await fixture(), target = await fixture();
    await setSourceUse({ sourceId: f.source.id, strategyId: target.brand.id, userId, operatorId, admin: false, revoke: false });
    await setSourceUse({ sourceId: f.source.id, strategyId: target.brand.id, userId, operatorId, admin: false, revoke: true });
    const result = await operatorAmendPillar({ ...target.intent, sourceReceipts: [f.receipt] });
    expect(result.status).toBe("FAILED"); expect(result.summary).toContain("SOURCE_UNAVAILABLE");
    expect((await db.pillar.findUniqueOrThrow({ where: { id: target.pillar.id } })).currentVersion).toBe(1);
    expect(await db.pillarVersion.count({ where: { pillarId: target.pillar.id } })).toBe(0);
  });
  it("requires the pillar version actually read for a documentary amendment", async () => {
    const f = await fixture(); const result = await operatorAmendPillar({ ...f.intent, expectedVersion: undefined });
    expect(result.status).toBe("VETOED"); expect(result.reason).toBe("SOURCE_VERSION_REQUIRED");
    expect(await db.recommendation.count({ where: { strategyId: f.brand.id } })).toBe(0);
    expect((await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } })).currentVersion).toBe(1);
  });
  it("keeps a stale pillar version refusal before recommendation creation", async () => {
    const f = await fixture(); const result = await operatorAmendPillar({ ...f.intent, expectedVersion: 2 });
    expect(result.status).toBe("VETOED"); expect(result.reason).toBe("CONCURRENCY_CONFLICT");
    expect(await db.recommendation.count({ where: { strategyId: f.brand.id } })).toBe(0);
  });
  it("rejects a malformed receipt instead of silently dropping documentary protection", async () => {
    const f = await fixture();
    const result = await operatorAmendPillar({ ...f.intent, sourceReceipts: [{ ...f.receipt, contentHash: "not-a-version" }] });
    expect(result.status).toBe("VETOED"); expect(result.reason).toBe("SOURCE_RECEIPT_INVALID");
    expect(await db.recommendation.count({ where: { strategyId: f.brand.id } })).toBe(0);
    expect((await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } })).currentVersion).toBe(1);
  });
  it("keeps the explicit human route and its review distinct from an agent proposal", async () => {
    const f = await fixture(true); const result = await operatorAmendPillar({ ...f.intent, viaAgent: false });
    expect(result.status).toBe("OK");
    const reco = await db.recommendation.findFirstOrThrow({ where: { strategyId: f.brand.id } });
    expect(reco).toMatchObject({ agent: "HUMAN", reviewedBy: userId, status: "APPLIED", sourceReceipts: [f.receipt] });
    expect(reco.reviewedAt).toBeInstanceOf(Date);
    const pillar = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    expect((pillar.content as Record<string, unknown>)._fieldProvenance).toMatchObject({ promesseDeValeur: "HUMAN" });
  });
  it("does not call a refused human value an applied agent amendment", async () => {
    const f = await fixture(true); const result = await operatorAmendPillar(f.intent);
    expect(result.status).toBe("FAILED"); expect(result.summary).toContain("FIELD_PROVENANCE_REFUSED");
    const pillar = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    expect(pillar.content).toEqual(f.pillar.content); expect(pillar.currentVersion).toBe(1);
    expect(pillar.sources).toEqual(f.pillar.sources);
    expect(await db.recommendation.count({ where: { strategyId: f.brand.id, status: "APPLIED" } })).toBe(0);
    expect(await db.pillarVersion.count({ where: { pillarId: f.pillar.id } })).toBe(0);
  });
});
