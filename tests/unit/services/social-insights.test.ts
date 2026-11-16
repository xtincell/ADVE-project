import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connections: vi.fn(), posts: vi.fn(), update: vi.fn(), decrypt: vi.fn(),
  openEmission: vi.fn(), closeEmission: vi.fn(), capture: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  socialConnection: { findMany: mocks.connections },
  socialPost: { findMany: mocks.posts, update: mocks.update },
} }));
vi.mock("@/server/services/oauth-integrations", () => ({ decryptTokenPayload: mocks.decrypt }));
vi.mock("@/server/governance/emission-spine", () => ({ openEmission: mocks.openEmission, closeEmission: mocks.closeEmission }));
vi.mock("@/server/services/seshat/creative-intelligence", () => ({ captureNativeInsights: mocks.capture }));

import { enrichRecentPostInsights } from "@/server/services/anubis/social-insights";

const connection = (platform = "INSTAGRAM", provider = "instagram", scopes = ["instagram_business_basic", "instagram_business_manage_insights"]) => ({
  id: "connection-1", platform, accessToken: "encrypted-test-token", metadata: { provider, scopes },
});
const metric = (name: string, value: unknown) => ({ name, values: [{ value }] });
const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.connections.mockResolvedValue([connection()]);
  mocks.posts.mockResolvedValue([{ id: "post-1", externalPostId: "media-1", insights: null }]);
  mocks.decrypt.mockReturnValue({ access_token: "test-token" });
  mocks.update.mockResolvedValue({});
  mocks.openEmission.mockResolvedValue("emission-1");
  mocks.capture.mockResolvedValue({ captured: true });
});
afterEach(() => vi.unstubAllGlobals());

describe("social insights — provider, permission and observed values", () => {
  it.each([
    ["INSTAGRAM", "instagram", "instagram_business_manage_insights", "graph.instagram.com", "reach"],
    ["INSTAGRAM", "meta", "instagram_manage_insights", "graph.facebook.com", "reach"],
    ["FACEBOOK", "meta", "read_insights", "graph.facebook.com", "post_impressions_unique"],
  ])("routes %s/%s with its granted permission", async (platform, provider, permission, host, reachMetric) => {
    mocks.connections.mockResolvedValue([connection(platform, provider, [permission])]);
    const fetch = vi.fn().mockResolvedValue(response(200, { data: [metric(reachMetric, 42)] }));
    vi.stubGlobal("fetch", fetch);
    const result = await enrichRecentPostInsights("brand-1");
    expect(result).toMatchObject({ state: "LIVE", data: [{ platform, postsMeasured: 1 }] });
    const request = new URL(fetch.mock.calls[0]![0]);
    expect(request.hostname).toBe(host);
    expect(request.pathname).toBe(provider === "instagram" ? "/media-1/insights" : "/v21.0/media-1/insights");
    expect(request.searchParams.get("access_token")).toBe("test-token");
    expect(mocks.posts).toHaveBeenCalledWith(expect.objectContaining({ where: { connectionId: "connection-1" } }));
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "post-1" }, data: { insights: { [reachMetric]: 42 }, reach: 42 } });
  });

  it.each([{ scopes: [] }, { scopes: ["instagram_business_basic"] }, { scopes: ["instagram_manage_insights"] }])("does not send an Instagram token without the direct-login insights scope: $scopes", async ({ scopes }) => {
    mocks.connections.mockResolvedValue([connection("INSTAGRAM", "instagram", scopes)]);
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await enrichRecentPostInsights("brand-1")).toEqual({ state: "DEGRADED", reason: "INSUFFICIENT_DATA" });
    expect(fetch).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });

  it("persists a measured zero and propagates the same measurement", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(200, { data: [metric("reach", 0), metric("saved", 0)] })));
    expect(await enrichRecentPostInsights("brand-1")).toMatchObject({ state: "LIVE" });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "post-1" }, data: { insights: { reach: 0, saved: 0 }, reach: 0 } });
    expect(mocks.capture).toHaveBeenCalledWith("brand-1", "post-1", { reach: 0, saved: 0 }, expect.any(Date));
  });

  it.each([{ data: [] }, { data: [metric("reach", null)] }, { data: [metric("reach", "0")] }, { data: [null] }, { data: {} }])("leaves absent or malformed measurements untouched: %j", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(200, body)));
    expect(await enrichRecentPostInsights("brand-1")).toEqual({ state: "DEGRADED", reason: "INSUFFICIENT_DATA" });
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.capture).not.toHaveBeenCalled();
  });

  it("does not replace reach when only another metric is observed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(200, { data: [metric("saved", 2)] })));
    await enrichRecentPostInsights("brand-1");
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "post-1" }, data: { insights: { saved: 2 } } });
  });

  it.each([[401, "AUTH_REVOKED"], [403, "AUTH_REVOKED"], [503, "VENDOR_OUTAGE"], [429, "RATE_LIMITED"]])("reports HTTP %i instead of LIVE with zero posts", async (status, reason) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(status as number, { error: {} })));
    expect(await enrichRecentPostInsights("brand-1")).toEqual({ state: "DEGRADED", reason });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("reports a revoked Graph token returned with HTTP 400", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(400, { error: { code: 190 } })));
    expect(await enrichRecentPostInsights("brand-1")).toEqual({ state: "DEGRADED", reason: "AUTH_REVOKED" });
  });

  it("reports a timeout without replacing stored measurements", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(await enrichRecentPostInsights("brand-1")).toEqual({ state: "DEGRADED", reason: "VENDOR_OUTAGE" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each(["", "   "])("refuses an empty decrypted token before the network call", async (access_token) => {
    mocks.decrypt.mockReturnValue({ access_token });
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await enrichRecentPostInsights("brand-1")).toEqual({ state: "DEGRADED", reason: "AUTH_REVOKED" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps received data but reports a subsequent partial outage", async () => {
    mocks.posts.mockResolvedValue([{ id: "post-1", externalPostId: "media-1" }, { id: "post-2", externalPostId: "media-2" }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(200, { data: [metric("reach", 12)] })).mockResolvedValueOnce(response(503, {})));
    expect(await enrichRecentPostInsights("brand-1")).toEqual({ state: "DEGRADED", reason: "VENDOR_OUTAGE" });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "post-1" } }));
  });
});
