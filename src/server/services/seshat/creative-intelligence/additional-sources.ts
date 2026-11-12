/** Official read contracts. No token-bearing source URL or invented performance. ADR-0196. */
import { createHash } from "node:crypto";
import { z } from "zod";
import { acquiredContentSchema, type AcquiredContent, type CreativeCredentials, type CreativeSourceInput } from "@/domain/creative-sources";
import { ssrfSafeFetch } from "@/lib/net/ssrf-guard";
import { parseRssItems } from "@/server/services/seshat/external-feeds/rss";
import { readBoundedJson, SourceReadError } from "./source-http";
import { readMediaBytes } from "./media-observations";

const id = z.string().min(1), nativeId = z.union([id, z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).transform(String)]);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional();
const https = z.url().refine(v => new URL(v).protocol === "https:");
const when = z.coerce.date();
const base = (i: CreativeSourceInput) => ({ strategyId: i.strategyId, visibility: i.strategyId ? "BRAND" : "PUBLIC", sector: i.sector, countryCode: i.countryCode });
const measurement = (at: Date, source: string, url: string, metrics: object) => Object.values(metrics).some(v => v != null) ? { measurement: { observedAt: at, source, sourceUrl: url, paidStatus: "UNKNOWN", ...metrics } } : {};
const numeric = (value: string | undefined) => { if (!value || !/^\d+$/.test(value)) throw new SourceReadError("MISSING_PREREQUISITE"); return value; };
const handle = (value: string) => { if (!/^[\w.\-]{1,100}$/.test(value)) throw new SourceReadError("MISSING_PREREQUISITE"); return value; };
const dates = (i: CreativeSourceInput) => {
  const until = i.until ?? new Date(), since = i.since ?? new Date(until.getTime() - 7 * 86400000);
  if (!Number.isFinite(+since) || !Number.isFinite(+until) || since >= until || +until > Date.now() || +until - +since > 30 * 86400000) throw new SourceReadError("MISSING_PREREQUISITE");
  return { since, until, start: since.toISOString().slice(0, 10).replaceAll("-", ""), end: until.toISOString().slice(0, 10).replaceAll("-", "") };
};

export function mapMetaLibrary(payload: unknown, input: CreativeSourceInput): AcquiredContent[] {
  const parsed = z.object({ data: z.array(z.object({ id, page_id: id, ad_delivery_start_time: when, ad_creative_bodies: z.array(z.string()).optional() })).max(100) }).parse(payload);
  return parsed.data.filter(p => p.page_id === input.account).slice(0, input.limit).map(p => acquiredContentSchema.parse({ specimen: { ...base(input), platform: "FACEBOOK", accountId: p.page_id, externalId: `meta-ad:${p.id}`, sourceUrl: `https://www.facebook.com/ads/library/?id=${encodeURIComponent(p.id)}`, caption: p.ad_creative_bodies?.join("\n").slice(0, 10000), format: "TEXT", publishedAt: p.ad_delivery_start_time, source: "META_AD_LIBRARY_TEXT" } }));
}
export function mapInstagramDiscovery(payload: unknown, input: CreativeSourceInput, at: Date): AcquiredContent[] {
  const data = z.object({ business_discovery: z.object({ id, username: id, media: z.object({ data: z.array(z.object({ id, caption: z.string().optional(), media_type: z.string(), media_url: https.optional(), permalink: https, timestamp: when, like_count: count, comments_count: count })).max(100) }).optional() }) }).parse(payload).business_discovery;
  if (data.username.toLowerCase() !== input.account.toLowerCase()) throw new SourceReadError("INSUFFICIENT_DATA");
  return (data.media?.data ?? []).slice(0, input.limit).map(p => acquiredContentSchema.parse({ specimen: { ...base(input), platform: "INSTAGRAM", accountId: data.id, externalId: p.id, sourceUrl: p.permalink, mediaUrl: p.media_type === "CAROUSEL_ALBUM" ? undefined : p.media_url, caption: p.caption?.slice(0, 10000), format: p.media_type === "VIDEO" ? "VIDEO_UNCLASSIFIED" : "IMAGE", publishedAt: p.timestamp, source: "INSTAGRAM_BUSINESS_DISCOVERY" }, ...measurement(at, "INSTAGRAM_BUSINESS_DISCOVERY", p.permalink, { likes: p.like_count, comments: p.comments_count }) }));
}
function tiktokEnvelope(payload: unknown) {
  const parsed = z.object({ error: z.object({ code: z.string() }), data: z.unknown() }).parse(payload);
  if (parsed.error.code !== "ok") throw new SourceReadError(parsed.error.code.includes("token") ? "AUTH_REVOKED" : parsed.error.code.includes("rate") ? "RATE_LIMITED" : "VENDOR_OUTAGE");
  return parsed.data;
}
export function mapTikTokResearch(payload: unknown, input: CreativeSourceInput, at: Date): AcquiredContent[] {
  const data = z.object({ videos: z.array(z.object({ id: nativeId, username: id, create_time: z.number().int().positive(), video_description: z.string().optional(), view_count: count, like_count: count, comment_count: count, share_count: count })).max(100) }).parse(tiktokEnvelope(payload));
  return data.videos.filter(p => p.username === input.account).slice(0, input.limit).map(p => {
    const url = `https://www.tiktok.com/@${encodeURIComponent(p.username)}/video/${p.id}`;
    return acquiredContentSchema.parse({ specimen: { ...base(input), platform: "TIKTOK", accountId: `username:${p.username}`, externalId: p.id, sourceUrl: url, caption: p.video_description?.slice(0, 10000), format: "VIDEO_UNCLASSIFIED", publishedAt: new Date(p.create_time * 1000), source: "TIKTOK_RESEARCH" }, ...measurement(at, "TIKTOK_RESEARCH", url, { views: p.view_count, likes: p.like_count, comments: p.comment_count, shares: p.share_count }) });
  });
}
export function mapTikTokCommercial(payload: unknown, input: CreativeSourceInput): AcquiredContent[] {
  const data = z.object({ commercial_contents: z.array(z.object({ id: nativeId, create_timestamp: z.number().int().positive(), creator: z.object({ username: id }), brand_names: z.array(z.string()).optional(), videos: z.array(z.object({ url: https })).max(30) })).max(100) }).parse(tiktokEnvelope(payload));
  return data.commercial_contents.filter(p => p.creator.username === input.account).slice(0, input.limit).flatMap(p => p.videos.slice(0, 1).map(v => acquiredContentSchema.parse({ specimen: { ...base(input), platform: "TIKTOK", accountId: `username:${p.creator.username}`, externalId: `commercial:${p.id}`, sourceUrl: v.url, caption: p.brand_names?.join(", ").slice(0, 10000), format: "VIDEO_UNCLASSIFIED", publishedAt: new Date(p.create_timestamp * 1000), source: "TIKTOK_COMMERCIAL_ARCHIVE" } })));
}
export function mapReddit(payload: unknown, input: CreativeSourceInput, at: Date): AcquiredContent[] {
  const data = z.object({ data: z.object({ children: z.array(z.object({ data: z.object({ name: id, author: id, author_fullname: id.optional(), title: z.string(), selftext: z.string().optional(), created_utc: z.number().positive(), permalink: z.string().startsWith("/"), num_comments: count, is_video: z.boolean().optional() }) })).max(100) }) }).parse(payload);
  return data.data.children.filter(({ data: p }) => p.author.toLowerCase() === input.account.toLowerCase()).slice(0, input.limit).map(({ data: p }) => {
    const url = `https://www.reddit.com${p.permalink}`;
    return acquiredContentSchema.parse({ specimen: { ...base(input), platform: "OTHER", accountId: p.author_fullname ?? `reddit-user:${p.author}`, externalId: p.name, sourceUrl: url, caption: `${p.title}\n${p.selftext ?? ""}`.slice(0, 10000), format: p.is_video ? "VIDEO_UNCLASSIFIED" : "TEXT", publishedAt: new Date(p.created_utc * 1000), source: "REDDIT_DATA_API" }, ...measurement(at, "REDDIT_DATA_API", url, { comments: p.num_comments }) });
  });
}
export function mapX(payload: unknown, input: CreativeSourceInput, at: Date): AcquiredContent[] {
  const data = z.object({ data: z.array(z.object({ id, author_id: id, text: z.string(), created_at: when, attachments: z.unknown().optional(), public_metrics: z.object({ like_count: count, reply_count: count, retweet_count: count }).optional() })).max(100) }).parse(payload);
  return data.data.filter(p => p.author_id === input.account).slice(0, input.limit).map(p => {
    const url = `https://x.com/i/web/status/${p.id}`;
    return acquiredContentSchema.parse({ specimen: { ...base(input), platform: "OTHER", accountId: `x:${p.author_id}`, externalId: p.id, sourceUrl: url, caption: p.text, format: "TEXT", publishedAt: p.created_at, source: "X_API_TEXT" }, ...measurement(at, "X_API", url, { likes: p.public_metrics?.like_count, comments: p.public_metrics?.reply_count, shares: p.public_metrics?.retweet_count }) });
  });
}
export function mapLinkedIn(payload: unknown, input: CreativeSourceInput): AcquiredContent[] {
  const data = z.object({ elements: z.array(z.object({ id, author: id, commentary: z.string().optional(), publishedAt: z.number().positive().optional(), lifecycleState: z.string() })).max(100) }).parse(payload);
  return data.elements.filter(p => p.author === input.account && p.lifecycleState === "PUBLISHED" && p.publishedAt != null).slice(0, input.limit).map(p => acquiredContentSchema.parse({ specimen: { ...base(input), platform: "LINKEDIN", accountId: p.author, externalId: p.id, sourceUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(p.id)}/`, caption: p.commentary?.slice(0, 10000), format: "TEXT", publishedAt: new Date(p.publishedAt!), source: "LINKEDIN_AUTHORIZED_POSTS_TEXT" } }));
}
export function mapBrandwatch(payload: unknown, input: CreativeSourceInput): AcquiredContent[] {
  const data = z.object({ results: z.array(z.object({ resourceId: id, url: https, date: when, title: z.string().optional(), snippet: z.string().optional(), fullText: z.string().optional() })).max(100) }).parse(payload);
  return data.results.slice(0, input.limit).map(p => acquiredContentSchema.parse({ specimen: { ...base(input), platform: "OTHER", accountId: `domain:${new URL(p.url).hostname}`, externalId: `brandwatch:${p.resourceId}`, sourceUrl: p.url, caption: [p.title, p.fullText ?? p.snippet].filter(Boolean).join("\n").slice(0, 10000), format: "TEXT", publishedAt: p.date, source: "BRANDWATCH_MENTION" } }));
}

export async function fetchAdditionalSource(input: CreativeSourceInput, credentials: CreativeCredentials, signal: AbortSignal) {
  const get = async (url: URL, body?: unknown, extraHeaders?: Record<string, string>) => readBoundedJson(await fetch(url, { method: body ? "POST" : "GET", redirect: "error", signal, headers: { Authorization: `Bearer ${credentials.apiKey}`, ...(body ? { "Content-Type": "application/json" } : {}), ...extraHeaders }, ...(body ? { body: JSON.stringify(body) } : {}) }));
  let payload: unknown;
  if (input.provider === "RSS") {
    if (new URL(input.account).protocol !== "https:") throw new SourceReadError("MISSING_PREREQUISITE");
    const text = (await readMediaBytes(await ssrfSafeFetch(input.account, { signal }), 1_000_000)).toString("utf8");
    const rows = parseRssItems(text, input.limit).filter(p => p.link.startsWith("https:") && Number.isFinite(Date.parse(p.pubDate))).map(p => acquiredContentSchema.parse({ specimen: { ...base(input), platform: "OTHER", accountId: `feed:${createHash("sha256").update(input.account).digest("hex")}`, externalId: createHash("sha256").update(p.link).digest("hex"), sourceUrl: p.link, caption: `${p.title}\n${p.summary}`.slice(0, 10000), format: "TEXT", publishedAt: new Date(p.pubDate), source: "RSS_PUBLISHER_FEED" } }));
    return { rows, observedAt: new Date() };
  }
  if (input.provider === "META_AD_LIBRARY" || input.provider === "INSTAGRAM_DISCOVERY") {
    if (!/^v\d+\.\d+$/.test(credentials.apiVersion ?? "")) throw new SourceReadError("MISSING_PREREQUISITE");
    const u = new URL(`https://graph.facebook.com/${credentials.apiVersion}/${input.provider === "META_AD_LIBRARY" ? "ads_archive" : numeric(credentials.actorId)}`);
    if (input.provider === "META_AD_LIBRARY") {
      if (!["ALL", "POLITICAL_AND_ISSUE_ADS"].includes(credentials.adType ?? "")) throw new SourceReadError("MISSING_PREREQUISITE");
      u.search = new URLSearchParams({ search_page_ids: JSON.stringify([numeric(input.account)]), ad_reached_countries: JSON.stringify([input.countryCode]), ad_type: credentials.adType!, fields: "id,page_id,ad_delivery_start_time,ad_creative_bodies", limit: String(input.limit) }).toString();
    } else u.searchParams.set("fields", `business_discovery.username(${handle(input.account)}){id,username,media.limit(${input.limit}){id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count}}`);
    payload = await get(u);
    return { rows: input.provider === "META_AD_LIBRARY" ? mapMetaLibrary(payload, input) : mapInstagramDiscovery(payload, input, new Date()), observedAt: new Date() };
  }
  if (input.provider === "TIKTOK_RESEARCH" || input.provider === "TIKTOK_COMMERCIAL") {
    const range = dates(input), user = handle(input.account), research = input.provider === "TIKTOK_RESEARCH";
    const u = new URL(`https://open.tiktokapis.com/v2/research/${research ? "video" : "adlib/commercial_content"}/query/`);
    u.searchParams.set("fields", research ? "id,username,create_time,video_description,view_count,like_count,comment_count,share_count" : "id,create_timestamp,creator,videos,brand_names");
    payload = await get(u, research ? { query: { and: [{ operation: "EQ", field_name: "username", field_values: [user] }] }, start_date: range.start, end_date: range.end, max_count: input.limit } : { filters: { content_published_date_range: { min: range.start, max: range.end }, creator_usernames: [user] }, max_count: input.limit });
    return { rows: research ? mapTikTokResearch(payload, input, new Date()) : mapTikTokCommercial(payload, input), observedAt: new Date() };
  }
  if (input.provider === "REDDIT") {
    if (!credentials.userAgent?.trim()) throw new SourceReadError("MISSING_PREREQUISITE");
    const u = new URL(`https://oauth.reddit.com/user/${handle(input.account)}/submitted`); u.searchParams.set("limit", String(input.limit)); u.searchParams.set("sort", "new");
    payload = await get(u, undefined, { "User-Agent": credentials.userAgent }); return { rows: mapReddit(payload, input, new Date()), observedAt: new Date() };
  }
  if (input.provider === "X") {
    const u = new URL(`https://api.x.com/2/users/${numeric(input.account)}/tweets`); u.searchParams.set("max_results", String(Math.max(5, input.limit))); u.searchParams.set("tweet.fields", "created_at,author_id,public_metrics,attachments");
    payload = await get(u); return { rows: mapX(payload, input, new Date()), observedAt: new Date() };
  }
  if (input.provider === "LINKEDIN") {
    if (!/^urn:li:(organization|person):[\w-]+$/.test(input.account) || !/^\d{6}$/.test(credentials.apiVersion ?? "")) throw new SourceReadError("MISSING_PREREQUISITE");
    const u = new URL("https://api.linkedin.com/rest/posts"); u.search = new URLSearchParams({ q: "author", author: input.account, count: String(input.limit), sortBy: "LAST_MODIFIED" }).toString();
    payload = await get(u, undefined, { "LinkedIn-Version": credentials.apiVersion!, "X-Restli-Protocol-Version": "2.0.0" }); return { rows: mapLinkedIn(payload, input), observedAt: new Date() };
  }
  if (input.provider === "BRANDWATCH") {
    const range = dates(input), u = new URL(`https://api.brandwatch.com/projects/${numeric(credentials.projectId)}/data/mentions/fulltext`);
    u.search = new URLSearchParams({ queryId: numeric(input.account), startDate: range.since.toISOString(), endDate: range.until.toISOString(), pageSize: String(input.limit), page: "0" }).toString();
    payload = await get(u); return { rows: mapBrandwatch(payload, input), observedAt: new Date() };
  }
  if (input.provider === "APIFY") {
    if (!/^[\w-]{1,100}$/.test(input.account)) throw new SourceReadError("MISSING_PREREQUISITE");
    const u = new URL(`https://api.apify.com/v2/datasets/${input.account}/items`); u.search = new URLSearchParams({ format: "json", clean: "true", limit: String(input.limit) }).toString();
    payload = await get(u); const rows = z.array(acquiredContentSchema).max(50).parse(payload);
    if (rows.some(r => r.specimen.strategyId !== input.strategyId || r.specimen.visibility !== (input.strategyId ? "BRAND" : "PUBLIC") || r.specimen.sector !== input.sector || r.specimen.countryCode !== input.countryCode)) throw new SourceReadError("MISSING_PREREQUISITE");
    return { rows, observedAt: new Date() };
  }
  throw new SourceReadError("MISSING_PREREQUISITE");
}
