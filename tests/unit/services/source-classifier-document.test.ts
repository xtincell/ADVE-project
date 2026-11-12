import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  call: vi.fn(), resolve: vi.fn(), receipt: vi.fn(), assets: vi.fn(),
  transaction: vi.fn(), retire: vi.fn(), create: vi.fn(), tag: vi.fn(), lock: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  brandAsset: { findMany: mock.assets }, $transaction: mock.transaction,
} }));
vi.mock("@/server/services/llm-gateway", () => ({
  callLLM: mock.call, extractJSON: JSON.parse,
  callLLMAndParse: async (options: unknown) => JSON.parse((await mock.call(options)).text),
}));
vi.mock("@/server/services/ingestion-pipeline/source-usage", () => ({
  resolveBrandSource: mock.resolve, assertCurrentSourceReceipts: mock.receipt,
}));
vi.mock("@/server/services/brand-vault/engine", () => ({ createBrandAsset: mock.create }));
vi.mock("@/server/services/asset-tagger", () => ({ tagAsset: mock.tag }));

import { decomposeDocument } from "@/server/services/source-classifier/llm-decomposer";
import { classifySource, proposeBrandAssetsFromSource } from "@/server/services/source-classifier";

const content = "Introduction documentaire. ".repeat(650)
  + "\nBénéficiaire : cherche un service accessible.\n"
  + "Payeur : finance ce service pour son équipe.\n";
const source = { id: "source", processingStatus: "EXTRACTED", sourceType: "FILE",
  fileType: "txt", fileName: "document.txt", rawContent: content };
const input = { rawContent: content, fileName: "document.txt", mimeType: "text/plain",
  fileType: "txt", strategyId: "brand" };
const proposal = (name: string, quote: string) => ({
  kind: "PERSONA", name, summary: name, confidence: 0.9,
  content: { extracted: quote }, quote,
});
const profiles = [proposal("Bénéficiaire", "Bénéficiaire : cherche un service accessible."),
  proposal("Payeur", "Payeur : finance ce service pour son équipe.")];
const respond = (proposals: unknown[] = profiles, complete = true) =>
  mock.call.mockResolvedValue({ text: JSON.stringify({ complete, proposals }),
    usage: { inputTokens: 100, outputTokens: 50 } });

beforeEach(() => {
  vi.clearAllMocks();
  mock.resolve.mockResolvedValue({ source, consumerStrategyId: "brand", contentHash: "current-hash" });
  mock.assets.mockResolvedValue([]);
  mock.receipt.mockResolvedValue(undefined);
  mock.tag.mockResolvedValue(undefined);
  mock.create.mockImplementation(async () => ({ id: `asset-${mock.create.mock.calls.length}` }));
  mock.transaction.mockImplementation(async (fn) => fn({
    $queryRaw: mock.lock, brandAsset: { findMany: mock.assets, updateMany: mock.retire },
    strategy: { findUniqueOrThrow: vi.fn(async () => ({ operatorId: "brand-operator" })) },
  }));
  respond();
});

describe("document classification preserves source information", () => {
  it("submits the entire document beyond the old prefix through one structured call", async () => {
    const result = await decomposeDocument(input);
    expect(mock.call).toHaveBeenCalledTimes(1);
    expect(mock.call.mock.calls[0]![0].prompt).toContain(content);
    expect(result.map((p) => p.name)).toEqual(["Bénéficiaire", "Payeur"]);
  });

  it("does not cap a complete document at six distinct proposals", async () => {
    const text = Array.from({ length: 8 }, (_, i) => `Profil ${i} : usage documentaire spécifique.`).join("\n");
    respond(text.split("\n").map((quote, i) => proposal(`Profil ${i}`, quote)));
    expect(await decomposeDocument({ ...input, rawContent: text })).toHaveLength(8);
  });

  it("uses the canonical taxonomy for documentary roles beyond the old shortlist", async () => {
    const quote = "Le narrateur est un rôle de production, pas un client.";
    respond([{ ...proposal("Casting", quote), kind: "CASTING_BRIEF" }]);
    const result = await decomposeDocument({ ...input, rawContent: quote });
    expect(mock.call.mock.calls[0]![0].system).toContain("CASTING_BRIEF");
    expect(result[0]!.kind).toBe("CASTING_BRIEF");
  });

  it("derives exact original UTF16 ranges from a unique quote", async () => {
    const result = await decomposeDocument({ ...input, rawContent: " 😀\n" + content });
    for (const p of result) {
      const citation = p.sourceCitation!;
      expect((" 😀\n" + content).slice(citation.charStart, citation.charEnd)).toBe(p.content!.extracted);
      expect(citation.charStart).toBeGreaterThan(12_000);
    }
  });

  it.each([
    ["invented quote", { ...profiles[0], quote: "Absent de la source" }],
    ["ambiguous quote", { ...profiles[0], quote: "Introduction documentaire." }],
    ["invalid kind", { ...profiles[0], kind: "NOT_A_KIND" }],
    ["invalid confidence", { ...profiles[0], confidence: 2 }],
    ["empty quote", { ...profiles[0], quote: " " }],
  ])("rejects %s without a second structured attempt", async (_label, invalid) => {
    respond([invalid]);
    await expect(decomposeDocument(input)).rejects.toThrow();
    expect(mock.call).toHaveBeenCalledTimes(1);
  });

  it("refuses an explicitly partial answer", async () => {
    respond(profiles, false);
    await expect(decomposeDocument(input)).rejects.toThrow();
  });

  it("does not label a document complete with no qualified proposal", async () => {
    respond([]);
    await expect(decomposeDocument(input)).rejects.toThrow();
  });

  it("propagates provider failure instead of returning an empty success", async () => {
    mock.call.mockRejectedValue(new Error("provider unavailable"));
    await expect(decomposeDocument(input)).rejects.toThrow("provider unavailable");
  });

  it("retains separate same-kind profiles and collapses only the same cited proposal", async () => {
    respond([...profiles, profiles[0]]);
    const result = await classifySource("source", "brand");
    expect(result.proposals.filter((p) => p.kind === "PERSONA").map((p) => p.name))
      .toEqual(["Bénéficiaire", "Payeur"]);
  });

  it("also inspects a long document with a confident file-level heuristic", async () => {
    mock.resolve.mockResolvedValue({ source: { ...source, fileName: "manifesto.txt" },
      consumerStrategyId: "brand", contentHash: "current-hash" });
    expect((await classifySource("source", "brand")).proposals.some((p) => p.name === "Payeur")).toBe(true);
  });

  it("fails before mutation when extraction is unavailable", async () => {
    mock.resolve.mockResolvedValue({ source: { ...source, processingStatus: "FAILED" },
      consumerStrategyId: "brand", contentHash: "current-hash" });
    await expect(proposeBrandAssetsFromSource("source", "operator", "brand")).rejects.toThrow();
    expect(mock.transaction).not.toHaveBeenCalled();
    expect(mock.call).not.toHaveBeenCalled();
  });

  it("keeps prior drafts on model failure", async () => {
    mock.call.mockRejectedValue(new Error("provider unavailable"));
    await expect(proposeBrandAssetsFromSource("source", "operator", "brand")).rejects.toThrow();
    expect(mock.retire).not.toHaveBeenCalled();
    expect(mock.create).not.toHaveBeenCalled();
  });

  it("checks the source receipt again before retiring or creating any asset", async () => {
    mock.receipt.mockRejectedValue(new Error("SOURCE_CHANGED: document revised"));
    await expect(proposeBrandAssetsFromSource("source", "operator", "brand")).rejects.toThrow("SOURCE_CHANGED");
    expect(mock.retire).not.toHaveBeenCalled();
    expect(mock.create).not.toHaveBeenCalled();
  });

  it("reuses a complete current batch without model calls or retagging", async () => {
    const first = await proposeBrandAssetsFromSource("source", "operator", "brand");
    const rows = mock.create.mock.calls.map(([args], i) => ({ id: first.brandAssetIds[i], metadata: args.metadata }));
    mock.assets.mockResolvedValue(rows);
    mock.call.mockClear(); mock.tag.mockClear(); mock.create.mockClear(); mock.retire.mockClear();
    const second = await proposeBrandAssetsFromSource("source", "operator", "brand");
    expect(second.brandAssetIds).toEqual(first.brandAssetIds);
    expect(mock.call).not.toHaveBeenCalled();
    expect(mock.tag).not.toHaveBeenCalled();
    expect(mock.create).not.toHaveBeenCalled();
    expect(mock.retire).not.toHaveBeenCalled();
  });

  it("rechecks a batch committed by another request before any duplicate write or tag", async () => {
    const first = await proposeBrandAssetsFromSource("source", "operator", "brand");
    const rows = mock.create.mock.calls.map(([args], i) => ({ id: first.brandAssetIds[i], metadata: args.metadata }));
    mock.assets.mockResolvedValueOnce([]).mockResolvedValue(rows);
    mock.call.mockClear(); mock.tag.mockClear(); mock.create.mockClear(); mock.retire.mockClear();
    const second = await proposeBrandAssetsFromSource("source", "operator", "brand");
    expect(second.alreadyFresh).toBe(true);
    expect(second.brandAssetIds).toEqual(first.brandAssetIds);
    expect(mock.call).toHaveBeenCalledTimes(1); // In-flight work is not a cross-request model lock.
    expect(mock.create).not.toHaveBeenCalled();
    expect(mock.retire).not.toHaveBeenCalled();
    expect(mock.tag).not.toHaveBeenCalled();
  });

  it.each(["source hash", "processor revision", "incomplete batch"])("does not reuse an old %s", async (change) => {
    await proposeBrandAssetsFromSource("source", "operator", "brand");
    const rows = mock.create.mock.calls.map(([args], i) => ({ id: `old-${i}`, metadata: { ...args.metadata } }));
    if (change === "source hash") rows.forEach((r) => { r.metadata.sourceContentHash = "old-hash"; });
    if (change === "processor revision") rows.forEach((r) => { r.metadata.classifierRevision = "old"; });
    if (change === "incomplete batch") rows.pop();
    mock.assets.mockResolvedValue(rows); mock.call.mockClear(); mock.create.mockClear();
    await proposeBrandAssetsFromSource("source", "operator", "brand");
    expect(mock.call).toHaveBeenCalledTimes(1);
    expect(mock.create).toHaveBeenCalled();
  });

  it("rejects a revoked source before returning cached asset IDs", async () => {
    const first = await proposeBrandAssetsFromSource("source", "operator", "brand");
    mock.assets.mockResolvedValue(mock.create.mock.calls.map(([args], i) => ({
      id: first.brandAssetIds[i], metadata: args.metadata,
    })));
    mock.receipt.mockRejectedValue(new Error("SOURCE_UNAVAILABLE: revoked"));
    mock.call.mockClear();
    await expect(proposeBrandAssetsFromSource("source", "operator", "brand")).rejects.toThrow("SOURCE_UNAVAILABLE");
    expect(mock.call).not.toHaveBeenCalled();
  });

  it("retires only prior drafts and leaves approved decisions untouched", async () => {
    await proposeBrandAssetsFromSource("source", "operator", "brand");
    expect(mock.retire).toHaveBeenCalledWith({
      where: { strategyId: "brand", state: "DRAFT", metadata: { path: ["sourceDataSourceId"], equals: "source" } },
      data: { state: "SUPERSEDED" },
    });
  });

  it("assigns new assets to the brand operator, independently of the executing user", async () => {
    await proposeBrandAssetsFromSource("source", "admin-user", "brand");
    expect(mock.create.mock.calls.every(([args]) => args.operatorId === "brand-operator")).toBe(true);
  });
});
