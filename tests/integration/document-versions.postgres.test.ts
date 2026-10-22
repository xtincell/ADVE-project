import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/server/services/oracle-section", () => ({ markAllSectionsStale: vi.fn(async () => ({})) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { registerDocumentEdition, decideDocumentEdition, correctResourceDocumentFiling, labelDocumentEdition } from "@/server/services/ingestion-pipeline/document-versions";
import { documentEdition } from "@/domain/source-document";
import { sourceFingerprint, loadBrandSources, assertCurrentSourceReceipts, resolveBrandSource } from "@/server/services/ingestion-pipeline/source-usage";
let brand: string, foreign: string, actor: string;
const ids: string[] = [];
beforeAll(async () => {
  expect(process.env.DATABASE_URL).toContain("shinkiro_verify");
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  const key = randomUUID();
  const operator = await db.operator.create({ data: { name: "Document versions fixture", slug: `doc-versions-${key}`,
    status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86_400_000) } });
  actor = (await db.user.create({ data: { email: `doc-versions-${key}@example.invalid`, operatorId: operator.id } })).id;
  const template = { userId: actor, operatorId: operator.id };
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
  it("repairs legacy OTHER file code on PostgreSQL while preserving its original and authority", async () => {
    const row = await db.brandDataSource.create({ data: { strategyId: brand, sourceType: "FILE", fileName: "Icon.jsx",
      rawContent: "export const Icon = () => null;", processingStatus: "EXTRACTED", rawData: { _original: { retainedFixture: true } } } });
    await db.$transaction(tx => registerDocumentEdition(tx, { id: row.id, expectedSourceHash: sourceFingerprint(row), document: {
      family: "Icônes", kind: "OTHER", label: "Icon.jsx", status: "REFERENCE", changeSummary: "Classement historique générique de recette." } }));
    const before = await db.brandDataSource.findUniqueOrThrow({ where: { id: row.id } });
    const input = { id: row.id, expectedSourceHash: sourceFingerprint(before), userId: actor, filing: {
      family: "Système graphique — code des icônes", kind: "TECHNICAL" as const, label: "Icon.jsx", status: "REFERENCE" as const,
      reason: "Classement du code, sans décision de marque." } };
    const after = await db.$transaction(tx => correctResourceDocumentFiling(tx, input));
    expect(after.rawContent).toBe(before.rawContent); expect(after.rawData).toMatchObject({ _original: { retainedFixture: true } });
    expect(documentEdition(after.rawData)).toMatchObject({ kind: "TECHNICAL", status: "REFERENCE", edition: 1,
      filingCorrections: [{ previousKind: "OTHER", previousStatus: "REFERENCE", by: actor }] });
    expect(documentEdition(after.rawData)?.decisions).toBeUndefined();
    await expect(db.$transaction(tx => correctResourceDocumentFiling(tx, input))).rejects.toThrow("SOURCE_CHANGED");
  });
  it("labels a research workbook losslessly and rejects a stale label receipt", async () => {
    const cells = Array.from({ length: 1200 }, (_, n) => ({ row: n + 1, observation: "Recherche synthétique seulement. ".repeat(10), count: n % 7 }));
    const row = await db.brandDataSource.create({ data: { strategyId: brand, sourceType: "FILE", fileName: "Recherche.xlsx",
      rawContent: cells.map(c => `${c.row}: ${c.observation} ${c.count}`).join("\n"), processingStatus: "EXTRACTED",
      rawData: { Observations: cells, _original: { retainedFixture: true } } } });
    await db.$transaction(tx => registerDocumentEdition(tx, { id: row.id, expectedSourceHash: sourceFingerprint(row), document: {
      family: "Étude de marché de recette", kind: "RESEARCH_DATA", label: "v1", status: "REFERENCE", changeSummary: "Observations synthétiques, aucun client acquis." } }));
    const before = await db.brandDataSource.findUniqueOrThrow({ where: { id: row.id } });
    const input = { id: row.id, expectedSourceHash: sourceFingerprint(before), userId: actor,
      tags: ["Recherche", "Tableur", "À relire"], reason: "Étiquettes descriptives uniquement." };
    const after = await db.$transaction(tx => labelDocumentEdition(tx, input), { timeout: 120_000 });
    expect(after.rawContent).toBe(before.rawContent);
    expect(after.rawData).toMatchObject({ Observations: cells, _original: { retainedFixture: true } });
    expect(documentEdition(after.rawData)).toMatchObject({ kind: "RESEARCH_DATA", status: "REFERENCE", edition: 1, tags: input.tags });
    await expect(db.$transaction(tx => labelDocumentEdition(tx, input))).rejects.toThrow("SOURCE_CHANGED");
  });
  it("corrects only descriptive resource filing with a stale-write fence and retained source history", async () => {
    const r = await db.brandDataSource.create({ data: { strategyId: brand, sourceType: "FILE", fileName: "README.txt", rawContent: "Ressource de création de recette.", processingStatus: "EXTRACTED", rawData: { _original: { retainedFixture: true } } } });
    await db.$transaction(tx => registerDocumentEdition(tx, { id: r.id, expectedSourceHash: sourceFingerprint(r), document: {
      family: "README", kind: "ASSET", label: "v1", status: "PROPOSED", changeSummary: "Classement initial de recette." } }));
    const before = await db.brandDataSource.findUniqueOrThrow({ where: { id: r.id } });
    const input = { id: r.id, expectedSourceHash: sourceFingerprint(before), userId: actor, filing: {
      family: "Carnet — README", kind: "ASSET" as const, label: "v1", status: "PROPOSED" as const, reason: "Même nom, autre ressource. Pas de décision métier." } };
    const after = await db.$transaction(tx => correctResourceDocumentFiling(tx, input));
    expect(after.rawContent).toBe(before.rawContent); expect(after.rawData).toMatchObject({ _original: { retainedFixture: true } });
    expect(documentEdition(after.rawData)).toMatchObject({ family: "Carnet — README", status: "PROPOSED", edition: 1, filingCorrections: [{ previousFamily: "README", by: actor }] });
    await expect(db.$transaction(tx => correctResourceDocumentFiling(tx, input))).rejects.toThrow("SOURCE_CHANGED");
    const business = await db.brandDataSource.findUniqueOrThrow({ where: { id: ids[1]! } });
    await expect(db.$transaction(tx => correctResourceDocumentFiling(tx, { ...input, id: business.id, expectedSourceHash: sourceFingerprint(business) }))).rejects.toThrow("réservée aux ressources");
  });

});
