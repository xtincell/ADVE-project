import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/server/services/oracle-section", () => ({ markAllSectionsStale: vi.fn(async () => ({})) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { registerDocumentEdition, decideDocumentEdition } from "@/server/services/ingestion-pipeline/document-versions";
import { documentEdition } from "@/domain/source-document";
import { sourceFingerprint, loadBrandSources, assertCurrentSourceReceipts, resolveBrandSource } from "@/server/services/ingestion-pipeline/source-usage";
let brand: string, foreign: string, actor: string;
const ids: string[] = [];
beforeAll(async () => {
  expect(process.env.DATABASE_URL).toContain("shinkiro_verify");
  const template = await db.strategy.findFirstOrThrow({ where: { operatorId: { not: null } } });
  actor = template.userId;
  const key = randomUUID();
  const owner = await db.strategy.create({ data: { name: `Document lineage ${key}`, userId: actor, operatorId: template.operatorId } });
  const other = await db.strategy.create({ data: { name: `Unrelated documents ${key}`, userId: actor } });
  brand = owner.id; foreign = other.id;
  for (const name of ["BMC précédent", "Nouvelle piste", "Troisième piste", "Piste concurrente"]) {
    const s = await db.brandDataSource.create({ data: { strategyId: brand, sourceType: "MANUAL_INPUT", fileName: name, rawContent: name + ": contenu synthétique, sans vente reçue.", processingStatus: "EXTRACTED" } }); ids.push(s.id);
  }
});
afterAll(async () => { await db.$disconnect(); });
async function register(id: string, previous?: string, status: "REFERENCE" | "PROPOSED" = "PROPOSED") {
  const source = await db.brandDataSource.findUniqueOrThrow({ where: { id } });
  const old = previous ? await db.brandDataSource.findUniqueOrThrow({ where: { id: previous } }) : null;
  return db.$transaction(tx => registerDocumentEdition(tx, { id, expectedSourceHash: sourceFingerprint(source), document: {
    family: "Modèle économique", kind: "BMC", label: id, status, changeSummary: "Décision de recette seulement.",
    ...(old ? { previous: { sourceId: old.id, contentHash: sourceFingerprint(old) } } : {}),
  } }));
}
describe.sequential("document editions on real PostgreSQL", () => {
  it("preserves reference and proposal, source text and brand boundaries", async () => {
    const before = await db.brandDataSource.findMany({ where: { strategyId: brand }, orderBy: { id: "asc" } });
    await register(ids[0]!, undefined, "REFERENCE"); await register(ids[1]!, ids[0]);
    const available = await loadBrandSources(brand);
    expect(documentEdition(available.find(s => s.id === ids[0])?.rawData)?.status).toBe("REFERENCE");
    expect(documentEdition(available.find(s => s.id === ids[1])?.rawData)).toMatchObject({ status: "PROPOSED", edition: 2, previousSourceId: ids[0] });
    const after = await db.brandDataSource.findMany({ where: { strategyId: brand }, orderBy: { id: "asc" } });
    expect(after.map(s => s.rawContent)).toEqual(before.map(s => s.rawContent));
    await expect(resolveBrandSource(ids[0]!, foreign)).rejects.toThrow("SOURCE_UNAVAILABLE");
  });
  it("allows exactly one concurrent next edition and rejects an obsolete predecessor", async () => {
    const result = await Promise.allSettled([register(ids[2]!, ids[1]), register(ids[3]!, ids[1])]);
    expect(result.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(result.filter(r => r.status === "rejected")).toHaveLength(1);
    const rows = await db.brandDataSource.findMany({ where: { strategyId: brand } });
    expect(rows.filter(s => documentEdition(s.rawData)?.edition === 3)).toHaveLength(1);
  });
  it("keeps an explicit decision and rejects historical receipts without deleting originals", async () => {
    const old = await db.brandDataSource.findUniqueOrThrow({ where: { id: ids[0]! } });
    const proposed = await db.brandDataSource.findUniqueOrThrow({ where: { id: ids[1]! } });
    await db.$transaction(tx => decideDocumentEdition(tx, { id: proposed.id, expectedSourceHash: sourceFingerprint(proposed), userId: actor,
      decision: { status: "REFERENCE", reason: "Choix explicite de recette ; aucune validation client réelle." } }));
    expect((await loadBrandSources(brand)).map(s => s.id)).not.toContain(old.id);
    expect((await resolveBrandSource(old.id, brand)).source.rawContent).toBe(old.rawContent);
    const current = await db.brandDataSource.findUniqueOrThrow({ where: { id: proposed.id } });
    expect(documentEdition(current.rawData)?.decisions?.[0]?.by).toBe(actor);
    await expect(db.$transaction(tx => assertCurrentSourceReceipts(tx, brand, [{ sourceId: old.id, contentHash: sourceFingerprint(old) }]))).rejects.toThrow("SOURCE_CHANGED");
  });
});
