import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/services/ingestion-pipeline/source-usage", async original => ({
  ...await original<object>(), invalidateSourceDerivatives: vi.fn(async () => {}),
}));
import { documentEdition, documentRepresentation, orderDocumentEditions, sourceIsUsable, documentContext } from "@/domain/source-document";
import { registerDocumentEdition, registerDocumentRepresentation, decideDocumentEdition, clarifyDocumentEdition } from "@/server/services/ingestion-pipeline/document-versions";
import { sourceFingerprint, type SourceDb } from "@/server/services/ingestion-pipeline/source-usage";

const raw = (id: string) => ({ id, strategyId: "own", fileName: id, sourceType: "FILE", rawContent: `${id}: prix déclarés, pas de ventes prouvées`, rawData: {}, processingStatus: "EXTRACTED" });
function fixture() {
  const rows = [raw("old"), raw("new"), raw("next")];
  const db = { $queryRaw: vi.fn(async () => []), brandDataSource: {
    findUniqueOrThrow: vi.fn(async ({ where }: any) => rows.find(r => r.id === where.id)!),
    findMany: vi.fn(async ({ where }: any) => rows.filter(r => r.strategyId === where.strategyId)),
    update: vi.fn(async ({ where, data }: any) => { const r = rows.find(r => r.id === where.id)!; Object.assign(r, data); return r; }),
  } } as unknown as SourceDb;
  const classify = async (id: string, status: "REFERENCE" | "PROPOSED" | "ARCHIVED", previous?: string) => registerDocumentEdition(db, {
    id, expectedSourceHash: sourceFingerprint(rows.find(r => r.id === id)!), document: {
      family: "BMC", kind: "BMC", label: id, status, changeSummary: "Évolution à examiner avec l’équipe.",
      ...(previous ? { previous: { sourceId: previous, contentHash: sourceFingerprint(rows.find(r => r.id === previous)!) } } : {}),
    },
  });
  return { rows, db, classify };
}
describe("document lineage and strategic authority", () => {
  it("places a late historical deposit before its declared successor without replacing reference or proposal", async () => {
    const f = fixture(); await f.classify("old", "REFERENCE"); await f.classify("new", "PROPOSED", "old");
    const before = structuredClone(f.rows.slice(0, 2));
    await registerDocumentEdition(f.db, { id: "next", expectedSourceHash: sourceFingerprint(f.rows[2]!), document: {
      family: "BMC", kind: "BMC", label: "v1 antérieure reçue tardivement", status: "ARCHIVED", changeSummary: "Ancienne position, pas une nouvelle recommandation.",
      before: { sourceId: "old", contentHash: sourceFingerprint(f.rows[0]!) },
    } });
    expect(f.rows.slice(0, 2)).toEqual(before);
    expect(orderDocumentEditions(f.rows.map(r => ({ id: r.id, document: documentEdition(r.rawData) }))).map(r => r.id)).toEqual(["new", "old", "next"]);
    expect(sourceIsUsable(f.rows[2]!.rawData)).toBe(false);
    f.rows.push(raw("later")); await f.classify("later", "PROPOSED", "new");
    expect(documentEdition(f.rows[3]!.rawData)?.previousSourceId).toBe("new");
    expect(documentContext(f.rows[3]!.rawData)).not.toContain("édition 4");
  });
  it("refuses a historical deposit that would replace a reference, uses a stale boundary or invents a lineage", async () => {
    const f = fixture(); await f.classify("old", "REFERENCE");
    const document = { family: "BMC", kind: "BMC" as const, label: "Ancienne", status: "ARCHIVED" as const, changeSummary: "Document historique.",
      before: { sourceId: "old", contentHash: sourceFingerprint(f.rows[0]!) } };
    const input = { id: "new", expectedSourceHash: sourceFingerprint(f.rows[1]!), document };
    await expect(registerDocumentEdition(f.db, { ...input, document: { ...document, status: "REFERENCE" } })).rejects.toThrow("archives");
    await expect(registerDocumentEdition(f.db, { ...input, document: { ...document, previous: document.before } })).rejects.toThrow("archives");
    await expect(registerDocumentEdition(f.db, { ...input, document: { ...document, before: { ...document.before, contentHash: "a".repeat(64) } } })).rejects.toThrow("SOURCE_CHANGED");
    await expect(registerDocumentEdition(f.db, { ...input, document: { ...document, family: "Autre document" } })).rejects.toThrow("SOURCE_CHANGED");
    expect(documentEdition(f.rows[1]!.rawData)).toBeNull();
    expect(documentEdition(f.rows[0]!.rawData)?.status).toBe("REFERENCE");
  });
  it("retains an alternate format under one proposed business edition, without an independent analysis source", async () => {
    const f = fixture(); await f.classify("old", "REFERENCE"); await f.classify("new", "PROPOSED", "old");
    const before = structuredClone(f.rows);
    await registerDocumentRepresentation(f.db, { id: "next", expectedSourceHash: sourceFingerprint(f.rows[2]!), userId: "owner",
      representation: { canonical: { sourceId: "new", contentHash: sourceFingerprint(f.rows[1]!) }, reason: "Export PDF du même BMC, sans nouvelle position." } });
    expect(f.rows.slice(0, 2)).toEqual(before.slice(0, 2));
    expect(f.rows[2]!.rawContent).toBe(before[2]!.rawContent);
    expect(documentEdition(f.rows[2]!.rawData)).toBeNull();
    expect(documentRepresentation(f.rows[2]!.rawData)).toMatchObject({ canonicalSourceId: "new", recordedBy: "owner" });
    expect(sourceIsUsable(f.rows[2]!.rawData)).toBe(false);
    expect(sourceIsUsable({ _documentRepresentation: {} })).toBe(false);
    await expect(f.classify("next", "REFERENCE", "new")).rejects.toThrow("conservée");
  });
  it("refuses unrelated, self, stale and already retained format relationships", async () => {
    const f = fixture(); await f.classify("old", "REFERENCE");
    const input = { id: "new", expectedSourceHash: sourceFingerprint(f.rows[1]!), userId: "owner", representation: {
      canonical: { sourceId: "old", contentHash: sourceFingerprint(f.rows[0]!) }, reason: "Même version." } };
    await expect(registerDocumentRepresentation(f.db, { ...input, id: "old" })).rejects.toThrow("propre référence");
    await expect(registerDocumentRepresentation(f.db, { ...input, expectedSourceHash: "a".repeat(64) })).rejects.toThrow("SOURCE_CHANGED");
    await expect(registerDocumentRepresentation(f.db, { ...input, representation: { ...input.representation, canonical: { ...input.representation.canonical, contentHash: "a".repeat(64) } } })).rejects.toThrow("SOURCE_CHANGED");
    f.rows[1]!.strategyId = "foreign";
    await expect(registerDocumentRepresentation(f.db, input)).rejects.toThrow("même dossier");
    expect(documentRepresentation(f.rows[1]!.rawData)).toBeNull();
  });
  it("clarifies the new BMC without adopting it or rewriting its deposit history", async () => {
    const f = fixture(); await f.classify("old", "REFERENCE"); await f.classify("new", "PROPOSED", "old");
    const before = structuredClone(f.rows);
    const clarification = "Ces BMC diffèrent. Le précédent précède la nouvelle piste, à valider par l’équipe.";
    await clarifyDocumentEdition(f.db, { id: "new", expectedSourceHash: sourceFingerprint(f.rows[1]!), userId: "owner", clarification });
    const doc = documentEdition(f.rows[1]!.rawData)!;
    expect(doc).toMatchObject({ ...documentEdition(before[1]!.rawData), clarifications: [{ by: "owner", text: clarification, at: expect.any(String) }] });
    expect(doc.decisions).toBeUndefined();
    expect(f.rows[0]).toEqual(before[0]);
    expect(f.rows[1]!.rawContent).toBe(before[1]!.rawContent);
    expect(documentContext(f.rows[1]!.rawData)).toContain(clarification);
    expect(documentContext(f.rows[1]!.rawData)).toContain("NON VALIDÉE PAR L’ÉQUIPE");
  });
  it("refuses a stale clarification and retains all previous clarifications", async () => {
    const f = fixture(); await f.classify("old", "PROPOSED");
    const first = { id: "old", expectedSourceHash: sourceFingerprint(f.rows[0]!), userId: "owner", clarification: "Première précision, sans adoption." };
    await clarifyDocumentEdition(f.db, first);
    await expect(clarifyDocumentEdition(f.db, first)).rejects.toThrow("SOURCE_CHANGED");
    await clarifyDocumentEdition(f.db, { ...first, expectedSourceHash: sourceFingerprint(f.rows[0]!), clarification: "Seconde précision, sans adoption." });
    expect(documentEdition(f.rows[0]!.rawData)?.clarifications?.map(c => c.text)).toEqual([first.clarification, "Seconde précision, sans adoption."]);
  });
  it("requires a classified edition and a nonempty clarification, without reviving archives", async () => {
    const f = fixture();
    await expect(clarifyDocumentEdition(f.db, { id: "old", expectedSourceHash: sourceFingerprint(f.rows[0]!), userId: "owner", clarification: "Précision." })).rejects.toThrow("Classez");
    await f.classify("old", "ARCHIVED");
    await expect(clarifyDocumentEdition(f.db, { id: "old", expectedSourceHash: sourceFingerprint(f.rows[0]!), userId: "owner", clarification: "  " })).rejects.toThrow();
    await clarifyDocumentEdition(f.db, { id: "old", expectedSourceHash: sourceFingerprint(f.rows[0]!), userId: "owner", clarification: "Historique uniquement." });
    expect(sourceIsUsable(f.rows[0]!.rawData)).toBe(false);
  });
  it("retains the previous BMC reference when a later BMC is only a proposition", async () => {
    const f = fixture(); const before = f.rows.map(r => r.rawContent);
    await f.classify("old", "REFERENCE"); await f.classify("new", "PROPOSED", "old");
    expect(documentEdition(f.rows[0]!.rawData)?.status).toBe("REFERENCE");
    expect(documentEdition(f.rows[1]!.rawData)).toMatchObject({ status: "PROPOSED", edition: 2, previousSourceId: "old" });
    expect(documentContext(f.rows[1]!.rawData)).toContain("NON VALIDÉE PAR L’ÉQUIPE");
    expect(f.rows.map(r => r.rawContent)).toEqual(before);
    expect(sourceIsUsable(f.rows[0]!.rawData)).toBe(true);
  });
  it("only an explicit reference supersedes the previous reference, preserving the proposal", async () => {
    const f = fixture(); await f.classify("old", "REFERENCE"); await f.classify("new", "PROPOSED", "old");
    await f.classify("next", "REFERENCE", "new");
    expect(documentEdition(f.rows[0]!.rawData)?.status).toBe("SUPERSEDED");
    expect(sourceIsUsable(f.rows[0]!.rawData)).toBe(false);
    expect(documentEdition(f.rows[1]!.rawData)?.status).toBe("PROPOSED");
    expect(documentEdition(f.rows[2]!.rawData)?.edition).toBe(3);
  });
  it("refuses a stale predecessor, an unrelated lineage and correction of a retained edition", async () => {
    const f = fixture(); await f.classify("old", "REFERENCE"); await f.classify("new", "PROPOSED", "old");
    await expect(f.classify("next", "PROPOSED", "old")).rejects.toThrow("SOURCE_CHANGED");
    await expect(f.classify("old", "PROPOSED")).rejects.toThrow("conservée");
    expect(documentEdition(f.rows[2]!.rawData)).toBeNull();
  });
  it("records an explicit review decision and refuses its stale replay", async () => {
    const f = fixture(); await f.classify("old", "REFERENCE"); await f.classify("new", "PROPOSED", "old");
    const receipt = sourceFingerprint(f.rows[1]!);
    const input = { id: "new", expectedSourceHash: receipt, userId: "reviewer", decision: { status: "REFERENCE" as const, reason: "Décision de recette seulement." } };
    await decideDocumentEdition(f.db, input);
    expect(documentEdition(f.rows[0]!.rawData)?.status).toBe("SUPERSEDED");
    expect(documentEdition(f.rows[1]!.rawData)?.decisions?.[0]).toMatchObject({ by: "reviewer", status: "REFERENCE", reason: "Décision de recette seulement." });
    await expect(decideDocumentEdition(f.db, input)).rejects.toThrow("SOURCE_CHANGED");
  });
  it("retains structured arrays when an edition is registered", async () => {
    const f = fixture(); const data = [{ price: 60000, status: "postulate" }];
    f.rows[0]!.rawData = data as any;
    await f.classify("old", "PROPOSED");
    expect((f.rows[0]!.rawData as any)._sourceData).toEqual(data);
    expect(documentEdition(f.rows[0]!.rawData)?.status).toBe("PROPOSED");
  });
  it("excludes archives and malformed edition metadata, while retaining legacy compatibility", async () => {
    const f = fixture(); await f.classify("old", "ARCHIVED");
    expect(sourceIsUsable(f.rows[0]!.rawData)).toBe(false);
    expect(sourceIsUsable({ _document: {} })).toBe(false);
    expect(sourceIsUsable({ legacy: true })).toBe(true);
    expect(sourceIsUsable(null)).toBe(true);
  });
});
