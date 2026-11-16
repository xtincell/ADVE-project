import crypto from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const persistence = vi.hoisted(() => ({ drivers: vi.fn(), signal: vi.fn(), capture: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { driver: { findMany: persistence.drivers }, signal: { create: persistence.signal } } }));
vi.mock("@/server/services/knowledge-capture", () => ({ captureEvent: persistence.capture }));
vi.mock("@/server/services/feedback-loop", () => ({}));
// Use the actual input parser and mutation handler. Authorization and the
// governance spine are covered independently; only those boundaries are stubbed.
vi.mock("@/server/trpc/init", async () => {
  const { initTRPC } = await import("@trpc/server");
  const t = initTRPC.context().create();
  return { createTRPCRouter: t.router, protectedProcedure: t.procedure };
});
vi.mock("@/server/governance/governed-procedure", async () => {
  const { protectedProcedure } = await import("@/server/trpc/init");
  return { governedProcedure: ({ inputSchema }: { inputSchema: Parameters<typeof protectedProcedure.input>[0] }) => protectedProcedure.input(inputSchema) };
});
import { socialRouter } from "@/server/trpc/routers/social";

const secret = "local-webhook-fixture-key";
let postWebhook: typeof import("@/app/api/webhooks/social/route").POST;
beforeAll(async () => {
  vi.stubEnv("WEBHOOK_SECRET_SOCIAL", secret);
  postWebhook = (await import("@/app/api/webhooks/social/route")).POST;
});
afterAll(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.clearAllMocks();
  persistence.drivers.mockResolvedValue([{ id: "driver", strategyId: "brand", constraints: { socialConnection: { accountId: "account" } } }]);
  persistence.signal.mockImplementation(async ({ data }) => ({ id: "signal", ...data }));
  persistence.capture.mockResolvedValue(undefined);
});
const caller = () => socialRouter.createCaller({ db: { signal: { create: persistence.signal } }, session: { user: { id: "operator" } } } as never);
const input = { strategyId: "brand", platform: "FACEBOOK", postId: "post" };
const stored = () => persistence.signal.mock.calls.at(-1)![0].data.data;
function webhook(data: unknown, options: { platform?: string; event?: string; validSignature?: boolean } = {}) {
  const raw = JSON.stringify({ platform: options.platform ?? "facebook", event: options.event ?? "metrics_update", accountId: "account", postId: "post", data });
  const signature = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return new Request("https://example.test/api/webhooks/social", {
    method: "POST", body: raw,
    headers: { "x-hub-signature-256": `sha256=${options.validSignature === false ? "0".repeat(64) : signature}` },
  });
}

describe("declared social metrics", () => {
  it("does not manufacture zeroes when all optional values are absent", async () => {
    await caller().ingestMetrics({ ...input, metrics: {} });
    expect(stored()).toMatchObject({ measurementVersion: 1, measurementSource: "DECLARED", observedMetricKeys: [], engagementRate: null });
    for (const metric of ["engagement", "clicks", "reach", "likes", "comments", "shares", "saves", "impressions"]) expect(stored()).not.toHaveProperty(metric);
  });
  it("keeps explicit zeroes and builds the receipt itself", async () => {
    await caller().ingestMetrics({ ...input, metrics: { engagement: 0, clicks: 0, reach: 100, measurementSource: "SIGNED_WEBHOOK", observedMetricKeys: ["likes"] } as never });
    expect(stored()).toMatchObject({ engagement: 0, clicks: 0, reach: 100, engagementRate: 0, measurementSource: "DECLARED" });
    expect(stored().observedMetricKeys.sort()).toEqual(["clicks", "engagement", "reach"]);
    expect(stored()).not.toHaveProperty("likes");
  });
  it.each([-1, Number.POSITIVE_INFINITY, "0", null])("rejects invalid declared metrics (%s)", async value => {
    await expect(caller().ingestMetrics({ ...input, metrics: { clicks: value } as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(persistence.signal).not.toHaveBeenCalled();
  });
  it("does not invent an engagement rate without its numerator or denominator", async () => {
    await caller().ingestMetrics({ ...input, metrics: { reach: 100 } });
    expect(stored().engagementRate).toBeNull();
    await caller().ingestMetrics({ ...input, metrics: { engagement: 0, reach: 0 } });
    expect(stored().engagementRate).toBeNull();
  });
});

describe("signed social webhook metrics", () => {
  it.each(["facebook", "instagram", "tiktok", "youtube", "twitter", "linkedin"])("keeps missing %s metrics absent", async platform => {
    const response = await postWebhook(webhook({}, { platform }));
    expect(response.status).toBe(200);
    expect(stored()).toMatchObject({ measurementVersion: 1, measurementSource: "SIGNED_WEBHOOK", observedMetricKeys: [] });
    expect(stored()).not.toHaveProperty("clicks");
    expect(stored()).not.toHaveProperty("likes");
    expect(await response.json()).toEqual({ received: true });
  });
  it("retains actual zeroes and positive values, filtering malformed values and forged receipt fields", async () => {
    await postWebhook(webhook({ clicks: 0, likes: 8, reach: -1, impressions: "0", shares: null,
      measurementVersion: 1, measurementSource: "DECLARED", observedMetricKeys: ["reach", "impressions"] }));
    expect(stored()).toMatchObject({ clicks: 0, likes: 8, measurementSource: "SIGNED_WEBHOOK" });
    expect(stored().observedMetricKeys.sort()).toEqual(["clicks", "likes"]);
    for (const key of ["reach", "impressions", "shares"]) expect(stored()).not.toHaveProperty(key);
  });
  it("does not turn a comment event into a zero metric observation", async () => {
    await postWebhook(webhook({ content: "Bonjour", author: "public-handle" }, { event: "comment" }));
    expect(stored()).toMatchObject({ observedMetricKeys: [], engagementType: "comment", content: "Bonjour" });
    expect(stored()).not.toHaveProperty("comments");
  });
  it("keeps the signature boundary before any lookup or write", async () => {
    const response = await postWebhook(webhook({ clicks: 0 }, { validSignature: false }));
    expect(response.status).toBe(401);
    expect(persistence.drivers).not.toHaveBeenCalled();
    expect(persistence.signal).not.toHaveBeenCalled();
  });
  it.each([null, [], "invalid"])("rejects a malformed metric object (%s) without writes", async data => {
    const response = await postWebhook(webhook(data));
    expect(response.status).toBe(400);
    expect(persistence.signal).not.toHaveBeenCalled();
  });
});
