import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { collectCreativeSourceSchema, creativeExportSchema } from "@/domain/creative-sources";
import { fetchCreativeSource, mapBluesky, mapYouTube, mapForeplay, readBoundedJson } from "@/server/services/seshat/creative-intelligence/source-adapters";

const observedAt = new Date("2026-10-06T12:00:00Z");
const input = collectCreativeSourceSchema.parse({ provider: "BLUESKY", account: "sample.bsky.social", sector: "food", countryCode: "CI" });
const post = { uri: "at://did:plc:sample/app.bsky.feed.post/abc", author: { did: "did:plc:sample", handle: input.account }, record: { text: "A real post", createdAt: "2026-10-05T12:00:00Z" }, likeCount: 0, replyCount: 2, repostCount: 3 };
afterEach(() => vi.unstubAllGlobals());
describe("creative source boundaries", () => {
  it("keeps zero observations, stable native IDs and unknown exposure; never manufactures views", () => {
    const [row] = mapBluesky({ feed: [{ post }] }, input, observedAt);
    expect(row!.specimen.accountId).toBe("did:plc:sample");
    expect(row!.measurement).toMatchObject({ likes: 0, comments: 2, shares: 3, paidStatus: "UNKNOWN", observedAt });
    expect(row!.measurement?.views).toBeUndefined();
    expect(row!.specimen.sourceUrl).toBe("https://bsky.app/profile/did%3Aplc%3Asample/post/abc");
  });
  it("does not credit reposts or foreign author posts to the watched account", () => {
    const rows = mapBluesky({ feed: [{ post, reason: { $type: "repost" } }, { post: { ...post, author: { did: "did:plc:foreign", handle: "foreign.bsky.social" } } }, { post }] }, input, observedAt);
    expect(rows).toHaveLength(1);
  });
  it("abstains when public counters are absent", () => {
    const { likeCount: _like, replyCount: _reply, repostCount: _repost, ...unmeasured } = post;
    expect(mapBluesky({ feed: [{ post: unmeasured }] }, input, observedAt)[0]!.measurement).toBeUndefined();
  });
  it("keeps YouTube video views distinct from followers and does not infer a Short", () => {
    const channel = "UCabcdefghijklmnopqrstuv";
    const [row] = mapYouTube({ items: [{ id: "abcdefghijk", snippet: { channelId: channel, title: "Video", publishedAt: "2026-10-05T12:00:00Z" }, statistics: { viewCount: "0" } }] }, { ...input, provider: "YOUTUBE" }, observedAt, channel, 123);
    expect(row!.measurement).toMatchObject({ views: 0, followersAtObservation: 123, paidStatus: "UNKNOWN" });
    expect(row!.measurement?.likes).toBeUndefined();
    expect(row!.specimen.format).toBe("VIDEO_UNCLASSIFIED");
  });
  it("rejects unsafe integer counters rather than silently rounding a performance", () => {
    expect(() => mapBluesky({ feed: [{ post: { ...post, likeCount: "9007199254740993" } }] }, input, observedAt)).toThrow();
  });
  it("archives Foreplay ads without inventing a native placement, views or winning status", () => {
    const [row] = mapForeplay({ metadata: { success: true }, data: [{ id: "library", ad_id: "ad", name: "Example", brand_id: "brand", started_running: 1791192000, video: "https://example.test/video.mp4", foreplay_url: "https://app.foreplay.co/ad/ad" }], error: null }, { ...input, provider: "FOREPLAY" });
    expect(row!.specimen).toMatchObject({ accountId: "foreplay:brand", externalId: "foreplay:ad", platform: "OTHER", format: "VIDEO_UNCLASSIFIED", source: "FOREPLAY_AD_ARCHIVE" });
    expect(row!.measurement).toBeUndefined();
  });
  it("rejects a vendor error envelope even when an ad array is present", () => {
    expect(() => mapForeplay({ metadata: { success: false }, data: [], error: { message: "secret" } }, input)).toThrow("VENDOR_OUTAGE");
  });
  it("does not call vendors without credentials", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await fetchCreativeSource({ ...input, provider: "YOUTUBE" })).toEqual({ state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: "youtube-data" });
    expect(await fetchCreativeSource({ ...input, provider: "FOREPLAY" })).toEqual({ state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: "foreplay" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([[429, "RATE_LIMITED"], [401, "AUTH_REVOKED"], [503, "VENDOR_OUTAGE"]])("maps HTTP %s without exposing vendor messages", async (status, reason) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret in vendor body", { status })));
    expect(await fetchCreativeSource(input)).toEqual({ state: "DEGRADED", reason });
  });
  it("sends a Foreplay bearer to a fixed origin and forbids redirect-following", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } })); vi.stubGlobal("fetch", fetch);
    expect(await fetchCreativeSource({ ...input, provider: "FOREPLAY" }, { apiKey: "fixture-secret" })).toEqual({ state: "DEGRADED", reason: "VENDOR_OUTAGE" });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url.origin).toBe("https://public.api.foreplay.co"); expect(init).toMatchObject({ redirect: "error", headers: { Authorization: "Bearer fixture-secret" } });
  });
  it("bounds bodies without trusting Content-Length", async () => {
    await expect(readBoundedJson(new Response(JSON.stringify({ value: "x".repeat(100) })), 20)).rejects.toThrow("VENDOR_OUTAGE");
  });
  it("rejects exports whose inner rows escape the declared brand", () => {
    const [row] = mapBluesky({ feed: [{ post }] }, input, observedAt);
    expect(creativeExportSchema.safeParse({ schemaVersion: "creative-source-export-v1", strategyId: "other-brand", items: [row] }).success).toBe(false);
  });
});
