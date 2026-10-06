import { beforeEach, describe, expect, it, vi } from "vitest";

// Real router + ingestion service. Only persistence, extraction and downstream
// dispatch are recorded. Auth/spine are exercised separately against Postgres.
const recorded = vi.hoisted(() => ({
  db: {
    brandDataSource: { create: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn() },
    brandContextNode: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
  assertRead: vi.fn(),
  extract: vi.fn(),
  emit: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: recorded.db }));
vi.mock("@/server/trpc/routers/_strategy-read-guard", () => ({ assertStrategyRead: recorded.assertRead }));
vi.mock("@/server/trpc/init", async () => {
  const { initTRPC } = await import("@trpc/server");
  const t = initTRPC.context<any>().create();
  return { createTRPCRouter: t.router, protectedProcedure: t.procedure, adminProcedure: t.procedure, operatorProcedure: t.procedure };
});
vi.mock("@/server/governance/governed-procedure", async () => {
  const { protectedProcedure } = await import("@/server/trpc/init");
  return { governedProcedure: ({ inputSchema }: any) => protectedProcedure.input(inputSchema) };
});
vi.mock("@/server/trpc/middleware/strategy-scope", async () => {
  const { protectedProcedure } = await import("@/server/trpc/init");
  return { strategyScopedProcedure: protectedProcedure };
});
vi.mock("@/server/services/ingestion-pipeline/extractors", () => ({ extractAuto: recorded.extract }));
vi.mock("@/server/services/ingestion-pipeline/ai-filler", () => ({ analyzeAndMapSources: vi.fn(), fillPillar: vi.fn(), fillRTISPillar: vi.fn() }));
vi.mock("@/server/services/advertis-scorer", () => ({ scoreObject: vi.fn() }));
vi.mock("@/server/services/pipeline-orchestrator", () => ({ executeFirstValueProtocol: vi.fn() }));
vi.mock("@/server/services/cross-validator", () => ({ getCrossRefSummary: vi.fn() }));
vi.mock("@/server/services/mestor/intents", () => ({ emitIntent: recorded.emit }));

import { ingestionRouter } from "@/server/trpc/routers/ingestion";

function caller() {
  return ingestionRouter.createCaller({ db: recorded.db, session: { user: { id: "operator-source-test" } } } as any);
}
async function settleHooks() {
  await vi.dynamicImportSettled();
}

beforeEach(() => {
  vi.clearAllMocks();
  recorded.db.brandDataSource.create.mockImplementation(async ({ data }) => ({ id: "source-test", ...data }));
  recorded.db.brandDataSource.update.mockImplementation(async ({ data }) => ({ id: "source-test", ...data }));
  recorded.extract.mockResolvedValue({ text: "Document conservé à l’identique.", metadata: { pages: 1 } });
  recorded.emit.mockResolvedValue({ status: "OK" });
  recorded.assertRead.mockResolvedValue(undefined);
  recorded.db.brandDataSource.findUniqueOrThrow.mockResolvedValue({ strategyId: "brand" });
  recorded.db.brandContextNode.deleteMany.mockResolvedValue({ count: 2 });
  recorded.db.$transaction.mockImplementation(async (operations) => Promise.all(operations));
});

describe("manual source correction retires the previous analysis atomically", () => {
  it.each([
    { content: "Texte corrigé" },
    { title: "Titre corrigé" },
    { certainty: "OFFICIAL" as const },
  ])("invalidates the source index for %j without launching preparation", async (patch) => {
    await caller().updateSource({ id: "source-test", ...patch });
    await settleHooks();
    expect(recorded.assertRead).toHaveBeenCalledWith("operator-source-test", "brand");
    expect(recorded.db.brandContextNode.deleteMany).toHaveBeenCalledWith({ where: { sourceId: "source-test" } });
    const operations = recorded.db.$transaction.mock.calls[0]?.[0];
    expect(operations).toHaveLength(2);
    expect(operations).toContain(recorded.db.brandDataSource.update.mock.results[0]?.value);
    expect(operations).toContain(recorded.db.brandContextNode.deleteMany.mock.results[0]?.value);
    expect(recorded.emit).not.toHaveBeenCalled();
  });

  it("a corrected text cannot reuse structured fields extracted from its predecessor", async () => {
    await caller().updateSource({ id: "source-test", content: "Le budget n'est plus confirmé." });
    expect(recorded.db.brandDataSource.update).toHaveBeenCalledWith({
      where: { id: "source-test" },
      data: { rawContent: "Le budget n'est plus confirmé.", processingStatus: "EXTRACTED", errorMessage: null, extractedFields: {}, rawData: {} },
    });
  });

  it("a forbidden source causes no write or index deletion", async () => {
    recorded.assertRead.mockRejectedValueOnce(new Error("Accès refusé à cette marque"));
    await expect(caller().updateSource({ id: "other-tenant", content: "wrong" })).rejects.toThrow("Accès refusé");
    expect(recorded.db.$transaction).not.toHaveBeenCalled();
    expect(recorded.db.brandDataSource.update).not.toHaveBeenCalled();
    expect(recorded.db.brandContextNode.deleteMany).not.toHaveBeenCalled();
  });
});

describe("source deposit requires an explicit choice for assisted preparation", () => {
  it("stores a manual note without indexing or classification by default", async () => {
    await caller().addManualSource({ strategyId: "brand", title: "Brief", content: "Source officielle" });
    await settleHooks();
    expect(recorded.db.brandDataSource.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rawContent: "Source officielle", processingStatus: "EXTRACTED" }) }));
    expect(recorded.emit).not.toHaveBeenCalled();
  });

  it("stores plain text without indexing or classification by default", async () => {
    await caller().addText({ strategyId: "brand", text: "Texte de référence conservé.", label: "Référence" });
    await settleHooks();
    expect(recorded.emit).not.toHaveBeenCalled();
  });

  it("extracts an uploaded document without assisted work by default", async () => {
    await caller().uploadFile({ strategyId: "brand", fileName: "brief.txt", fileType: "TXT", content: "dGVzdA==" });
    await settleHooks();
    expect(recorded.extract).toHaveBeenCalledTimes(1);
    expect(recorded.db.brandDataSource.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rawContent: "Document conservé à l’identique.", processingStatus: "EXTRACTED" }) }));
    expect(recorded.emit).not.toHaveBeenCalled();
  });

  it.each(["note", "text", "file"] as const)("only an opted-in %s launches both existing governed preparation commands", async (kind) => {
    const api = caller();
    if (kind === "note") await api.addManualSource({ strategyId: "brand", title: "Brief", content: "Source officielle", prepareAnalysis: true });
    if (kind === "text") await api.addText({ strategyId: "brand", text: "Texte de référence conservé.", prepareAnalysis: true });
    if (kind === "file") await api.uploadFile({ strategyId: "brand", fileName: "brief.txt", fileType: "TXT", content: "dGVzdA==", prepareAnalysis: true });
    await vi.waitFor(() => expect(recorded.emit).toHaveBeenCalledTimes(2));
    expect(recorded.emit.mock.calls.map(([intent]) => intent.kind).sort()).toEqual(["INDEX_BRAND_SOURCE", "PROPOSE_VAULT_FROM_SOURCE"]);
    for (const [intent] of recorded.emit.mock.calls) expect(intent).toMatchObject({ strategyId: "brand", sourceId: "source-test" });
  });

  it("preserves an extraction failure, reports it, and launches no preparation even when opted in", async () => {
    recorded.extract.mockRejectedValueOnce(new Error("Format non lisible"));
    await expect(caller().uploadFile({ strategyId: "brand", fileName: "broken.pdf", fileType: "PDF", content: "invalid", prepareAnalysis: true })).rejects.toThrow("Format non lisible");
    await settleHooks();
    expect(recorded.db.brandDataSource.update).toHaveBeenCalledWith(expect.objectContaining({ data: { processingStatus: "FAILED", errorMessage: "Format non lisible" } }));
    expect(recorded.emit).not.toHaveBeenCalled();
  });
});
