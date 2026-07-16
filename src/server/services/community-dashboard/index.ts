/**
 * community-dashboard — composition (read-only) du suivi communauté du cockpit.
 *
 * P5 « Fusée non-dépendante du LLM » — la donnée communauté existe déjà en
 * silos (`SuperfanProfile`, `DevotionSnapshot`, `CommunitySnapshot`,
 * `FollowerSnapshot`) mais sans surface unifiée. Ce service **compose** ces
 * sources en un DTO unique pour le portail `/cockpit/intelligence/community`.
 *
 * `shapeCommunityDashboard` est **pure** (pas d'I/O, déterministe) — l'I/O vit
 * dans le procédure tRPC `cockpitDashboard.getCommunityDashboard`. Honnêteté des
 * trous (PROPAGATION-MAP) : chaque section absente → `null` → EmptyState côté UI,
 * jamais une valeur fabriquée. Aucune dépendance LLM.
 */

/** Seuils devotion-engine (≥0.65 ambassadeur, ≥0.85 évangéliste) — cf. superfan router. */
export const ACTIVE_SUPERFAN_THRESHOLD = 0.65;
export const EVANGELISTE_THRESHOLD = 0.85;

export type VelocityTrend = "up" | "down" | "flat";

export interface CommunityDevotion {
  readonly distribution: {
    spectateur: number;
    interesse: number;
    participant: number;
    engage: number;
    ambassadeur: number;
    evangeliste: number;
  };
  readonly devotionScore: number;
  readonly measuredAt: string;
  /** Trajectoire du score (asc, ≤30 derniers snapshots quotidiens) — audit
      2026-07-16 `community-timeseries-and-identities-dropped`. */
  readonly history: ReadonlyArray<number>;
}

export interface CommunityHealth {
  readonly platform: string;
  readonly size: number;
  /** Fractions 0-1 (unités canon ADR-0134). Null = non mesuré → masqué UI. */
  readonly sentiment: number | null;
  readonly health: number | null;
  readonly velocity: number | null;
  readonly activeRate: number | null;
  readonly measuredAt: string;
}

export interface CommunityFollowers {
  readonly totalFollowers: number;
  readonly byPlatform: ReadonlyArray<{ platform: string; followers: number }>;
}

export interface CommunityDashboard {
  readonly superfans: {
    total: number;
    active: number;
    evangelistes: number;
    /** active / total, en %. */
    ratio: number;
    velocity: { delta: number; trend: VelocityTrend; periodDays: number };
  };
  readonly devotion: CommunityDevotion | null;
  readonly community: CommunityHealth | null;
  readonly followers: CommunityFollowers | null;
  /** false → la marque n'a encore aucune donnée communauté (EmptyState global). */
  readonly hasAnyData: boolean;
}

// ── Pure shaping inputs (rows already fetched by the procedure) ──────────

export interface DevotionRow {
  spectateur: number;
  interesse: number;
  participant: number;
  engage: number;
  ambassadeur: number;
  evangeliste: number;
  devotionScore: number;
  measuredAt: Date;
}

export interface CommunityRow {
  platform: string;
  size: number;
  sentiment: number | null;
  health: number | null;
  velocity: number | null;
  activeRate: number | null;
  measuredAt: Date;
}

export interface ShapeInput {
  superfanCounts: { total: number; active: number; evangelistes: number };
  velocity: { newActive: number; previousActive: number; periodDays: number };
  devotionRow: DevotionRow | null;
  communityRow: CommunityRow | null;
  /** Latest follower count per platform (already deduped to most-recent). */
  followerRows: ReadonlyArray<{ platform: string; followerCount: number }>;
  /** Snapshots devotion asc pour la trajectoire (optionnel, défaut []). */
  devotionHistory?: ReadonlyArray<{ devotionScore: number }>;
}

/**
 * Compose le DTO communauté à partir des lignes déjà récupérées. Pure,
 * déterministe, zéro LLM, zéro I/O.
 */
export function shapeCommunityDashboard(input: ShapeInput): CommunityDashboard {
  const { superfanCounts, velocity, devotionRow, communityRow, followerRows, devotionHistory } = input;

  const delta = velocity.newActive - velocity.previousActive;
  const trend: VelocityTrend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  // Unité normalisée AU BOUNDARY : DevotionSnapshot stocke des POURCENTAGES
  // 0-100 (devotion-engine roundPct) ; le DTO porte des FRACTIONS 0-1 canon.
  // Audit 2026-07-16 `devotion-rung-pct-times-100` : l'heuristique UI
  // « v <= 1 ? v*100 : v » re-multipliait les petits rungs réels (0.1 % → 10 %)
  // — l'échelle d'engagement était fausse d'un facteur 100 exactement là où
  // la mesure devient réelle.
  const asFraction = (v: number): number => Math.max(0, Math.min(1, v / 100));
  const devotion: CommunityDevotion | null = devotionRow
    ? {
        distribution: {
          spectateur: asFraction(devotionRow.spectateur),
          interesse: asFraction(devotionRow.interesse),
          participant: asFraction(devotionRow.participant),
          engage: asFraction(devotionRow.engage),
          ambassadeur: asFraction(devotionRow.ambassadeur),
          evangeliste: asFraction(devotionRow.evangeliste),
        },
        devotionScore: devotionRow.devotionScore,
        measuredAt: devotionRow.measuredAt.toISOString(),
        history: (devotionHistory ?? []).map((h) => h.devotionScore),
      }
    : null;

  const community: CommunityHealth | null = communityRow
    ? {
        platform: communityRow.platform,
        size: communityRow.size,
        sentiment: communityRow.sentiment,
        health: communityRow.health,
        velocity: communityRow.velocity,
        activeRate: communityRow.activeRate,
        measuredAt: communityRow.measuredAt.toISOString(),
      }
    : null;

  const followers: CommunityFollowers | null =
    followerRows.length > 0
      ? {
          totalFollowers: followerRows.reduce((sum, r) => sum + r.followerCount, 0),
          byPlatform: followerRows
            .map((r) => ({ platform: r.platform, followers: r.followerCount }))
            .sort((a, b) => b.followers - a.followers),
        }
      : null;

  const hasAnyData =
    superfanCounts.total > 0 ||
    devotion !== null ||
    community !== null ||
    followers !== null;

  return {
    superfans: {
      total: superfanCounts.total,
      active: superfanCounts.active,
      evangelistes: superfanCounts.evangelistes,
      ratio: superfanCounts.total > 0 ? Math.round((superfanCounts.active / superfanCounts.total) * 100) : 0,
      velocity: { delta, trend, periodDays: velocity.periodDays },
    },
    devotion,
    community,
    followers,
    hasAnyData,
  };
}

/**
 * Déduplique des FollowerSnapshot triés par date décroissante → un par plateforme
 * (le plus récent). Pure.
 */
export function latestFollowerPerPlatform(
  rows: ReadonlyArray<{ platform: string; followerCount: number; capturedAt: Date }>,
): Array<{ platform: string; followerCount: number }> {
  const seen = new Set<string>();
  const out: Array<{ platform: string; followerCount: number }> = [];
  // rows assumed sorted capturedAt desc — first occurrence per platform wins.
  for (const r of rows) {
    if (seen.has(r.platform)) continue;
    seen.add(r.platform);
    out.push({ platform: r.platform, followerCount: r.followerCount });
  }
  return out;
}
