/**
 * social-publish — publier et planifier depuis le cockpit (ADR-0133, mandat
 * « tout le nécessaire pour piloter, publier, planifier »).
 *
 * Owning Neter : ANUBIS. Handler du kind gouverné ANUBIS_PUBLISH_SOCIAL_POST.
 *
 * Couverture v1 (scopes en main, mode testeurs) :
 *   FACEBOOK  : texte / lien / photo sur la Page (pages_manage_posts).
 *   INSTAGRAM : image + légende (instagram_content_publish, container →
 *               media_publish) — IG EXIGE un visuel, texte seul = refus honnête.
 *   LINKEDIN  : post texte (+ lien) sur le profil membre (w_member_social).
 *   X / TIKTOK / YOUTUBE : UNSUPPORTED honnête (payant PPU / audit / upload vidéo).
 *
 * Planification : `scheduleAt` futur → AUCUN appel plateforme ; la demande
 * est matérialisée en BrandAction SCHEDULED (calendrier unique — doctrine
 * Lot 13) avec `metadata.socialPublish.pending`, et le cron social-sync la
 * publie à l'échéance en ré-émettant l'Intent (spine + cost-gate à chaque
 * exécution). Publication immédiate → BrandAction EXECUTED. Jamais deux
 * calendriers : la publication sociale EST une action du plan.
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptTokenPayload } from "@/server/services/oauth-integrations";
import type { SocialTokenPayload } from "./social-connect";
import { pushNotification } from "./notifications";

const FETCH_TIMEOUT_MS = 12_000;

export type PublishablePlatform = "FACEBOOK" | "INSTAGRAM" | "LINKEDIN";
export const PUBLISHABLE_PLATFORMS: readonly PublishablePlatform[] = [
  "FACEBOOK",
  "INSTAGRAM",
  "LINKEDIN",
];

export interface PublishSocialPostInput {
  strategyId: string;
  userId: string;
  targets: string[];
  /** Copy de PUBLICATION (légende du post). */
  text: string;
  linkUrl?: string | null;
  imageUrl?: string | null;
  /** ISO — futur (>2 min) = planification via calendrier + cron. */
  scheduleAt?: string | null;
  /** Ré-émission par le cron : action déjà matérialisée. */
  brandActionId?: string | null;
  /**
   * Brief créatif intégré — direction pour ILLUSTRER (le générateur/designer
   * sait quoi produire). Persisté sur l'action ; ne part jamais au réseau.
   */
  brief?: string | null;
  /** Copy du VISUEL — le texte à intégrer DANS l'image (≠ légende). */
  visualCopy?: string | null;
}

export interface PublishTargetResult {
  platform: string;
  state: "PUBLISHED" | "FAILED" | "UNSUPPORTED" | "SCOPE_MISSING" | "NOT_CONNECTED";
  externalPostId: string | null;
  detail: string | null;
}

export interface PublishSocialPostResult {
  mode: "PUBLISHED" | "SCHEDULED";
  brandActionId: string;
  results: PublishTargetResult[];
}

/**
 * Scope(s) de publication requis par plateforme — sémantique « n'importe
 * lequel suffit ». Instagram accepte `instagram_content_publish` (flow
 * meta/Facebook Login) OU `instagram_business_content_publish` (flow Instagram
 * Business Login, ADR-0128 amendé 2026-07-14).
 */
function requiredScopesFor(platform: string): string[] | null {
  if (platform === "FACEBOOK") return ["pages_manage_posts"];
  if (platform === "INSTAGRAM") return ["instagram_content_publish", "instagram_business_content_publish"];
  if (platform === "LINKEDIN") return ["w_member_social"];
  return null;
}

async function publishToFacebook(
  accountId: string,
  accessToken: string,
  text: string,
  linkUrl: string | null,
  imageUrl: string | null,
): Promise<{ id: string | null } | string> {
  const base = `https://graph.facebook.com/v21.0/${encodeURIComponent(accountId)}`;
  const body = new URLSearchParams({ access_token: accessToken });
  let endpoint: string;
  if (imageUrl) {
    endpoint = `${base}/photos`;
    body.set("url", imageUrl);
    if (text) body.set("caption", text);
  } else {
    endpoint = `${base}/feed`;
    body.set("message", text);
    if (linkUrl) body.set("link", linkUrl);
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const err = (json.error ?? {}) as Record<string, unknown>;
      return `Facebook ${res.status}: ${String(err.message ?? "publication refusée").slice(0, 200)}`;
    }
    return { id: typeof json.post_id === "string" ? json.post_id : typeof json.id === "string" ? json.id : null };
  } catch (e) {
    return `Facebook injoignable: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  text: string,
  imageUrl: string,
  viaInstagramGraph: boolean,
): Promise<{ id: string | null } | string> {
  // Instagram Business Login (token IG) publie sur graph.instagram.com ; l'edge
  // FB-Page hérité (token de Page) publie sur graph.facebook.com. Même geste
  // (container /media → /media_publish), seul l'hôte diffère.
  const graphBase = viaInstagramGraph
    ? "https://graph.instagram.com"
    : "https://graph.facebook.com/v21.0";
  const base = `${graphBase}/${encodeURIComponent(igUserId)}`;
  try {
    const create = await fetch(`${base}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: accessToken, image_url: imageUrl, caption: text }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const created = (await create.json().catch(() => ({}))) as Record<string, unknown>;
    if (!create.ok || typeof created.id !== "string") {
      const err = (created.error ?? {}) as Record<string, unknown>;
      return `Instagram (container) ${create.status}: ${String(err.message ?? "visuel refusé").slice(0, 200)}`;
    }
    const publish = await fetch(`${base}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: accessToken, creation_id: created.id }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const published = (await publish.json().catch(() => ({}))) as Record<string, unknown>;
    if (!publish.ok) {
      const err = (published.error ?? {}) as Record<string, unknown>;
      return `Instagram (publish) ${publish.status}: ${String(err.message ?? "publication refusée").slice(0, 200)}`;
    }
    return { id: typeof published.id === "string" ? published.id : null };
  } catch (e) {
    return `Instagram injoignable: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function publishToLinkedIn(
  personId: string,
  accessToken: string,
  text: string,
  linkUrl: string | null,
): Promise<{ id: string | null } | string> {
  const payload: Record<string, unknown> = {
    author: `urn:li:person:${personId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: linkUrl ? "ARTICLE" : "NONE",
        ...(linkUrl ? { media: [{ status: "READY", originalUrl: linkUrl }] } : {}),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };
  try {
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return `LinkedIn ${res.status}: ${detail.slice(0, 200)}`;
    }
    const id = res.headers.get("x-restli-id");
    return { id: id ?? null };
  } catch (e) {
    return `LinkedIn injoignable: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/** Matérialise/actualise l'action calendrier qui porte la publication. */
async function upsertPublishAction(
  input: PublishSocialPostInput,
  mode: "PUBLISHED" | "SCHEDULED",
  results: PublishTargetResult[] | null,
): Promise<string> {
  const title = `Publication : ${input.text.slice(0, 70)}${input.text.length > 70 ? "…" : ""}`;
  const socialPublish: Prisma.InputJsonValue = {
    targets: input.targets,
    text: input.text,
    linkUrl: input.linkUrl ?? null,
    imageUrl: input.imageUrl ?? null,
    scheduleAt: input.scheduleAt ?? null,
    requestedByUserId: input.userId,
    pending: mode === "SCHEDULED",
    // Brief intégré : direction créative pour illustrer + copy du visuel.
    // Le générateur (Ptah) ou un designer humain sait quoi produire ; ces
    // champs ne partent jamais au réseau (seuls text/imageUrl le font).
    brief: input.brief ?? null,
    visualCopy: input.visualCopy ?? null,
    results: (results ?? []) as unknown as Prisma.InputJsonValue,
  };

  if (input.brandActionId) {
    const existing = await db.brandAction.findFirst({
      where: { id: input.brandActionId, strategyId: input.strategyId },
      select: { id: true, metadata: true },
    });
    if (existing) {
      const meta = (existing.metadata ?? {}) as Record<string, unknown>;
      await db.brandAction.update({
        where: { id: existing.id },
        data: {
          status: mode === "PUBLISHED" ? "EXECUTED" : "SCHEDULED",
          timingEnd: mode === "PUBLISHED" ? new Date() : undefined,
          metadata: { ...meta, socialPublish } as Prisma.InputJsonValue,
        },
      });
      return existing.id;
    }
  }

  const created = await db.brandAction.create({
    data: {
      strategyId: input.strategyId,
      title,
      description: input.text.slice(0, 500),
      touchpoint: "DIGITAL",
      source: "OPERATOR_MANUAL",
      status: mode === "PUBLISHED" ? "EXECUTED" : "SCHEDULED",
      // `selected: true` — la publication planifiée DOIT être visible dans le
      // calendrier « Plan d'actions » (qui filtre selected:true). Sans ça elle
      // était créée invisible alors que la notif y renvoie (gap 2026-07-13).
      selected: true,
      timingStart: input.scheduleAt ? new Date(input.scheduleAt) : new Date(),
      timingEnd: mode === "PUBLISHED" ? new Date() : null,
      metadata: { socialPublish } as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Publie (ou planifie) au nom de la marque. Appelé UNIQUEMENT via le dispatch
 * Mestor (kind ANUBIS_PUBLISH_SOCIAL_POST) — spine + cost-gate + firewall
 * zones (délégable "social", ADR-0131).
 */
/**
 * Meta/LinkedIn récupèrent le visuel par URL → il doit être ABSOLU et public.
 * Un actif du coffre est stocké en chemin relatif (`/brand/…`) : on le résout
 * sur l'URL publique de l'app avant l'appel plateforme. Une URL déjà absolue
 * (CDN, etc.) passe telle quelle.
 */
function toAbsoluteImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://powerupgraders.com"
  ).replace(/\/$/, "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

export async function publishSocialPost(
  input: PublishSocialPostInput,
): Promise<PublishSocialPostResult> {
  const text = input.text.trim();
  if (!text && !input.imageUrl) throw new Error("Publication vide — texte ou visuel requis");
  const pubImageUrl = toAbsoluteImageUrl(input.imageUrl);
  const targets = [...new Set(input.targets.map((t) => t.toUpperCase()))];
  if (targets.length === 0) throw new Error("Aucune plateforme ciblée");

  // ── Planification : zéro appel plateforme, le calendrier porte l'échéance ──
  const scheduleAt = input.scheduleAt ? new Date(input.scheduleAt) : null;
  if (scheduleAt && scheduleAt.getTime() > Date.now() + 2 * 60_000) {
    const brandActionId = await upsertPublishAction(input, "SCHEDULED", null);
    return { mode: "SCHEDULED", brandActionId, results: [] };
  }

  // ── Publication immédiate ──
  const connections = await db.socialConnection.findMany({
    where: { strategyId: input.strategyId, status: "ACTIVE" },
  });
  const byPlatform = new Map(connections.map((c) => [String(c.platform), c]));
  const results: PublishTargetResult[] = [];

  for (const platform of targets) {
    if (!PUBLISHABLE_PLATFORMS.includes(platform as PublishablePlatform)) {
      results.push({
        platform,
        state: "UNSUPPORTED",
        externalPostId: null,
        detail:
          platform === "TWITTER"
            ? "X est payant à l'appel — activable en option facturée"
            : platform === "TIKTOK"
              ? "TikTok exige l'audit Content Posting"
              : "Plateforme non couverte en v1",
      });
      continue;
    }
    const conn = byPlatform.get(platform);
    if (!conn?.accessToken) {
      results.push({ platform, state: "NOT_CONNECTED", externalPostId: null, detail: "Réseau non connecté" });
      continue;
    }
    const meta = (conn.metadata ?? {}) as Record<string, unknown>;
    const scopes = Array.isArray(meta.scopes) ? meta.scopes.map(String) : [];
    const needed = requiredScopesFor(platform);
    if (needed && !needed.some((s) => scopes.includes(s))) {
      results.push({
        platform,
        state: "SCOPE_MISSING",
        externalPostId: null,
        detail: "Connexion antérieure aux capacités de publication — reconnectez le réseau",
      });
      continue;
    }
    if (platform === "INSTAGRAM" && !input.imageUrl) {
      results.push({
        platform,
        state: "UNSUPPORTED",
        externalPostId: null,
        detail: "Instagram exige un visuel — ajoutez une image",
      });
      continue;
    }

    let payload: SocialTokenPayload;
    try {
      payload = decryptTokenPayload<SocialTokenPayload>(conn.accessToken);
    } catch {
      results.push({ platform, state: "FAILED", externalPostId: null, detail: "Jeton illisible — reconnectez le réseau" });
      continue;
    }

    const out =
      platform === "FACEBOOK"
        ? await publishToFacebook(conn.accountId, payload.access_token, text, input.linkUrl ?? null, pubImageUrl)
        : platform === "INSTAGRAM"
          ? await publishToInstagram(
              conn.accountId,
              payload.access_token,
              text,
              pubImageUrl!,
              // Business Login (token IG) → graph.instagram.com ; edge FB-Page → graph.facebook.com.
              meta.provider === "instagram",
            )
          : await publishToLinkedIn(conn.accountId, payload.access_token, text, input.linkUrl ?? null);

    if (typeof out === "string") {
      results.push({ platform, state: "FAILED", externalPostId: null, detail: out });
    } else {
      results.push({ platform, state: "PUBLISHED", externalPostId: out.id, detail: null });
    }
  }

  // Décision de matérialisation — le keystone du « cron synchronisé avec le
  // calendrier » (mandat 2026-07-13). Une publication PLANIFIÉE ré-émise par le
  // cron (`brandActionId` présent) qui ne trouve AUCUNE connexion active RESTE
  // EN ATTENTE (SCHEDULED + pending=true) au lieu d'être consommée à vide :
  // elle repartira au prochain tick dès que l'opérateur aura connecté le réseau.
  // Sinon (au moins un réseau a publié, ou échec réel) l'action est consommée.
  const anyPublished = results.some((r) => r.state === "PUBLISHED");
  const waitingForConnection =
    !anyPublished && results.some((r) => r.state === "NOT_CONNECTED");
  const keepWaiting = Boolean(input.brandActionId) && waitingForConnection;

  let brandActionId: string;
  try {
    brandActionId = await upsertPublishAction(
      input,
      keepWaiting ? "SCHEDULED" : "PUBLISHED",
      results,
    );
  } catch (persistErr) {
    // round-16a : si un POST RÉEL a réussi (anyPublished) mais que le persist du
    // statut échoue (blip DB), NE JAMAIS laisser l'action claimée en PUBLISHING :
    // le cron social-sync restaure alors SCHEDULED → RE-POST irréversible au tick
    // suivant (FB Graph n'a pas de clé d'idempotence). On sort de PUBLISHING vers
    // EXECUTED (best-effort, idempotent) et on renvoie un succès — le post EST parti,
    // seul le détail persisté (metadata results) est perdu. Sur un échec PRÉ-POST
    // (aucun réseau publié), on re-throw → le cron restaure SCHEDULED pour un vrai retry.
    if (anyPublished && input.brandActionId) {
      await db.brandAction
        .updateMany({
          where: { id: input.brandActionId, status: "PUBLISHING" },
          data: { status: "EXECUTED", timingEnd: new Date() },
        })
        .catch(() => {});
      return { mode: "PUBLISHED", brandActionId: input.brandActionId, results };
    }
    throw persistErr;
  }

  // En attente de connexion : pas de notification (sinon spam à chaque tick).
  // Le calendrier montre l'action toujours planifiée avec le motif NOT_CONNECTED.
  if (keepWaiting) {
    return { mode: "SCHEDULED", brandActionId, results };
  }

  // Notification honnête (succès ET échecs) au porteur + délégués.
  const published = results.filter((r) => r.state === "PUBLISHED").map((r) => r.platform);
  const failed = results.filter((r) => r.state === "FAILED" || r.state === "SCOPE_MISSING");
  const strategy = await db.strategy.findUnique({
    where: { id: input.strategyId },
    select: { userId: true, name: true },
  });
  if (strategy) {
    const brandName = strategy.name;
    const collaborators = await db.strategyCollaborator.findMany({
      where: { strategyId: input.strategyId, status: "ACTIVE" },
      select: { userId: true },
    });
    const recipients = [...new Set([strategy.userId, ...collaborators.map((c) => c.userId)])];
    const title =
      published.length > 0
        ? `Publication envoyée (${published.join(", ")})`
        : "Publication non envoyée";
    const body =
      failed.length > 0
        ? `${brandName} : ${published.length} réseau(x) OK, ${failed.length} en échec — ${failed[0]!.detail ?? failed[0]!.platform}`
        : `${brandName} : « ${text.slice(0, 80)} »`;
    await Promise.all(
      recipients.map((userId) =>
        pushNotification({
          userId,
          type: "SOCIAL_PUBLISH",
          priority: failed.length > 0 && published.length === 0 ? "HIGH" : "NORMAL",
          title,
          body,
          link: "/cockpit/operate/calendar",
          entityType: "BrandAction",
          entityId: brandActionId,
        }).catch(() => undefined),
      ),
    );
  }

  return { mode: "PUBLISHED", brandActionId, results };
}

/**
 * Publie les actions planifiées arrivées à échéance (appelé par le cron
 * social-sync). Ré-émission gouvernée par action — chaque exécution repasse
 * le spine (traçabilité + cost-gate).
 */
export async function listDueScheduledPublications(): Promise<
  Array<{ brandActionId: string; strategyId: string; input: PublishSocialPostInput }>
> {
  const due = await db.brandAction.findMany({
    where: {
      status: "SCHEDULED",
      timingStart: { lte: new Date() },
      metadata: { path: ["socialPublish", "pending"], equals: true },
    },
    select: { id: true, strategyId: true, metadata: true },
    take: 25,
  });
  const out: Array<{ brandActionId: string; strategyId: string; input: PublishSocialPostInput }> = [];
  for (const action of due) {
    const sp = ((action.metadata ?? {}) as Record<string, unknown>).socialPublish as
      | Record<string, unknown>
      | undefined;
    if (!sp) continue;
    out.push({
      brandActionId: action.id,
      strategyId: action.strategyId,
      input: {
        strategyId: action.strategyId,
        userId: String(sp.requestedByUserId ?? ""),
        targets: Array.isArray(sp.targets) ? sp.targets.map(String) : [],
        text: String(sp.text ?? ""),
        linkUrl: typeof sp.linkUrl === "string" ? sp.linkUrl : null,
        imageUrl: typeof sp.imageUrl === "string" ? sp.imageUrl : null,
        scheduleAt: null, // échéance atteinte → publication immédiate
        brandActionId: action.id,
        // Préservés à la ré-émission : sinon le brief/copy visuel seraient nullés
        // quand le cron reconstruit socialPublish (perte de la direction créative).
        brief: typeof sp.brief === "string" ? sp.brief : null,
        visualCopy: typeof sp.visualCopy === "string" ? sp.visualCopy : null,
      },
    });
  }
  return out;
}

// ── Gestion par publication (mandat 2026-07-13 : voir / corriger CHAQUE
//    publication — éditer, importer l'image, changer l'heure, déclencher,
//    annuler). L'édition/replanification/déclenchement RÉUTILISENT
//    `publishSocialPost` (brandActionId) — pas de nouveau kind. Ici : lister
//    + annuler. ──────────────────────────────────────────────────────────────

export interface BrandPublicationView {
  brandActionId: string;
  status: string; // SCHEDULED | EXECUTED | CANCELLED
  scheduledAt: string | null; // timingStart ISO
  targets: string[];
  text: string;
  linkUrl: string | null;
  imageUrl: string | null;
  brief: string | null;
  visualCopy: string | null;
  pending: boolean;
  results: PublishTargetResult[];
}

/**
 * Liste les publications sociales de la marque (planifiées + récentes) pour le
 * panneau de gestion. Toute BrandAction qui porte un `metadata.socialPublish`,
 * triée par échéance décroissante. Déterministe, lecture seule.
 */
export async function listScheduledPublications(
  strategyId: string,
  limit = 50,
): Promise<BrandPublicationView[]> {
  const actions = await db.brandAction.findMany({
    where: {
      strategyId,
      metadata: { path: ["socialPublish", "requestedByUserId"], not: Prisma.JsonNull },
    },
    select: { id: true, status: true, timingStart: true, metadata: true },
    orderBy: { timingStart: "desc" },
    take: limit,
  });
  const out: BrandPublicationView[] = [];
  for (const a of actions) {
    const sp = ((a.metadata ?? {}) as Record<string, unknown>).socialPublish as
      | Record<string, unknown>
      | undefined;
    if (!sp) continue;
    out.push({
      brandActionId: a.id,
      status: a.status,
      scheduledAt: a.timingStart ? a.timingStart.toISOString() : null,
      targets: Array.isArray(sp.targets) ? sp.targets.map(String) : [],
      text: typeof sp.text === "string" ? sp.text : "",
      linkUrl: typeof sp.linkUrl === "string" ? sp.linkUrl : null,
      imageUrl: typeof sp.imageUrl === "string" ? sp.imageUrl : null,
      brief: typeof sp.brief === "string" ? sp.brief : null,
      visualCopy: typeof sp.visualCopy === "string" ? sp.visualCopy : null,
      pending: sp.pending === true,
      results: Array.isArray(sp.results) ? (sp.results as PublishTargetResult[]) : [],
    });
  }
  return out;
}

/**
 * Annule une publication planifiée : `status=CANCELLED`, `pending=false` — le
 * cron ne la reprendra plus. L'historique est conservé (Loi 1). Idempotent.
 */
export async function cancelScheduledPublication(
  strategyId: string,
  brandActionId: string,
): Promise<{ ok: boolean }> {
  const action = await db.brandAction.findFirst({
    where: { id: brandActionId, strategyId },
    select: { id: true, metadata: true, status: true },
  });
  if (!action) throw new Error("Publication introuvable");
  const meta = (action.metadata ?? {}) as Record<string, unknown>;
  const sp = (meta.socialPublish ?? {}) as Record<string, unknown>;
  await db.brandAction.update({
    where: { id: action.id },
    data: {
      status: "CANCELLED",
      metadata: { ...meta, socialPublish: { ...sp, pending: false } } as Prisma.InputJsonValue,
    },
  });
  return { ok: true };
}
