import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { assertCurrentSourceReceipts, sharedSourceAnalysis, sourceFingerprint, type SourceDb } from "@/server/services/ingestion-pipeline/source-usage";

const evidence = { id: "doc", strategyId: "owner", rawContent: "Texte reçu.", rawData: { a: 1, b: 2 },
  certainty: "DECLARED", fileName: "Brief", sourceType: "MANUAL_INPUT", processingStatus: "EXTRACTED" };
const hash = sourceFingerprint(evidence);
function client(source: object | null) {
  return { $queryRaw: vi.fn(async () => []), strategy: { findUnique: vi.fn(async () => ({ operatorId: "operator" })) },
    brandDataSource: { findFirst: vi.fn(async () => source) } } as unknown as SourceDb;
}

describe("documentary receipts", () => {
  it("tracks evidence and certainty, without treating analysis bookkeeping as new evidence", () => {
    expect(sourceFingerprint({ ...evidence, rawData: { b: 2, a: 1 } })).toBe(hash);
    expect(sourceFingerprint({ ...evidence, processingStatus: "PROCESSED" } as typeof evidence)).toBe(hash);
    expect(sourceFingerprint({ ...evidence, rawContent: "Texte corrigé." })).not.toBe(hash);
    expect(sourceFingerprint({ ...evidence, certainty: "OFFICIAL" })).not.toBe(hash);
  });
  it("accepts the version actually consumed and rejects a corrected document", async () => {
    const receipt = { sourceId: "doc", contentHash: hash };
    await expect(assertCurrentSourceReceipts(client(evidence), "owner", [receipt], ["doc"])).resolves.toBeUndefined();
    await expect(assertCurrentSourceReceipts(client({ ...evidence, rawContent: "Révision." }), "owner", [receipt])).rejects.toThrow("SOURCE_CHANGED");
  });
  it("requires proof for a cited source and refuses an unavailable or revoked use", async () => {
    await expect(assertCurrentSourceReceipts(client(evidence), "owner", [], ["doc"])).rejects.toThrow("SOURCE_RECEIPT_MISSING");
    await expect(assertCurrentSourceReceipts(client(null), "consumer", [{ sourceId: "doc", contentHash: hash }])).rejects.toThrow("SOURCE_UNAVAILABLE");
  });
  it("keeps the local analysis only while its evidence is current and readable", () => {
    const analysis = { analysisStatus: "PROCESSED", pillarMapping: { a: true }, analyzedSourceHash: hash };
    expect(sharedSourceAnalysis(evidence, analysis)).toEqual({ analysisStatus: "PROCESSED", pillarMapping: { a: true } });
    expect(sharedSourceAnalysis({ ...evidence, rawContent: "Révision." }, analysis)).toEqual({ analysisStatus: "EXTRACTED", pillarMapping: null });
    expect(sharedSourceAnalysis({ ...evidence, processingStatus: "FAILED" }, analysis)).toEqual({ analysisStatus: "FAILED", pillarMapping: null });
  });
});
