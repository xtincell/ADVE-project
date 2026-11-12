import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({ vector: vi.fn(), metadata: vi.fn(), documents: vi.fn(), index: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/services/mestor", () => ({}));
vi.mock("@/server/services/knowledge-aggregator", () => ({}));
vi.mock("@/server/services/feedback-loop", () => ({}));
vi.mock("@/server/services/seshat-bridge", () => ({}));
vi.mock("@/server/services/seshat/context-store/ranker", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/server/services/seshat/context-store/ranker")>(),
  topKWithinStrategy: harness.vector, listByMetadata: harness.metadata, listDocumentCandidates: harness.documents,
}));
vi.mock("@/server/services/seshat/context-store/indexer", () => ({ indexBrandSource: harness.index }));

import { tools } from "@/server/mcp/intelligence";
const rag = tools.find((tool) => tool.name === "rag_search")!;
const hit = {
  id: "chunk-42", sourceId: "source-7", kind: "BRAND_SOURCE", pillarKey: null,
  field: "chunk_0", similarity: 0.8,
  payload: { text: "SPAWT révèle le bon goût.", sourceContentHash: "current-fingerprint" },
};

beforeEach(() => {
  vi.clearAllMocks();
  harness.vector.mockResolvedValue([]);
  harness.metadata.mockResolvedValue([hit]);
  harness.documents.mockImplementation(async () => harness.metadata());
});

describe("MCP excerpts remain attributable and read only", () => {
  it("does not merge distinct precise fields from the same pillar", async () => {
    harness.documents.mockResolvedValue([]);
    harness.metadata.mockResolvedValue([1, 2].map(i => ({ ...hit, id: `field-${i}`, sourceId: "pillar-a", kind: "PILLAR_FIELD",
      payload: { field: `price-${i}`, value: "Prix historique à qualifier." } })));
    const result = await rag.handler({ strategyId: "brand-a", query: "prix", topK: 2 }) as any;
    expect(result.results.map((r: any) => r.id)).toEqual(["field-1", "field-2"]);
  });
  it("keeps a newly indexed document beside older successful vectors", async () => {
    harness.vector.mockResolvedValue([hit]);
    harness.documents.mockResolvedValue([{ ...hit, id: "fresh-bmc", sourceId: "fresh-source", similarity: undefined,
      payload: { ...hit.payload, fileName: "BMC.docx", text: "Position à faire valider." } }]);
    const result = await rag.handler({ strategyId: "brand-a", query: "BMC", topK: 1 }) as any;
    expect(result.results[0]?.sourceId).toBe("fresh-source");
    expect(result.results[0]?.similarity).toBeUndefined();
    expect(result.usedVectorSearch).toBe(true);
  });
  it("finds an accented document name through the same normalized query", async () => {
    harness.metadata.mockResolvedValue([{ ...hit, payload: { ...hit.payload, fileName: "Étude terrain.docx", text: "Prix constatés." } }]);
    const result = await rag.handler({ strategyId: "brand-a", query: "etude", topK: 1 }) as any;
    expect(result.results[0]?.sourceId).toBe(hit.sourceId);
    expect(result.usedVectorSearch).toBe(false);
  });
  it("does not prefer a recent summary over the requested original title", async () => {
    harness.metadata.mockResolvedValue([
      ...Array.from({ length: 20 }, (_, i) => ({ ...hit, id: `note-${i}`, sourceId: "recent-note", payload: { ...hit.payload, fileName: "Note.txt", text: "BMC résumé." } })),
      { ...hit, id: "bmc", sourceId: "bmc-original", payload: { ...hit.payload, fileName: "BMC.docx", text: "Hypothèses à valider." } },
    ]);
    const result = await rag.handler({ strategyId: "brand-a", query: "BMC", topK: 1 }) as any;
    expect(result.results[0]?.sourceId).toBe("bmc-original");
  });
  it.each([true, false])("preserves the document and chunk anchors (vector=%s)", async (vector) => {
    if (vector) harness.vector.mockResolvedValue([hit]);
    const result = await rag.handler({ strategyId: "brand-a", query: "SPAWT", topK: 8 }) as any;
    expect(result.usedVectorSearch).toBe(vector);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      id: hit.id, sourceId: hit.sourceId, payload: hit.payload,
    });
    expect(harness.vector).toHaveBeenCalledWith("brand-a", "SPAWT", { pillarKey: undefined, topK: 8 });
    expect(harness.index).not.toHaveBeenCalled();
  });

  it("reports an empty match without indexing or claiming semantic retrieval", async () => {
    const result = await rag.handler({ strategyId: "brand-a", query: "absent" }) as any;
    expect(result).toMatchObject({ results: [], usedVectorSearch: false });
    expect(harness.index).not.toHaveBeenCalled();
  });

  it.each([true, false])("keeps documentary certainty distinct from retrieved text (vector=%s)", async (vector) => {
    const mixed = [
      { ...hit, sourceCertainty: "OFFICIAL" },
      { ...hit, id: "chunk-declared", sourceId: "source-declared", sourceCertainty: "DECLARED" },
      { ...hit, id: "pillar-field", sourceId: null, kind: "PILLAR_FIELD", sourceCertainty: null },
    ];
    if (vector) harness.vector.mockResolvedValue(mixed);
    else harness.metadata.mockResolvedValue(mixed);
    const result = await rag.handler({ strategyId: "brand-a", query: "SPAWT", topK: 8 }) as any;
    expect(result.results.map((r: any) => ({ sourceId: r.sourceId, sourceCertainty: r.sourceCertainty })))
      .toEqual(mixed.map((r) => ({ sourceId: r.sourceId, sourceCertainty: r.sourceCertainty })));
    expect(harness.index).not.toHaveBeenCalled();
  });
});
