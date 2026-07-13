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
 *   - Périmètre de CE service (boucle passive de télémétrie) : données DE LA
 *     MARQUE (pages, publications, métriques, profil public) au MAXIMUM des
 *     scopes accordés — et rien des tiers ICI (pas de texte de commentaire,
 *     pas d'identité d'abonné, pas de DM dans la boucle de fond : on ne
 *     stocke pas ce qu'aucune surface ne consomme, et /data-deletion décrit
 *     ce périmètre-là).
 *   - L'engagement des tiers (commentaires, DM, mentions AVEC identités) est
 *     un ORGANE PRODUIT distinct — l'Inbox unifiée (benchmark §S3,
 *     `SocialInboxItem`, doctrine « rival Sprout » confirmée opérateur) : il
 *     arrivera avec ses scopes dédiés (pages_manage_engagement,
 *     instagram_manage_comments, messaging), son propre service, la surface
 *     d'assignation ADR-0129, et la mise à jour de /privacy + /data-deletion
 *     (rôle processor pour le compte de la marque — le modèle Sprout).
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

/**
 * Scopes par provider — mandat « tout depuis l'app » (ADR-0133) : lecture
 * d'audience + PILOTAGE (publier, répondre, mesurer). En mode développement
 * Meta/Google, ces scopes fonctionnent immédiatement pour les comptes
 * testeurs ; l'App Review (soumission groupée, RESIDUAL-DEBT §ADR-0128)
 * n'est requise que pour ouvrir au public. JAMAIS de scope publicitaire
 * (/ads/), ni messaging (DM = vague ultérieure), ni upload vidéo YT.
 */
export const SOCIAL_SCOPES: Record<BrandSocialProvider, readonly string[]> = {
  meta: [
    "public_profile",
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "pages_manage_posts",
    "pages_manage_engagement",
    "read_insights",
    "instagram_content_publish",
    "instagram_manage_comments",
    "instagram_manage_insights",
  ],
  google: [
    "openid",
    "email",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
  ],
  linkedin: ["openid", "profile", "email", "w_member_social"],
  x: ["tweet.read", "users.read", "offline.access"],
  tiktok: ["user.info.basic", "user.info.profile", "user.info.stats"],
};

/**
 * True ssi la connexion stockée porte déjà tous les scopes courants du
 * provider — sinon l'UI propose « Reconnecter » pour activer les nouvelles
 * capacités (publier/répondre/mesurer) sans jamais casser l'existant.
 */
export function hasAllCurrentScopes(
  provider: BrandSocialProvider,
  storedScopes: unknown,
): boolean {
  if (!Array.isArray(storedScopes)) return false;
  const stored = new Set(storedScopes.map((s) => String(s).toLowerCase()));
  return SOCIAL_SCOPES[provider].every((s) => stored.has(s.toLowerCase()));
}

/** Payload de tokens tel que chiffré dans `SocialConnection.accessToken`. */
export interface SocialTokenPayload {
  access_token: string;
  refresh_token?: string | null;
  obtainedAt: number;
  /** Epoch ms — absent = pas d'expiration connue (page tokens Meta). */
  expiresAt?: number | null;
}

/**
 * Profil public DE LA MARQUE tel que la plateforme le publie — alimente le
 * pilier E (empreinte publique) et le dashboard. Tout est nullable : une
 * plateforme qui ne fournit pas un champ = null, jamais une valeur fabriquée.
 */
export interface AccountProfile {
  /** Bio / à-propos publié par la marque (FB about, IG biography, YT description…). */
  bio: string | null;
  /** Site web déclaré sur le profil. */
  website: string | null;
  /** Catégorie déclarée (FB Page category). */
  category: string | null;
  /** Localisation publiée (ville, pays) quand la plateforme l'expose. */
  location: string | null;
  /** Comptes suivis par la marque. */
  followingCount: number | null;
  /** Nombre de publications/médias/vidéos publiés. */
  mediaCount: number | null;
  /** Vues cumulées de la chaîne/du compte (YT viewCount, TikTok likes_count). */
  totalViews: number | null;
  /** Avatar/photo de profil publié. */
  pictureUrl: string | null;
}

/** Compte découvert chez le provider juste après l'échange OAuth. */
export interface DiscoveredSocialAccount {
  platform: "FACEBOOK" | "INSTAGRAM" | "YOUTUBE" | "LINKEDIN" | "TWITTER" | "TIKTOK";
  accountId: string;
  accountName: string;
  handle: string | null;
  followerCount: number | null;
  followingCount: number | null;
  profile: AccountProfile | null;
  tokens: SocialTokenPayload;
}

/** Même compte, tokens déjà chiffrés — SEULE forme qui traverse un Intent. */
export interface EncryptedSocialAccount {
  platform: DiscoveredSocialAccount["platform"];
  accountId: string;
  accountName: string;
  handle: string | null;
  followerCount: number | null;
  followingCount: number | null;
  /** Profil public de la marque — non-secret, voyage en clair dans l'Intent. */
  profile: AccountProfile | null;
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
    followingCount: a.followingCount,
    profile: a.profile,
    encryptedTokens: encryptTokenPayload(a.tokens),
    tokenExpiresAt: a.tokens.expiresAt ? new Date(a.tokens.expiresAt).toISOString() : null,
  }));
}

/** Normalise un profil : null si la plateforme n'a rien fourni du tout. */
function toProfile(p: Partial<AccountProfile>): AccountProfile | null {
  const profile: AccountProfile = {
    bio: p.bio ?? null,
    website: p.website ?? null,
    category: p.category ?? null,
    location: p.location ?? null,
    followingCount: p.followingCount ?? null,
    mediaCount: p.mediaCount ?? null,
    totalViews: p.totalViews ?? null,
    pictureUrl: p.pictureUrl ?? null,
  };
  return Object.values(profile).every((v) => v == null) ? null : profile;
}

function asStr(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function asNum(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
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
    // Collecte maximale sous pages_show_list + pages_read_engagement +
    // instagram_basic : identité, audience ET profil public de chaque Page /
    // compte IG Business (about, catégorie, site, localisation, volumes).
    const FB_PAGE_FIELDS =
      "id,name,username,access_token,fan_count,followers_count,about,category,website,link,location{city,country}";
    const IG_FIELDS =
      "instagram_business_account{id,username,name,followers_count,follows_count,media_count,biography,website,profile_picture_url}";
    const json = await jsonFetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=${encodeURIComponent(`${FB_PAGE_FIELDS},${IG_FIELDS}`)}&limit=25&access_token=${encodeURIComponent(tokens.access_token)}`,
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
      const loc = (page.location ?? null) as Record<string, unknown> | null;
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
        followingCount: null,
        profile: toProfile({
          bio: asStr(page.about),
          category: asStr(page.category),
          website: asStr(page.website) ?? asStr(page.link),
          location: loc ? [asStr(loc.city), asStr(loc.country)].filter(Boolean).join(", ") || null : null,
        }),
        tokens: pageTokens,
      });
      const ig = page.instagram_business_account as Record<string, unknown> | undefined;
      if (ig && typeof ig.id === "string") {
        accounts.push({
          platform: "INSTAGRAM",
          accountId: ig.id,
          accountName: String(ig.name ?? ig.username ?? ig.id),
          handle: typeof ig.username === "string" ? ig.username : null,
          followerCount: typeof ig.followers_count === "number" ? ig.followers_count : null,
          followingCount: asNum(ig.follows_count),
          profile: toProfile({
            bio: asStr(ig.biography),
            website: asStr(ig.website),
            followingCount: asNum(ig.follows_count),
            mediaCount: asNum(ig.media_count),
            pictureUrl: asStr(ig.profile_picture_url),
          }),
          tokens: pageTokens,
        });
      }
    }
  } else if (config.id === "google") {
    // youtube.readonly : identité + audience + statistiques CUMULÉES de la
    // chaîne (vues totales, nombre de vidéos) + description/pays.
    const json = await jsonFetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const items = (json?.items as Array<Record<string, unknown>> | undefined) ?? [];
    for (const ch of items) {
      const snippet = (ch.snippet ?? {}) as Record<string, unknown>;
      const stats = (ch.statistics ?? {}) as Record<string, unknown>;
      const thumbs = (snippet.thumbnails ?? {}) as Record<string, Record<string, unknown>>;
      const hidden = stats.hiddenSubscriberCount === true;
      accounts.push({
        platform: "YOUTUBE",
        accountId: String(ch.id ?? ""),
        accountName: String(snippet.title ?? "Chaîne YouTube"),
        handle: typeof snippet.customUrl === "string" ? snippet.customUrl.replace(/^@/, "") : null,
        followerCount: !hidden && stats.subscriberCount != null ? Number(stats.subscriberCount) : null,
        followingCount: null,
        profile: toProfile({
          bio: asStr(snippet.description),
          location: asStr(snippet.country),
          mediaCount: asNum(stats.videoCount),
          totalViews: asNum(stats.viewCount),
          pictureUrl: asStr(thumbs.medium?.url) ?? asStr(thumbs.default?.url),
        }),
        tokens: user,
      });
    }
  } else if (config.id === "x") {
    const json = await jsonFetch(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics,username,name,description,url,location,profile_image_url",
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
        followingCount: asNum(metrics.following_count),
        profile: toProfile({
          bio: asStr(data.description),
          website: asStr(data.url),
          location: asStr(data.location),
          followingCount: asNum(metrics.following_count),
          mediaCount: asNum(metrics.tweet_count),
          pictureUrl: asStr(data.profile_image_url),
        }),
        tokens: user,
      });
    }
  } else if (config.id === "tiktok") {
    // user.info.basic + user.info.profile + user.info.stats : tout le profil
    // public (bio, lien profond, avatar) + volumes (vidéos, likes cumulés).
    const json = await jsonFetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,username,bio_description,profile_deep_link,avatar_url,follower_count,following_count,likes_count,video_count",
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
        followingCount: asNum(u.following_count),
        profile: toProfile({
          bio: asStr(u.bio_description),
          website: asStr(u.profile_deep_link),
          followingCount: asNum(u.following_count),
          mediaCount: asNum(u.video_count),
          totalViews: asNum(u.likes_count),
          pictureUrl: asStr(u.avatar_url),
        }),
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
        followingCount: null,
        profile: toProfile({ pictureUrl: asStr(json.picture) }),
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
      // Profil public de la marque tel que publié par la plateforme —
      // alimente pilier E + dashboard. Non-secret par construction.
      profile: account.profile ?? null,
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
          followingCount: account.followingCount,
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

interface FollowerFetchResult {
  handle: string | null;
  followerCount: number | null;
  followingCount: number | null;
  /** Profil public rafraîchi à chaque sync (bio/site/catégorie/volumes). */
  profile: AccountProfile | null;
}

async function fetchFollowersForConnection(
  platform: string,
  accountId: string,
  accessToken: string,
): Promise<FollowerFetchResult | "AUTH" | "OUTAGE"> {
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
      `https://graph.facebook.com/v21.0/${encodeURIComponent(accountId)}?fields=${encodeURIComponent("name,username,fan_count,followers_count,about,category,website,link,location{city,country}")}&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    const loc = (json.location ?? null) as Record<string, unknown> | null;
    return {
      handle: typeof json.username === "string" ? json.username : null,
      followerCount:
        typeof json.followers_count === "number"
          ? json.followers_count
          : typeof json.fan_count === "number"
            ? json.fan_count
            : null,
      followingCount: null,
      profile: toProfile({
        bio: asStr(json.about),
        category: asStr(json.category),
        website: asStr(json.website) ?? asStr(json.link),
        location: loc ? [asStr(loc.city), asStr(loc.country)].filter(Boolean).join(", ") || null : null,
      }),
    };
  }
  if (platform === "INSTAGRAM") {
    const json = await guard(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(accountId)}?fields=username,name,followers_count,follows_count,media_count,biography,website,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    return {
      handle: typeof json.username === "string" ? json.username : null,
      followerCount: typeof json.followers_count === "number" ? json.followers_count : null,
      followingCount: asNum(json.follows_count),
      profile: toProfile({
        bio: asStr(json.biography),
        website: asStr(json.website),
        followingCount: asNum(json.follows_count),
        mediaCount: asNum(json.media_count),
        pictureUrl: asStr(json.profile_picture_url),
      }),
    };
  }
  if (platform === "YOUTUBE") {
    const json = await guard(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    const ch = ((json.items as Array<Record<string, unknown>> | undefined) ?? [])[0];
    if (!ch) return { handle: null, followerCount: null, followingCount: null, profile: null };
    const snippet = (ch.snippet ?? {}) as Record<string, unknown>;
    const stats = (ch.statistics ?? {}) as Record<string, unknown>;
    const thumbs = (snippet.thumbnails ?? {}) as Record<string, Record<string, unknown>>;
    return {
      handle: typeof snippet.customUrl === "string" ? snippet.customUrl.replace(/^@/, "") : null,
      followerCount:
        stats.hiddenSubscriberCount !== true && stats.subscriberCount != null
          ? Number(stats.subscriberCount)
          : null,
      followingCount: null,
      profile: toProfile({
        bio: asStr(snippet.description),
        location: asStr(snippet.country),
        mediaCount: asNum(stats.videoCount),
        totalViews: asNum(stats.viewCount),
        pictureUrl: asStr(thumbs.medium?.url) ?? asStr(thumbs.default?.url),
      }),
    };
  }
  if (platform === "TWITTER") {
    const json = await guard(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics,username,description,url,location,profile_image_url",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    const data = (json.data ?? {}) as Record<string, unknown>;
    const metrics = (data.public_metrics ?? {}) as Record<string, unknown>;
    return {
      handle: typeof data.username === "string" ? data.username : null,
      followerCount: typeof metrics.followers_count === "number" ? metrics.followers_count : null,
      followingCount: asNum(metrics.following_count),
      profile: toProfile({
        bio: asStr(data.description),
        website: asStr(data.url),
        location: asStr(data.location),
        followingCount: asNum(metrics.following_count),
        mediaCount: asNum(metrics.tweet_count),
        pictureUrl: asStr(data.profile_image_url),
      }),
    };
  }
  if (platform === "TIKTOK") {
    const json = await guard(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,username,bio_description,profile_deep_link,avatar_url,follower_count,following_count,likes_count,video_count",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    const u = ((json.data as Record<string, unknown> | undefined)?.user ?? {}) as Record<string, unknown>;
    return {
      handle: typeof u.username === "string" ? u.username : null,
      followerCount: typeof u.follower_count === "number" ? u.follower_count : null,
      followingCount: asNum(u.following_count),
      profile: toProfile({
        bio: asStr(u.bio_description),
        website: asStr(u.profile_deep_link),
        followingCount: asNum(u.following_count),
        mediaCount: asNum(u.video_count),
        totalViews: asNum(u.likes_count),
        pictureUrl: asStr(u.avatar_url),
      }),
    };
  }
  // LINKEDIN : compteur organisation non accessible sans produit dédié.
  return { handle: null, followerCount: null, followingCount: null, profile: null };
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

    // Profil public rafraîchi à chaque sync — on ne l'efface jamais avec un
    // null si la plateforme a répondu partiellement.
    const nextMeta: Record<string, unknown> = { ...meta, lastSyncAt: new Date().toISOString() };
    if (result.profile) nextMeta.profile = result.profile;
    await db.socialConnection.update({
      where: { id: conn.id },
      data: { metadata: nextMeta as Prisma.InputJsonValue },
    });

    if (result.followerCount != null) {
      const handle = (result.handle ?? conn.accountName).replace(/^@/, "");
      await db.followerSnapshot.create({
        data: {
          strategyId,
          platform: conn.platform,
          handle,
          followerCount: result.followerCount,
          followingCount: result.followingCount,
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

// ── Sync des publications (handler de ANUBIS_SYNC_SOCIAL_POSTS — P1 validé) ──
//
// Donne au modèle dormant `SocialPost` son premier écrivain de production
// (même geste que SocialConnection en vague ADR-0128). Lecture seule des
// métriques PUBLIQUES par post (likes/commentaires/partages/vues) sur les
// plateformes accessibles sans review supplémentaire en mode testeurs :
// Facebook Page, Instagram Business, YouTube. X (payant à l'appel — P5),
// TikTok (scope video.list non demandé) et LinkedIn (produit CM requis)
// sont déclarés UNSUPPORTED — jamais un zéro silencieux.

export interface SyncedPostsRow {
  platform: string;
  fetched: number;
  upserted: number;
}

interface FetchedPost {
  externalPostId: string;
  content: string | null;
  publishedAt: string | null;
  likes: number;
  comments: number;
  shares: number;
  /** Vues/impressions quand la plateforme les publie (YT viewCount). */
  reach: number;
  /** Type de média (IMAGE/VIDEO/CAROUSEL_ALBUM/…) quand publié. */
  mediaType: string | null;
  /** Permalink public de la publication. */
  permalinkUrl: string | null;
  /** Visuel (image ou miniature) publié par la plateforme. */
  mediaUrl: string | null;
}

const POSTS_PER_SYNC = 25;

function toCount(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

async function fetchPostsForConnection(
  platform: string,
  accountId: string,
  accessToken: string,
): Promise<FetchedPost[] | "AUTH" | "OUTAGE" | "UNSUPPORTED"> {
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
      `https://graph.facebook.com/v21.0/${encodeURIComponent(accountId)}/posts?fields=${encodeURIComponent("id,message,created_time,permalink_url,full_picture,attachments{media_type},shares,likes.summary(true).limit(0),comments.summary(true).limit(0)")}&limit=${POSTS_PER_SYNC}&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    const items = (json.data as Array<Record<string, unknown>> | undefined) ?? [];
    return items.map((p) => {
      const likes = ((p.likes as Record<string, unknown> | undefined)?.summary ?? {}) as Record<string, unknown>;
      const comments = ((p.comments as Record<string, unknown> | undefined)?.summary ?? {}) as Record<string, unknown>;
      const shares = (p.shares ?? {}) as Record<string, unknown>;
      const att = (((p.attachments as Record<string, unknown> | undefined)?.data ?? []) as Array<Record<string, unknown>>)[0];
      return {
        externalPostId: String(p.id ?? ""),
        content: typeof p.message === "string" ? p.message.slice(0, 500) : null,
        publishedAt: typeof p.created_time === "string" ? p.created_time : null,
        likes: toCount(likes.total_count),
        comments: toCount(comments.total_count),
        shares: toCount(shares.count),
        reach: 0,
        mediaType: att && typeof att.media_type === "string" ? att.media_type.toUpperCase() : null,
        permalinkUrl: asStr(p.permalink_url),
        mediaUrl: asStr(p.full_picture),
      };
    }).filter((p) => p.externalPostId);
  }

  if (platform === "INSTAGRAM") {
    const json = await guard(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(accountId)}/media?fields=id,caption,timestamp,like_count,comments_count,media_type,media_url,thumbnail_url,permalink&limit=${POSTS_PER_SYNC}&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    const items = (json.data as Array<Record<string, unknown>> | undefined) ?? [];
    return items.map((m) => ({
      externalPostId: String(m.id ?? ""),
      content: typeof m.caption === "string" ? m.caption.slice(0, 500) : null,
      publishedAt: typeof m.timestamp === "string" ? m.timestamp : null,
      likes: toCount(m.like_count),
      comments: toCount(m.comments_count),
      shares: 0,
      reach: 0,
      mediaType: asStr(m.media_type),
      permalinkUrl: asStr(m.permalink),
      // media_url absent sur certaines vidéos (droits musique) → miniature.
      mediaUrl: asStr(m.media_url) ?? asStr(m.thumbnail_url),
    })).filter((p) => p.externalPostId);
  }

  if (platform === "YOUTUBE") {
    // 1. Playlist « uploads » de la chaîne → 2. items récents → 3. statistiques.
    const chan = await guard(
      "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (chan === "AUTH" || chan === "OUTAGE") return chan;
    const uploads = (((((chan.items as Array<Record<string, unknown>> | undefined) ?? [])[0]
      ?.contentDetails as Record<string, unknown> | undefined)
      ?.relatedPlaylists as Record<string, unknown> | undefined)
      ?.uploads) as string | undefined;
    if (!uploads) return [];
    const list = await guard(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${encodeURIComponent(uploads)}&maxResults=${POSTS_PER_SYNC}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (list === "AUTH" || list === "OUTAGE") return list;
    const videoIds = (((list.items as Array<Record<string, unknown>> | undefined) ?? [])
      .map((i) => ((i.contentDetails ?? {}) as Record<string, unknown>).videoId)
      .filter((v): v is string => typeof v === "string"));
    if (videoIds.length === 0) return [];
    const vids = await guard(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.map(encodeURIComponent).join(",")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (vids === "AUTH" || vids === "OUTAGE") return vids;
    return (((vids.items as Array<Record<string, unknown>> | undefined) ?? []).map((v) => {
      const sn = (v.snippet ?? {}) as Record<string, unknown>;
      const st = (v.statistics ?? {}) as Record<string, unknown>;
      const th = (sn.thumbnails ?? {}) as Record<string, Record<string, unknown>>;
      const id = String(v.id ?? "");
      return {
        externalPostId: id,
        content: typeof sn.title === "string" ? sn.title.slice(0, 500) : null,
        publishedAt: typeof sn.publishedAt === "string" ? sn.publishedAt : null,
        likes: toCount(st.likeCount),
        comments: toCount(st.commentCount),
        shares: 0,
        reach: toCount(st.viewCount),
        mediaType: "VIDEO",
        permalinkUrl: id ? `https://www.youtube.com/watch?v=${id}` : null,
        mediaUrl: asStr(th.medium?.url) ?? asStr(th.default?.url),
      };
    })).filter((p) => p.externalPostId);
  }

  // X = payant à l'appel (pay-per-use, plan P5) · TikTok = scope video.list
  // non demandé en v1 · LinkedIn = produit Community Management requis.
  return "UNSUPPORTED";
}

/**
 * Collecte les publications récentes de toutes les connexions ACTIVE d'une
 * marque et upsert `SocialPost` (unique connectionId+externalPostId).
 * Contract P22-1 — les plateformes non couvertes sont dites UNSUPPORTED,
 * jamais comptées à zéro.
 */
export async function syncStrategySocialPosts(
  strategyId: string,
): Promise<ConnectorResult<SyncedPostsRow[]>> {
  const connections = await db.socialConnection.findMany({
    where: { strategyId, status: "ACTIVE" },
  });
  if (connections.length === 0) {
    return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
  }
  if (!integrationKeyReady()) {
    return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: "INTEGRATION_TOKEN_KEY" };
  }

  const rows: SyncedPostsRow[] = [];
  let sawAuthFailure = false;
  let sawOutage = false;

  for (const conn of connections) {
    if (!conn.accessToken) { sawAuthFailure = true; continue; }
    let payload: SocialTokenPayload;
    try {
      payload = decryptTokenPayload<SocialTokenPayload>(conn.accessToken);
    } catch { sawAuthFailure = true; continue; }

    const meta = (conn.metadata ?? {}) as Record<string, unknown>;
    const provider =
      (meta.provider as BrandSocialProvider | undefined) ??
      PROVIDER_FOR_PLATFORM[String(conn.platform)];

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

    const fetched = await fetchPostsForConnection(
      String(conn.platform),
      conn.accountId,
      payload.access_token,
    );
    if (fetched === "AUTH") {
      await db.socialConnection.update({ where: { id: conn.id }, data: { status: "ERROR" } });
      sawAuthFailure = true;
      continue;
    }
    if (fetched === "OUTAGE") { sawOutage = true; continue; }
    if (fetched === "UNSUPPORTED") continue;

    // Taux d'engagement vs dernier relevé d'audience de la plateforme (si connu).
    const lastSnapshot = await db.followerSnapshot.findFirst({
      where: { strategyId, platform: conn.platform },
      orderBy: { capturedAt: "desc" },
      select: { followerCount: true },
    });
    const followers = lastSnapshot?.followerCount ?? null;

    let upserted = 0;
    for (const p of fetched) {
      const engagement = p.likes + p.comments + p.shares;
      await db.socialPost.upsert({
        where: { connectionId_externalPostId: { connectionId: conn.id, externalPostId: p.externalPostId } },
        update: {
          likes: p.likes,
          comments: p.comments,
          shares: p.shares,
          reach: p.reach,
          engagementRate: followers && followers > 0 ? engagement / followers : null,
          mediaType: p.mediaType,
          permalinkUrl: p.permalinkUrl,
          mediaUrl: p.mediaUrl,
        },
        create: {
          connectionId: conn.id,
          strategyId,
          externalPostId: p.externalPostId,
          content: p.content,
          publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
          likes: p.likes,
          comments: p.comments,
          shares: p.shares,
          reach: p.reach,
          engagementRate: followers && followers > 0 ? engagement / followers : null,
          mediaType: p.mediaType,
          permalinkUrl: p.permalinkUrl,
          mediaUrl: p.mediaUrl,
        },
      });
      upserted++;
    }
    rows.push({ platform: String(conn.platform), fetched: fetched.length, upserted });
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
  /** true = la connexion date d'avant les scopes de pilotage → « Reconnecter ». */
  scopesOutdated: boolean;
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

  // Relevé le plus récent par compte (platform + handle) ET par plateforme
  // (repli quand un seul compte). Facebook peut connecter PLUSIEURS Pages —
  // chacune a son propre relevé.
  const snapByAccount = new Map<string, (typeof snapshots)[number]>();
  const latestSnap = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    const p = String(s.platform);
    const key = `${p}:${String(s.handle).toLowerCase()}`;
    if (!snapByAccount.has(key)) snapByAccount.set(key, s);
    if (!latestSnap.has(p)) latestSnap.set(p, s);
  }
  // Toutes les connexions groupées par plateforme (une marque peut avoir
  // plusieurs Pages Facebook connectées — on ne dédoublonne PLUS).
  const connByPlatform = new Map<string, (typeof connections)>();
  for (const c of connections) {
    const p = String(c.platform);
    const arr = connByPlatform.get(p) ?? [];
    arr.push(c);
    connByPlatform.set(p, arr);
  }

  const rows: BrandSocialHubRow[] = [];
  for (const [platform, provider] of Object.entries(PROVIDER_FOR_PLATFORM)) {
    const conns = connByPlatform.get(platform) ?? [];
    // Comptes « vivants » = ACTIVE ou ERROR (à reconnecter) — un par ligne.
    const live = conns.filter((c) => c.status === "ACTIVE" || c.status === "ERROR");
    if (live.length > 0) {
      for (const conn of live) {
        const meta = (conn.metadata ?? {}) as Record<string, unknown>;
        const handle = typeof meta.handle === "string" ? meta.handle : null;
        const snap =
          (handle ? snapByAccount.get(`${platform}:${handle.toLowerCase()}`) : undefined) ??
          (live.length === 1 ? latestSnap.get(platform) : undefined);
        rows.push({
          platform,
          provider,
          state: conn.status === "ACTIVE" ? "CONNECTED" : "ERROR",
          accountName: conn.accountName ?? null,
          handle: handle ?? snap?.handle ?? null,
          followerCount: snap?.followerCount ?? null,
          followerSource: snap?.source ?? null,
          followerCapturedAt: snap?.capturedAt.toISOString() ?? null,
          lastSyncAt: typeof meta.lastSyncAt === "string" ? meta.lastSyncAt : null,
          connectionId: conn.id,
          scopesOutdated:
            conn.status === "ACTIVE" && !hasAllCurrentScopes(provider, meta.scopes),
        });
      }
    } else {
      // Aucun compte vivant → une ligne d'état (à connecter / bientôt / déco).
      const disc = conns.find((c) => c.status === "DISCONNECTED" || c.status === "PAUSED");
      const snap = latestSnap.get(platform);
      rows.push({
        platform,
        provider,
        state: disc
          ? "DISCONNECTED"
          : !readiness[provider]
            ? "PROVIDER_UNAVAILABLE"
            : "NOT_CONNECTED",
        accountName: null,
        handle: snap?.handle ?? null,
        followerCount: snap?.followerCount ?? null,
        followerSource: snap?.source ?? null,
        followerCapturedAt: snap?.capturedAt.toISOString() ?? null,
        lastSyncAt: null,
        connectionId: null,
        scopesOutdated: false,
      });
    }
  }

  return {
    rows,
    anyProviderReady: Object.values(readiness).some(Boolean),
    encryptionReady: integrationKeyReady(),
  };
}
