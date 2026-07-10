/**
 * Empreinte digitale — statistiques de chaîne YouTube (ADR-0121 vague A).
 * YouTube Data API v3, gratuite (10 000 unités/jour), env `YOUTUBE_API_KEY`.
 * Résolution handle → channel (forHandle) puis stats publiques. Best-effort.
 */

export interface YouTubeStats {
  status: "LIVE" | "DEFERRED_NO_KEY" | "NOT_FOUND" | "ERROR";
  handle: string | null;
  channelTitle: string | null;
  subscriberCount: number | null;
  viewCount: number | null;
  videoCount: number | null;
}

const EMPTY = { handle: null, channelTitle: null, subscriberCount: null, viewCount: null, videoCount: null };

/** Parse la réponse channels.list (statistics + snippet). Pur — fixtures. */
export function parseYouTubeChannelResponse(json: Record<string, unknown>, handle: string): YouTubeStats {
  const items = Array.isArray(json.items) ? (json.items as Array<Record<string, unknown>>) : [];
  const item = items[0];
  if (!item) return { status: "NOT_FOUND", ...EMPTY, handle };
  const stats = (item.statistics ?? {}) as Record<string, unknown>;
  const snippet = (item.snippet ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number | null => {
    const n = typeof v === "string" ? parseInt(v, 10) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const subscriberCount = stats.hiddenSubscriberCount === true ? null : num(stats.subscriberCount);
  return {
    status: "LIVE",
    handle,
    channelTitle: typeof snippet.title === "string" ? snippet.title : null,
    subscriberCount,
    viewCount: num(stats.viewCount),
    videoCount: num(stats.videoCount),
  };
}

export async function fetchYouTubeChannelStats(
  handleOrUrl: string,
  opts?: { timeoutMs?: number },
): Promise<YouTubeStats> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const handle = handleOrUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@|channel\/|c\/|user\/)?/i, "").replace(/^@/, "").split(/[/?#]/)[0] ?? "";
  if (!apiKey) return { status: "DEFERRED_NO_KEY", ...EMPTY, handle: handle || null };
  if (!handle) return { status: "NOT_FOUND", ...EMPTY };

  const timeoutMs = opts?.timeoutMs ?? 6_000;
  try {
    // forHandle marche pour les @handles ; les ids UC… passent par id=.
    const param = /^UC[\w-]{20,}$/.test(handle) ? `id=${encodeURIComponent(handle)}` : `forHandle=${encodeURIComponent(handle)}`;
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&${param}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { status: "ERROR", ...EMPTY, handle };
    const json = (await res.json()) as Record<string, unknown>;
    return parseYouTubeChannelResponse(json, handle);
  } catch {
    return { status: "ERROR", ...EMPTY, handle };
  }
}
