import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/services/ingestion-pipeline/source-usage", async original => ({
  ...await original<object>(), invalidateSourceDerivatives: vi.fn(async () => {}),
}));
import { documentEdition, sourceIsUsable, documentContext } from "@/domain/source-document";
import { registerDocumentEdition, decideDocumentEdition } from "@/server/services/ingestion-pipeline/document-versions";
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
