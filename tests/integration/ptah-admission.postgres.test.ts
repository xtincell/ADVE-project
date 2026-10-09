/** Real PostgreSQL admission; provider boundary only is synthetic, no paid call. */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { materializeBrief, reconcileTask, regenerateFadingAsset } from "@/server/services/ptah";
import { getProvider } from "@/server/services/ptah/providers";
import * as providerSelection from "@/server/services/ptah/routing/provider-selector";
import type { ForgeBrief } from "@/server/services/ptah/types";
import { execute } from "@/server/services/artemis/commandant";
import { POST } from "@/app/api/ptah/webhook/route";
import { ptahRouter } from "@/server/trpc/routers/ptah";
import { openEmission } from "@/server/governance/emission-spine";

const brands: string[] = [], operators: string[] = [], users: string[] = [];
const url = "https://fixture.example.invalid/result.png";
let owner: string, operatorId: string;
beforeAll(async () => {
  const connection = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(connection.hostname);
  expect(connection.pathname).toBe("/shinkiro_verify");
  for (let i = 0; i < 2; i++) {
    const op = await db.operator.create({ data: { name: "Forge fixture", slug: "forge-" + randomUUID(),
      status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86400000) } });
    operators.push(op.id);
  }
  const user = await db.user.create({ data: { email: "forge-" + randomUUID() + "@example.invalid", operatorId: operators[0] } });
  users.push(user.id); owner = user.id; operatorId = operators[0]!;
});
beforeEach(() => { vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_FIXTURE")); });
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  const where = { strategyId: { in: brands } };
  await db.assetVersion.deleteMany({ where }); await db.generativeTask.deleteMany({ where });
  await db.brandAsset.deleteMany({ where }); await db.campaignBrief.deleteMany({ where: { campaign: where } });
  await db.campaign.deleteMany({ where }); await db.aICostLog.deleteMany({ where });
  await db.intentEmission.deleteMany({ where }); await db.costDecision.deleteMany({ where });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.operator.deleteMany({ where: { id: { in: operators } } }); await db.$disconnect();
});
async function fixture(patch: Record<string, unknown> = {}) {
  const strategy = await db.strategy.create({ data: { name: "Forge synthetic", userId: owner, operatorId } });
  brands.push(strategy.id);
  const task = await db.generativeTask.create({ data: { intentId: "forge-" + randomUUID(), strategyId: strategy.id,
    operatorId, forgeKind: "image", provider: "openai", providerModel: "gpt-image-1", providerTaskId: url,
    status: "IN_PROGRESS", promptHash: randomUUID(), parameters: {}, pillarSource: "D", manipulationMode: "entertainer",
    estimatedCostUsd: 0.07, webhookSecret: randomUUID(), ...patch } });
  return { strategy, task };
}
async function counts(strategyId: string) {
  const where = { strategyId };
  return [await db.assetVersion.count({ where }), await db.brandAsset.count({ where }), await db.aICostLog.count({ where })];
}
const entryBrief: ForgeBrief = { briefText: "Synthetic campaign production",
  forgeSpec: { kind: "image", parameters: {} }, pillarSource: "D", manipulationMode: "entertainer" };
function deferProvider() {
  return vi.spyOn(providerSelection, "selectProvider").mockRejectedValue(
    new providerSelection.NoAvailableProviderError("image", ["openai"]));
}
async function businessScope(strategyId: string, sourceOperator = operatorId) {
  const campaign = await db.campaign.create({ data: { strategyId, name: "Synthetic campaign" } });
  const brief = await db.campaignBrief.create({ data: { campaignId: campaign.id, title: "Synthetic brief", content: {} } });
  const source = await db.brandAsset.create({ data: { strategyId, operatorId: sourceOperator,
    name: "Synthetic production brief", kind: "KV_ART_DIRECTION_BRIEF", campaignId: campaign.id, briefId: brief.id } });
  return { campaignId: campaign.id, briefId: brief.id, sourceBrandAssetId: source.id };
}
function entryPayload(strategyId: string, refs: Record<string, string> = {}) {
  return { strategyId, sourceIntentId: "synthetic-upstream-" + randomUUID(), brief: entryBrief, ...refs };
}
async function fault(table: "BrandAsset" | "GenerativeTask", expression: string, run: () => Promise<void>) {
  const constraint = "fixture_forge_" + randomUUID().replaceAll("-", "");
  await db.$executeRawUnsafe(`ALTER TABLE "${table}" ADD CONSTRAINT ${constraint} CHECK (${expression}) NOT VALID`);
  try { await run(); } finally { await db.$executeRawUnsafe(`ALTER TABLE "${table}" DROP CONSTRAINT ${constraint}`); }
}

describe("Ptah result admission", () => {
  async function deferredOriginal() {
    const f = await fixture(), refs = await businessScope(f.strategy.id);
    const payload = entryPayload(f.strategy.id, refs);
    const intentId = await openEmission({ kind: "PTAH_MATERIALIZE_BRIEF", strategyId: f.strategy.id,
      payload: { kind: "PTAH_MATERIALIZE_BRIEF", operatorId, ...payload }, caller: "synthetic-resume" });
    const selection = deferProvider();
    const result = await materializeBrief(payload, { operatorId, intentId });
    return { ...f, refs, payload, result, selection, intentId };
  }

  it("keeps the same deferred task and original receipt when configuration is still absent", async () => {
    const f = await deferredOriginal();
    const resumed = await materializeBrief({ ...f.payload, resumeTaskId: f.result.taskId } as typeof f.payload,
      { operatorId, intentId: "resume-" + randomUUID() });
    expect(resumed).toMatchObject({ taskId: f.result.taskId, status: "DEFERRED" });
    expect(await db.generativeTask.count({ where: { strategyId: f.strategy.id } })).toBe(2);
    expect((await db.generativeTask.findUniqueOrThrow({ where: { id: resumed.taskId } })).intentId).toBe(f.intentId);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("submits one existing deferred task under concurrent explicit resumptions", async () => {
    const f = await deferredOriginal();
    const forge = vi.fn(async () => { await new Promise(resolve => setTimeout(resolve, 80));
      return { providerTaskId: "resume-provider-id", providerModel: "synthetic", estimatedCostUsd: 0,
        webhookSecret: "synthetic-provider-receipt" }; });
    f.selection.mockResolvedValue({ ...getProvider("openai"), sync: false, forge,
      estimateCost: () => 0, isAvailable: async () => true });
    const results = await Promise.all(Array.from({ length: 3 }, () => materializeBrief(
      { ...f.payload, resumeTaskId: f.result.taskId } as typeof f.payload,
      { operatorId, intentId: "resume-" + randomUUID() })));
    expect(results.every(r => r.taskId === f.result.taskId)).toBe(true);
    expect(results.filter(r => r.submissionReserved)).toHaveLength(1);
    expect(forge).toHaveBeenCalledTimes(1);
    expect(await db.generativeTask.count({ where: { strategyId: f.strategy.id } })).toBe(2);
    expect(await db.generativeTask.findUniqueOrThrow({ where: { id: f.result.taskId } })).toMatchObject({
      ...f.refs, sourceIntentId: f.payload.sourceIntentId, status: "IN_PROGRESS",
      providerTaskId: "resume-provider-id", intentId: f.intentId,
    });
  });

  it("refuses a changed brief on resumption before selecting or calling a provider", async () => {
    const f = await deferredOriginal(); f.selection.mockClear();
    await expect(materializeBrief({ ...f.payload, brief: { ...f.payload.brief, briefText: "Different request" },
      resumeTaskId: f.result.taskId } as typeof f.payload, { operatorId, intentId: "resume-" + randomUUID() })).rejects.toThrow();
    expect(f.selection).not.toHaveBeenCalled();
    expect(await db.generativeTask.count({ where: { strategyId: f.strategy.id } })).toBe(2);
  });

  it("refuses another operator and a missing original receipt before provider work", async () => {
    const f = await deferredOriginal(); f.selection.mockClear();
    const payload = { ...f.payload, resumeTaskId: f.result.taskId };
    await expect(materializeBrief(payload, { operatorId: operators[1]!, intentId: "resume-foreign" })).rejects.toThrow();
    await db.intentEmission.delete({ where: { id: f.intentId } });
    await expect(materializeBrief(payload, { operatorId, intentId: "resume-missing" })).rejects.toThrow();
    expect(f.selection).not.toHaveBeenCalled();
    expect(await db.generativeTask.count({ where: { strategyId: f.strategy.id } })).toBe(2);
  });

  it("refuses a changed persisted emission body before provider work", async () => {
    const f = await deferredOriginal(); f.selection.mockClear();
    const row = await db.intentEmission.findUniqueOrThrow({ where: { id: f.intentId } });
    const payload = row.payload as Record<string, unknown>;
    await db.intentEmission.update({ where: { id: f.intentId }, data: { payload: JSON.parse(JSON.stringify({ ...payload,
      brief: { ...f.payload.brief, briefText: "Synthetic alteration" } })) } });
    await expect(materializeBrief({ ...f.payload, resumeTaskId: f.result.taskId },
      { operatorId, intentId: "resume-altered-seal" })).rejects.toThrow("reçu original");
    expect(f.selection).not.toHaveBeenCalled();
    expect(await db.generativeTask.count({ where: { strategyId: f.strategy.id } })).toBe(2);
  });

  it("rechecks current source and manipulation gates before resubmitting", async () => {
    const f = await deferredOriginal(); f.selection.mockClear();
    const payload = { ...f.payload, resumeTaskId: f.result.taskId };
    await db.brandAsset.update({ where: { id: f.refs.sourceBrandAssetId }, data: { state: "ARCHIVED" } });
    await expect(materializeBrief(payload, { operatorId, intentId: "resume-source" })).rejects.toThrow();
    await db.brandAsset.update({ where: { id: f.refs.sourceBrandAssetId }, data: { state: "DRAFT" } });
    await db.strategy.update({ where: { id: f.strategy.id }, data: { manipulationMix: { entertainer: 0 } } });
    await expect(materializeBrief(payload, { operatorId, intentId: "resume-mix" })).rejects.toThrow();
    expect(f.selection).not.toHaveBeenCalled();
    expect((await db.generativeTask.findUniqueOrThrow({ where: { id: f.result.taskId } })).status).toBe("DEFERRED");
  });

  it("never resends a submission interrupted before its provider receipt is persisted", async () => {
    const f = await deferredOriginal(); f.selection.mockClear();
    await db.generativeTask.update({ where: { id: f.result.taskId }, data: { status: "CREATED",
      parameters: { _ptahSubmission: { state: "STARTED", startedAt: new Date().toISOString() } } } });
    const result = await materializeBrief({ ...f.payload, resumeTaskId: f.result.taskId },
      { operatorId, intentId: "resume-interrupted" });
    expect(result).toMatchObject({ taskId: f.result.taskId, status: "CREATED", submissionUnknown: true });
    expect(f.selection).not.toHaveBeenCalled();
    expect(await db.generativeTask.count({ where: { strategyId: f.strategy.id } })).toBe(2);
  });

  it("retains a failed submission and refuses an automatic resend after an uncertain response", async () => {
    const f = await deferredOriginal(); const forge = vi.fn().mockRejectedValue(new Error("synthetic-response-lost"));
    f.selection.mockResolvedValue({ ...getProvider("openai"), sync: false, forge,
      estimateCost: () => 0, isAvailable: async () => true });
    const payload = { ...f.payload, resumeTaskId: f.result.taskId };
    await expect(materializeBrief(payload, { operatorId, intentId: "resume-lost-response" })).rejects.toThrow();
    await expect(materializeBrief(payload, { operatorId, intentId: "resume-after-loss" })).rejects.toThrow();
    expect(forge).toHaveBeenCalledTimes(1);
    expect(await db.generativeTask.findUniqueOrThrow({ where: { id: f.result.taskId } })).toMatchObject({
      status: "FAILED", intentId: f.intentId, parameters: { _ptahSubmission: { state: "STARTED" } } });
    expect(await db.generativeTask.count({ where: { strategyId: f.strategy.id } })).toBe(2);
  });

  it("refuses altered persisted parameters or a terminal state without material receipt", async () => {
    const f = await deferredOriginal(); f.selection.mockClear();
    const payload = { ...f.payload, resumeTaskId: f.result.taskId };
    await db.generativeTask.update({ where: { id: f.result.taskId }, data: { parameters: { changed: true } } });
    await expect(materializeBrief(payload, { operatorId, intentId: "resume-params" })).rejects.toThrow();
    await db.generativeTask.update({ where: { id: f.result.taskId }, data: { parameters: {}, status: "COMPLETED", resultUrls: [url] } });
    await expect(materializeBrief(payload, { operatorId, intentId: "resume-empty-completed" })).rejects.toThrow();
    expect(f.selection).not.toHaveBeenCalled();
  });

  it("replays a completed resumed production without forging, recosting or admitting it again", async () => {
    const f = await deferredOriginal(), forge = vi.fn().mockResolvedValue({ providerTaskId: url, providerModel: "synthetic", estimatedCostUsd: 0 });
    f.selection.mockResolvedValue({ ...getProvider("openai"), sync: false, forge,
      estimateCost: () => 0, isAvailable: async () => true });
    const payload = { ...f.payload, resumeTaskId: f.result.taskId };
    await materializeBrief(payload, { operatorId, intentId: "resume-complete" });
    vi.spyOn(getProvider("openai"), "reconcile").mockResolvedValue({ resultUrls: [url], realisedCostUsd: 0.07, completedAt: new Date() });
    const admitted = await reconcileTask(f.result.taskId, null);
    const before = await counts(f.strategy.id);
    const result = await materializeBrief(payload, { operatorId, intentId: "resume-completed-replay" });
    expect(result).toMatchObject({ taskId: f.result.taskId, status: "COMPLETED" });
    expect(result.assetVersionIds).toEqual(admitted.assetVersionIds);
    expect(await counts(f.strategy.id)).toEqual(before);
    expect(forge).toHaveBeenCalledTimes(1);
  });

  it("refuses a hybrid resumption and changed brief before any new decision or task", async () => {
    const f = await deferredOriginal(); f.selection.mockClear();
    const caller = ptahRouter.createCaller({ db, headers: undefined, session: { user: { id: owner, role: "OPERATOR" },
      expires: new Date(Date.now() + 60_000).toISOString() } });
    const before = await db.intentEmission.count({ where: { strategyId: f.strategy.id } });
    const hybrid = { ...f.payload, resumeTaskId: f.result.taskId,
      brief: { ...f.payload.brief, briefText: "Changed hybrid request" }, overrideMixViolation: true };
    await expect(caller.materializeBrief(hybrid)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(f.selection).not.toHaveBeenCalled();
    expect(await db.generativeTask.count({ where: { strategyId: f.strategy.id } })).toBe(2);
    expect(await db.intentEmission.count({ where: { strategyId: f.strategy.id } })).toBe(before);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("pages all operator tasks with timestamp ties and never exposes callback secrets or reservation metadata", async () => {
    const f = await fixture();
    await db.generativeTask.createMany({ data: Array.from({ length: 21 }, () => ({ intentId: "paged-" + randomUUID(),
      strategyId: f.strategy.id, operatorId, forgeKind: "image", provider: "openai", providerModel: "synthetic",
      status: "DEFERRED", promptHash: randomUUID(), parameters: { input: "retained", _ptahSubmission: { state: "STARTED" } },
      pillarSource: "D", manipulationMode: "entertainer", estimatedCostUsd: 0, webhookSecret: "synthetic-callback-secret",
      createdAt: new Date("2000-01-01") })) });
    const caller = ptahRouter.createCaller({ db, headers: undefined, session: { user: { id: owner, role: "OPERATOR" },
      expires: new Date(Date.now() + 60_000).toISOString() } });
    const ids: string[] = [];
    let cursor: { id: string; createdAt: Date } | undefined;
    for (let page = 0; page < 4; page++) {
      const rows = await caller.listForges({ strategyId: f.strategy.id, limit: 7, cursor });
      for (const row of rows) {
        expect(row).not.toHaveProperty("webhookSecret"); expect(row.parameters).not.toHaveProperty("_ptahSubmission");
        ids.push(row.id);
      }
      if (!rows.length) break;
      cursor = { id: rows[rows.length - 1]!.id, createdAt: rows[rows.length - 1]!.createdAt };
    }
    expect(ids).toHaveLength(22); expect(new Set(ids).size).toBe(22);
    expect(await caller.listForges({ strategyId: "foreign-or-missing", limit: 7 })).toEqual([]);
    await db.user.update({ where: { id: owner }, data: { operatorId: null } });
    try { await expect(caller.listForges({ strategyId: f.strategy.id, limit: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" }); }
    finally { await db.user.update({ where: { id: owner }, data: { operatorId } }); }
  });

  it("retains business scope through the existing commandant and a selected asynchronous provider", async () => {
    const f = await fixture(), refs = await businessScope(f.strategy.id), payload = entryPayload(f.strategy.id, refs);
    const forge = vi.fn().mockResolvedValue({ providerTaskId: "synthetic-provider-task", providerModel: "synthetic", estimatedCostUsd: 0 });
    vi.spyOn(providerSelection, "selectProvider").mockResolvedValue({ ...getProvider("magnific"), name: "magnific",
      sync: false, forge, estimateCost: () => 0, isAvailable: async () => true });
    const emissionId = "synthetic-emission-" + randomUUID();
    const result = await execute({ kind: "PTAH_MATERIALIZE_BRIEF", operatorId, ...payload,
      brief: { ...payload.brief, forgeSpec: { ...payload.brief.forgeSpec, providerHint: "magnific" } } }, { intentId: emissionId });
    expect(result.status).toBe("OK"); expect(forge).toHaveBeenCalledTimes(1);
    const task = await db.generativeTask.findFirstOrThrow({ where: { intentId: emissionId } });
    expect(task).toMatchObject({ ...refs, sourceIntentId: payload.sourceIntentId, status: "IN_PROGRESS" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("retains business references from a deferred entry through material admission", async () => {
    const f = await fixture(), refs = await businessScope(f.strategy.id);
    const selection = deferProvider(), payload = entryPayload(f.strategy.id, refs);
    const result = await materializeBrief(payload, { operatorId, intentId: "synthetic-emission-" + randomUUID() });
    expect(result.status).toBe("DEFERRED"); expect(selection).toHaveBeenCalledTimes(1);
    const task = await db.generativeTask.findUniqueOrThrow({ where: { id: result.taskId } });
    expect(task).toMatchObject({ ...refs, sourceIntentId: payload.sourceIntentId });
    await db.generativeTask.update({ where: { id: task.id }, data: { status: "IN_PROGRESS", resultUrls: [url], realisedCostUsd: 0 } });
    const admitted = await reconcileTask(task.id, null);
    const material = await db.brandAsset.findFirstOrThrow({ where: { sourceAssetVersionId: admitted.assetVersionIds[0] } });
    expect(material).toMatchObject({ campaignId: refs.campaignId, briefId: refs.briefId, sourceIntentId: task.intentId });
    expect(material.metadata).toMatchObject({ sourceBrandAssetId: refs.sourceBrandAssetId });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each(["campaignId", "briefId", "sourceBrandAssetId"] as const)("refuses a foreign entry %s before provider selection", async (field) => {
    const f = await fixture(), other = await fixture();
    const refs = await businessScope(f.strategy.id), foreign = await businessScope(other.strategy.id);
    const selection = deferProvider();
    await expect(materializeBrief(entryPayload(f.strategy.id, { ...refs, [field]: foreign[field] }),
      { operatorId, intentId: "synthetic-emission-" + randomUUID() })).rejects.toThrow();
    expect(selection).not.toHaveBeenCalled();
    expect(await db.generativeTask.count({ where: { strategyId: f.strategy.id } })).toBe(1);
  });

  it("refuses an entry source attributed to another operator before provider selection", async () => {
    const f = await fixture(), refs = await businessScope(f.strategy.id, operators[1]);
    const selection = deferProvider();
    await expect(materializeBrief(entryPayload(f.strategy.id, refs),
      { operatorId, intentId: "synthetic-emission-" + randomUUID() })).rejects.toThrow();
    expect(selection).not.toHaveBeenCalled();
  });

  it("requires an existing campaign brief before selecting a provider", async () => {
    const f = await fixture();
    const campaign = await db.campaign.create({ data: { strategyId: f.strategy.id, name: "No brief" } });
    const selection = deferProvider();
    await expect(materializeBrief(entryPayload(f.strategy.id, { campaignId: campaign.id }),
      { operatorId, intentId: "synthetic-emission-" + randomUUID() })).rejects.toMatchObject({ code: "BRIEF_MISSING" });
    expect(selection).not.toHaveBeenCalled();
  });

  it.each(["brand", "operator"] as const)("refuses a version linked to a task of another %s before regeneration", async (foreignScope) => {
    const f = await fixture(), other = await fixture();
    if (foreignScope === "operator") await db.generativeTask.update({ where: { id: other.task.id },
      data: { strategyId: f.strategy.id, operatorId: operators[1] } });
    const version = await db.assetVersion.create({ data: { strategyId: f.strategy.id, operatorId,
      generativeTaskId: other.task.id, kind: "image", url, metadata: {} } });
    const selection = deferProvider();
    await expect(regenerateFadingAsset({ strategyId: f.strategy.id, assetVersionId: version.id },
      { operatorId, intentId: "synthetic-emission-" + randomUUID() })).rejects.toThrow();
    expect(selection).not.toHaveBeenCalled();
  });

  it("retains the original business scope when regenerating a compatible version", async () => {
    const f = await fixture(), refs = await businessScope(f.strategy.id);
    await db.generativeTask.update({ where: { id: f.task.id }, data: refs });
    const version = await db.assetVersion.create({ data: { strategyId: f.strategy.id, operatorId,
      generativeTaskId: f.task.id, kind: "image", url, metadata: {} } });
    deferProvider();
    const result = await regenerateFadingAsset({ strategyId: f.strategy.id, assetVersionId: version.id },
      { operatorId, intentId: "synthetic-emission-" + randomUUID() });
    expect(await db.generativeTask.findUniqueOrThrow({ where: { id: result.taskId } }))
      .toMatchObject({ ...refs, sourceIntentId: f.task.intentId });
  });

  it("keeps a brand-wide manual production valid without inventing campaign references", async () => {
    const f = await fixture(); deferProvider();
    const result = await materializeBrief(entryPayload(f.strategy.id),
      { operatorId, intentId: "synthetic-emission-" + randomUUID() });
    expect(await db.generativeTask.findUniqueOrThrow({ where: { id: result.taskId } }))
      .toMatchObject({ campaignId: null, briefId: null, sourceBrandAssetId: null });
  });

  it.each(["BrandAsset", "GenerativeTask"] as const)("keeps a checkpoint and rolls back admission on late %s failure", async (table) => {
    const f = await fixture();
    vi.spyOn(getProvider("openai"), "reconcile").mockResolvedValue({ resultUrls: [url], realisedCostUsd: 0.07, completedAt: new Date() });
    await fault(table, table === "BrandAsset" ? `"strategyId" <> '${f.strategy.id}'`
      : `id <> '${f.task.id}' OR status <> 'COMPLETED'`, async () => {
      await expect(reconcileTask(f.task.id, null)).rejects.toThrow();
      const task = await db.generativeTask.findUniqueOrThrow({ where: { id: f.task.id } });
      expect(task.status).toBe("IN_PROGRESS"); expect(task.resultUrls).toEqual([url]);
      expect(task.realisedCostUsd).toBe(0.07); expect(await counts(f.strategy.id)).toEqual([0, 0, 0]);
    });
    vi.spyOn(getProvider("openai"), "reconcile").mockRejectedValue(new Error("provider must not be called again"));
    const result = await reconcileTask(f.task.id, null);
    expect(result.assetVersionIds).toHaveLength(1); expect(await counts(f.strategy.id)).toEqual([1, 1, 1]);
  });

  it("serializes repeated callbacks and reports stable ids and the actual cost exactly once", async () => {
    const f = await fixture({ resultUrls: [url], realisedCostUsd: 0.07 });
    const before = await db.forgeProviderHealth.findUnique({ where: { provider: "openai" } });
    const results = await Promise.all(Array.from({ length: 6 }, () => reconcileTask(f.task.id, null)));
    expect(new Set(results.map((r) => JSON.stringify(r.assetVersionIds))).size).toBe(1);
    expect(results[0]!.assetVersionIds).toHaveLength(1); expect(await counts(f.strategy.id)).toEqual([1, 1, 1]);
    const cost = await db.aICostLog.findFirstOrThrow({ where: { strategyId: f.strategy.id } });
    expect(cost).toMatchObject({ provider: "openai", cost: 0.07, context: `ptah:image:${f.task.id}` });
    const after = await db.forgeProviderHealth.findUniqueOrThrow({ where: { provider: "openai" } });
    expect(after.totalCostUsd - (before?.totalCostUsd ?? 0)).toBeCloseTo(0.07);
  });

  it("repairs a legacy terminal task without resurrecting an archived material", async () => {
    const f = await fixture({ status: "COMPLETED", resultUrls: [url, url + "?second"], realisedCostUsd: 0.07, completedAt: new Date() });
    const version = await db.assetVersion.create({ data: { generativeTaskId: f.task.id, operatorId, strategyId: f.strategy.id, kind: "image", url, metadata: {} } });
    const archived = await db.brandAsset.create({ data: { strategyId: f.strategy.id, operatorId, name: "Archived", kind: "KV_VISUAL",
      family: "MATERIAL", format: "image", sourceAssetVersionId: version.id, sourceIntentId: f.task.intentId, fileUrl: url, state: "ARCHIVED" } });
    const result = await reconcileTask(f.task.id, null);
    expect(result.assetVersionIds).toContain(version.id); expect(result.assetVersionIds).toHaveLength(2);
    expect(await counts(f.strategy.id)).toEqual([2, 2, 1]);
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: archived.id } })).state).toBe("ARCHIVED");
  });

  it.each([[], ["javascript:alert(1)"], [url, url]].map((resultUrls) => ({ resultUrls })))("refuses invalid or ambiguous provider URLs $resultUrls", async ({ resultUrls }) => {
    const f = await fixture();
    vi.spyOn(getProvider("openai"), "reconcile").mockResolvedValue({ resultUrls, realisedCostUsd: 0.07, completedAt: new Date() });
    await expect(reconcileTask(f.task.id, null)).rejects.toThrow();
    expect((await db.generativeTask.findUniqueOrThrow({ where: { id: f.task.id } })).status).not.toBe("COMPLETED");
    expect(await counts(f.strategy.id)).toEqual([0, 0, 0]);
  });

  it("refuses a cross-brand command before contacting the provider", async () => {
    const f = await fixture(), other = await fixture();
    const provider = vi.spyOn(getProvider("openai"), "reconcile");
    const result = await execute({ kind: "PTAH_RECONCILE_TASK", strategyId: other.strategy.id, taskId: f.task.id, webhookPayload: null });
    expect(result.status).toBe("FAILED"); expect(provider).not.toHaveBeenCalled();
    expect(await counts(f.strategy.id)).toEqual([0, 0, 0]);
  });

  it("refuses a forged task operator", async () => {
    const f = await fixture({ operatorId: operators[1] });
    await expect(reconcileTask(f.task.id, null)).rejects.toThrow(); expect(await counts(f.strategy.id)).toEqual([0, 0, 0]);
  });

  it("routes an authenticated callback through the existing emission spine", async () => {
    const f = await fixture({ resultUrls: [url], realisedCostUsd: 0.07 });
    const request = (secret: string, body = "{}") => new Request(`http://localhost/api/ptah/webhook?taskId=${f.task.id}&secret=${secret}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body });
    expect((await POST(request("wrong"))).status).toBe(403);
    expect((await POST(request(f.task.webhookSecret, "{"))).status).toBe(400);
    const response = await POST(request(f.task.webhookSecret));
    const body = await response.json();
    expect(response.status, JSON.stringify(body)).toBe(200); expect(body.assetVersionIds).toHaveLength(1);
    const emissions = await db.intentEmission.findMany({ where: { strategyId: f.strategy.id, intentKind: "PTAH_RECONCILE_TASK" } });
    expect(emissions).toHaveLength(1); expect(emissions[0]).toMatchObject({ status: "OK", caller: "webhook:ptah" });
  });
  it("rolls back the first admitted file when the second file fails", async () => {
    const second = url + "?second";
    const f = await fixture({ resultUrls: [url, second], realisedCostUsd: 0.07 });
    await fault("BrandAsset", `"strategyId" <> '${f.strategy.id}' OR "fileUrl" <> '${second}'`, async () => {
      await expect(reconcileTask(f.task.id, null)).rejects.toThrow();
      expect(await counts(f.strategy.id)).toEqual([0, 0, 0]);
    });
    expect((await reconcileTask(f.task.id, null)).assetVersionIds).toHaveLength(2);
    expect(await counts(f.strategy.id)).toEqual([2, 2, 1]);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("refuses an invalid reported cost %s", async (realisedCostUsd) => {
    const f = await fixture();
    vi.spyOn(getProvider("openai"), "reconcile").mockResolvedValue({ resultUrls: [url], realisedCostUsd, completedAt: new Date() });
    await expect(reconcileTask(f.task.id, null)).rejects.toThrow(); expect(await counts(f.strategy.id)).toEqual([0, 0, 0]);
  });

  it.each(["campaign", "brief", "source"])("refuses a foreign %s reference", async (field) => {
    const f = await fixture({ resultUrls: [url], realisedCostUsd: 0.07 }), other = await fixture();
    const campaign = await db.campaign.create({ data: { strategyId: other.strategy.id, name: "Foreign" } });
    const brief = await db.campaignBrief.create({ data: { campaignId: campaign.id, title: "Foreign", content: {} } });
    const source = await db.brandAsset.create({ data: { strategyId: other.strategy.id, operatorId, name: "Foreign", kind: "CREATIVE_BRIEF" } });
    await db.generativeTask.update({ where: { id: f.task.id }, data: field === "campaign" ? { campaignId: campaign.id }
      : field === "brief" ? { briefId: brief.id } : { sourceBrandAssetId: source.id } });
    await expect(reconcileTask(f.task.id, null)).rejects.toThrow(); expect(await counts(f.strategy.id)).toEqual([0, 0, 0]);
  });

  it.each(["VETOED", "EXPIRED"])("does not admit a %s task", async (status) => {
    const f = await fixture({ status, resultUrls: [url], realisedCostUsd: 0.07 });
    await expect(reconcileTask(f.task.id, null)).rejects.toThrow(); expect(await counts(f.strategy.id)).toEqual([0, 0, 0]);
  });

  it("accepts the existing OpenAI embedded-image result without fetching it", async () => {
    const f = await fixture({ providerTaskId: "data:image/png;base64,aGVsbG8=" });
    const result = await reconcileTask(f.task.id, null);
    expect(result.assetVersionIds).toHaveLength(1); expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("refuses ambiguous pre-existing versions rather than guessing which one to retain", async () => {
    const f = await fixture({ resultUrls: [url], realisedCostUsd: 0.07 });
    await db.assetVersion.createMany({ data: Array.from({ length: 2 }, () => ({ generativeTaskId: f.task.id,
      operatorId, strategyId: f.strategy.id, kind: "image", url, metadata: {} })) });
    await expect(reconcileTask(f.task.id, null)).rejects.toThrow("PTAH_VERSION_CONFLICT");
    expect(await counts(f.strategy.id)).toEqual([2, 0, 0]);
  });

  it("corrects the legacy zero-token cost receipt from its persisted provider result", async () => {
    const f = await fixture({ status: "COMPLETED", resultUrls: [url], realisedCostUsd: 0.07, completedAt: new Date() });
    const log = await db.aICostLog.create({ data: { model: f.task.providerModel, provider: "anthropic", inputTokens: 0,
      outputTokens: 0, cost: 0, context: `ptah:image:${f.task.id}`, strategyId: f.strategy.id } });
    await reconcileTask(f.task.id, null); await reconcileTask(f.task.id, null);
    expect(await counts(f.strategy.id)).toEqual([1, 1, 1]);
    expect(await db.aICostLog.findUniqueOrThrow({ where: { id: log.id } })).toMatchObject({ provider: "openai", cost: 0.07 });
  });

  it("keeps the campaign, brief and upstream material lineage", async () => {
    const f = await fixture({ resultUrls: [url], realisedCostUsd: 0.07 });
    const campaign = await db.campaign.create({ data: { strategyId: f.strategy.id, name: "Synthetic" } });
    const brief = await db.campaignBrief.create({ data: { campaignId: campaign.id, title: "Synthetic", content: {} } });
    const source = await db.brandAsset.create({ data: { strategyId: f.strategy.id, operatorId, name: "Source", kind: "CREATIVE_BRIEF",
      campaignId: campaign.id, briefId: brief.id } });
    await db.generativeTask.update({ where: { id: f.task.id }, data: { campaignId: campaign.id, briefId: brief.id, sourceBrandAssetId: source.id } });
    const result = await reconcileTask(f.task.id, null);
    expect(await db.brandAsset.findFirstOrThrow({ where: { sourceAssetVersionId: result.assetVersionIds[0] } })).toMatchObject({
      strategyId: f.strategy.id, operatorId, campaignId: campaign.id, briefId: brief.id,
      sourceIntentId: f.task.intentId, metadata: expect.objectContaining({ sourceBrandAssetId: source.id }) });
  });

  it("returns failure and traces it when callback admission fails", async () => {
    const f = await fixture({ resultUrls: [url], realisedCostUsd: 0.07 });
    await fault("BrandAsset", `"strategyId" <> '${f.strategy.id}'`, async () => {
      const response = await POST(new Request(`http://localhost/api/ptah/webhook?taskId=${f.task.id}&secret=${f.task.webhookSecret}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }));
      expect(response.status).toBe(500); expect(await response.json()).toMatchObject({ ok: false });
      expect(await counts(f.strategy.id)).toEqual([0, 0, 0]);
      expect(await db.intentEmission.findFirstOrThrow({ where: { strategyId: f.strategy.id } })).toMatchObject({ status: "FAILED" });
    });
  });

});
