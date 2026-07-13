/**
 * social-inbox — l'Inbox unifiée de la marque (ADR-0133, doctrine « rival
 * Sprout » — mandat opérateur 12/07 : « je veux les commentaires […] tout le
 * nécessaire pour piloter »).
 *
 * Owning Neter : ANUBIS. Service DISTINCT de social-connect : ICI vivent les
 * interactions des TIERS adressées à la marque (commentaires v1 ; mentions/
 * DM/avis = vagues suivantes). PII de tiers assumée et ENCADRÉE :
 *   - rôle processor pour le compte de la marque (modèle Sprout) — copy
 *     /privacy + /cgu + /data-deletion alignée (même vague ADR-0133) ;
 *   - écrivains UNIQUEMENT via Intents gouvernés (ANUBIS_SYNC_INBOX /
 *     ANUBIS_REPLY_COMMENT) ;
 *   - purge : déconnexion du réseau = arrêt de collecte ; suppression de
 *     compte = purge des items (cascade demande RGPD).
 *
 * Couverture v1 (scopes en main, mode testeurs) :
 *   FACEBOOK  : commentaires des posts de la Page (pages_read_engagement) ;
 *               réponse via pages_manage_engagement.
 *   INSTAGRAM : commentaires des médias du compte Business (instagram_basic) ;
 *               réponse via instagram_manage_comments.
 *   YOUTUBE/X/TIKTOK/LINKEDIN : UNSUPPORTED honnête v1 (YT commentThreads =
 *   vague suivante ; X payant ; TikTok audit ; LinkedIn produit CM).
 */

import type { Prisma, SocialPlatform } from "@prisma/client";
import { db } from "@/lib/db";
import type { ConnectorResult } from "@/domain";
import { decryptTokenPayload } from "@/server/services/oauth-integrations";
import type { SocialTokenPayload } from "./social-connect";
import { pushNotification } from "./notifications";

const FETCH_TIMEOUT_MS = 8_000;
const COMMENTS_PER_POST = 25;
const POSTS_SCANNED_PER_SYNC = 15;

// ── Types ────────────────────────────────────────────────────────────────────

export interface SyncedInboxRow {
  platform: string;
  scannedPosts: number;
  newItems: number;
}

interface FetchedComment {
  externalId: string;
  parentExternalId: string;
  authorName: string | null;
  authorHandle: string | null;
  authorExternalId: string | null;
  text: string | null;
  likeCount: number;
  permalinkUrl: string | null;
  publishedAt: string | null;
}

type Guarded = Record<string, unknown> | "AUTH" | "OUTAGE";

async function guard(url: string, init?: RequestInit): Promise<Guarded> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.status === 401 || res.status === 403) return "AUTH";
    if (!res.ok) return "OUTAGE";
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return "OUTAGE";
  }
}

// ── Lecture des commentaires par plateforme ──────────────────────────────────

async function fetchCommentsForPost(
  platform: string,
  externalPostId: string,
  accessToken: string,
): Promise<FetchedComment[] | "AUTH" | "OUTAGE" | "UNSUPPORTED"> {
  if (platform === "FACEBOOK") {
    const json = await guard(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(externalPostId)}/comments?fields=${encodeURIComponent("id,message,from{name,id},created_time,like_count,permalink_url")}&limit=${COMMENTS_PER_POST}&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    const items = (json.data as Array<Record<string, unknown>> | undefined) ?? [];
    return items
      .map((c) => {
        const from = (c.from ?? {}) as Record<string, unknown>;
        return {
          externalId: String(c.id ?? ""),
          parentExternalId: externalPostId,
          authorName: typeof from.name === "string" ? from.name : null,
          authorHandle: null,
          authorExternalId: typeof from.id === "string" ? from.id : null,
          text: typeof c.message === "string" ? c.message.slice(0, 2000) : null,
          likeCount: typeof c.like_count === "number" ? c.like_count : 0,
          permalinkUrl: typeof c.permalink_url === "string" ? c.permalink_url : null,
          publishedAt: typeof c.created_time === "string" ? c.created_time : null,
        };
      })
      .filter((c) => c.externalId);
  }

  if (platform === "INSTAGRAM") {
    const json = await guard(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(externalPostId)}/comments?fields=id,text,username,timestamp,like_count&limit=${COMMENTS_PER_POST}&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (json === "AUTH" || json === "OUTAGE") return json;
    const items = (json.data as Array<Record<string, unknown>> | undefined) ?? [];
    return items
      .map((c) => ({
        externalId: String(c.id ?? ""),
        parentExternalId: externalPostId,
        authorName: typeof c.username === "string" ? c.username : null,
        authorHandle: typeof c.username === "string" ? c.username : null,
        authorExternalId: null,
        text: typeof c.text === "string" ? c.text.slice(0, 2000) : null,
        likeCount: typeof c.like_count === "number" ? c.like_count : 0,
        permalinkUrl: null,
        publishedAt: typeof c.timestamp === "string" ? c.timestamp : null,
      }))
      .filter((c) => c.externalId);
  }

  return "UNSUPPORTED";
}

// ── Handler Intent : ANUBIS_SYNC_INBOX ───────────────────────────────────────

/**
 * Balaie les publications récentes des connexions ACTIVE (FB/IG) et upsert
 * les commentaires en SocialInboxItem. Notifie (in-app + push, préférences
 * respectées) le porteur quand des interactions NOUVELLES arrivent.
 * Contract P22-1 — jamais de zéro silencieux.
 */
export async function syncStrategyInbox(
  strategyId: string,
): Promise<ConnectorResult<SyncedInboxRow[]>> {
  const connections = await db.socialConnection.findMany({
    where: { strategyId, status: "ACTIVE", platform: { in: ["FACEBOOK", "INSTAGRAM"] } },
  });
  if (connections.length === 0) {
    return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
  }

  const rows: SyncedInboxRow[] = [];
  let sawAuthFailure = false;
  let sawOutage = false;
  let totalNew = 0;

  for (const conn of connections) {
    if (!conn.accessToken) { sawAuthFailure = true; continue; }
    let payload: SocialTokenPayload;
    try {
      payload = decryptTokenPayload<SocialTokenPayload>(conn.accessToken);
    } catch { sawAuthFailure = true; continue; }

    const posts = await db.socialPost.findMany({
      where: { connectionId: conn.id },
      orderBy: [{ publishedAt: "desc" }],
      take: POSTS_SCANNED_PER_SYNC,
      select: { externalPostId: true },
    });
    if (posts.length === 0) {
      rows.push({ platform: String(conn.platform), scannedPosts: 0, newItems: 0 });
      continue;
    }

    let newItems = 0;
    let scanned = 0;
    for (const post of posts) {
      const fetched = await fetchCommentsForPost(
        String(conn.platform),
        post.externalPostId,
        payload.access_token,
      );
      if (fetched === "AUTH") { sawAuthFailure = true; break; }
      if (fetched === "OUTAGE") { sawOutage = true; continue; }
      if (fetched === "UNSUPPORTED") break;
      scanned++;

      for (const c of fetched) {
        const existing = await db.socialInboxItem.findUnique({
          where: { connectionId_externalId: { connectionId: conn.id, externalId: c.externalId } },
          select: { id: true },
        });
        if (existing) {
          await db.socialInboxItem.update({
            where: { id: existing.id },
            data: { likeCount: c.likeCount, text: c.text },
          });
        } else {
          await db.socialInboxItem.create({
            data: {
              strategyId,
              connectionId: conn.id,
              platform: conn.platform,
              kind: "COMMENT",
              externalId: c.externalId,
              parentExternalId: c.parentExternalId,
              authorName: c.authorName,
              authorHandle: c.authorHandle,
              authorExternalId: c.authorExternalId,
              text: c.text,
              likeCount: c.likeCount,
              permalinkUrl: c.permalinkUrl,
              publishedAt: c.publishedAt ? new Date(c.publishedAt) : null,
            },
          });
          newItems++;
        }
      }
    }
    totalNew += newItems;
    rows.push({ platform: String(conn.platform), scannedPosts: scanned, newItems });
  }

  // Notification groupée (1 par sync avec du nouveau) — porteur + délégués.
  if (totalNew > 0) {
    await notifyInboxRecipients(strategyId, totalNew).catch(() => undefined);
  }

  if (rows.length > 0) {
    return { state: "LIVE", data: rows, observedAt: new Date().toISOString() };
  }
  if (sawAuthFailure) return { state: "DEGRADED", reason: "AUTH_REVOKED" };
  if (sawOutage) return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
  return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };
}

async function notifyInboxRecipients(strategyId: string, count: number): Promise<void> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { userId: true, name: true },
  });
  if (!strategy) return;
  const brandName = strategy.name;
  const collaborators = await db.strategyCollaborator.findMany({
    where: { strategyId, status: "ACTIVE" },
    select: { userId: true },
  });
  const recipients = [...new Set([strategy.userId, ...collaborators.map((c) => c.userId)])];
  await Promise.all(
    recipients.map((userId) =>
      pushNotification({
        userId,
        type: "SOCIAL_INBOX",
        title: `${count} nouvelle${count > 1 ? "s" : ""} interaction${count > 1 ? "s" : ""}`,
        body: `${brandName} : ${count} commentaire${count > 1 ? "s" : ""} à traiter dans votre boîte de réception.`,
        link: "/cockpit/operate/inbox",
        entityType: "SocialInboxItem",
        entityId: strategyId,
      }).catch(() => undefined),
    ),
  );
}

// ── Handler Intent : ANUBIS_REPLY_COMMENT ────────────────────────────────────

export interface ReplyCommentResult {
  itemId: string;
  platform: string;
  replyExternalId: string | null;
}

/**
 * Répond à un commentaire AU NOM DE LA MARQUE (page token / compte Business).
 * FB : POST /{comment-id}/comments (pages_manage_engagement).
 * IG : POST /{ig-comment-id}/replies (instagram_manage_comments).
 * Connexion sans le scope → erreur SCOPE_MISSING explicite (l'UI propose
 * « Reconnecter le réseau ») — jamais d'échec silencieux.
 */
export async function replyToInboxItem(input: {
  strategyId: string;
  itemId: string;
  text: string;
}): Promise<ReplyCommentResult> {
  const item = await db.socialInboxItem.findFirst({
    where: { id: input.itemId, strategyId: input.strategyId },
    include: { connection: true },
  });
  if (!item) throw new Error("Interaction introuvable pour cette marque");
  if (item.status === "REPLIED") throw new Error("Interaction déjà traitée");
  const conn = item.connection;
  if (!conn.accessToken || conn.status !== "ACTIVE") {
    throw new Error("SCOPE_MISSING: réseau déconnecté — reconnectez-le depuis Connexions");
  }

  const meta = (conn.metadata ?? {}) as Record<string, unknown>;
  const scopes = Array.isArray(meta.scopes) ? meta.scopes.map(String) : [];
  const needed = item.platform === "FACEBOOK" ? "pages_manage_engagement" : "instagram_manage_comments";
  if (!scopes.includes(needed)) {
    throw new Error(
      `SCOPE_MISSING: la connexion ${item.platform} date d'avant les capacités de réponse — reconnectez le réseau pour les activer`,
    );
  }

  const payload = decryptTokenPayload<SocialTokenPayload>(conn.accessToken);
  const endpoint =
    item.platform === "FACEBOOK"
      ? `https://graph.facebook.com/v21.0/${encodeURIComponent(item.externalId)}/comments`
      : `https://graph.facebook.com/v21.0/${encodeURIComponent(item.externalId)}/replies`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ message: input.text, access_token: payload.access_token }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Réponse refusée par ${item.platform} (${res.status}) ${detail.slice(0, 200)}`);
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const replyExternalId = typeof json.id === "string" ? json.id : null;

  await db.socialInboxItem.update({
    where: { id: item.id },
    data: {
      status: "REPLIED",
      repliedAt: new Date(),
      replyText: input.text.slice(0, 2000),
      replyExternalId,
    },
  });

  return { itemId: item.id, platform: String(item.platform), replyExternalId };
}

// ── Lecture cockpit (read-only, zéro secret) ─────────────────────────────────

export interface InboxListFilters {
  status?: "OPEN" | "REPLIED" | "DISMISSED";
  platform?: string;
  limit?: number;
}

export async function listInboxItems(strategyId: string, filters: InboxListFilters = {}) {
  const where: Prisma.SocialInboxItemWhereInput = { strategyId };
  if (filters.status) where.status = filters.status;
  if (filters.platform) where.platform = filters.platform as SocialPlatform;
  const items = await db.socialInboxItem.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }],
    take: Math.min(filters.limit ?? 50, 200),
    select: {
      id: true, platform: true, kind: true, status: true,
      authorName: true, authorHandle: true, text: true, likeCount: true,
      permalinkUrl: true, publishedAt: true, repliedAt: true, replyText: true,
      parentExternalId: true, createdAt: true,
    },
  });
  const counts = await db.socialInboxItem.groupBy({
    by: ["status"],
    where: { strategyId },
    _count: { _all: true },
  });
  return {
    items: items.map((i) => ({
      ...i,
      publishedAt: i.publishedAt?.toISOString() ?? null,
      repliedAt: i.repliedAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
    })),
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<string, number>,
  };
}

export async function dismissInboxItem(strategyId: string, itemId: string): Promise<void> {
  const item = await db.socialInboxItem.findFirst({
    where: { id: itemId, strategyId },
    select: { id: true },
  });
  if (!item) throw new Error("Interaction introuvable pour cette marque");
  await db.socialInboxItem.update({ where: { id: item.id }, data: { status: "DISMISSED" } });
}
