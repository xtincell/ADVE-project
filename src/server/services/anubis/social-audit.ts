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

export interface SocialHandle {
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
  // Éphémère : un snapshot sans marque (funnel /scorer anonyme, strategyId=null)
  // n'appartient à personne — on ne persiste JAMAIS d'orphelin. La façade renvoie
  // quand même les followers en mémoire (LIVE), seule l'écriture est supprimée.
  if (!strategyId) return;
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

// ── Option 2 — Apify (scraping public sans OAuth plateforme) ─────────────────

/**
 * Résolution des credentials Apify — pattern ADR-0075 : le vault opérateur
 * prime quand un contexte opérateur existe ; sinon fallback sur le token
 * système `APIFY_TOKEN` (env). L'intake public (pré-opérateur) passe par
 * l'env. Null → l'appelant retourne DEFERRED_AWAITING_CREDENTIALS.
 */
export async function resolveApifyCredentials(operatorId: string | null): Promise<{
  apiKey: string;
  igActorOverride: string | null;
  origin: "VAULT" | "ENV";
} | null> {
  if (operatorId) {
    const connector = await db.externalConnector.findUnique({
      where: { operatorId_connectorType: { operatorId, connectorType: SOCIAL_CONNECTOR_APIFY } },
    });
    if (connector && connector.status !== "INACTIVE") {
      const config = connector.config as Record<string, unknown>;
      const apiKey = config.apiKey as string | undefined;
      if (apiKey) {
        return {
          apiKey,
          igActorOverride: (config.actorId as string | undefined) ?? null,
          origin: "VAULT",
        };
      }
    }
  }

  const envToken = process.env.APIFY_TOKEN;
  if (envToken) {
    return { apiKey: envToken, igActorOverride: null, origin: "ENV" };
  }
  return null;
}

/**
 * Teste une clé Apify (bouton « Test » du Credentials Vault). Lit le token du
 * connecteur — QUEL QUE SOIT son statut, car il est INACTIVE à l'instant du test
 * (fallback env `APIFY_TOKEN`) — puis valide contre `/v2/users/me`. Contrairement
 * aux ProviderFaçade broadcast, Apify n'a pas de provider `getProvider()` : ce test
 * dédié fait passer le connecteur ACTIVE sur succès, ce qui débloque
 * `resolveApifyCredentials` (qui ignore les INACTIVE).
 */
export async function testApifyConnection(
  operatorId: string,
): Promise<{ success: boolean; reason?: string }> {
  const connector = await db.externalConnector.findUnique({
    where: { operatorId_connectorType: { operatorId, connectorType: SOCIAL_CONNECTOR_APIFY } },
  });
  const config = (connector?.config ?? {}) as Record<string, unknown>;
  const apiKey = (config.apiKey as string | undefined) ?? process.env.APIFY_TOKEN;
  if (!apiKey) return { success: false, reason: "Aucune clé Apify enregistrée." };

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8_000);
    const res = await fetch(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(apiKey)}`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (res.status === 401 || res.status === 403) return { success: false, reason: "Clé Apify rejetée (401/403)." };
    if (!res.ok) return { success: false, reason: `Apify a répondu ${res.status}.` };
    return { success: true };
  } catch (e) {
    return { success: false, reason: `Apify injoignable : ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * Table de dispatch par plateforme. Instagram, TikTok et Facebook tournent
 * dès qu'un `APIFY_TOKEN` existe (actors par défaut ci-dessous, ~0,001 $/
 * profil) ; mettre l'env var d'actor à "off" désactive une plateforme.
 * LinkedIn : pas d'actor fiable sans cookies — hint footprint only.
 */
const APIFY_ACTORS: Record<
  "INSTAGRAM" | "TIKTOK" | "FACEBOOK",
  {
    envVar: string;
    defaultActorId: string;
    enabledWithoutEnv: boolean;
    buildInput: (handles: string[]) => Record<string, unknown>;
    parseItem: (item: Record<string, unknown>) => Omit<SocialFollowerData, "platform"> | null;
  }
> = {
  INSTAGRAM: {
    envVar: "APIFY_IG_ACTOR_ID",
    defaultActorId: "apify~instagram-profile-scraper",
    enabledWithoutEnv: true,
    buildInput: (handles) => ({ usernames: handles, resultsType: "details", resultsLimit: handles.length }),
    parseItem: (item) => {
      const username = (item.username as string | undefined) ?? "";
      const followerCount = item.followersCount as number | undefined;
      if (!username || typeof followerCount !== "number") return null;
      return {
        handle: username,
        followerCount,
        followingCount: (item.followsCount as number) ?? undefined,
        rawMeta: { ...item, _scraperSource: "apify" },
      };
    },
  },
  TIKTOK: {
    envVar: "APIFY_TIKTOK_ACTOR_ID",
    defaultActorId: "clockworks~tiktok-profile-scraper",
    enabledWithoutEnv: true,
    buildInput: (handles) => ({ profiles: handles, resultsPerPage: 1 }),
    parseItem: (item) => {
      const meta = (item.authorMeta as Record<string, unknown> | undefined) ?? item;
      const handle = (meta.name as string | undefined) ?? (meta.uniqueId as string | undefined) ?? "";
      const followerCount = meta.fans as number | undefined;
      if (!handle || typeof followerCount !== "number") return null;
      return { handle, followerCount, rawMeta: { ...item, _scraperSource: "apify" } };
    },
  },
  FACEBOOK: {
    envVar: "APIFY_FB_ACTOR_ID",
    defaultActorId: "apify~facebook-pages-scraper",
    enabledWithoutEnv: true,
    buildInput: (handles) => ({
      startUrls: handles.map((h) => ({ url: `https://www.facebook.com/${h}` })),
    }),
    parseItem: (item) => {
      const handle =
        (item.pageName as string | undefined) ?? (item.pageUrl as string | undefined) ?? "";
      const followerCount = (item.followers as number | undefined) ?? (item.likes as number | undefined);
      if (!handle || typeof followerCount !== "number") return null;
      return {
        handle: handle.replace(/^https?:\/\/(www\.)?facebook\.com\//, "").replace(/\/$/, ""),
        followerCount,
        rawMeta: { ...item, _scraperSource: "apify" },
      };
    },
  },
};

type ApifyRunOutcome =
  | { kind: "OK"; data: SocialFollowerData[] }
  | { kind: "DEGRADED"; reason: "AUTH_REVOKED" | "RATE_LIMITED" | "VENDOR_OUTAGE" | "INSUFFICIENT_DATA" };

/** Un run d'actor Apify pour une plateforme donnée (run-sync-get-dataset-items). */
async function runApifyActor(
  apiKey: string,
  platform: "INSTAGRAM" | "TIKTOK" | "FACEBOOK",
  actorId: string,
  handles: string[],
  timeoutMs: number,
): Promise<ApifyRunOutcome> {
  const spec = APIFY_ACTORS[platform];
  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(apiKey)}&timeout=${Math.ceil(timeoutMs / 1000)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec.buildInput(handles)),
        signal: AbortSignal.timeout(timeoutMs + 10_000),
      },
    );

    if (runRes.status === 401 || runRes.status === 403) {
      return { kind: "DEGRADED", reason: "AUTH_REVOKED" };
    }
    if (runRes.status === 429) {
      return { kind: "DEGRADED", reason: "RATE_LIMITED" };
    }
    if (!runRes.ok) {
      return { kind: "DEGRADED", reason: "VENDOR_OUTAGE" };
    }

    const items = (await runRes.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(items) || items.length === 0) {
      return { kind: "DEGRADED", reason: "INSUFFICIENT_DATA" };
    }

    const data: SocialFollowerData[] = [];
    for (const item of items) {
      const parsed = spec.parseItem(item);
      if (parsed) data.push({ platform, ...parsed });
    }
    if (data.length === 0) {
      return { kind: "DEGRADED", reason: "INSUFFICIENT_DATA" };
    }
    return { kind: "OK", data };
  } catch (_err) {
    return { kind: "DEGRADED", reason: "VENDOR_OUTAGE" };
  }
}

/**
 * Façade Apify historique (contexte opérateur, IG only, vault-first avec
 * fallback env ADR-0075). Cost model : ~$0.001 per profile.
 */
export async function fetchThirdPartyFollowers(
  operatorId: string,
  strategyId: string | null,
  handles: SocialHandle[],
): Promise<ConnectorResult<SocialFollowerData[]>> {
  const creds = await resolveApifyCredentials(operatorId);
  if (!creds) {
    return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: SOCIAL_CONNECTOR_APIFY };
  }

  const igHandles = handles.filter((h) => h.platform === "INSTAGRAM").map((h) => h.handle.replace(/^@/, ""));
  if (igHandles.length === 0) {
    return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
  }

  const actorId =
    creds.igActorOverride ?? process.env.APIFY_IG_ACTOR_ID ?? APIFY_ACTORS.INSTAGRAM.defaultActorId;
  const outcome = await runApifyActor(creds.apiKey, "INSTAGRAM", actorId, igHandles, 60_000);
  if (outcome.kind === "DEGRADED") {
    return { state: "DEGRADED", reason: outcome.reason };
  }

  for (const data of outcome.data) {
    await persistSnapshot(strategyId, data, "APIFY");
  }
  return { state: "LIVE", data: outcome.data, observedAt: new Date().toISOString() };
}

/**
 * Façade publique (intake, pré-opérateur) — token système `APIFY_TOKEN` (env,
 * ADR-0075), multi-plateforme via APIFY_ACTORS. IG/TikTok/FB tournent par
 * défaut dès que le token existe (vague A) ; opt-out par plateforme via
 * `APIFY_*_ACTOR_ID="off"`. Une plateforme sans handle est SKIPPÉE, pas
 * DEGRADED — aucune dépense forcée. Time-box court par défaut (intake).
 */
export async function fetchPublicFollowers(
  strategyId: string | null,
  handles: SocialHandle[],
  opts?: { operatorId?: string; timeoutMs?: number },
): Promise<ConnectorResult<SocialFollowerData[]>> {
  const creds = await resolveApifyCredentials(opts?.operatorId ?? null);
  if (!creds) {
    return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: SOCIAL_CONNECTOR_APIFY };
  }

  const timeoutMs = opts?.timeoutMs ?? 15_000;
  const results: SocialFollowerData[] = [];
  let worstDegradation: ApifyRunOutcome & { kind: "DEGRADED" } | null = null;

  // Plateformes en PARALLÈLE (2026-07-16) : les runs étaient séquentiels —
  // IG puis TikTok puis FB, chacun 10-60 s de scraping — impossible à tenir
  // dans le budget d'un rapport instantané. Chaque plateforme garde son
  // propre timeout ; le wall-clock total = la plus lente, pas la somme.
  const outcomes = await Promise.all(
    (["INSTAGRAM", "TIKTOK", "FACEBOOK"] as const).map(async (platform) => {
      const spec = APIFY_ACTORS[platform];
      const rawEnvActor = process.env[spec.envVar];
      if (rawEnvActor === "off") return null; // opt-out explicite (même convention que maps/ads)
      const envActor = rawEnvActor || undefined;
      if (!spec.enabledWithoutEnv && !envActor) return null;

      const platformHandles = handles
        .filter((h) => h.platform === platform)
        .map((h) => h.handle.replace(/^@/, ""));
      if (platformHandles.length === 0) return null;

      const actorId =
        envActor ?? (platform === "INSTAGRAM" ? creds.igActorOverride ?? spec.defaultActorId : spec.defaultActorId);
      return runApifyActor(creds.apiKey, platform, actorId, platformHandles, timeoutMs);
    }),
  );
  for (const outcome of outcomes) {
    if (!outcome) continue;
    if (outcome.kind === "OK") {
      for (const data of outcome.data) {
        await persistSnapshot(strategyId, data, "APIFY");
        results.push(data);
      }
    } else {
      worstDegradation = outcome;
    }
  }

  if (results.length > 0) {
    return { state: "LIVE", data: results, observedAt: new Date().toISOString() };
  }
  return { state: "DEGRADED", reason: worstDegradation?.reason ?? "INSUFFICIENT_DATA" };
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
