/**
 * social-connect — connexions « réseaux de la marque » par le founder (ADR-0128).
 *
 * Owning Neter : ANUBIS (Comms — c'est lui qui garde les credentials externes,
 * ADR-0021). Cap APOGEE 7/7 préservé. Zéro LLM — tout est fetch déterministe.
 *
 * Réconcilie trois briques qui existaient déjà sans se parler :
 *   1. `oauth-integrations` (Authorization-Code + AES-GCM) — le flow OAuth réel.
 *   2. `SocialConnection` (Prisma) — le modèle token-par-marque, dormant.
 *   3. `FollowerSnapshot` / community-dashboard — la ventilation de l'audience.
 *
 * Doctrine (identique à brand-email.ts / social-audit.ts) :
 *   - Les tokens vivent en DB **chiffrés AES-GCM** (INTEGRATION_TOKEN_KEY),
 *     jamais en clair, jamais renvoyés au client tRPC, jamais loggés.
 *   - Aucune donnée simulée : provider sans env creds → NOT_CONFIGURED honnête ;
 *     token expiré/révoqué → DEGRADED AUTH_REVOKED + statut ERROR sur la ligne.
 *   - La collecte écrit des `FollowerSnapshot` source="CONNECTOR" — le
 *     community-dashboard et `getConnectedSources` les ventilent déjà.
 */

import type { Prisma, SocialPlatform } from "@prisma/client";
import { db } from "@/lib/db";
import type { ConnectorResult } from "@/domain";
import {
  decryptTokenPayload,
  encryptTokenPayload,
  getProviderConfig,
  type ProviderConfig,
  type SupportedProvider,
  type TokenResponse,
} from "@/server/services/oauth-integrations";

// ── Types ────────────────────────────────────────────────────────────────────

/** Providers OAuth ouverts aux marques (sous-ensemble de SupportedProvider). */
export type BrandSocialProvider = "meta" | "google" | "linkedin" | "x" | "tiktok";

export const BRAND_SOCIAL_PROVIDERS: readonly BrandSocialProvider[] = [
  "meta",
  "google",
  "linkedin",
  "x",
  "tiktok",
];

/** Plateforme (enum Prisma) → provider OAuth qui la porte. */
export const PROVIDER_FOR_PLATFORM: Record<string, BrandSocialProvider> = {
  FACEBOOK: "meta",
  INSTAGRAM: "meta",
  YOUTUBE: "google",
  LINKEDIN: "linkedin",
  TWITTER: "x",
  TIKTOK: "tiktok",
};

/** Scopes lecture-audience par provider (jamais de scope d'écriture/ads ici). */
export const SOCIAL_SCOPES: Record<BrandSocialProvider, readonly string[]> = {
  meta: ["public_profile", "pages_show_list", "pages_read_engagement", "instagram_basic"],
  google: ["openid", "email", "https://www.googleapis.com/auth/youtube.readonly"],
  linkedin: ["openid", "profile", "email"],
  x: ["tweet.read", "users.read", "offline.access"],
  tiktok: ["user.info.basic", "user.info.profile", "user.info.stats"],
};

/** Payload de tokens tel que chiffré dans `SocialConnection.accessToken`. */
export interface SocialTokenPayload {
  access_token: string;
  refresh_token?: string | null;
  obtainedAt: number;
  /** Epoch ms — absent = pas d'expiration connue (page tokens Meta). */
  expiresAt?: number | null;
}

/** Compte découvert chez le provider juste après l'échange OAuth. */
export interface DiscoveredSocialAccount {
  platform: "FACEBOOK" | "INSTAGRAM" | "YOUTUBE" | "LINKEDIN" | "TWITTER" | "TIKTOK";
  accountId: string;
  accountName: string;
  handle: string | null;
  followerCount: number | null;
  tokens: SocialTokenPayload;
}

/** Même compte, tokens déjà chiffrés — SEULE forme qui traverse un Intent. */
export interface EncryptedSocialAccount {
  platform: DiscoveredSocialAccount["platform"];
  accountId: string;
  accountName: string;
  handle: string | null;
  followerCount: number | null;
  encryptedTokens: string;
  tokenExpiresAt: string | null;
}

const FETCH_TIMEOUT_MS = 8_000;

// ── Readiness (env) ──────────────────────────────────────────────────────────

export function integrationKeyReady(): boolean {
  return (process.env.INTEGRATION_TOKEN_KEY ?? "").length >= 32;
}

/** Un provider est « prêt » si ses env creds ET la clé de chiffrement existent. */
export function providerReadiness(): Record<BrandSocialProvider, boolean> {
  const keyOk = integrationKeyReady();
  const out = {} as Record<BrandSocialProvider, boolean>;
  for (const p of BRAND_SOCIAL_PROVIDERS) {
    out[p] = keyOk && getProviderConfig(p) !== null;
  }
  return out;
}

// ── Chiffrement des comptes découverts (pour traverser l'Intent sans secret) ──

export function encryptDiscoveredAccounts(
  accounts: DiscoveredSocialAccount[],
): EncryptedSocialAccount[] {
  return accounts.map((a) => ({
    platform: a.platform,
    accountId: a.accountId,
    accountName: a.accountName,
    handle: a.handle,
    followerCount: a.followerCount,
    encryptedTokens: encryptTokenPayload(a.tokens),
    tokenExpiresAt: a.tokens.expiresAt ? new Date(a.tokens.expiresAt).toISOString() : null,
  }));
}

// ── Découverte de comptes par provider (fetch déterministes, tolérants) ──────

async function jsonFetch(url: string, init?: RequestInit): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function baseTokens(tokens: TokenResponse): SocialTokenPayload {
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    obtainedAt: Date.now(),
    expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
  };
}

/**
 * Interroge le provider pour lister les comptes accessibles avec ce token.
 * Meta → pages Facebook + comptes Instagram Business liés (token de PAGE
 * stocké par ligne — il survit au user token) ; Google → chaîne YouTube ;
 * X → profil ; TikTok → profil ; LinkedIn → profil membre (pas de compteur
 * d'abonnés sans produit organisation — on n'invente rien).
 */
export async function discoverSocialAccounts(
  config: ProviderConfig,
  tokens: TokenResponse,
): Promise<DiscoveredSocialAccount[]> {
  const accounts: DiscoveredSocialAccount[] = [];
  const user = baseTokens(tokens);

  if (config.id === "meta") {
    const json = await jsonFetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,username,access_token,fan_count,followers_count,instagram_business_account%7Bid,username,followers_count%7D&limit=25&access_token=${encodeURIComponent(tokens.access_token)}`,
    );
    const pages = (json?.data as Array<Record<string, unknown>> | undefined) ?? [];
    for (const page of pages) {
      const pageId = String(page.id ?? "");
      if (!pageId) continue;
      const pageToken = typeof page.access_token === "string" ? page.access_token : tokens.access_token;
      // Les page tokens issus d'un user token long-lived n'expirent pas.
      const pageTokens: SocialTokenPayload = {
        access_token: pageToken,
        refresh_token: null,
        obtainedAt: Date.now(),
        expiresAt: null,
      };
      accounts.push({
        platform: "FACEBOOK",
        accountId: pageId,
        accountName: String(page.name ?? pageId),
        handle: typeof page.username === "string" ? page.username : null,
        followerCount:
          typeof page.followers_count === "number"
            ? page.followers_count
            : typeof page.fan_count === "number"
              ? page.fan_count
              : null,
        tokens: pageTokens,
      });
      const ig = page.instagram_business_account as Record<string, unknown> | undefined;
      if (ig && typeof ig.id === "string") {
        accounts.push({
          platform: "INSTAGRAM",
          accountId: ig.id,
          accountName: String(ig.username ?? ig.id),
          handle: typeof ig.username === "string" ? ig.username : null,
          followerCount: typeof ig.followers_count === "number" ? ig.followers_count : null,
          tokens: pageTokens,
        });
      }
    }
  } else if (config.id === "google") {
    const json = await jsonFetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const items = (json?.items as Array<Record<string, unknown>> | undefined) ?? [];
    for (const ch of items) {
      const snippet = (ch.snippet ?? {}) as Record<string, unknown>;
      const stats = (ch.statistics ?? {}) as Record<string, unknown>;
      const hidden = stats.hiddenSubscriberCount === true;
      accounts.push({
        platform: "YOUTUBE",
        accountId: String(ch.id ?? ""),
        accountName: String(snippet.title ?? "Chaîne YouTube"),
        handle: typeof snippet.customUrl === "string" ? snippet.customUrl.replace(/^@/, "") : null,
        followerCount: !hidden && stats.subscriberCount != null ? Number(stats.subscriberCount) : null,
        tokens: user,
      });
    }
  } else if (config.id === "x") {
    const json = await jsonFetch(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics,username,name",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const data = json?.data as Record<string, unknown> | undefined;
    if (data && typeof data.id === "string") {
      const metrics = (data.public_metrics ?? {}) as Record<string, unknown>;
      accounts.push({
        platform: "TWITTER",
        accountId: data.id,
        accountName: String(data.name ?? data.username ?? data.id),
        handle: typeof data.username === "string" ? data.username : null,
        followerCount: typeof metrics.followers_count === "number" ? metrics.followers_count : null,
        tokens: user,
      });
    }
  } else if (config.id === "tiktok") {
    const json = await jsonFetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,follower_count",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const u = ((json?.data as Record<string, unknown> | undefined)?.user ?? null) as
      | Record<string, unknown>
      | null;
    if (u && (typeof u.open_id === "string" || typeof u.union_id === "string")) {
      accounts.push({
        platform: "TIKTOK",
        accountId: String(u.open_id ?? u.union_id),
        accountName: String(u.display_name ?? u.username ?? "Compte TikTok"),
        handle: typeof u.username === "string" ? u.username : null,
        followerCount: typeof u.follower_count === "number" ? u.follower_count : null,
        tokens: user,
      });
    }
  } else if (config.id === "linkedin") {
    const json = await jsonFetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (json && typeof json.sub === "string") {
      accounts.push({
        platform: "LINKEDIN",
        accountId: json.sub,
        accountName: String(json.name ?? "Profil LinkedIn"),
        handle: null,
        // Le compteur d'abonnés organisation exige le produit Community
        // Management — absent = null, jamais 0 fabriqué.
        followerCount: null,
        tokens: user,
      });
    }
  }

  return accounts;
}

// ── Handler Intent : ANUBIS_SOCIAL_CONNECT_ACCOUNT ───────────────────────────

export interface ConnectSocialAccountsInput {
  strategyId: string;
  userId: string;
  provider: BrandSocialProvider;
  accounts: EncryptedSocialAccount[];
  scopes: string[];
}

export interface ConnectSocialAccountsResult {
  connected: Array<{ platform: string; accountName: string }>;
  snapshotsCreated: number;
}

/**
 * Persiste les connexions découvertes (upsert par (strategyId, platform,
 * accountId)) + un premier FollowerSnapshot source=CONNECTOR quand le
 * provider a donné un compteur. Appelé UNIQUEMENT via le dispatch Mestor.
 */
export async function connectSocialAccounts(
  input: ConnectSocialAccountsInput,
): Promise<ConnectSocialAccountsResult> {
  const connected: ConnectSocialAccountsResult["connected"] = [];
  let snapshotsCreated = 0;

  for (const account of input.accounts) {
    const metadata = {
      provider: input.provider,
      scopes: input.scopes,
      handle: account.handle,
      encrypted: true,
      connectedByUserId: input.userId,
      lastSyncAt: new Date().toISOString(),
    };
    await db.socialConnection.upsert({
      where: {
        strategyId_platform_accountId: {
          strategyId: input.strategyId,
          platform: account.platform as SocialPlatform,
          accountId: account.accountId,
        },
      },
      update: {
        accountName: account.accountName,
        accessToken: account.encryptedTokens,
        refreshToken: null,
        tokenExpiry: account.tokenExpiresAt ? new Date(account.tokenExpiresAt) : null,
        status: "ACTIVE",
        metadata: metadata as Prisma.InputJsonValue,
      },
      create: {
        strategyId: input.strategyId,
        userId: input.userId,
        platform: account.platform as SocialPlatform,
        accountId: account.accountId,
        accountName: account.accountName,
        accessToken: account.encryptedTokens,
        refreshToken: null,
        tokenExpiry: account.tokenExpiresAt ? new Date(account.tokenExpiresAt) : null,
        status: "ACTIVE",
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
    connected.push({ platform: account.platform, accountName: account.accountName });

    if (account.followerCount != null) {
      await db.followerSnapshot.create({
        data: {
          strategyId: input.strategyId,
          platform: account.platform as SocialPlatform,
          handle: (account.handle ?? account.accountName).replace(/^@/, ""),
          followerCount: account.followerCount,
          source: "CONNECTOR",
        },
      });
      snapshotsCreated++;
    }
  }

  return { connected, snapshotsCreated };
}

// ── Déconnexion ──────────────────────────────────────────────────────────────

export async function disconnectSocialConnection(
  strategyId: string,
  connectionId: string,
): Promise<{ platform: string; accountName: string }> {
  const row = await db.socialConnection.findFirst({
    where: { id: connectionId, strategyId },
    select: { id: true, platform: true, accountName: true },
  });
  if (!row) throw new Error("Connexion introuvable pour cette marque");
  await db.socialConnection.update({
    where: { id: row.id },
    data: { status: "DISCONNECTED", accessToken: null, refreshToken: null, tokenExpiry: null },
  });
  return { platform: String(row.platform), accountName: row.accountName };
}

// ── Refresh de token (google / x / tiktok — les seuls avec refresh_token) ────

async function refreshTokens(
  provider: BrandSocialProvider,
  payload: SocialTokenPayload,
): Promise<SocialTokenPayload | null> {
  if (!payload.refresh_token) return null;
  const config = getProviderConfig(provider as SupportedProvider);
  if (!config) return null;

  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: payload.refresh_token });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
  if (config.tokenAuth === "basic") {
    headers.Authorization =
      "Basic " + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    body.set("client_id", config.clientId);
  } else if (config.clientIdParam === "client_key") {
    body.set("client_key", config.clientId);
    body.set("client_secret", config.clientSecret);
  } else {
    body.set("client_id", config.clientId);
    body.set("client_secret", config.clientSecret);
  }

  try {
    const res = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as TokenResponse;
    if (!json.access_token) return null;
    return {
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? payload.refresh_token,
      obtainedAt: Date.now(),
      expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : null,
    };
  } catch {
    return null;
  }
}

// ── Sync followers (handler de ANUBIS_SOCIAL_SYNC_FOLLOWERS) ─────────────────

export interface SyncedFollowerRow {
  platform: string;
  handle: string;
  followerCount: number;
}

async function fetchFollowersForConnection(
  platform: string,
  accountId: string,
  accessToken: string,
): Promise<{ handle: string | null; followerCount: number | null } | "AUTH" | "OUTAGE"> {
  const guard = async (url: string, init?: RequestInit) => {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.status === 401 || res.status === 403) return "AUTH" as const;
      if (!res.ok) return "OUTAGE" as const;
      return (await res.json()) as Record<string, unknown>;
    } catch {
      return "OUTAGE" as const;
    }
  };

  if (platform === "FACEBOOK") {
    const json = await guard(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(accountId)}?fields=name,username,fan_count,followers_count&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    return {
      handle: typeof json.username === "string" ? json.username : null,
      followerCount:
        typeof json.followers_count === "number"
          ? json.followers_count
          : typeof json.fan_count === "number"
            ? json.fan_count
            : null,
    };
  }
  if (platform === "INSTAGRAM") {
    const json = await guard(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(accountId)}?fields=username,followers_count&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    return {
      handle: typeof json.username === "string" ? json.username : null,
      followerCount: typeof json.followers_count === "number" ? json.followers_count : null,
    };
  }
  if (platform === "YOUTUBE") {
    const json = await guard(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    const ch = ((json.items as Array<Record<string, unknown>> | undefined) ?? [])[0];
    if (!ch) return { handle: null, followerCount: null };
    const snippet = (ch.snippet ?? {}) as Record<string, unknown>;
    const stats = (ch.statistics ?? {}) as Record<string, unknown>;
    return {
      handle: typeof snippet.customUrl === "string" ? snippet.customUrl.replace(/^@/, "") : null,
      followerCount:
        stats.hiddenSubscriberCount !== true && stats.subscriberCount != null
          ? Number(stats.subscriberCount)
          : null,
    };
  }
  if (platform === "TWITTER") {
    const json = await guard(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics,username",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    const data = (json.data ?? {}) as Record<string, unknown>;
    const metrics = (data.public_metrics ?? {}) as Record<string, unknown>;
    return {
      handle: typeof data.username === "string" ? data.username : null,
      followerCount: typeof metrics.followers_count === "number" ? metrics.followers_count : null,
    };
  }
  if (platform === "TIKTOK") {
    const json = await guard(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,follower_count",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    const u = ((json.data as Record<string, unknown> | undefined)?.user ?? {}) as Record<string, unknown>;
    return {
      handle: typeof u.username === "string" ? u.username : null,
      followerCount: typeof u.follower_count === "number" ? u.follower_count : null,
    };
  }
  // LINKEDIN : compteur organisation non accessible sans produit dédié.
  return { handle: null, followerCount: null };
}

/**
 * Rafraîchit l'audience de toutes les connexions ACTIVE d'une marque.
 * Persiste un FollowerSnapshot source=CONNECTOR par compte mesuré.
 * Contract P22-1 : LIVE / DEGRADED — jamais de zéro silencieux.
 */
export async function syncStrategySocialFollowers(
  strategyId: string,
): Promise<ConnectorResult<SyncedFollowerRow[]>> {
  const connections = await db.socialConnection.findMany({
    where: { strategyId, status: "ACTIVE" },
  });
  if (connections.length === 0) {
    return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
  }
  if (!integrationKeyReady()) {
    return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: "INTEGRATION_TOKEN_KEY" };
  }

  const rows: SyncedFollowerRow[] = [];
  let sawAuthFailure = false;
  let sawOutage = false;

  for (const conn of connections) {
    if (!conn.accessToken) {
      sawAuthFailure = true;
      continue;
    }
    let payload: SocialTokenPayload;
    try {
      payload = decryptTokenPayload<SocialTokenPayload>(conn.accessToken);
    } catch {
      sawAuthFailure = true;
      continue;
    }

    const meta = (conn.metadata ?? {}) as Record<string, unknown>;
    const provider =
      (meta.provider as BrandSocialProvider | undefined) ??
      PROVIDER_FOR_PLATFORM[String(conn.platform)];

    // Refresh proactif si le token expire dans < 60 s.
    if (payload.expiresAt && payload.expiresAt < Date.now() + 60_000) {
      const refreshed = provider ? await refreshTokens(provider, payload) : null;
      if (refreshed) {
        payload = refreshed;
        await db.socialConnection.update({
          where: { id: conn.id },
          data: {
            accessToken: encryptTokenPayload(refreshed),
            tokenExpiry: refreshed.expiresAt ? new Date(refreshed.expiresAt) : null,
          },
        });
      } else {
        await db.socialConnection.update({ where: { id: conn.id }, data: { status: "ERROR" } });
        sawAuthFailure = true;
        continue;
      }
    }

    const result = await fetchFollowersForConnection(
      String(conn.platform),
      conn.accountId,
      payload.access_token,
    );
    if (result === "AUTH") {
      await db.socialConnection.update({ where: { id: conn.id }, data: { status: "ERROR" } });
      sawAuthFailure = true;
      continue;
    }
    if (result === "OUTAGE") {
      sawOutage = true;
      continue;
    }

    await db.socialConnection.update({
      where: { id: conn.id },
      data: {
        metadata: { ...meta, lastSyncAt: new Date().toISOString() } as Prisma.InputJsonValue,
      },
    });

    if (result.followerCount != null) {
      const handle = (result.handle ?? conn.accountName).replace(/^@/, "");
      await db.followerSnapshot.create({
        data: {
          strategyId,
          platform: conn.platform,
          handle,
          followerCount: result.followerCount,
          source: "CONNECTOR",
        },
      });
      rows.push({ platform: String(conn.platform), handle, followerCount: result.followerCount });
    }
  }

  if (rows.length > 0) {
    return { state: "LIVE", data: rows, observedAt: new Date().toISOString() };
  }
  if (sawAuthFailure) return { state: "DEGRADED", reason: "AUTH_REVOKED" };
  if (sawOutage) return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
  return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
}

// ── Lecture composée pour le cockpit (read-only, zéro secret) ────────────────

export interface BrandSocialHubRow {
  platform: string;
  provider: BrandSocialProvider;
  /** État honnête de la plateforme pour CETTE marque. */
  state: "CONNECTED" | "ERROR" | "DISCONNECTED" | "NOT_CONNECTED" | "PROVIDER_UNAVAILABLE";
  accountName: string | null;
  handle: string | null;
  followerCount: number | null;
  followerSource: string | null;
  followerCapturedAt: string | null;
  lastSyncAt: string | null;
  connectionId: string | null;
}

export async function getBrandSocialHubData(strategyId: string): Promise<{
  rows: BrandSocialHubRow[];
  anyProviderReady: boolean;
  encryptionReady: boolean;
}> {
  const readiness = providerReadiness();
  const [connections, snapshots] = await Promise.all([
    db.socialConnection.findMany({
      where: { strategyId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        platform: true,
        accountName: true,
        status: true,
        metadata: true,
        updatedAt: true,
      },
    }),
    db.followerSnapshot.findMany({
      where: { strategyId },
      orderBy: { capturedAt: "desc" },
      take: 120,
      select: { platform: true, handle: true, followerCount: true, source: true, capturedAt: true },
    }),
  ]);

  const latestSnap = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    if (!latestSnap.has(String(s.platform))) latestSnap.set(String(s.platform), s);
  }
  const latestConn = new Map<string, (typeof connections)[number]>();
  for (const c of connections) {
    if (!latestConn.has(String(c.platform))) latestConn.set(String(c.platform), c);
  }

  const rows: BrandSocialHubRow[] = Object.entries(PROVIDER_FOR_PLATFORM).map(
    ([platform, provider]) => {
      const conn = latestConn.get(platform);
      const snap = latestSnap.get(platform);
      const meta = (conn?.metadata ?? {}) as Record<string, unknown>;
      let state: BrandSocialHubRow["state"];
      if (conn?.status === "ACTIVE") state = "CONNECTED";
      else if (conn?.status === "ERROR") state = "ERROR";
      else if (conn?.status === "DISCONNECTED" || conn?.status === "PAUSED") state = "DISCONNECTED";
      else if (!readiness[provider]) state = "PROVIDER_UNAVAILABLE";
      else state = "NOT_CONNECTED";
      return {
        platform,
        provider,
        state,
        accountName: conn?.accountName ?? null,
        handle: (typeof meta.handle === "string" ? meta.handle : null) ?? snap?.handle ?? null,
        followerCount: snap?.followerCount ?? null,
        followerSource: snap?.source ?? null,
        followerCapturedAt: snap?.capturedAt.toISOString() ?? null,
        lastSyncAt: typeof meta.lastSyncAt === "string" ? meta.lastSyncAt : null,
        connectionId: conn?.id ?? null,
      };
    },
  );

  return {
    rows,
    anyProviderReady: Object.values(readiness).some(Boolean),
    encryptionReady: integrationKeyReady(),
  };
}
