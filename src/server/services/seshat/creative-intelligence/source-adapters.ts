/** Bounded vendor reads. URLs are fixed; authentication never follows redirects. */
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ConnectorResult } from "@/domain/connector-result";
import { acquiredContentSchema, type AcquiredContent, type CreativeSourceInput, type CreativeCredentials, CREATIVE_SOURCE_CONNECTIONS } from "@/domain/creative-sources";

const count = z.union([z.string().regex(/^\d+$/), z.number().int().nonnegative()]).transform(Number).refine(Number.isSafeInteger);
const optionalCount = count.optional();
export { readBoundedJson, SourceReadError } from "./source-http";
import { readBoundedJson, SourceReadError } from "./source-http";
import { fetchAdditionalSource } from "./additional-sources";
async function jsonGet(url: URL, signal: AbortSignal, token?: string) {
  // These constructors use fixed vendor hosts; no user-supplied endpoint or query secret in errors.
  return readBoundedJson(await fetch(url, { signal, redirect: "error", headers: token ? { Authorization: `Bearer ${token}` } : undefined }));
}
const context = (input: CreativeSourceInput) => ({ strategyId: input.strategyId, visibility: input.strategyId ? "BRAND" as const : "PUBLIC" as const, sector: input.sector, countryCode: input.countryCode });
const measured = (observedAt: Date, source: string, sourceUrl: string) => ({ observedAt, source, sourceUrl, paidStatus: "UNKNOWN" as const });

const blueskySchema = z.object({ feed: z.array(z.object({
  reason: z.unknown().optional(), post: z.object({
    uri: z.string().regex(/^at:\/\/did:[^/]+\/app\.bsky\.feed\.post\/[^/]+$/),
    author: z.object({ did: z.string().min(1), handle: z.string().min(1) }),
    record: z.object({ text: z.string(), createdAt: z.iso.datetime({ offset: true }) }),
    likeCount: optionalCount, replyCount: optionalCount, repostCount: optionalCount,
    embed: z.object({ $type: z.string() }).optional(),
  }),
})).max(100) });
export function mapBluesky(payload: unknown, input: CreativeSourceInput, observedAt: Date): AcquiredContent[] {
  return blueskySchema.parse(payload).feed.filter(e => !e.reason && [e.post.author.did, e.post.author.handle].includes(input.account)).slice(0, input.limit).map(({ post: p }) => {
    const sourceUrl = `https://bsky.app/profile/${encodeURIComponent(p.author.did)}/post/${encodeURIComponent(p.uri.split("/").at(-1)!)}`;
    const format = p.embed?.$type === "app.bsky.embed.video#view" ? "SHORT_VIDEO" : p.embed?.$type === "app.bsky.embed.images#view" ? "IMAGE" : "TEXT";
    const metrics = { likes: p.likeCount, comments: p.replyCount, shares: p.repostCount };
    return acquiredContentSchema.parse({ specimen: { ...context(input), platform: "OTHER", accountId: p.author.did, externalId: p.uri, sourceUrl, caption: p.record.text, format, publishedAt: p.record.createdAt, source: "BLUESKY_PUBLIC_API" }, ...(Object.values(metrics).some(v => v != null) ? { measurement: { ...measured(observedAt, "BLUESKY_PUBLIC_API", sourceUrl), ...metrics } } : {}) });
  });
}
async function bluesky(input: CreativeSourceInput, signal: AbortSignal) {
  const url = new URL("https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed");
  url.searchParams.set("actor", input.account); url.searchParams.set("limit", String(input.limit)); url.searchParams.set("filter", "posts_no_replies");
  const payload = await jsonGet(url, signal); const observedAt = new Date();
  return { rows: mapBluesky(payload, input, observedAt), observedAt };
}

const channelSchema = z.object({ items: z.array(z.object({ id: z.string(), contentDetails: z.object({ relatedPlaylists: z.object({ uploads: z.string() }) }), statistics: z.object({ subscriberCount: optionalCount, hiddenSubscriberCount: z.boolean().optional() }).optional() })).max(50) });
const playlistSchema = z.object({ items: z.array(z.object({ contentDetails: z.object({ videoId: z.string() }) })).max(50) });
const videosSchema = z.object({ items: z.array(z.object({ id: z.string().regex(/^[\w-]{11}$/), snippet: z.object({ channelId: z.string(), title: z.string(), publishedAt: z.iso.datetime({ offset: true }), description: z.string().optional() }), statistics: z.object({ viewCount: optionalCount, likeCount: optionalCount, commentCount: optionalCount }).optional() })).max(50) });
export function mapYouTube(payload: unknown, input: CreativeSourceInput, observedAt: Date, channelId: string, followers?: number): AcquiredContent[] {
  return videosSchema.parse(payload).items.filter(v => v.snippet.channelId === channelId).map(v => {
    const sourceUrl = `https://www.youtube.com/watch?v=${v.id}`;
    const metrics = { views: v.statistics?.viewCount, likes: v.statistics?.likeCount, comments: v.statistics?.commentCount };
    return acquiredContentSchema.parse({ specimen: { ...context(input), platform: "YOUTUBE", accountId: channelId, externalId: v.id, sourceUrl, caption: [v.snippet.title, v.snippet.description].filter(Boolean).join("\n").slice(0, 10000), format: input.youtubeFormat, publishedAt: v.snippet.publishedAt, source: "YOUTUBE_DATA_API" }, ...(Object.values(metrics).some(x => x != null) ? { measurement: { ...measured(observedAt, "YOUTUBE_DATA_API", sourceUrl), ...metrics, followersAtObservation: followers } } : {}) });
  });
}
async function youtube(input: CreativeSourceInput, signal: AbortSignal, apiKey: string) {
  if (!/^(UC[\w-]{22}|@[\w.-]{1,100})$/.test(input.account)) throw new SourceReadError("MISSING_PREREQUISITE");
  const get = (resource: string, params: Record<string, string>) => { const u = new URL(`https://www.googleapis.com/youtube/v3/${resource}`); Object.entries({ ...params, key: apiKey }).forEach(([k, v]) => u.searchParams.set(k, v)); return jsonGet(u, signal); };
  const channels = channelSchema.parse(await get("channels", { part: "contentDetails,statistics", ...(input.account.startsWith("UC") ? { id: input.account } : { forHandle: input.account }) }));
  const channel = channels.items[0]; if (!channel) throw new SourceReadError("INSUFFICIENT_DATA");
  const playlist = playlistSchema.parse(await get("playlistItems", { part: "contentDetails", playlistId: channel.contentDetails.relatedPlaylists.uploads, maxResults: String(input.limit) }));
  if (!playlist.items.length) throw new SourceReadError("INSUFFICIENT_DATA");
  const payload = await get("videos", { part: "snippet,statistics", id: playlist.items.map(p => p.contentDetails.videoId).join(",") });
  const observedAt = new Date();
  return { rows: mapYouTube(payload, input, observedAt, channel.id, channel.statistics?.hiddenSubscriberCount ? undefined : channel.statistics?.subscriberCount), observedAt };
}

const foreplaySchema = z.object({ metadata: z.object({ success: z.boolean() }), error: z.unknown().nullable().optional(), data: z.array(z.object({
  id: z.string(), ad_id: z.string(), name: z.string(), brand_id: z.string().nullable().optional(), description: z.string().nullable().optional(),
  display_format: z.string().nullable().optional(), started_running: z.number().int().positive().nullable().optional(),
  video: z.string().nullable().optional(), image: z.string().nullable().optional(), foreplay_url: z.string().nullable().optional(),
})).max(250) });
export function mapForeplay(payload: unknown, input: CreativeSourceInput): AcquiredContent[] {
  const data = foreplaySchema.parse(payload);
  if (!data.metadata.success || data.error) throw new SourceReadError("VENDOR_OUTAGE");
  // Query results can span brands and platforms; native placement/account isn't inferred from the query.
  return data.data.slice(0, input.limit).filter(a => a.started_running && a.foreplay_url?.startsWith("https:")).map(a => acquiredContentSchema.parse({ specimen: {
    ...context(input), platform: "OTHER", accountId: `foreplay:${a.brand_id ?? a.name}`.slice(0, 200), externalId: `foreplay:${a.ad_id || a.id}`,
    sourceUrl: a.foreplay_url, ...(a.video?.startsWith("https:") || a.image?.startsWith("https:") ? { mediaUrl: a.video?.startsWith("https:") ? a.video : a.image } : {}),
    caption: [a.name, a.description].filter(Boolean).join("\n").slice(0, 10000),
    // Discovery's 'video' is a media kind, not proof of a platform's short-video placement.
    format: a.video ? "VIDEO_UNCLASSIFIED" : a.image ? "IMAGE" : "TEXT",
    publishedAt: new Date(a.started_running! * 1000), source: "FOREPLAY_AD_ARCHIVE",
  } }));
}
async function foreplay(input: CreativeSourceInput, signal: AbortSignal, apiKey: string) {
  const u = new URL("https://public.api.foreplay.co/api/discovery/ads"); u.searchParams.set("query", input.account); u.searchParams.set("limit", String(input.limit));
  const payload = await jsonGet(u, signal, apiKey); return { rows: mapForeplay(payload, input), observedAt: new Date() };
}

async function connectedSocial(input: CreativeSourceInput, store: Prisma.TransactionClient) {
  if (!input.strategyId) throw new SourceReadError("MISSING_PREREQUISITE");
  const posts = await store.socialPost.findMany({ where: { strategyId: input.strategyId, connection: { accountId: input.account, status: "ACTIVE", platform: { in: ["FACEBOOK", "INSTAGRAM"] } } }, include: { connection: { select: { platform: true, accountId: true } } }, orderBy: { publishedAt: "desc" }, take: input.limit });
  // No default-zero SocialPost counters or undated stored Insights become fresh observations.
  return { rows: posts.filter(p => p.publishedAt && p.permalinkUrl?.startsWith("https:")).map(p => acquiredContentSchema.parse({ specimen: { ...context(input), platform: p.connection.platform, accountId: p.connection.accountId, externalId: p.externalPostId, sourceUrl: p.permalinkUrl, caption: p.content ?? undefined, format: p.mediaType?.toLowerCase().includes("video") ? "VIDEO_UNCLASSIFIED" : "IMAGE", publishedAt: p.publishedAt, source: "NATIVE_SYNC_STORED" } })), observedAt: new Date() };
}

export async function fetchCreativeSource(input: CreativeSourceInput, credentials: CreativeCredentials = {}, store: Prisma.TransactionClient = db): Promise<ConnectorResult<AcquiredContent[]>> {
  const connection = input.provider in CREATIVE_SOURCE_CONNECTIONS ? CREATIVE_SOURCE_CONNECTIONS[input.provider as keyof typeof CREATIVE_SOURCE_CONNECTIONS] : null;
  if (connection && !credentials.apiKey) return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: connection.type };
  try {
    const signal = AbortSignal.timeout(25000);
    const result = input.provider === "BLUESKY" ? await bluesky(input, signal) : input.provider === "YOUTUBE" ? await youtube(input, signal, credentials.apiKey!) : input.provider === "FOREPLAY" ? await foreplay(input, signal, credentials.apiKey!) : input.provider === "CONNECTED_SOCIAL" ? await connectedSocial(input, store) : await fetchAdditionalSource(input, credentials, signal);
    if (!result.rows.length) return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
    return { state: "LIVE", data: result.rows, observedAt: result.observedAt.toISOString() };
  } catch (error) { return { state: "DEGRADED", reason: error instanceof SourceReadError ? error.reason : "VENDOR_OUTAGE" }; }
}
