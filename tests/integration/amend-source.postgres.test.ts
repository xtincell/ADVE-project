/** Existing amendment, real persistence and documentary fences; isolated DB only. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/server/services/oracle-section", () => ({ markAllSectionsStale: vi.fn(async () => ({})) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { operatorAmendPillar } from "@/server/services/mestor/operator-amend";
import { resolveBrandSource, setSourceUse } from "@/server/services/ingestion-pipeline/source-usage";
import type { Intent } from "@/server/services/mestor/intents";
type Amend = Extract<Intent, { kind: "OPERATOR_AMEND_PILLAR" }>;
let userId: string, operatorId: string;
const strategies: string[] = [];
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname); expect(url.pathname).toBe("/shinkiro_verify");
  operatorId = (await db.strategy.findFirstOrThrow({ where: { operatorId: { not: null } } })).operatorId!;
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
describe("documentary amendments through Mestor", () => {
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
