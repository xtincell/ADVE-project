/**
 * SocialAuditConnector — 3 sources de collecte followers.
 *
 * Owning Neter : ANUBIS (Comms §4.7). Cap APOGEE 7/7 préservé.
 *
 * ## Trois options
 *
 * 1. **OFFICIAL_API** — token Meta Graph API fourni par le client (Page
 *    Access Token ou User token avec `pages_read_engagement`). Stocké dans
 *    ExternalConnector (connectorType = "META_SOCIAL_OFFICIAL").
 *    Requiert Feature "Page Public Content Access" activée dans l'app Meta.
 *
 * 2. **APIFY** — Apify Instagram Profile Scraper. Aucune dépendance sur la
 *    perm Meta. Stocké dans ExternalConnector (connectorType = "APIFY_SOCIAL").
 *    DEFERRED si clé absente.
 *
 * 3. **MANUAL** — saisie opérateur via la UI console (procédure déjà wired :
 *    `recordFollowerSnapshot`). Aucune config requise.
 *
 * ## Contract P22-1
 *
 * Toutes les façades retournent `ConnectorResult<SocialFollowerData>` :
 *   - LIVE              — fetch OK, données persistes via `persistSnapshot()`
 *   - DEFERRED_AWAITING_CREDENTIALS — pas de connecteur configuré
 *   - DEGRADED + AUTH_REVOKED       — token rejeté (401/403)
 *   - DEGRADED + RATE_LIMITED       — upstream 429
 *   - DEGRADED + VENDOR_OUTAGE      — 5xx / timeout / réseau
 *   - DEGRADED + INSUFFICIENT_DATA  — réponse vide ou incohérente
 */

import type { Prisma, SocialPlatform } from "@prisma/client";
import { db } from "@/lib/db";
import type { ConnectorResult } from "@/domain";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SocialFollowerData {
  platform: string;
  handle: string;
  followerCount: number;
  followingCount?: number;
  mentionsCount?: number;
  rawMeta?: Record<string, unknown>;
}

interface SocialHandle {
  platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "LINKEDIN" | "TWITTER" | "YOUTUBE";
  handle: string;
}

// ── Connector type constants ──────────────────────────────────────────────────

export const SOCIAL_CONNECTOR_META = "META_SOCIAL_OFFICIAL";
export const SOCIAL_CONNECTOR_APIFY = "APIFY_SOCIAL";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function persistSnapshot(
  strategyId: string | null,
  data: SocialFollowerData,
  source: string,
): Promise<void> {
  await db.followerSnapshot.create({
    data: {
      strategyId,
      platform: data.platform as SocialPlatform,
      handle: data.handle.replace(/^@/, ""),
      followerCount: data.followerCount,
      followingCount: data.followingCount ?? null,
      mentionsCount: data.mentionsCount ?? null,
      source,
    },
  });
}

// ── Option 1 — Official Meta Graph API ───────────────────────────────────────

/**
 * Fetches Facebook Page fan_count (and Instagram followersCount if IG account
 * linked) using a stored Page Access Token or User Access Token.
 *
 * ExternalConnector.config shape:
 * ```json
 * {
 *   "accessToken": "<page_access_token | user_access_token>",
 *   "pageId": "<numeric-or-named>",       // required for FB
 *   "igAccountId": "<numeric>",            // optional — IG Business account id
 *   "handles": [{ "platform": "FACEBOOK", "handle": "spawt.ci" }]
 * }
 * ```
 */
export async function fetchOfficialApiFollowers(
  operatorId: string,
  strategyId: string | null,
  handles: SocialHandle[],
): Promise<ConnectorResult<SocialFollowerData[]>> {
  // Load connector
  const connector = await db.externalConnector.findUnique({
    where: { operatorId_connectorType: { operatorId, connectorType: SOCIAL_CONNECTOR_META } },
  });

  if (!connector || connector.status === "INACTIVE") {
    return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: SOCIAL_CONNECTOR_META };
  }

  const config = connector.config as Record<string, unknown>;
  const accessToken = config.accessToken as string | undefined;
  if (!accessToken) {
    return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: SOCIAL_CONNECTOR_META };
  }

  const results: SocialFollowerData[] = [];

  for (const { platform, handle } of handles) {
    const cleanHandle = handle.replace(/^@/, "");

    try {
      if (platform === "INSTAGRAM") {
        // IG Business: requires igAccountId + token with instagram_basic perm
        const igAccountId = config.igAccountId as string | undefined;
        if (!igAccountId) {
          // Skip IG if no account id configured — not an error, operator must add it
          continue;
        }
        const url = `https://graph.facebook.com/v21.0/${igAccountId}?fields=followers_count,follows_count,username&access_token=${encodeURIComponent(accessToken)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

        if (res.status === 401 || res.status === 403) {
          return { state: "DEGRADED", reason: "AUTH_REVOKED" };
        }
        if (res.status === 429) {
          return { state: "DEGRADED", reason: "RATE_LIMITED" };
        }
        if (!res.ok) {
          return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
        }

        const json = (await res.json()) as Record<string, unknown>;
        const followerCount = (json.followers_count as number) ?? 0;
        if (followerCount === 0 && !json.username) {
          return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
        }

        const data: SocialFollowerData = {
          platform,
          handle: cleanHandle,
          followerCount,
          followingCount: (json.follows_count as number) ?? undefined,
          rawMeta: json,
        };
        await persistSnapshot(strategyId, data, "OFFICIAL_API");
        results.push(data);

      } else if (platform === "FACEBOOK") {
        const pageTarget = (config.pageId as string | undefined) ?? cleanHandle;
        const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(pageTarget)}?fields=fan_count,followers_count,name&access_token=${encodeURIComponent(accessToken)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

        if (res.status === 401 || res.status === 403) {
          return { state: "DEGRADED", reason: "AUTH_REVOKED" };
        }
        if (res.status === 429) {
          return { state: "DEGRADED", reason: "RATE_LIMITED" };
        }
        if (!res.ok) {
          return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
        }

        const json = (await res.json()) as Record<string, unknown>;
        const followerCount = (json.followers_count as number) ?? (json.fan_count as number) ?? 0;

        const data: SocialFollowerData = {
          platform,
          handle: cleanHandle,
          followerCount,
          rawMeta: json,
        };
        await persistSnapshot(strategyId, data, "OFFICIAL_API");
        results.push(data);
      }
    } catch (_err) {
      return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
    }
  }

  if (results.length === 0) {
    return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
  }

  return { state: "LIVE", data: results, observedAt: new Date().toISOString() };
}

// ── Option 2 — Apify Instagram/Facebook Scraper ───────────────────────────────

/**
 * Uses Apify's Instagram Profile Scraper (apify~instagram-profile-scraper)
 * to retrieve public follower counts without requiring platform OAuth.
 *
 * ExternalConnector.config shape:
 * ```json
 * {
 *   "apiKey": "<apify_api_token>",
 *   "actorId": "apify~instagram-profile-scraper"  // optional, default used if absent
 * }
 * ```
 *
 * Cost model : ~$0.001 per profile (Apify free tier covers ~1000 runs/month).
 */
export async function fetchThirdPartyFollowers(
  operatorId: string,
  strategyId: string | null,
  handles: SocialHandle[],
): Promise<ConnectorResult<SocialFollowerData[]>> {
  const connector = await db.externalConnector.findUnique({
    where: { operatorId_connectorType: { operatorId, connectorType: SOCIAL_CONNECTOR_APIFY } },
  });

  if (!connector || connector.status === "INACTIVE") {
    return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: SOCIAL_CONNECTOR_APIFY };
  }

  const config = connector.config as Record<string, unknown>;
  const apiKey = config.apiKey as string | undefined;
  if (!apiKey) {
    return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: SOCIAL_CONNECTOR_APIFY };
  }

  const actorId = (config.actorId as string | undefined) ?? "apify~instagram-profile-scraper";
  const igHandles = handles.filter((h) => h.platform === "INSTAGRAM").map((h) => h.handle.replace(/^@/, ""));

  if (igHandles.length === 0) {
    return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
  }

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(apiKey)}&timeout=60`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: igHandles, resultsType: "details", resultsLimit: igHandles.length }),
        signal: AbortSignal.timeout(70_000),
      },
    );

    if (runRes.status === 401 || runRes.status === 403) {
      return { state: "DEGRADED", reason: "AUTH_REVOKED" };
    }
    if (runRes.status === 429) {
      return { state: "DEGRADED", reason: "RATE_LIMITED" };
    }
    if (!runRes.ok) {
      return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
    }

    const items = (await runRes.json()) as Array<Record<string, unknown>>;

    if (!Array.isArray(items) || items.length === 0) {
      return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
    }

    const results: SocialFollowerData[] = [];
    for (const item of items) {
      const username = (item.username as string | undefined) ?? "";
      const followerCount = (item.followersCount as number) ?? 0;

      const data: SocialFollowerData = {
        platform: "INSTAGRAM",
        handle: (username || igHandles[results.length]) ?? "unknown",
        followerCount,
        followingCount: (item.followsCount as number) ?? undefined,
        rawMeta: { ...item, _scraperSource: "apify" },
      };
      await persistSnapshot(strategyId, data, "APIFY");
      results.push(data);
    }

    return { state: "LIVE", data: results, observedAt: new Date().toISOString() };
  } catch (_err) {
    return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
  }
}

// ── Connector CRUD helpers ────────────────────────────────────────────────────

export interface SocialConnectorConfig {
  connectorType: typeof SOCIAL_CONNECTOR_META | typeof SOCIAL_CONNECTOR_APIFY;
  config: Record<string, unknown>;
}

export async function upsertSocialConnector(
  operatorId: string,
  { connectorType, config }: SocialConnectorConfig,
): Promise<{ id: string }> {
  const existing = await db.externalConnector.findUnique({
    where: { operatorId_connectorType: { operatorId, connectorType } },
  });

  if (existing) {
    return db.externalConnector.update({
      where: { id: existing.id },
      data: { config: config as Prisma.InputJsonValue, status: "ACTIVE", updatedAt: new Date() },
      select: { id: true },
    });
  }

  return db.externalConnector.create({
    data: { operatorId, connectorType, config: config as Prisma.InputJsonValue, status: "ACTIVE" },
    select: { id: true },
  });
}

export async function getSocialConnectors(operatorId: string) {
  return db.externalConnector.findMany({
    where: {
      operatorId,
      connectorType: { in: [SOCIAL_CONNECTOR_META, SOCIAL_CONNECTOR_APIFY] },
    },
    select: { id: true, connectorType: true, status: true, lastSyncAt: true, config: true },
    orderBy: { createdAt: "asc" },
  });
}
