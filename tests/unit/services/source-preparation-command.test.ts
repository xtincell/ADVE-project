import { initTRPC } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/server/trpc/context";

const harness = vi.hoisted(() => ({ resolve: vi.fn(), emit: vi.fn(), operator: vi.fn() }));
const t = initTRPC.context<any>().create();
vi.mock("@/server/trpc/init", () => ({
  createTRPCRouter: t.router, protectedProcedure: t.procedure,
  adminProcedure: t.procedure, operatorProcedure: t.procedure,
}));
vi.mock("@/server/trpc/middleware/strategy-scope", () => ({ strategyScopedProcedure: t.procedure }));
// These tests exercise the adapter's handler. The unchanged role/scoping
// middleware is received separately through authenticated HTTP calls.
vi.mock("@/server/governance/governed-procedure", () => ({
  governedProcedure: (opts: any) => t.procedure.input(opts.inputSchema),
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/services/ingestion-pipeline", () => ({}));
vi.mock("@/server/trpc/routers/_strategy-read-guard", () => ({ assertStrategyRead: vi.fn() }));
vi.mock("@/server/services/operator-isolation", () => ({ getOperatorContext: harness.operator }));
vi.mock("@/server/services/mestor/intents", () => ({ emitIntent: harness.emit }));
vi.mock("@/server/services/ingestion-pipeline/source-usage", () => ({
  resolveBrandSource: harness.resolve, listBrandSourceSummaries: vi.fn(),
  setSourceUse: vi.fn(), invalidateSourceDerivatives: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  harness.resolve.mockResolvedValue({ source: { processingStatus: "EXTRACTED" } });
  harness.operator.mockResolvedValue({ operatorId: "operator-a", userId: "user-a" });
  harness.emit.mockResolvedValue({ status: "OK", output: { chunks: 2, embeddingRequested: false } });
});

async function prepare(prepareEmbeddings?: false) {
  const { ingestionRouter } = await import("@/server/trpc/routers/ingestion");
  const caller = ingestionRouter.createCaller({
    session: { user: { id: "user-a", role: "ADMIN" }, expires: "2026-10-14T00:00:00Z" },
    db: {} as Context["db"], headers: undefined,
  });
  return caller.prepareSourceIndex({ strategyId: "brand-a", sourceId: "source-a", prepareEmbeddings });
}

describe("manual source preparation command", () => {
  it("uses the existing writer with no embeddings and the operator's identity", async () => {
    expect(await prepare()).toEqual({ chunks: 2, embeddingRequested: false });
    expect(harness.emit).toHaveBeenCalledExactlyOnceWith({
      kind: "INDEX_BRAND_SOURCE", strategyId: "brand-a", sourceId: "source-a", prepareEmbeddings: false,
    }, { caller: "ingestion:prepareSourceIndex", operatorId: "operator-a" });
  });

  it("does not extract or dispatch an unreadable document", async () => {
    harness.resolve.mockResolvedValue({ source: { processingStatus: "PENDING" } });
    await expect(prepare()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(harness.emit).not.toHaveBeenCalled();
  });

  it("rejects an embedding override before the writer", async () => {
    // Deliberately invalid external input, received by the real Zod parser.
    await expect(prepare(true as unknown as false)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(harness.resolve).not.toHaveBeenCalled();
    expect(harness.emit).not.toHaveBeenCalled();
  });

  it("treats an inaccessible source as unavailable before dispatch", async () => {
    harness.resolve.mockRejectedValue(new Error("SOURCE_UNAVAILABLE: inaccessible"));
    await expect(prepare()).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(harness.emit).not.toHaveBeenCalled();
  });

  it("preserves a storage outage rather than disguising it as absence", async () => {
    harness.resolve.mockRejectedValue(new Error("connection unavailable"));
    await expect(prepare()).rejects.toThrow("connection unavailable");
    expect(harness.emit).not.toHaveBeenCalled();
  });

  it("does not report success after a writer failure", async () => {
    harness.emit.mockResolvedValue({ status: "FAILED", output: { chunks: 99 } });
    await expect(prepare()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
