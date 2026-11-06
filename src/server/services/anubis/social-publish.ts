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
 * exécution). Seul un envoi confirmé pour chaque cible passe en EXECUTED. Jamais deux
 * calendriers : la publication sociale EST une action du plan.
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptTokenPayload } from "@/server/services/oauth-integrations";
import type { SocialTokenPayload } from "./social-connect";
import { pushNotification } from "./notifications";
import { readPreparedPublication } from "./publication-package";
import { publicationMediaUrl } from "./publication-access";

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
  /** Version lue par le cron pour ne pas publier une ancienne édition. */
  scheduledVersion?: string;
  /** Exact reviewed package. Generic/manual publications leave these absent. */
  publicationPackageId?: string;
  publicationPackageHash?: string;
  publicationTarget?: { connectionId: string; accountId: string };
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
  state: "PUBLISHED" | "FAILED" | "UNSUPPORTED" | "SCOPE_MISSING" | "NOT_CONNECTED" | "UNCONFIRMED";
  externalPostId: string | null;
  detail: string | null;
  connectionId?: string;
  permalinkUrl?: string;
}

export interface PublishSocialPostResult {
  mode: "PUBLISHED" | "PARTIAL" | "FAILED" | "UNCONFIRMED" | "SCHEDULED" | "SKIPPED";
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

// Un transport interrompu après l'envoi peut avoir publié : il faut rapprocher
// la réponse avec le compte avant toute nouvelle tentative sur ce réseau.
type TransportResult = { id: string | null } | { uncertain: string } | string;

function providerFailure(status: number, message: string): TransportResult {
  return status >= 500 || status === 408 ? { uncertain: message } : message;
}

async function publishToFacebook(
  accountId: string,
  accessToken: string,
  text: string,
  linkUrl: string | null,
  imageUrl: string | null,
): Promise<TransportResult> {
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
      return providerFailure(res.status, `Facebook ${res.status}: ${String(err.message ?? "publication refusée").slice(0, 200)}`);
    }
    return { id: typeof json.post_id === "string" ? json.post_id : typeof json.id === "string" ? json.id : null };
  } catch (e) {
    return { uncertain: `Facebook injoignable: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  text: string,
  imageUrl: string,
  viaInstagramGraph: boolean,
  placement: "FEED" | "STORIES" = "FEED",
): Promise<TransportResult> {
  // Instagram Business Login (token IG) publie sur graph.instagram.com ; l'edge
  // FB-Page hérité (token de Page) publie sur graph.facebook.com. Même geste
  // (container /media → /media_publish), seul l'hôte diffère.
  const graphBase = viaInstagramGraph
    ? "https://graph.instagram.com"
    : "https://graph.facebook.com/v21.0";
  const base = `${graphBase}/${encodeURIComponent(igUserId)}`;
  let publishStarted = false;
  try {
    const media = new URLSearchParams({ access_token: accessToken, image_url: imageUrl });
    if (placement === "STORIES") media.set("media_type", "STORIES");
    else media.set("caption", text);
    const create = await fetch(`${base}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: media,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const created = (await create.json().catch(() => ({}))) as Record<string, unknown>;
    if (!create.ok || typeof created.id !== "string" || !created.id.trim()) {
      const err = (created.error ?? {}) as Record<string, unknown>;
      return `Instagram (container) ${create.status}: ${String(err.message ?? "visuel refusé").slice(0, 200)}`;
    }
    publishStarted = true;
    const publish = await fetch(`${base}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: accessToken, creation_id: created.id }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const published = (await publish.json().catch(() => ({}))) as Record<string, unknown>;
    if (!publish.ok) {
      const err = (published.error ?? {}) as Record<string, unknown>;
      return providerFailure(publish.status, `Instagram (publish) ${publish.status}: ${String(err.message ?? "publication refusée").slice(0, 200)}`);
    }
    return { id: typeof published.id === "string" ? published.id : null };
  } catch (e) {
    const detail = `Instagram injoignable: ${e instanceof Error ? e.message : String(e)}`;
    return publishStarted ? { uncertain: detail } : detail;
  }
}

async function publishToLinkedIn(
  personId: string,
  accessToken: string,
  text: string,
  linkUrl: string | null,
): Promise<TransportResult> {
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
      return providerFailure(res.status, `LinkedIn ${res.status}: ${detail.slice(0, 200)}`);
    }
    const id = res.headers.get("x-restli-id");
    return { id: id ?? null };
  } catch (e) {
    return { uncertain: `LinkedIn injoignable: ${e instanceof Error ? e.message : String(e)}` };
  }
}

const missingReceipt = "Le réseau n’a pas fourni d’identifiant. Vérifiez la publication sur le compte avant toute reprise.";

function readReceipts(sp: Record<string, unknown>): PublishTargetResult[] {
  if (!Array.isArray(sp.results)) return [];
  return (sp.results as PublishTargetResult[]).filter((r) => r && typeof r.platform === "string").map((r) =>
    r.state === "PUBLISHED" && !r.externalPostId?.trim()
      ? { ...r, state: "UNCONFIRMED", externalPostId: null, detail: missingReceipt }
      : r);
}

function publicationOutcome(targets: string[], results: PublishTargetResult[]): PublishSocialPostResult["mode"] {
  const confirmed = new Set(results.filter((r) => r.state === "PUBLISHED" && r.externalPostId).map((r) => r.platform));
  if (targets.length > 0 && targets.every((t) => confirmed.has(t))) return "PUBLISHED";
  if (confirmed.size > 0) return "PARTIAL";
  if (results.length === 0 || results.some((r) => r.state === "UNCONFIRMED")) return "UNCONFIRMED";
  return "FAILED";
}

function publishMetadata(input: PublishSocialPostInput, pending: boolean, results: PublishTargetResult[]) {
  return {
    targets: input.targets, text: input.text, linkUrl: input.linkUrl ?? null,
    imageUrl: input.imageUrl ?? null, scheduleAt: input.scheduleAt ?? null,
    requestedByUserId: input.userId, pending, brief: input.brief ?? null, visualCopy: input.visualCopy ?? null,
    ...(input.publicationPackageId ? { publicationPackageId: input.publicationPackageId,
      publicationPackageHash: input.publicationPackageHash, publicationTarget: input.publicationTarget } : {}),
    results: results as unknown as Prisma.InputJsonValue,
  };
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
  const prepared = input.publicationPackageId
    ? await readPreparedPublication(input.strategyId, input.publicationPackageId, input.publicationPackageHash ?? "", input.userId)
    : null;
  if (prepared) {
    if (!input.publicationTarget) throw new Error("Choisissez le compte destinataire de ce paquet.");
    const target = await db.socialConnection.findFirst({ where: { id: input.publicationTarget.connectionId,
      accountId: input.publicationTarget.accountId, strategyId: input.strategyId, status: "ACTIVE", platform: prepared.platform as "INSTAGRAM" | "FACEBOOK" } });
    if (!target) throw new Error("Le compte destinataire a changé. Vérifiez la connexion avant l’envoi.");
    input = { ...input, brandActionId: prepared.action.id, targets: [prepared.platform],
      text: prepared.content.publicationText, linkUrl: null,
      imageUrl: `/api/production/publication/${encodeURIComponent(prepared.asset.id)}` };
  }
  // Preserve the exact reviewed copy; manual legacy copy keeps its old trim behavior.
  const text = prepared ? input.text : input.text.trim();
  if (!text && !input.imageUrl) throw new Error("Publication vide — texte ou visuel requis");
  let pubImageUrl = prepared ? null : toAbsoluteImageUrl(input.imageUrl);
  const targets = [...new Set(input.targets.map((t) => t.toUpperCase()))];
  if (targets.length === 0) throw new Error("Aucune plateforme ciblée");

  input = { ...input, targets };
  const scheduleAt = input.scheduleAt ? new Date(input.scheduleAt) : null;
  if (prepared && scheduleAt && (!Number.isFinite(scheduleAt.getTime()) || scheduleAt.getTime() <= Date.now() + 2 * 60_000))
    throw new Error("Choisissez une échéance à plus de deux minutes ou demandez explicitement un envoi immédiat.");
  const planning = Boolean(scheduleAt && scheduleAt.getTime() > Date.now() + 2 * 60_000);
  const existing = input.brandActionId ? await db.brandAction.findFirst({
    where: { id: input.brandActionId, strategyId: input.strategyId },
    select: { id: true, metadata: true, status: true, updatedAt: true, timingStart: true },
  }) : null;
  const meta = (existing?.metadata ?? {}) as Record<string, unknown>;
  if (meta.publicationPackageId && (!prepared || meta.publicationPackageId !== prepared.asset.id || meta.contentHash !== input.publicationPackageHash))
    throw new Error("Ouvrez le paquet relu pour publier sa version exacte.");
  const previous = meta.socialPublish as Record<string, unknown> | undefined;
  if (input.brandActionId && (!existing || (!previous && !prepared))) throw new Error("Publication introuvable");
  if (existing && input.scheduledVersion &&
      (existing.status !== "SCHEDULED" || existing.updatedAt.toISOString() !== input.scheduledVersion)) {
    return { mode: "SKIPPED", brandActionId: existing.id, results: [] };
  }
  if (existing && !["SCHEDULED", "ACCEPTED", "EXECUTED"].includes(existing.status)) {
    throw new Error("La publication a changé. Rechargez son état avant de continuer.");
  }
  const prior = previous ? readReceipts(previous) : [];
  // Un EXECUTED ancien sans journal ni ID pourrait avoir envoyé un post.
  if (existing?.status === "EXECUTED" && prior.length === 0) throw new Error(missingReceipt);
  const held = prior.filter((r) => r.state === "PUBLISHED" || r.state === "UNCONFIRMED");
  const previousTargets = Array.isArray(previous?.targets) ? [...new Set(previous.targets.map((t) => String(t).toUpperCase()))] : [];
  const previousTarget = previous?.publicationTarget as { connectionId?: string; accountId?: string } | undefined;
  if (held.length && prepared && (previousTarget?.connectionId !== input.publicationTarget?.connectionId || previousTarget?.accountId !== input.publicationTarget?.accountId))
    throw new Error("Cette version a déjà été envoyée ou attend vérification sur le compte retenu.");
  if (held.length && (planning || previousTargets.length !== targets.length || previousTargets.some((t) => !targets.includes(t)) ||
      input.text !== previous?.text || (input.imageUrl ?? null) !== (previous?.imageUrl ?? null) ||
      (input.linkUrl ?? null) !== (previous?.linkUrl ?? null))) {
    throw new Error("Une cible a déjà reçu cet envoi ou attend vérification. Reprenez uniquement les réseaux en échec avec le même contenu.");
  }
  if (!planning && targets.every((t) => held.some((r) => r.platform === t)) && existing) {
    return { mode: publicationOutcome(targets, held), brandActionId: existing.id, results: held };
  }
  // Connexions lues avant le claim : si la DB est indisponible aucun POST n'a débuté.
  const connections = planning ? [] : await db.socialConnection.findMany({
    where: { strategyId: input.strategyId, status: "ACTIVE", ...(prepared ? { id: input.publicationTarget!.connectionId, accountId: input.publicationTarget!.accountId } : {}) },
  });
  // A signed delivery URL exists only for a deliberate send, never in persisted metadata.
  if (prepared && !planning) pubImageUrl = publicationMediaUrl(prepared.asset.id, input.publicationPackageHash!);
  const status = planning ? "SCHEDULED" : "PUBLISHING";
  const metadata = { ...meta, socialPublish: publishMetadata(input, planning, prior) } as Prisma.InputJsonValue;
  let brandActionId: string;
  if (existing) {
    // Ce claim partagé empêche un double envoi entre cron et déclenchement manuel.
    const claim = (client: Prisma.TransactionClient) => client.brandAction.updateMany({
      where: { id: existing.id, strategyId: input.strategyId, status: existing.status, updatedAt: existing.updatedAt },
      data: { status, metadata, timingStart: scheduleAt ?? existing.timingStart, timingEnd: null },
    });
    const claimed = prepared ? await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id=${input.strategyId} FOR UPDATE`;
      await readPreparedPublication(input.strategyId, prepared.asset.id, input.publicationPackageHash!, input.userId, tx);
      return claim(tx);
    }, { isolationLevel: "Serializable", timeout: 25000 }) : await claim(db);
    if (claimed.count !== 1) {
      if (input.scheduledVersion) return { mode: "SKIPPED", brandActionId: existing.id, results: [] };
      throw new Error("Publication déjà prise en charge ou modifiée.");
    }
    brandActionId = existing.id;
  } else {
    const created = await db.brandAction.create({
      data: { strategyId: input.strategyId, title: `Publication : ${text.slice(0, 70)}`,
        description: text.slice(0, 500), touchpoint: "DIGITAL", source: "OPERATOR_MANUAL", selected: true,
        status, metadata, timingStart: scheduleAt ?? new Date() }, select: { id: true },
    });
    brandActionId = created.id;
  }
  if (planning) return { mode: "SCHEDULED", brandActionId, results: prior };

  const byPlatform = new Map(connections.map((c) => [String(c.platform), c]));
  const results: PublishTargetResult[] = [];
  for (const platform of targets) {
    const protectedResult = held.find((r) => r.platform === platform);
    if (protectedResult) {
      results.push(protectedResult);
      continue;
    }
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
    if (connections.filter((c) => String(c.platform) === platform).length > 1) {
      results.push({ platform, state: "FAILED", externalPostId: null, detail: "Choisissez un seul compte de travail pour ce réseau." });
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
              prepared?.content.delivery.placement ?? "FEED",
            )
          : await publishToLinkedIn(conn.accountId, payload.access_token, text, input.linkUrl ?? null);

    if (typeof out === "string") {
      results.push({ platform, state: "FAILED", externalPostId: null, detail: out });
    } else if ("uncertain" in out || !out.id?.trim()) {
      results.push({ platform, state: "UNCONFIRMED", connectionId: conn.id, externalPostId: null, detail: "uncertain" in out ? out.uncertain : missingReceipt });
    } else {
      results.push({ platform, state: "PUBLISHED", connectionId: conn.id, externalPostId: out.id, detail: null });
    }
  }

  const mode = publicationOutcome(targets, results);
  // Seule une action déjà planifiée, bloquée uniquement sur la connexion,
  // repart au prochain tick. Un refus ou un envoi incertain exige une revue.
  const keepWaiting = existing?.status === "SCHEDULED" && results.every((r) => r.state === "NOT_CONNECTED");
  // Si cette écriture échoue après un POST, le claim PUBLISHING reste en place.
  // Le cron ne le remet jamais en planification : rapprochement manuel nécessaire.
  await db.brandAction.update({
    where: { id: brandActionId },
    data: {
      status: keepWaiting ? "SCHEDULED" : mode === "PUBLISHED" ? "EXECUTED" : "ACCEPTED",
      timingEnd: mode === "PUBLISHED" ? new Date() : null,
      metadata: { ...meta, socialPublish: publishMetadata(input, keepWaiting, results) } as Prisma.InputJsonValue,
    },
  });
  if (keepWaiting) return { mode: "SCHEDULED", brandActionId, results };

  // Notification honnête (succès ET échecs) au porteur + délégués.
  const published = results.filter((r) => r.state === "PUBLISHED").map((r) => r.platform);
  const failed = results.filter((r) => r.state !== "PUBLISHED");
  const strategy = await db.strategy.findUnique({
    where: { id: input.strategyId },
    select: { userId: true, name: true },
  }).catch(() => null);
  if (strategy) {
    const brandName = strategy.name;
    const collaborators = await db.strategyCollaborator.findMany({
      where: { strategyId: input.strategyId, status: "ACTIVE" },
      select: { userId: true },
    }).catch(() => []);
    const recipients = [...new Set([strategy.userId, ...collaborators.map((c) => c.userId)])];
    const title =
      published.length > 0
        ? `Publication envoyée (${published.join(", ")})`
        : mode === "UNCONFIRMED" ? "Publication à vérifier sur le compte" : "Publication non envoyée";
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

  return { mode, brandActionId, results };
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
    select: { id: true, strategyId: true, metadata: true, updatedAt: true },
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
        scheduledVersion: action.updatedAt.toISOString(),
        ...(typeof sp.publicationPackageId === "string" ? {
          publicationPackageId: sp.publicationPackageId,
          publicationPackageHash: String(sp.publicationPackageHash ?? ""),
          publicationTarget: sp.publicationTarget as PublishSocialPostInput["publicationTarget"],
        } : {}),
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
  publicationPackageId?: string;
  status: string; // État spécifique de publication, reconstitué des reçus pour les anciennes lignes.
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
    const targets = Array.isArray(sp.targets) ? [...new Set(sp.targets.map((p) => String(p).toUpperCase()))] : [];
    const results = readReceipts(sp);
    const settled = a.status === "EXECUTED" || a.status === "ACCEPTED";
    out.push({
      brandActionId: a.id,
      ...(typeof sp.publicationPackageId === "string" ? { publicationPackageId: sp.publicationPackageId } : {}),
      status: settled ? publicationOutcome(targets, results) : a.status,
      scheduledAt: a.timingStart ? a.timingStart.toISOString() : null,
      targets,
      text: typeof sp.text === "string" ? sp.text : "",
      linkUrl: typeof sp.linkUrl === "string" ? sp.linkUrl : null,
      imageUrl: typeof sp.imageUrl === "string" ? sp.imageUrl : null,
      brief: typeof sp.brief === "string" ? sp.brief : null,
      visualCopy: typeof sp.visualCopy === "string" ? sp.visualCopy : null,
      pending: sp.pending === true,
      results,
    });
  }
  // La collecte est indépendante de l’envoi. Un rapprochement requiert le
  // même compte et l’ID renvoyé par le transport, jamais la seule légende.
  const sent = out.flatMap((p) => p.results).filter((r) => r.state === "PUBLISHED" && r.connectionId && r.externalPostId);
  if (sent.length) {
    const posts = await db.socialPost.findMany({
      where: { strategyId, OR: sent.map((r) => ({ connectionId: r.connectionId!, externalPostId: r.externalPostId! })) },
      select: { connectionId: true, externalPostId: true, permalinkUrl: true },
    });
    const links = new Map(posts.map((p) => [`${p.connectionId}:${p.externalPostId}`, p.permalinkUrl]));
    for (const r of sent) {
      const url = links.get(`${r.connectionId}:${r.externalPostId}`);
      if (url && /^https:\/\//i.test(url)) r.permalinkUrl = url;
    }
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
    select: { id: true, metadata: true, status: true, updatedAt: true },
  });
  if (!action) throw new Error("Publication introuvable");
  const meta = (action.metadata ?? {}) as Record<string, unknown>;
  const sp = meta.socialPublish as Record<string, unknown> | undefined;
  if (!sp) throw new Error("Publication introuvable");
  if (action.status === "CANCELLED") return { ok: true };
  const receipts = readReceipts(sp);
  const canCancel = action.status === "SCHEDULED" ||
    (["ACCEPTED", "EXECUTED"].includes(action.status) && receipts.length > 0);
  if (!canCancel || receipts.some((r) => r.state === "PUBLISHED" || r.state === "UNCONFIRMED")) {
    throw new Error("Cette publication ne peut plus être annulée.");
  }
  const changed = await db.brandAction.updateMany({
    where: { id: action.id, status: action.status, updatedAt: action.updatedAt },
    data: { status: "CANCELLED", metadata: { ...meta, socialPublish: { ...sp, pending: false } } as Prisma.InputJsonValue },
  });
  if (!changed.count) throw new Error("La publication a changé, rechargez son état.");
  return { ok: true };
}
