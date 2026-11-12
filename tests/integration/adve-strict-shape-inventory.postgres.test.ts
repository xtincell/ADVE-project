/**
 * Inventaire des formes ADVE refusées par le schéma strict, lu sur un PostgreSQL
 * jetable détenu par le test (RESIDUAL-DEBT « Formats ADVE legacy », étape 1).
 * Preuves : transaction READ ONLY en REPEATABLE READ relue dans la base, chemins,
 * version, écriture, journal et source retrouvés, et AUCUNE ligne modifiée.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));

import { db } from "@/lib/db";
import { readAdveStrictShapeInventory } from "@/server/services/pillar-maturity/strict-shape-inventory";
import { createCheckpoint, pillarMetadata } from "@/server/services/pillar-versioning/checkpoint";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";

const strategies: string[] = [];
let userId: string;

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(url.hostname).toBe("127.0.0.1"); expect(url.pathname).toBe("/shinkiro_verify");
  const ownedLocal = url.port === "55439" && url.username === "shinkiro_fixture";
  const ownedCI = process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REPOSITORY === "xtincell/ADVE-project"
    && url.port === "5432" && url.username === "postgres";
  expect(ownedLocal || ownedCI).toBe(true);
  vi.stubGlobal("fetch", async () => { throw new Error("NETWORK_FORBIDDEN_IN_OWNED_FIXTURE"); });
  userId = (await db.user.create({ data: { email: `inventory-${randomUUID()}@example.invalid`, role: "ADMIN" } })).id;
});

afterAll(async () => {
  const scope = { in: strategies };
  await db.intentEmission.deleteMany({ where: { strategyId: scope } });
  await db.pillarVersion.deleteMany({ where: { pillar: { strategyId: scope } } });
  await db.pillar.deleteMany({ where: { strategyId: scope } });
  await db.brandDataSource.deleteMany({ where: { strategyId: scope } });
  await db.strategy.deleteMany({ where: { id: scope } });
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
});

const LEGACY_VALUES = [{ valeur: "Communauté avant funnel", rang: 1, justification: "La communauté produit la donnée." }];

async function fixture() {
  const strategy = await db.strategy.create({ data: { name: `Inventaire synthétique ${randomUUID()}`, userId } });
  strategies.push(strategy.id);
  const source = await db.brandDataSource.create({ data: {
    strategyId: strategy.id, sourceType: "FILE", certainty: "OFFICIAL", fileName: "charte.pdf", fileType: "PDF",
    rawContent: "Charte synthétique", processingStatus: "EXTRACTED",
    rawData: { _document: { schema: "document-edition-v1", edition: 1, status: "REFERENCE", family: "Charte",
      kind: "BRAND_GUIDE", label: "v1", changeSummary: "Référence synthétique", recordedAt: "2026-10-01T00:00:00.000Z" } },
  } });
  const receipt = { sourceId: source.id, contentHash: sourceFingerprint(source) };
  const emission = await db.intentEmission.create({ data: {
    strategyId: strategy.id, intentKind: "OPERATOR_AMEND_PILLAR", status: "OK", payload: { synthetic: true },
  } });
  const before = { archetype: "Sage", valeurs: LEGACY_VALUES };
  const current = { archetype: "Créateur", valeurs: LEGACY_VALUES };
  const pillar = await db.pillar.create({ data: {
    strategyId: strategy.id, key: "a", content: current, currentVersion: 2, validationStatus: "DRAFT",
    fieldCertainty: { "a.archetype": "INFERRED" }, sources: [receipt],
  } });
  const meta = pillarMetadata({ sources: null, fieldCertainty: null, confidence: null, validationStatus: "DRAFT", staleAt: null });
  await db.pillarVersion.create({ data: {
    pillarId: pillar.id, version: 1, content: before, author: "MESTOR", reason: "Amendement synthétique",
    intentId: emission.id, checkpoint: createCheckpoint(before, current, meta, meta, 2, [receipt]),
  } });
  // Un pilier E sans contenu et une autre marque hors filtre.
  await db.pillar.create({ data: { strategyId: strategy.id, key: "e", content: undefined } });
  return { strategy, source, receipt, emission, pillar };
}

async function snapshotRows(strategyId: string) {
  const [pillars, versions, sources, emissions] = await Promise.all([
    db.pillar.findMany({ where: { strategyId }, orderBy: { id: "asc" } }),
    db.pillarVersion.findMany({ where: { pillar: { strategyId } }, orderBy: { id: "asc" } }),
    db.brandDataSource.findMany({ where: { strategyId }, orderBy: { id: "asc" } }),
    db.intentEmission.findMany({ where: { strategyId }, orderBy: { id: "asc" } }),
  ]);
  return JSON.stringify({ pillars, versions, sources, emissions });
}

describe("inventaire des formes ADVE sur PostgreSQL", () => {
  it("lit dans une transaction READ ONLY/REPEATABLE READ, retrouve version, écriture et source, et ne modifie rien", async () => {
    const f = await fixture();
    const before = await snapshotRows(f.strategy.id);

    const inv = await readAdveStrictShapeInventory({ strategyIds: [f.strategy.id] });

    expect(inv.snapshot).toEqual({ readOnly: true, isolation: "REPEATABLE READ" });
    expect(inv.mode).toBe("DATABASE");
    expect(inv.entries.map(e => `${e.pillarKey}:${e.contentState}`)).toEqual(["a:PRESENT", "e:ABSENT"]);
    const a = inv.entries[0]!;
    expect(a).toMatchObject({ strategyName: f.strategy.name, pillarId: f.pillar.id, currentVersion: 2, validationStatus: "DRAFT" });

    const archetype = a.findings.find(x => x.path === "archetype")!;
    expect(archetype).toMatchObject({ kind: "ENUM", situation: "PRESENT_REFUSED", provenance: "INFERRED", sourceIds: [f.source.id] });
    expect(archetype.lastRetainedChange).toMatchObject({
      status: "CHANGED", fromVersion: 1, producedVersion: 2, intentId: f.emission.id,
      intentKind: "OPERATOR_AMEND_PILLAR", sourceReceiptsUsed: [f.receipt],
    });
    expect(a.findings.filter(x => x.topKey === "valeurs").map(x => x.path))
      .toEqual(["valeurs.0.costOfHolding", "valeurs.0.customName", "valeurs.0.rank", "valeurs.0.value"]);
    expect(a.sources).toEqual([{
      sourceId: f.source.id, receiptHash: f.receipt.contentHash, attachedToPillar: true, citedByFindings: 1,
      lookup: "FOUND", sameStrategy: true, sourceType: "FILE", certainty: "OFFICIAL", receiptMatchesCurrent: true,
      edition: { family: "Charte", kind: "BRAND_GUIDE", label: "v1", edition: 1, status: "REFERENCE" },
    }]);

    // Aucune ligne modifiée, y compris `updatedAt`.
    expect(await snapshotRows(f.strategy.id)).toBe(before);
  });

  it("la même forme de transaction refuse réellement une écriture (adaptateur PostgreSQL en place)", async () => {
    const f = await fixture();
    const before = await snapshotRows(f.strategy.id);
    await expect(db.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await tx.pillar.update({ where: { id: f.pillar.id }, data: { validationStatus: "VALIDATED" } });
    }, { isolationLevel: "RepeatableRead" })).rejects.toThrow(/read-only transaction/);
    expect(await snapshotRows(f.strategy.id)).toBe(before);
  });

  it("le filtre de stratégie et de pilier est respecté ; même lecture → même JSON", async () => {
    const f = await fixture();
    const other = await fixture();
    const one = await readAdveStrictShapeInventory({ strategyIds: [f.strategy.id], pillars: ["a"] });
    expect(one.entries.map(e => `${e.strategyId}/${e.pillarKey}`)).toEqual([`${f.strategy.id}/a`]);
    const both = await readAdveStrictShapeInventory({ strategyIds: [other.strategy.id, f.strategy.id] });
    const again = await readAdveStrictShapeInventory({ strategyIds: [f.strategy.id, other.strategy.id] });
    expect(JSON.stringify(both)).toBe(JSON.stringify(again));
    expect(new Set(both.entries.map(e => e.strategyId))).toEqual(new Set([f.strategy.id, other.strategy.id]));
  });
});
