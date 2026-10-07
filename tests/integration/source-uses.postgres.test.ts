/** Run only against a disposable local database with migrations applied.
 * Providers are stubbed; persistence, transactions, locks and access resolution are real.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/server/services/seshat/context-store/embedder", () => ({ embedBrandContext: vi.fn(async () => ({})) }));
vi.mock("@/server/services/asset-tagger", () => ({ tagAsset: vi.fn(async () => ({})) }));
vi.mock("@/server/services/source-classifier/llm-decomposer", () => ({ decomposeDocument: vi.fn(async () => []), classifyImage: vi.fn(async () => null) }));
vi.mock("@/server/services/advertis-scorer", () => ({ scoreObject: vi.fn(async () => ({})) }));
vi.mock("@/server/services/oracle-section", () => ({ markAllSectionsStale: vi.fn(async () => ({})) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { markAllSectionsStale } from "@/server/services/oracle-section";
import { eventBus } from "@/server/governance/event-bus";
import { db } from "@/lib/db";
import { setSourceUse, resolveBrandSource, loadBrandSources, recordSourceAnalysis, invalidateSourceDerivatives, assertCurrentSourceReceipts, sourceFingerprint, sourceScope } from "@/server/services/ingestion-pipeline/source-usage";
import { indexBrandSource } from "@/server/services/seshat/context-store/indexer";
import { proposeBrandAssetsFromSource } from "@/server/services/source-classifier";
import { writePillarsAtomically } from "@/server/services/pillar-gateway";
let owner: string, second: string, third: string, foreign: string, sourceId: string, actor: string, operatorId: string, foreignOperator: string;
const share = (strategyId: string, revoke = false) => setSourceUse({ sourceId, strategyId, userId: actor, operatorId, admin: false, revoke });
async function correction(content: string) {
  await db.$transaction(async (tx) => {
    await tx.brandDataSource.update({ where: { id: sourceId }, data: { rawContent: content } });
    await invalidateSourceDerivatives(tx, sourceId);
  });
}
beforeAll(async () => {
  expect(process.env.DATABASE_URL).toContain("127.0.0.1:55439/shinkiro_verify");
  const template = await db.strategy.findFirstOrThrow({ where: { operatorId: { not: null } } });
  actor = template.userId; operatorId = template.operatorId!;
  const op = await db.operator.findUniqueOrThrow({ where: { id: operatorId } });
  const other = await db.operator.create({ data: { status: op.status, licenseType: op.licenseType, licensedAt: op.licensedAt, licenseExpiry: op.licenseExpiry, slug: `receipt-${randomUUID()}`, name: "Opérateur de recette isolé" } });
  foreignOperator = other.id;
  const brands = await Promise.all(["Propriétaire", "Marque deux", "Marque trois", "Marque étrangère"].map((name, i) => db.strategy.create({ data: {
    name: `${name} — reçu documentaire synthétique`, userId: actor, operatorId: i === 3 ? other.id : operatorId,
  } })));
  owner = brands[0]!.id; second = brands[1]!.id; third = brands[2]!.id; foreign = brands[3]!.id;
  const source = await db.brandDataSource.create({ data: {
    strategyId: owner, sourceType: "MANUAL_INPUT", fileName: "Brief synthétique partagé", rawContent: "Une source unique pour trois marques. La période est décembre. Aucun budget validé.", processingStatus: "EXTRACTED", certainty: "DECLARED",
  } });
  sourceId = source.id;
});
afterAll(async () => { await db.$disconnect(); });
describe.sequential("canonical source uses on PostgreSQL", () => {
  it("links concurrent retries once, preserves one canonical document and isolates operators", async () => {
    await Promise.all([share(second), share(second), share(third), share(third)]);
    expect(await db.brandSourceUse.count({ where: { sourceId } })).toBe(2);
    expect(await db.brandDataSource.count({ where: { id: sourceId } })).toBe(1);
    await expect(share(foreign)).rejects.toThrow("même opérateur");
    await expect(resolveBrandSource(sourceId, foreign)).rejects.toThrow("SOURCE_UNAVAILABLE");
    expect((await resolveBrandSource(sourceId, second)).source.id).toBe(sourceId);
    expect((await loadBrandSources(third)).map((s) => s.id)).toContain(sourceId);
  });
  it("keeps local analysis and index scopes distinct", async () => {
    const receipt = { sourceId, contentHash: (await resolveBrandSource(sourceId, second)).contentHash };
    await db.$transaction(async (tx) => {
      await recordSourceAnalysis(tx, second, receipt, { pillarMapping: { a: true }, analysisStatus: "PROCESSED" });
      await recordSourceAnalysis(tx, third, receipt, { pillarMapping: { e: true }, analysisStatus: "EXTRACTED" });
    });
    expect((await resolveBrandSource(sourceId, second)).pillarMapping).toEqual({ a: true });
    expect((await resolveBrandSource(sourceId, third)).pillarMapping).toEqual({ e: true });
    expect((await resolveBrandSource(sourceId, owner)).pillarMapping).toBeNull();
    await Promise.all([indexBrandSource(sourceId, owner), indexBrandSource(sourceId, second), indexBrandSource(sourceId, second), indexBrandSource(sourceId, third)]);
    const nodes = await db.brandContextNode.findMany({ where: { sourceId, kind: "BRAND_SOURCE" } });
    expect(nodes).toHaveLength(3);
    expect(new Set(nodes.map((n) => n.strategyId)).size).toBe(3);
  });
  it("refuses stale proposals, invalidates all users, and retains decisions", async () => {
    const receipt = { sourceId, contentHash: (await resolveBrandSource(sourceId, second)).contentHash };
    const proposals = await proposeBrandAssetsFromSource(sourceId, actor, second);
    expect(proposals.strategyId).toBe(second);
    expect(proposals.brandAssetIds).toHaveLength(1);
    expect((await proposeBrandAssetsFromSource(sourceId, actor, second)).brandAssetIds).toEqual(proposals.brandAssetIds);
    const reco = await db.recommendation.create({ data: {
      strategyId: second, targetPillarKey: "a", targetField: "missionStatement", operation: "SET", proposedValue: "Une mission de recette.",
      sourceReceipts: [receipt], groundedSourceIds: [sourceId], status: "APPLIED", agent: "MESTOR", source: "VAULT", confidence: 0.6, impact: "LOW", missionType: "ADVE_UPDATE", explain: "Recette documentaire.",
    } });
    await db.pillar.upsert({ where: { strategyId_key: { strategyId: second, key: "a" } }, create: { strategyId: second, key: "a", content: { missionStatement: "Une décision historique conservée." } }, update: {} });
    await correction("Source corrigée : la période reste décembre et le budget reste à valider.");
    expect(await db.brandContextNode.count({ where: { sourceId } })).toBe(0);
    expect((await resolveBrandSource(sourceId, third)).source.rawContent).toContain("Source corrigée");
    expect((await db.recommendation.findUniqueOrThrow({ where: { id: reco.id } })).status).toBe("APPLIED");
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: proposals.brandAssetIds[0]! } })).staleAt).not.toBeNull();
    const pillar = await db.pillar.findUniqueOrThrow({ where: { strategyId_key: { strategyId: second, key: "a" } } });
    expect(pillar.content).toEqual({ missionStatement: "Une décision historique conservée." });
    expect(pillar.staleAt).not.toBeNull();
    await expect(db.$transaction((tx) => assertCurrentSourceReceipts(tx, second, [receipt]))).rejects.toThrow("SOURCE_CHANGED");
  });
  it("revokes one use only, blocks reads after a tenant transfer, and supports regrant", async () => {
    await Promise.all([indexBrandSource(sourceId, owner), indexBrandSource(sourceId, second), indexBrandSource(sourceId, third)]);
    await share(second, true);
    await expect(resolveBrandSource(sourceId, second)).rejects.toThrow("SOURCE_UNAVAILABLE");
    expect(await db.brandContextNode.count({ where: { sourceId, strategyId: second } })).toBe(0);
    expect(await db.brandContextNode.count({ where: { sourceId, strategyId: third } })).toBe(1);
    await share(second);
    expect((await resolveBrandSource(sourceId, second)).analysisStatus).toBe("EXTRACTED");
    const scopeBeforeTransfer = await sourceScope(third);
    await db.strategy.update({ where: { id: third }, data: { operatorId: foreignOperator } });
    expect(await db.brandDataSource.findFirst({ where: { AND: [{ id: sourceId }, scopeBeforeTransfer] } })).toBeNull();
    await expect(resolveBrandSource(sourceId, third)).rejects.toThrow("SOURCE_UNAVAILABLE");
    expect(await loadBrandSources(third)).toHaveLength(0);
    await share(third, true); // The owner can revoke an inaccessible historical use.
    await db.strategy.update({ where: { id: third }, data: { operatorId } });
    await expect(resolveBrandSource(sourceId, third)).rejects.toThrow("SOURCE_UNAVAILABLE");
    await share(third);
  });
  it("does not advertise a failed canonical extraction as a completed local analysis", async () => {
    const receipt = { sourceId, contentHash: (await resolveBrandSource(sourceId, second)).contentHash };
    await Promise.all([owner, second, third].map((strategyId) => db.$transaction((tx) =>
      recordSourceAnalysis(tx, strategyId, receipt, { pillarMapping: { a: true }, analysisStatus: "PROCESSED" }),
    )));
    await db.brandDataSource.update({ where: { id: sourceId }, data: { processingStatus: "FAILED" } });
    const failed = await resolveBrandSource(sourceId, second);
    expect(failed.analysisStatus).toBe("FAILED"); expect(failed.pillarMapping).toBeNull();
    expect((await loadBrandSources(second))[0]?.analysisStatus).toBe("FAILED");
    await db.brandDataSource.update({ where: { id: sourceId }, data: { processingStatus: "EXTRACTED" } });
  });
  it("serializes correction against a derivative commit, then marks that derivative stale", async () => {
    const current = await resolveBrandSource(sourceId, second);
    const receipt = { sourceId, contentHash: current.contentHash };
    let unlock!: () => void, locked!: () => void;
    const barrier = new Promise<void>((r) => { unlock = r; });
    const ready = new Promise<void>((r) => { locked = r; });
    const applying = db.$transaction(async (tx) => {
      await assertCurrentSourceReceipts(tx, second, [receipt]);
      locked(); await barrier;
      return tx.brandAsset.create({ data: { strategyId: second, operatorId: actor, name: "Concurrent evidence", assetType: "DOCUMENT", metadata: { sourceDataSourceId: sourceId, sourceContentHash: receipt.contentHash } } });
    });
    await ready;
    let corrected = false;
    const editing = correction("Correction concurrente reçue.").then(() => { corrected = true; });
    await new Promise((r) => setTimeout(r, 80));
    expect(corrected).toBe(false);
    unlock(); const asset = await applying; await editing;
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: asset.id } })).staleAt).not.toBeNull();
  });
  it("rolls back every pillar and its version when one write is refused", async () => {
    const receipt = { sourceId, contentHash: (await resolveBrandSource(sourceId, second)).contentHash };
    await db.pillar.upsert({ where: { strategyId_key: { strategyId: second, key: "d" } }, create: { strategyId: second, key: "d", content: {}, validationStatus: "LOCKED" }, update: { validationStatus: "LOCKED" } });
    const before = await db.pillar.findUniqueOrThrow({ where: { strategyId_key: { strategyId: second, key: "a" } } });
    const versions = await db.pillarVersion.count({ where: { pillarId: before.id } });
    await expect(writePillarsAtomically(["a", "d"].map((key) => ({
      strategyId: second, pillarKey: key as "a" | "d", operation: { type: "SET_FIELDS" as const, fields: [{ path: key === "a" ? "missionStatement" : "positionnement", value: "Écriture temporaire à annuler." }] },
      author: { system: "MESTOR" as const, reason: "Recette atomique" }, options: { sourceReceipts: [receipt] },
    })))).rejects.toThrow("LOCKED");
    const after = await db.pillar.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.content).toEqual(before.content); expect(after.currentVersion).toBe(before.currentVersion);
    expect(await db.pillarVersion.count({ where: { pillarId: before.id } })).toBe(versions);
    expect(sourceFingerprint((await resolveBrandSource(sourceId, second)).source)).toBe(receipt.contentHash);
  });
  it("publishes post-commit effects once per operation and reconciles each written pillar", async () => {
    vi.mocked(markAllSectionsStale).mockClear(); vi.mocked(eventBus.publish).mockClear();
    const receipt = { sourceId, contentHash: (await resolveBrandSource(sourceId, owner)).contentHash };
    const results = await writePillarsAtomically(["a", "d"].map((key) => ({
      strategyId: owner, pillarKey: key as "a" | "d", operation: { type: "SET_FIELDS" as const, fields: [{ path: key === "a" ? "missionStatement" : "positionnement", value: "Une proposition documentaire de recette." }] },
      author: { system: "MESTOR" as const, reason: "Recette du commit" }, options: { sourceReceipts: [receipt] },
    })));
    expect(results.every((r) => r.success)).toBe(true);
    expect(markAllSectionsStale).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledTimes(2);
    const rows = await db.pillar.findMany({ where: { strategyId: owner } });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.currentVersion === 2 && Array.isArray(r.sources))).toBe(true);
  });

});
