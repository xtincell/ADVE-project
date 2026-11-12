import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ sources: [] as any[], nodes: [] as any[], embedding: [] as number[] }));
vi.mock("@/lib/db", () => ({ db: {
  strategy: { findUnique: vi.fn(async () => ({ operatorId: "operator-a" })) },
  brandDataSource: { findMany: vi.fn(async () => structuredClone(state.sources)) },
  brandContextNode: { findMany: vi.fn(async () => structuredClone(state.nodes)) },
} }));
vi.mock("@/server/services/llm-gateway", () => ({
  embed: vi.fn(async () => ({ embeddings: [state.embedding], model: "fixture-model" })),
}));
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import { listByMetadata, topKWithinStrategy } from "@/server/services/seshat/context-store/ranker";
import { buildRetrievedSourceBrief, retrieveSourceChunksForField } from "@/server/services/vault-enrichment/source-rag";
import { db } from "@/lib/db";
import { loadBrandSourceContext, renderSourceContext } from "@/server/services/notoria/source-context";
const source = { id: "source-a", strategyId: "brand-a", sourceType: "FILE", certainty: "OFFICIAL",
  fileName: "brief.txt", fileType: "TXT", rawContent: "Marque et pièces fournies.", rawData: null,
  extractedFields: null, processingStatus: "EXTRACTED" };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.brandDataSource.findMany).mockReset()
    .mockImplementation((async () => structuredClone(state.sources)) as any);
  state.sources = [{ ...source }]; state.embedding = [];
  state.nodes = [{ id: "chunk-a", strategyId: "brand-a", kind: "BRAND_SOURCE", sourceId: source.id,
    pillarKey: null, field: "chunk_0", metadata: null, embedding: [1, 0], embeddingModel: "fixture-model",
    payload: { text: source.rawContent, sourceContentHash: sourceFingerprint(source), certainty: "ARBITRARY" } }];
});

it("Notoria selects the requested older study before its document cap", async () => {
  state.sources = [
    ...Array.from({ length: 14 }, (_, i) => ({ ...source, id: `note-${i}`, certainty: "DECLARED", fileName: "Note de suivi.txt",
      rawContent: "Note générale sans résultat pertinent. ".repeat(20), updatedAt: new Date("2026-10-19T00:00:00Z") })),
    { ...source, id: "study-older", certainty: "DECLARED", fileName: "Étude terrain.docx",
      rawContent: "Étude terrain : prix observés et limites des échantillons. ".repeat(20), updatedAt: new Date("2026-10-18T00:00:00Z") },
  ];
  const result = await loadBrandSourceContext("brand-a", { query: "terrain", maxDocuments: 1 });
  expect(result.excerpts[0]?.sourceId).toBe("study-older");
  expect(result.retrieval).toBe("DETERMINISTIC");
});
describe("canonical documentary certainty follows current retrieval", () => {
  it("retains the proposed edition notice on the semantic path", async () => {
    state.embedding = [1, 0];
    state.sources[0].rawData = { _document: { schema: "document-edition-v1", family: "Modèle économique",
      kind: "BMC", label: "v3", status: "PROPOSED", changeSummary: "Piste à discuter", edition: 3,
      recordedAt: "2026-10-18T00:00:00.000Z" } };
    state.nodes[0].payload.sourceContentHash = sourceFingerprint(state.sources[0]);
    const context = await loadBrandSourceContext("brand-a", { query: "marque" });
    expect(context.retrieval).toBe("SEMANTIC");
    expect(context.excerpts[0]?.text).toContain("HYPOTHÈSE NON VALIDÉE PAR L’ÉQUIPE");
    expect(context.excerpts[0]?.text).toContain(source.rawContent);
  });
  it.each([false, true])("takes certainty from the current source, never the cache (vector=%s)", async (vector) => {
    if (vector) state.embedding = [1, 0];
    const rows = vector ? await topKWithinStrategy("brand-a", "marque") : await listByMetadata({ strategyId: "brand-a" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "chunk-a", sourceId: source.id, sourceCertainty: "OFFICIAL" });
    expect(state.nodes[0].payload.certainty).toBe("ARBITRARY");
    expect(state.sources[0]).toEqual(source);
  });
  it("keeps unsupported non-document certainty unknown", async () => {
    state.nodes = [{ ...state.nodes[0], kind: "PILLAR_FIELD", sourceId: null }];
    const rows = await listByMetadata({ strategyId: "brand-a" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveProperty("sourceCertainty", null);
  });
  it("rejects documentary fragments without a canonical source even when every id is absent", async () => {
    state.sources = []; state.nodes[0].sourceId = null;
    expect(await listByMetadata({ strategyId: "brand-a" })).toEqual([]);
  });
  it("does not promote an old fragment after the declared source certainty changes", async () => {
    state.sources[0].certainty = "DECLARED";
    expect(await listByMetadata({ strategyId: "brand-a" })).toEqual([]);
  });
  it("represents an unsupported legacy label as unknown without inventing a level", async () => {
    state.sources[0].certainty = "legacy-custom-label";
    state.nodes[0].payload.sourceContentHash = sourceFingerprint(state.sources[0]);
    const rows = await listByMetadata({ strategyId: "brand-a" });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sourceCertainty).toBeNull();
  });
  it("the source consumer keeps the certainty received with its fingerprint instead of rereading it", async () => {
    state.embedding = [1, 0];
    state.sources[0].certainty = "DECLARED";
    state.nodes[0].payload.sourceContentHash = sourceFingerprint(state.sources[0]);
    vi.mocked(db.brandDataSource.findMany)
      .mockResolvedValueOnce(structuredClone(state.sources) as any)
      .mockResolvedValueOnce([{ ...state.sources[0], certainty: "OFFICIAL" }] as any);
    const rows = await retrieveSourceChunksForField("brand-a", "marque");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.certainty).toBe("DECLARED");
    expect(db.brandDataSource.findMany).toHaveBeenCalledTimes(1);
  });
  it("keeps the source identity and certainty in the evidence sent to a producer", async () => {
    state.embedding = [1, 0];
    state.sources[0].certainty = "DECLARED";
    state.nodes[0].payload.sourceContentHash = sourceFingerprint(state.sources[0]);
    const text = await buildRetrievedSourceBrief("brand-a", [{ field: "promesse", query: "marque" }]);
    expect(text).toContain("source:source-a");
    expect(text).toContain("certitude:DECLARED");
    expect(text).toContain(source.rawContent);
  });
  it("counts separators in the producer's context budget and receipts only included chunks", async () => {
    state.embedding = [1, 0];
    state.nodes[0].payload.text = source.rawContent.slice(0, 12);
    state.nodes.push({ ...state.nodes[0], id: "chunk-b",
      payload: { ...state.nodes[0].payload, text: source.rawContent.slice(12) } });
    const receipts: Array<{ sourceId: string; contentHash: string }> = [];
    const head = "[promesse ← source, source:source-a, certitude:OFFICIAL] ";
    const maxChars = 2 * head.length + source.rawContent.length;
    const text = await buildRetrievedSourceBrief("brand-a", [{ field: "promesse", query: "marque" }],
      { perFieldTopK: 2, maxChars, sourceReceipts: receipts });
    expect(text.length).toBeLessThanOrEqual(maxChars);
    expect(receipts).toHaveLength(1);
  });
  it.each([false, true])("Notoria does not invent certainty for an unsupported legacy status (vector=%s)", async (vector) => {
    if (vector) state.embedding = [1, 0];
    state.sources[0].certainty = "legacy-custom-label";
    state.nodes[0].payload.sourceContentHash = sourceFingerprint(state.sources[0]);
    const context = await loadBrandSourceContext("brand-a", { query: "marque" });
    expect(context.excerpts).toHaveLength(1);
    expect(context.excerpts[0]?.certainty).toBeNull();
    const rendered = renderSourceContext(context);
    expect(rendered).toContain("certitude:non renseignée");
    expect(rendered).not.toContain("certitude:INFERRED");
    expect(rendered).not.toContain("legacy-custom-label");
  });
});
