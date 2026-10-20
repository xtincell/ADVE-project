import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
vi.mock("@/server/services/oracle-section", () => ({ markAllSectionsStale: vi.fn(async () => ({})) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { documentEdition, documentRepresentation, orderDocumentEditions } from "@/domain/source-document";
import { registerDocumentEdition, registerDocumentRepresentation } from "@/server/services/ingestion-pipeline/document-versions";
import { retainSourceFile, readSourceOriginal } from "@/server/services/ingestion-pipeline/original";
import { sourceFingerprint, loadBrandSources, listBrandSourceSummaries, setSourceUse, assertCurrentSourceReceipts } from "@/server/services/ingestion-pipeline/source-usage";

let brand: string, consumer: string, unrelated: string, actor: string, operatorId: string, mediaRoot: string;
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  mediaRoot = await mkdtemp(join(tmpdir(), "documents504-"));
  vi.stubEnv("CREATIVE_MEDIA_ARCHIVE_DIR", mediaRoot);
  vi.stubEnv("CREATIVE_MEDIA_ENCRYPTION_KEY", randomBytes(32).toString("hex"));
  const key = randomUUID();
  const operator = await db.operator.create({ data: { name: "Document representations fixture", slug: `formats-${key}`, status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86_400_000) } });
  operatorId = operator.id;
  actor = (await db.user.create({ data: { email: `formats-${key}@example.invalid`, operatorId, role: "USER" } })).id;
  brand = (await db.strategy.create({ data: { name: "Formats source fixture", userId: actor, operatorId } })).id;
  consumer = (await db.strategy.create({ data: { name: "Formats consumer fixture", userId: actor, operatorId } })).id;
  unrelated = (await db.strategy.create({ data: { name: "Unrelated fixture", userId: actor } })).id;
});
afterAll(async () => { await db.$disconnect(); vi.unstubAllEnvs(); if (mediaRoot) await rm(mediaRoot, { recursive: true, force: true }); });
const get = (id: string) => db.brandDataSource.findUniqueOrThrow({ where: { id } });
async function file(name: string, type = "TXT", text = "Piste documentaire de recette ; aucune vente ni décision réelle.") {
  return retainSourceFile(brand, { name, type, content: Buffer.from(text).toString("base64") }, actor);
}
async function edition(id: string, family: string, label: string, status: "REFERENCE" | "PROPOSED" | "ARCHIVED", previous?: string, before?: string) {
  const source = await get(id), prior = previous ? await get(previous) : null, after = before ? await get(before) : null;
  return db.$transaction(tx => registerDocumentEdition(tx, { id, expectedSourceHash: sourceFingerprint(source), document: {
    family, kind: "BMC", label, status, changeSummary: "Qualification de recette, aucune adoption réelle.",
    ...(prior ? { previous: { sourceId: prior.id, contentHash: sourceFingerprint(prior) } } : {}),
    ...(after ? { before: { sourceId: after.id, contentHash: sourceFingerprint(after) } } : {}),
  } }));
}
async function representation(id: string, canonicalId: string, expectedCanonicalHash?: string) {
  const source = await get(id), canonical = await get(canonicalId);
  return db.$transaction(tx => registerDocumentRepresentation(tx, { id, expectedSourceHash: sourceFingerprint(source), userId: actor,
    representation: { canonical: { sourceId: canonicalId, contentHash: expectedCanonicalHash ?? sourceFingerprint(canonical) }, reason: "Autre format de cette version de recette." } }));
}

describe.sequential("business editions, formats and exact aliases on PostgreSQL", () => {
  it("admits history late without changing current reference/proposal or their next successor", async () => {
    const old = await file("reference.txt", "TXT", "Référence initiale."), proposal = await file("proposal.txt", "TXT", "Proposition plus récente."), historical = await file("history.txt", "TXT", "Document plus ancien."), next = await file("next.txt", "TXT", "Nouvelle proposition après réception de l’historique.");
    await edition(old, "Chronologie", "v2", "REFERENCE"); await edition(proposal, "Chronologie", "v3 à valider", "PROPOSED", old);
    const before = await Promise.all([get(old), get(proposal)]);
    await edition(historical, "Chronologie", "v1 reçue après v3", "ARCHIVED", undefined, old);
    expect(await Promise.all([get(old), get(proposal)])).toEqual(before);
    await edition(next, "Chronologie", "v4 à valider", "PROPOSED", proposal);
    const rows = await db.brandDataSource.findMany({ where: { id: { in: [old, proposal, historical, next] } } });
    expect(orderDocumentEditions(rows.map(s => ({ id: s.id, document: documentEdition(s.rawData) }))).map(s => s.id)).toEqual([next, proposal, old, historical]);
    expect((await loadBrandSources(brand)).map(s => s.id)).not.toContain(historical);
    expect((await readSourceOriginal(historical))?.bytes.toString()).toBe("Document plus ancien.");
  });
  it("conserves two physical formats with one analysis source and no change to the proposed position", async () => {
    const canonical = await file("economic-position.txt", "TXT", "Proposition : accès gratuit, validation de recette en attente."), alternate = await file("economic-position.csv", "CSV", 'position,statut\n"accès gratuit","validation de recette en attente"\n');
    await edition(canonical, "Formats", "v3 proposition", "PROPOSED");
    const before = await get(canonical), original = (await readSourceOriginal(alternate))!.bytes;
    await representation(alternate, canonical);
    expect(await get(canonical)).toEqual(before);
    expect(documentRepresentation((await get(alternate)).rawData)?.canonicalSourceId).toBe(canonical);
    expect(documentEdition((await get(alternate)).rawData)).toBeNull();
    expect((await loadBrandSources(brand)).filter(s => [canonical, alternate].includes(s.id)).map(s => s.id)).toEqual([canonical]);
    expect((await readSourceOriginal(alternate))!.bytes).toEqual(original);
    expect((await listBrandSourceSummaries(brand)).find(s => s.id === alternate)?.representation?.canonicalSourceId).toBe(canonical);
    const alternateHash = sourceFingerprint(await get(alternate));
    await expect(db.$transaction(tx => assertCurrentSourceReceipts(tx, brand, [{ sourceId: alternate, contentHash: alternateHash }]))).rejects.toThrow("SOURCE_CHANGED");
    await setSourceUse({ sourceId: alternate, strategyId: consumer, userId: actor, operatorId, admin: false, revoke: false });
    expect((await loadBrandSources(consumer)).map(s => s.id)).not.toContain(alternate);
    expect((await listBrandSourceSummaries(consumer)).some(s => s.id === canonical)).toBe(false);
  });
  it("refuses stale, self and cross-brand format links without changing either document", async () => {
    const canonical = await file("current.txt", "TXT", "Position courante de recette."), alternate = await file("other-format.txt", "TXT", "Autre format de recette.");
    await edition(canonical, "Refus", "v1", "REFERENCE");
    const before = await Promise.all([get(canonical), get(alternate)]);
    await expect(representation(alternate, canonical, "0".repeat(64))).rejects.toThrow("SOURCE_CHANGED");
    await expect(representation(canonical, canonical)).rejects.toThrow("propre référence");
    const foreign = await db.brandDataSource.create({ data: { strategyId: unrelated, sourceType: "MANUAL_INPUT", rawContent: "Pièce étrangère de recette.", processingStatus: "EXTRACTED" } });
    await expect(representation(foreign.id, canonical)).rejects.toThrow("même dossier");
    expect(await Promise.all([get(canonical), get(alternate)])).toEqual(before);
  });
  it("receives concurrent exact aliases as one original and preserves source fingerprints and received bytes", async () => {
    const text = "Original identique, aucun résultat réel.", canonical = await file("original.txt", "TXT", text);
    await edition(canonical, "Copies", "v1 référence", "REFERENCE");
    const source = await get(canonical), original = (await readSourceOriginal(canonical))!.bytes;
    const alias = { name: "ARCHIVE_original.txt", type: "TXT", content: Buffer.from(text).toString("base64"), sourceLocation: { sourceUrl: "https://drive.google.com/file/d/fixture-exact-alias/view" } };
    const results = await Promise.all([retainSourceFile(brand, alias, actor), retainSourceFile(brand, alias, actor)]);
    expect(results).toEqual([canonical, canonical]);
    expect(await get(canonical)).toEqual(source);
    const summaries = await listBrandSourceSummaries(brand), received = summaries.find(s => s.id === canonical)!;
    expect(received.contentHash).toBe(sourceFingerprint(source));
    expect(received.original?.aliases).toHaveLength(1);
    expect((await readSourceOriginal(canonical))!.bytes).toEqual(original);
    expect(await db.fileUpload.count({ where: { sourceId: canonical } })).toBe(1);
  });
});
