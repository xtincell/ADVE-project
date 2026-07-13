/**
 * community-snapshot-writer — écrivain de PRODUCTION des `CommunitySnapshot`
 * (ADR-0134 §B1). Extension du service cult-index-engine (qui possède REQ-4
 * CommunitySnapshot depuis M10) — pas un nouveau module métier.
 *
 * Avant cette vague, `CommunitySnapshot` était seed-only : la dimension
 * `communityCohesion` (15 % du cult index) était structurellement vide en
 * production pendant que la vraie donnée dormait dans `FollowerSnapshot`,
 * `SocialPost` et `SocialInboxItem` (audit 2026-07-13, T8).
 *
 * Doctrine :
 *   - 100 % déterministe, zéro LLM (LOI 9).
 *   - Absence de mesure = `null` / pas de row — JAMAIS un 0 fabriqué (P22-2).
 *   - Unités canoniques (ADR-0134) : `size` absolu · `health`/`activeRate`/
 *     `sentiment` fractions 0-1 · `velocity` fraction de croissance ~30 j.
 *   - `sentiment` = null TOUJOURS en v1 : aucune source ne mesure le sentiment
 *     aujourd'hui (les champs `SocialPost.sentiment`/`SocialInboxItem.sentiment`
 *     n'ont pas d'écrivain). Le jour où ils en ont un, la formule vient ici.
 *   - Écriture déclenchée par l'Intent `SESHAT_CAPTURE_COMMUNITY_SNAPSHOT`
 *     (cron social-sync quotidien) — provenance `source: "CONNECTOR"`.
 */

import { db } from "@/lib/db";

/** Fenêtres de mesure (jours). */
export const FOLLOWER_FRESHNESS_DAYS = 90;
export const VELOCITY_REFERENCE_TARGET_DAYS = 30;
export const VELOCITY_REFERENCE_MIN_DAYS = 7;
export const VELOCITY_REFERENCE_MAX_DAYS = 45;
export const ENGAGEMENT_WINDOW_DAYS = 30;
export const INBOX_WINDOW_DAYS = 30;

/**
 * Plateformes couvertes par l'inbox v1 (ADR-0133 : commentaires FB Page +
 * IG Business). Hors couverture → `activeRate` reste null (absence de
 * mesure ≠ communauté inactive).
 */
export const INBOX_COVERED_PLATFORMS: ReadonlySet<string> = new Set([
  "FACEBOOK",
  "INSTAGRAM",
]);

export interface CommunityMeasureInput {
  platform: string;
  /** Dernier relevé followers ≤ FOLLOWER_FRESHNESS_DAYS. Null = pas de base. */
  latestFollowers: { count: number; capturedAt: Date } | null;
  /** Relevé de référence le plus proche de J-30 dans [J-45, J-7]. */
  referenceFollowers: { count: number; capturedAt: Date } | null;
  /** `SocialPost.engagementRate` non-null des posts publiés ≤ 30 j (fractions). */
  postEngagementRates: readonly number[];
  /** Auteurs uniques inbox ≤ 30 j. Null = plateforme hors couverture inbox v1. */
  inboxUniqueAuthors30d: number | null;
}

export interface CommunitySnapshotRow {
  platform: string;
  size: number;
  health: number | null;
  sentiment: null;
  velocity: number | null;
  activeRate: number | null;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Compose une row de mesure pour UNE plateforme. Pure, déterministe.
 * Retourne `null` si aucune base followers mesurée — pas de row fabriquée.
 */
export function composeCommunitySnapshotRow(
  m: CommunityMeasureInput,
): CommunitySnapshotRow | null {
  if (!m.latestFollowers || m.latestFollowers.count <= 0) return null;
  const size = m.latestFollowers.count;

  // velocity — croissance vs référence ~J-30 ; null sans référence exploitable.
  let velocity: number | null = null;
  if (m.referenceFollowers && m.referenceFollowers.count > 0) {
    velocity = Math.max(-1, (size - m.referenceFollowers.count) / m.referenceFollowers.count);
  }

  // health — taux d'engagement moyen par post mesuré ; null si aucun post mesuré.
  let health: number | null = null;
  if (m.postEngagementRates.length > 0) {
    const mean =
      m.postEngagementRates.reduce((s, r) => s + r, 0) / m.postEngagementRates.length;
    health = clamp01(mean);
  }

  // activeRate — commentateurs uniques / followers. 0 auteur sur une plateforme
  // SCANNÉE est une mesure réelle (0 honnête) ; null = hors couverture inbox.
  const activeRate =
    m.inboxUniqueAuthors30d === null ? null : clamp01(m.inboxUniqueAuthors30d / size);

  return { platform: m.platform, size, health, sentiment: null, velocity, activeRate };
}

export type CaptureCommunityResult =
  | { state: "LIVE"; platforms: string[]; snapshotIds: string[] }
  | { state: "DEGRADED"; reason: "INSUFFICIENT_DATA" };

/**
 * I/O — mesure et persiste un CommunitySnapshot par plateforme suivie.
 * Une plateforme = un dernier `FollowerSnapshot` ≤ 90 j (la « base »).
 * DEGRADED INSUFFICIENT_DATA si aucune base — la chaîne de mesure aval
 * (devotion → cult) n'est alors PAS déclenchée par le handler.
 */
export async function captureCommunitySnapshots(
  strategyId: string,
): Promise<CaptureCommunityResult> {
  const now = Date.now();
  const freshFloor = new Date(now - FOLLOWER_FRESHNESS_DAYS * 86_400_000);
  const refFrom = new Date(now - VELOCITY_REFERENCE_MAX_DAYS * 86_400_000);
  const refTo = new Date(now - VELOCITY_REFERENCE_MIN_DAYS * 86_400_000);
  const engagementFloor = new Date(now - ENGAGEMENT_WINDOW_DAYS * 86_400_000);
  const inboxFloor = new Date(now - INBOX_WINDOW_DAYS * 86_400_000);

  const [followerRows, posts, inboxItems] = await Promise.all([
    db.followerSnapshot.findMany({
      where: { strategyId, capturedAt: { gte: refFrom } },
      orderBy: { capturedAt: "desc" },
      select: { platform: true, followerCount: true, capturedAt: true },
    }),
    db.socialPost.findMany({
      where: {
        strategyId,
        publishedAt: { gte: engagementFloor },
        engagementRate: { not: null },
      },
      select: { engagementRate: true, connection: { select: { platform: true } } },
    }),
    db.socialInboxItem.findMany({
      where: { strategyId, publishedAt: { gte: inboxFloor } },
      select: { platform: true, authorExternalId: true, authorHandle: true },
    }),
  ]);

  // Agrégats par plateforme (réduction TS pure).
  const platforms = new Set<string>(followerRows.map((r) => r.platform as string));
  const engagementByPlatform = new Map<string, number[]>();
  for (const p of posts) {
    if (p.engagementRate === null) continue;
    const key = p.connection.platform as string;
    const arr = engagementByPlatform.get(key) ?? [];
    arr.push(p.engagementRate);
    engagementByPlatform.set(key, arr);
  }
  const inboxAuthorsByPlatform = new Map<string, Set<string>>();
  for (const item of inboxItems) {
    const identity = item.authorExternalId ?? item.authorHandle;
    if (!identity) continue;
    const key = item.platform as string;
    const set = inboxAuthorsByPlatform.get(key) ?? new Set<string>();
    set.add(identity);
    inboxAuthorsByPlatform.set(key, set);
  }

  const rows: CommunitySnapshotRow[] = [];
  for (const platform of platforms) {
    const ofPlatform = followerRows.filter((r) => (r.platform as string) === platform);
    const latest = ofPlatform.find((r) => r.capturedAt >= freshFloor) ?? null;

    // Référence velocity : le relevé le plus proche de J-30 dans [J-45, J-7],
    // STRICTEMENT antérieur au relevé courant.
    const targetTs = now - VELOCITY_REFERENCE_TARGET_DAYS * 86_400_000;
    let reference: { count: number; capturedAt: Date } | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const r of ofPlatform) {
      if (r.capturedAt > refTo || r.capturedAt < refFrom) continue;
      if (latest && r.capturedAt >= latest.capturedAt) continue;
      const dist = Math.abs(r.capturedAt.getTime() - targetTs);
      if (dist < bestDist) {
        bestDist = dist;
        reference = { count: r.followerCount, capturedAt: r.capturedAt };
      }
    }

    const row = composeCommunitySnapshotRow({
      platform,
      latestFollowers: latest
        ? { count: latest.followerCount, capturedAt: latest.capturedAt }
        : null,
      referenceFollowers: reference,
      postEngagementRates: engagementByPlatform.get(platform) ?? [],
      inboxUniqueAuthors30d: INBOX_COVERED_PLATFORMS.has(platform)
        ? (inboxAuthorsByPlatform.get(platform)?.size ?? 0)
        : null,
    });
    if (row) rows.push(row);
  }

  if (rows.length === 0) return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };

  const snapshotIds: string[] = [];
  for (const row of rows) {
    const created = await db.communitySnapshot.create({
      data: { strategyId, ...row, source: "CONNECTOR" },
      select: { id: true },
    });
    snapshotIds.push(created.id);
  }

  return { state: "LIVE", platforms: rows.map((r) => r.platform), snapshotIds };
}
