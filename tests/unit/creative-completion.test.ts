import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
vi.mock("@/lib/db", () => ({ db: {} }));
import { collectCreativeSourceSchema } from "@/domain/creative-sources";
import { annotationSchema, type Observation } from "@/domain/creative-intelligence";
import { conditionalPerformance, patternTrajectory } from "@/domain/creative-models";
import { mapMetaLibrary, mapTikTokCommercial, mapTikTokResearch, mapReddit, mapX, mapInstagramDiscovery, mapLinkedIn, mapBrandwatch } from "@/server/services/seshat/creative-intelligence/additional-sources";
import { fetchCreativeSource } from "@/server/services/seshat/creative-intelligence/source-adapters";
import { mediaStoreConfiguration, putEncryptedMedia, getEncryptedMedia, deleteEncryptedMedia, decryptMedia, type MediaStore } from "@/lib/encrypted-media-store";
import { annotationFitsCoverage } from "@/server/services/seshat/creative-intelligence/media-observations";
import { callNativeVideo, videoConfiguration, validateGatewayVideo } from "@/server/services/llm-gateway/audiovisual";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const input = collectCreativeSourceSchema.parse({ provider: "X", account: "42", sector: "food", countryCode: "CI" });
const at = new Date("2026-10-06T12:00:00Z");
const annotation = annotationSchema.parse({ hook: "RESULT_FIRST", narrative: "TRANSFORMATION", visual: "MACRO", socialDriver: "UTILITY", evidence: ["hook", "narrative", "visual", "socialDriver"].map(field => ({ field, observation: "Documented controlled observation", confidence: "HIGH" })) });

describe("official creative source contracts", () => {
  it("never stores a token-bearing Meta snapshot URL or invented ad views", () => {
    const [row] = mapMetaLibrary({ data: [{ id: "ad1", page_id: "42", ad_delivery_start_time: "2026-10-01", ad_snapshot_url: "https://facebook.com/render?access_token=secret", ad_creative_bodies: ["Ad text"] }] }, input);
    expect(row!.specimen.sourceUrl).toBe("https://www.facebook.com/ads/library/?id=ad1");
    expect(row!.measurement).toBeUndefined(); expect(JSON.stringify(row)).not.toContain("secret");
  });
  it("reads TikTok counts without claiming organic exposure or thumbnail video", () => {
    const [row] = mapTikTokResearch({ error: { code: "ok" }, data: { videos: [{ id: "1234567890123456789", username: "creator", create_time: 1790812800, view_count: 0, like_count: 7 }] } }, { ...input, account: "creator" }, at);
    expect(row!.measurement).toMatchObject({ views: 0, likes: 7, paidStatus: "UNKNOWN" });
    expect(row!.specimen.format).toBe("VIDEO_UNCLASSIFIED"); expect(row!.specimen.mediaUrl).toBeUndefined();
    expect(() => mapTikTokResearch({ error: { code: "access_token_invalid" }, data: {} }, input, at)).toThrow("AUTH_REVOKED");
  });
  it("reads commercial TikTok links, never cover images as observed videos", () => {
    const [row] = mapTikTokCommercial({ error: { code: "ok" }, data: { commercial_contents: [{ id: "v123", create_timestamp: 1790812800, creator: { username: "creator" }, videos: [{ url: "https://www.tiktok.com/@creator/video/123", cover_image_url: "https://example.test/cover.jpg" }] }] } }, { ...input, account: "creator" });
    expect(row!.specimen.mediaUrl).toBeUndefined(); expect(row!.measurement).toBeUndefined();
  });
  it("does not relabel Reddit vote score as likes and rejects another author", () => {
    const p = { name: "t3_post", author: "author", author_fullname: "t2_author", title: "Observed post", created_utc: 1790812800, permalink: "/r/food/comments/abc/", score: -20, num_comments: 0 };
    const rows = mapReddit({ data: { children: [{ data: p }, { data: { ...p, author: "someone" } }] } }, { ...input, account: "author" }, at);
    expect(rows).toHaveLength(1); expect(rows[0]!.measurement).toMatchObject({ comments: 0 }); expect(rows[0]!.measurement?.likes).toBeUndefined();
  });
  it("keeps native X author identity and excludes impressions from views", () => {
    const [row] = mapX({ data: [{ id: "1", author_id: "42", text: "Post", created_at: "2026-10-01", public_metrics: { like_count: 2, impression_count: 5000 } }] }, input, at);
    expect(row!.specimen.accountId).toBe("x:42"); expect(row!.measurement?.views).toBeUndefined();
  });
  it("uses Instagram native IDs without classifying all videos as Reels", () => {
    const [row] = mapInstagramDiscovery({ business_discovery: { id: "ig42", username: "creator", media: { data: [{ id: "post", media_type: "VIDEO", permalink: "https://www.instagram.com/p/post/", timestamp: "2026-10-01", comments_count: 0 }] } } }, { ...input, account: "creator" }, at);
    expect(row!.specimen).toMatchObject({ accountId: "ig42", format: "VIDEO_UNCLASSIFIED" });
  });
  it("does not import unpublished LinkedIn drafts or unknown publication dates", () => {
    const p = { id: "urn:li:share:12", author: "urn:li:organization:42", commentary: "Published", publishedAt: 1790812800000, lifecycleState: "PUBLISHED" };
    expect(mapLinkedIn({ elements: [p, { ...p, lifecycleState: "DRAFT" }, { ...p, publishedAt: undefined }] }, { ...input, account: p.author })).toHaveLength(1);
  });
  it("does not mistake Brandwatch default counters or estimates for observed metrics", () => {
    const [row] = mapBrandwatch({ results: [{ resourceId: "reference", url: "https://example.test/article", date: "2026-10-01", snippet: "Real mention", impressions: 1000, instagramLikeCount: 0 }] }, input);
    expect(row!.measurement).toBeUndefined();
  });
  it.each(["META_AD_LIBRARY", "INSTAGRAM_DISCOVERY", "TIKTOK_RESEARCH", "TIKTOK_COMMERCIAL", "REDDIT", "X", "LINKEDIN", "BRANDWATCH", "APIFY"] as const)("keeps %s unavailable without credentials, without a vendor request", async provider => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await fetchCreativeSource({ ...input, provider })).state).toBe("DEFERRED_AWAITING_CREDENTIALS"); expect(fetch).not.toHaveBeenCalled();
  });
  it("requires explicit Meta API version before a token can be transmitted", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await fetchCreativeSource({ ...input, provider: "META_AD_LIBRARY" }, { apiKey: "fixture" })).toMatchObject({ state: "DEGRADED", reason: "MISSING_PREREQUISITE" }); expect(fetch).not.toHaveBeenCalled();
  });
});

describe("durable encrypted media", () => {
  it("round-trips actual bytes, detects tampering and scope substitution, removes the physical file", async () => {
    const root = await mkdtemp(join(tmpdir(), "creative-store-test-"));
    try {
      const store: MediaStore = { kind: "VOLUME", key: Buffer.alloc(32, 8), keyId: "test", backendId: "fixture", root };
      const key = "a".repeat(64), clear = Buffer.from("Authorized fixture media bytes");
      await putEncryptedMedia(store, key, clear);
      const encrypted = await readFile(join(root, `${key}.enc`)); expect(encrypted.includes(clear)).toBe(false);
      expect(await getEncryptedMedia(store, key)).toEqual(clear);
      expect(() => decryptMedia(encrypted, store, "b".repeat(64))).toThrow();
      encrypted[encrypted.length - 1] = encrypted.at(-1)! ^ 1; expect(() => decryptMedia(encrypted, store, key)).toThrow();
      await deleteEncryptedMedia(store, key); await expect(readFile(join(root, `${key}.enc`))).rejects.toMatchObject({ code: "ENOENT" });
      await deleteEncryptedMedia(store, key);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it("requires a real key and changes backend identity when the volume moves", () => {
    vi.stubEnv("CREATIVE_MEDIA_ENCRYPTION_KEY", ""); expect(mediaStoreConfiguration()).toBeNull();
    vi.stubEnv("CREATIVE_MEDIA_ENCRYPTION_KEY", "a".repeat(64)); vi.stubEnv("CREATIVE_MEDIA_ARCHIVE_DIR", "/tmp/first"); const first = mediaStoreConfiguration();
    vi.stubEnv("CREATIVE_MEDIA_ARCHIVE_DIR", "/tmp/second"); expect(first?.backendId).not.toBe(mediaStoreConfiguration()?.backendId);
  });
});

describe("native audiovisual observation", () => {
  const bytes = Buffer.concat([Buffer.from([0, 0, 0, 16]), Buffer.from("ftypisom0000")]);
  const video = { bytes, mediaType: "video/mp4" as const, durationSeconds: 4, hasAudio: true };
  it("sends actual MP4 bytes and forbids redirects or text fallback", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "fixture");
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "{}" }, finish_reason: "stop" }], usage: { prompt_tokens: 9, completion_tokens: 2 } }))); vi.stubGlobal("fetch", fetch);
    const result = await callNativeVideo({ system: "Observe", prompt: "Data", caller: "test" }, video, "google/gemini-fixture");
    expect(result.usage.inputTokens).toBe(9);
    const [url, init] = fetch.mock.calls[0]!; expect(url).toBe("https://openrouter.ai/api/v1/chat/completions"); expect(init.redirect).toBe("error");
    expect(JSON.parse(init.body).messages[1].content[1].video_url.url).toBe(`data:video/mp4;base64,${bytes.toString("base64")}`);
  });
  it("rejects unsupported configuration, oversized media and audio invented over a silent track", () => {
    vi.stubEnv("LLM_VIDEO_PROVIDER", "none"); expect(videoConfiguration()).toBeNull();
    expect(() => validateGatewayVideo({ ...video, durationSeconds: 301 })).toThrow();
    expect(annotationFitsCoverage({ ...annotation, durationSeconds: 4, transcript: [{ text: "invented" }] }, { method: "NATIVE_VIDEO", durationSeconds: 4, audioObserved: false })).toBe(false);
    expect(annotationFitsCoverage({ ...annotation, transcript: [{ text: "invented" }] }, { method: "SINGLE_IMAGE" })).toBe(false);
    expect(annotationFitsCoverage({ ...annotation, durationSeconds: 4, evidence: [{ startSeconds: 5 }] }, { method: "NATIVE_VIDEO", durationSeconds: 4, audioObserved: true })).toBe(false);
  });
});

describe("prediction and diffusion evidence", () => {
  const make = (a: string, n: number, value: number, date = new Date(Date.UTC(2026, 0, n))) : Observation => ({ specimenId: `${a}:${n}`, externalId: String(n), accountId: a, platform: "YOUTUBE", format: "LONG_VIDEO", sector: "food", countryCode: "CI", publishedAt: date, observedAt: new Date(+date + 86400000), value, paidStatus: "ORGANIC", metricId: `${a}:${n}:metric`, annotation });
  it("abstains without comparable history and when advertising status is unknown", () => {
    expect(conditionalPerformance(make("target", 9, 500), []).state).toBe("INSUFFICIENT_DATA");
    expect(conditionalPerformance({ ...make("target", 9, 500), paidStatus: "UNKNOWN" }, []).reason).toBe("UNMEASURED_OR_PAID_UNKNOWN");
  });
  it("never admits the target account or future observations into trained/validation samples", () => {
    const corpus = Array.from({ length: 12 }, (_, a) => Array.from({ length: 50 }, (_, i) => make(`a${a}`, i + 1, Math.round((1000 + a * 500) * 1.035 ** i)))).flat();
    const own = Array.from({ length: 30 }, (_, i) => make("target", i + 35, 2000 + i * 100));
    const target = make("target", 70, 5000), future = make("future", 90, 1e10);
    const result = conditionalPerformance(target, [...corpus, ...own, future]);
    expect(result.state).toBe("CALIBRATED");
    if (result.state === "CALIBRATED") {
      expect(result.trainingMetricIds.concat(result.validationMetricIds).some(id => id.startsWith("target:") || id.startsWith("future:"))).toBe(false);
      const trainedAccounts = new Set(corpus.filter(o => result.trainingMetricIds.includes(o.metricId)).map(o => o.accountId));
      expect(corpus.filter(o => result.validationMetricIds.includes(o.metricId)).every(o => !trainedAccounts.has(o.accountId))).toBe(true);
      expect(result.validation!.modelMaeLog).toBeLessThan(result.validation!.baselineMaeLog);
      expect(result.interval!.low).toBeLessThanOrEqual(result.expected!);
    }
  });
  it("reports missing annotations and refuses a trend created by changing sampled accounts", () => {
    const rows = Array.from({ length: 3 }, (_, week) => Array.from({ length: 12 }, (_, i) => ({ ...make(`week${week}-account${i % 3}`, i, 100, new Date(+at - (20 - week * 7) * 86400000)), ...(i === 0 ? { annotation: undefined } : {}) }))).flat();
    const result = patternTrajectory(rows, annotation, at);
    expect(result.series[0]!.state).toBe("INSUFFICIENT_DATA");
    expect(result.series[0]!.periods.some(p => p.observed > p.annotated)).toBe(true);
    expect(result.limitation).toContain("saturation du marché non établies");
  });
});
