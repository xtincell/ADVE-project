import { initTRPC } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/server/trpc/context";

const h = vi.hoisted(() => ({
  context: vi.fn(), emit: vi.fn(), resume: vi.fn(),
  task: vi.fn(), tasks: vi.fn(), asset: vi.fn(), campaigns: vi.fn(), briefs: vi.fn(),
  intent: vi.fn(), brandAsset: vi.fn(), strategy: vi.fn(),
}));
const t = initTRPC.context<any>().create();
vi.mock("@/server/trpc/init", () => ({
  createTRPCRouter: t.router, operatorProcedure: t.procedure, protectedProcedure: t.procedure, publicProcedure: t.procedure,
}));
vi.mock("@/server/trpc/middleware/strategy-scope", () => ({ strategyScopedProcedure: t.procedure }));
vi.mock("@/server/governance/governed-procedure", () => ({
  governedProcedure: (opts: any) => t.procedure.input(opts.inputSchema), auditedProcedure: t.procedure,
}));
vi.mock("@/server/services/strategy-presentation", () => ({}));
vi.mock("@/server/services/budget-allocator", () => ({}));
vi.mock("@/lib/db", () => ({ db: {
  generativeTask: { findFirst: h.task, findMany: h.tasks }, assetVersion: { findFirst: h.asset },
  campaign: { findMany: h.campaigns }, campaignBrief: { findMany: h.briefs },
  brandAsset: { findFirst: h.brandAsset }, strategy: { findUnique: h.strategy },
} }));
vi.mock("@/server/services/operator-isolation", () => ({ getOperatorContext: h.context }));
vi.mock("@/server/services/mestor/intents", () => ({ emitIntentTyped: h.emit, emitIntent: h.intent }));
vi.mock("@/server/services/ptah", () => ({
  materializeBrief: vi.fn(), regenerateFadingAsset: vi.fn(), resolveResumptionPayload: h.resume,
}));
vi.mock("@/server/services/ptah/routing/provider-selector", () => ({ listProviders: () => [] }));

const secret = "test-server-only-webhook-capability";
const task = {
  id: "task-a", operatorId: "operator-a", strategyId: "brand-a", status: "COMPLETED",
  webhookSecret: secret, parameters: { prompt: "Documented art direction", width: 1024 },
  resultUrls: ["https://assets.example.com/original.png"], provider: "openai", providerModel: "image-model",
  campaignId: null, briefId: null, versions: [{ id: "asset-a", kind: "image", url: "https://assets.example.com/original.png" }],
};
const receipt = {
  taskId: task.id, provider: task.provider, providerModel: task.providerModel,
  status: task.status, estimatedCostUsd: 0, webhookSecret: secret, assetVersionIds: ["asset-a"],
};
const input = {
  strategyId: "brand-a", sourceIntentId: "intent-a",
  brief: { briefText: "Use the approved art direction", pillarSource: "D" as const,
    manipulationMode: "entertainer" as const, forgeSpec: { kind: "image", parameters: { prompt: "Artwork" } } },
};

async function caller() {
  const { ptahRouter } = await import("@/server/trpc/routers/ptah");
  return ptahRouter.createCaller({
    session: { user: { id: "user-a", role: "OPERATOR" }, expires: "2026-11-07T00:00:00Z" },
    db: {} as Context["db"], headers: undefined,
  });
}
function expectPublic(value: unknown) {
  // Check the entire transport shape, including nested tasks on asset readers.
  expect(JSON.stringify(value)).not.toContain(secret);
  expect(JSON.stringify(value)).not.toContain('"webhookSecret"');
}
beforeEach(() => {
  vi.clearAllMocks();
  h.context.mockResolvedValue({ operatorId: "operator-a", role: "OPERATOR" });
  h.task.mockResolvedValue(task);
  h.tasks.mockResolvedValue([{ ...task, resultUrls: undefined }]);
  h.asset.mockResolvedValue({ id: "asset-a", url: task.resultUrls[0], generativeTask: task, parent: null, children: [] });
  h.campaigns.mockResolvedValue([]);
  h.briefs.mockResolvedValue([]);
  h.emit.mockResolvedValue(receipt);
  h.resume.mockResolvedValue({ payload: { ...input, resumeTaskId: task.id } });
  h.brandAsset.mockResolvedValue({ id: "brief-asset", summary: "Art direction", pillarSource: "D", manipulationMode: "entertainer" });
  h.strategy.mockResolvedValue({ operatorId: "operator-a" });
  h.intent.mockResolvedValue({ status: "OK", summary: "Production received", output: receipt });
});

describe("Ptah public receipts", () => {
  it("keeps the detailed task useful without exposing its callback credential", async () => {
    const result = await (await caller()).getForge({ taskId: task.id });
    expectPublic(result);
    expect(result).toMatchObject({ parameters: task.parameters, resultUrls: task.resultUrls, versions: task.versions });
    expect(h.task).toHaveBeenCalledExactlyOnceWith({ where: { id: task.id, operatorId: "operator-a" }, include: { versions: true } });
    expect(task.webhookSecret).toBe(secret);
  });

  it("removes the nested task credential from an asset while preserving its lineage and original", async () => {
    const result = await (await caller()).getAssetVersion({ id: "asset-a" });
    expectPublic(result);
    expect(result).toMatchObject({ id: "asset-a", url: task.resultUrls[0], parent: null, children: [],
      generativeTask: { id: task.id, parameters: task.parameters } });
    expect(h.asset).toHaveBeenCalledExactlyOnceWith({ where: { id: "asset-a", operatorId: "operator-a" },
      include: { generativeTask: true, parent: true, children: true } });
    expect(task.webhookSecret).toBe(secret);
  });

  it.each([false, true])("returns a public creation/resumption receipt (resume=%s)", async (resume) => {
    const result = await (await caller()).materializeBrief(resume ? { strategyId: "brand-a", resumeTaskId: task.id } : input);
    expectPublic(result);
    expect(result).toMatchObject({ taskId: task.id, status: "COMPLETED", assetVersionIds: ["asset-a"] });
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ kind: "PTAH_MATERIALIZE_BRIEF", operatorId: "operator-a", strategyId: "brand-a" }),
      { caller: "ptah-router:materializeBrief" });
    expect(receipt.webhookSecret).toBe(secret);
  });

  it("keeps the polled list compact and credential-free", async () => {
    const result = await (await caller()).listForges({ strategyId: "brand-a" });
    expectPublic(result);
    expect(result[0]).not.toHaveProperty("parameters");
    expect(result[0]).toMatchObject({ id: task.id, versions: task.versions, canResume: true });
    expect(h.tasks).toHaveBeenCalledWith(expect.objectContaining({
      where: { operatorId: "operator-a", strategyId: "brand-a" }, omit: { resultUrls: true },
    }));
  });

  it("preserves unavailable assets/tasks and denies unassigned accounts before reading", async () => {
    h.task.mockResolvedValue(null);
    h.asset.mockResolvedValue(null);
    const api = await caller();
    expect(await api.getForge({ taskId: "foreign-task" })).toBeNull();
    expect(await api.getAssetVersion({ id: "foreign-asset" })).toBeNull();
    h.context.mockResolvedValue({ operatorId: null, role: "ADMIN" });
    await expect(api.getForge({ taskId: task.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(api.getAssetVersion({ id: "asset-a" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(h.task).toHaveBeenCalledTimes(1);
    expect(h.asset).toHaveBeenCalledTimes(1);
  });

  it("keeps a manually supplied asset readable without inventing a generative author", async () => {
    h.asset.mockResolvedValue({ id: "manual-asset", url: "https://assets.example.com/manual.png", generativeTask: null, parent: null, children: [] });
    const result = await (await caller()).getAssetVersion({ id: "manual-asset" });
    expectPublic(result);
    expect(result).toEqual({ id: "manual-asset", url: "https://assets.example.com/manual.png", generativeTask: null, parent: null, children: [] });
  });

  it("also protects the same receipt when a forge is requested from an Oracle section", async () => {
    const { strategyPresentationRouter } = await import("@/server/trpc/routers/strategy-presentation");
    const api = strategyPresentationRouter.createCaller({
      session: { user: { id: "user-a", role: "OPERATOR" }, expires: "2026-11-07T00:00:00Z" },
      db: {} as Context["db"], headers: undefined,
    });
    const request = { strategyId: "brand-a", sectionId: "territoire-creatif", brandAssetKind: "KV_VISUAL", forgeKind: "image" as const };
    const result = await api.forgeForSection(request);
    expectPublic(result);
    expect(result).toMatchObject({ sectionId: request.sectionId, brandAssetId: "brief-asset", status: "OK",
      output: { taskId: task.id, assetVersionIds: ["asset-a"] } });
    expect(h.intent).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      kind: "PTAH_MATERIALIZE_BRIEF", operatorId: "operator-a", strategyId: "brand-a", sourceBrandAssetId: "brief-asset",
    }), { caller: "oracle-forge:territoire-creatif" });
    expect(h.brandAsset).toHaveBeenCalledWith(expect.objectContaining({
      where: { strategyId: "brand-a", kind: "KV_VISUAL", state: "DRAFT" },
    }));
    h.intent.mockResolvedValue({ status: "VETOED", summary: "Unavailable", reason: "Capacity" });
    expect(await api.forgeForSection(request)).toMatchObject({ status: "VETOED", reason: "Capacity", output: null });
    expect(receipt.webhookSecret).toBe(secret);
  });
});
