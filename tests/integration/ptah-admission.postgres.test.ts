/** Real PostgreSQL admission; provider boundary only is synthetic, no paid call. */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { reconcileTask } from "@/server/services/ptah";
import { getProvider } from "@/server/services/ptah/providers";
import { execute } from "@/server/services/artemis/commandant";
import { POST } from "@/app/api/ptah/webhook/route";

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
async function fault(table: "BrandAsset" | "GenerativeTask", expression: string, run: () => Promise<void>) {
  const constraint = "fixture_forge_" + randomUUID().replaceAll("-", "");
  await db.$executeRawUnsafe(`ALTER TABLE "${table}" ADD CONSTRAINT ${constraint} CHECK (${expression}) NOT VALID`);
  try { await run(); } finally { await db.$executeRawUnsafe(`ALTER TABLE "${table}" DROP CONSTRAINT ${constraint}`); }
}

describe("Ptah result admission", () => {
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
