/**
 * superfan-ingest — mesure superfan depuis les interactions RÉELLES (ADR-0134 §B4).
 *
 * Sous-domaine SESHAT (mesure). Ce module est **LE single-writer** de
 * `SuperfanProfile` (le corps d'upsert a déménagé du router `superfan.ts` ici —
 * verrou HARD `scoring-scale-aware.test.ts` mis à jour en conséquence). Deux
 * portes gouvernées du MÊME kind `SESHAT_REGISTER_SUPERFAN` y délèguent :
 * la voie tRPC (`superfan.register`, geste opérateur) et le case commandant
 * (chemin cron — mise à jour des profils déjà nés).
 *
 * Doctrine anti-inflation (ADR-0126 renforcé) :
 *   - la NAISSANCE d'un profil reste un geste humain (revue de candidats,
 *     1 clic = intent) — `updateKnownSuperfansFromInbox` n'actualise QUE les
 *     profils existants, il n'en crée JAMAIS ;
 *   - `computeInboxEngagementDepth` est plafonné DUR à 0.60 : la seule preuve
 *     « commentaires » ne peut pas franchir le seuil superfan actif (0.65) —
 *     le bras d'évidence CULTE/ICONE reste inatteignable par simple footprint ;
 *   - sémantique jamais-dégrader : une mesure sociale ne peut qu'augmenter
 *     depth/interactions/récence d'un profil (max), jamais écraser un
 *     jugement opérateur plus haut.
 *
 * 100 % déterministe, zéro LLM (LOI 9). Absence de mesure = absence, jamais
 * une valeur fabriquée (P22-2).
 */

import { db } from "@/lib/db";
import {
  DEVOTION_LADDER_TIERS,
  devotionLadderPosition,
  type DevotionLadderTier,
} from "@/domain/devotion-ladder";

/** Client Prisma minimal — accepte `db` global ou le `ctx.db` tenant-scoped. */
type SuperfanDbClient = {
  superfanProfile: Pick<(typeof db)["superfanProfile"], "findUnique" | "upsert">;
};

// ── Fenêtres + seuils de la formule (documentés ADR-0134 §B4) ────────────────

export const INBOX_AGGREGATION_WINDOW_DAYS = 90;
/** Candidat proposé à revue humaine : ≥ 3 interactions ET ≥ 2 jours actifs. */
export const CANDIDATE_MIN_INTERACTIONS = 3;
export const CANDIDATE_MIN_ACTIVE_DAYS = 2;
export const CANDIDATE_LIST_LIMIT = 20;
/**
 * CAP DUR de la preuve « commentaires seuls » — STRICTEMENT sous le seuil
 * superfan actif (0.65, cf. community-dashboard/superfan router) : l'évidence
 * CULTE/ICONE ne peut PAS être gonflée par du footprint public.
 */
export const INBOX_DEPTH_HARD_CAP = 0.6;

/** Seuils depth→rung — mêmes bornes que devotion-engine `ENGAGEMENT_THRESHOLDS`. */
const DEPTH_TO_TIER: ReadonlyArray<{ min: number; tier: DevotionLadderTier }> = [
  { min: 0.85, tier: "EVANGELISTE" },
  { min: 0.65, tier: "AMBASSADEUR" },
  { min: 0.45, tier: "ENGAGE" },
  { min: 0.25, tier: "PARTICIPANT" },
  { min: 0.1, tier: "INTERESSE" },
  { min: 0, tier: "SPECTATEUR" },
];

export function tierFromEngagementDepth(depth: number): DevotionLadderTier {
  for (const { min, tier } of DEPTH_TO_TIER) {
    if (depth >= min) return tier;
  }
  return "SPECTATEUR";
}

// ── Écriture unique ──────────────────────────────────────────────────────────

export interface RegisterSuperfanInput {
  strategyId: string;
  platform: string;
  handle: string;
  segment: DevotionLadderTier;
  engagementDepth: number;
  interactions?: number;
  lastActiveAt?: Date;
  source: "MANUAL" | "CRM" | "CAMPAIGN" | "SOCIAL";
  /** Nom d'affichage public capté par la mesure (inbox) — jamais requis. */
  displayName?: string | null;
}

/**
 * L'UNIQUE upsert `SuperfanProfile` du repo. Dédup par la clé unique
 * (strategyId, platform, handle). `metadata` est MERGÉ (l'ancien corps du
 * router l'écrasait à chaque update — perte de provenance, T18).
 */
export async function registerSuperfanProfile(
  client: SuperfanDbClient,
  input: RegisterSuperfanInput,
) {
  const { strategyId, platform, handle, segment, engagementDepth, interactions, lastActiveAt, source, displayName } = input;
  const existing = await client.superfanProfile.findUnique({
    where: { strategyId_platform_handle: { strategyId, platform, handle } },
    select: { metadata: true },
  });
  const previousMeta =
    existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};
  const metadata = {
    ...previousMeta,
    source,
    ...(displayName ? { displayName } : {}),
  };

  return client.superfanProfile.upsert({
    where: { strategyId_platform_handle: { strategyId, platform, handle } },
    create: {
      strategyId, platform, handle, segment, engagementDepth,
      interactions: interactions ?? 0,
      lastActiveAt: lastActiveAt ?? null,
      metadata,
    },
    update: {
      segment, engagementDepth,
      ...(interactions != null ? { interactions } : {}),
      ...(lastActiveAt ? { lastActiveAt } : {}),
      metadata,
    },
  });
}

// ── Agrégation des interactions réelles ──────────────────────────────────────

export interface InboxAuthorAggregate {
  platform: string;
  /** Identité stable : `authorHandle ?? authorExternalId` (asymétrie FB/IG). */
  handle: string;
  displayName: string | null;
  interactions: number;
  lastActiveAt: Date;
  /** Jours distincts avec ≥ 1 interaction (étalement de l'engagement). */
  activeDays: number;
}

/**
 * Agrège les interactions inbox par auteur sur la fenêtre. Déterministe —
 * réduction TS pure sur les rows ; les items sans identité sont ignorés.
 */
export async function aggregateInboxAuthors(
  strategyId: string,
  windowDays: number = INBOX_AGGREGATION_WINDOW_DAYS,
): Promise<InboxAuthorAggregate[]> {
  const floor = new Date(Date.now() - windowDays * 86_400_000);
  const items = await db.socialInboxItem.findMany({
    where: { strategyId, publishedAt: { gte: floor } },
    select: {
      platform: true,
      authorHandle: true,
      authorExternalId: true,
      authorName: true,
      publishedAt: true,
    },
  });

  const byAuthor = new Map<
    string,
    { platform: string; handle: string; displayName: string | null; interactions: number; lastActiveAt: Date; days: Set<string> }
  >();
  for (const item of items) {
    const identity = item.authorHandle ?? item.authorExternalId;
    if (!identity || !item.publishedAt) continue;
    const platform = item.platform as string;
    const key = `${platform}::${identity}`;
    const day = item.publishedAt.toISOString().slice(0, 10);
    const agg = byAuthor.get(key);
    if (agg) {
      agg.interactions += 1;
      agg.days.add(day);
      if (item.publishedAt > agg.lastActiveAt) agg.lastActiveAt = item.publishedAt;
      if (!agg.displayName && item.authorName) agg.displayName = item.authorName;
    } else {
      byAuthor.set(key, {
        platform,
        handle: identity,
        displayName: item.authorName ?? null,
        interactions: 1,
        lastActiveAt: item.publishedAt,
        days: new Set([day]),
      });
    }
  }

  return [...byAuthor.values()]
    .map((a) => ({
      platform: a.platform,
      handle: a.handle,
      displayName: a.displayName,
      interactions: a.interactions,
      lastActiveAt: a.lastActiveAt,
      activeDays: a.days.size,
    }))
    .sort((x, y) => y.interactions - x.interactions);
}

/**
 * Profondeur d'engagement DÉTERMINISTE dérivée de la seule preuve inbox
 * (formule documentée ADR-0134 §B4) :
 *   0.25 (commenter = PARTICIPANT, canon devotion-ladder)
 *   + 0.02 × min(interactions, 10)   — volume, saturé à +0.20
 *   + 0.10 si activeDays ≥ 3          — étalement (pas un one-shot)
 *   + 0.05 si actif ≤ 14 j            — récence
 *   plafonnée DUR à `INBOX_DEPTH_HARD_CAP` (0.60).
 */
export function computeInboxEngagementDepth(
  a: Pick<InboxAuthorAggregate, "interactions" | "activeDays" | "lastActiveAt">,
  now: Date = new Date(),
): number {
  let depth = 0.25;
  depth += 0.02 * Math.min(a.interactions, 10);
  if (a.activeDays >= 3) depth += 0.1;
  const daysSinceActive = (now.getTime() - a.lastActiveAt.getTime()) / 86_400_000;
  if (daysSinceActive <= 14) depth += 0.05;
  return Math.min(INBOX_DEPTH_HARD_CAP, Math.round(depth * 100) / 100);
}

// ── Mise à jour des profils DÉJÀ nés (chemin cron) ───────────────────────────

export interface UpdateKnownSuperfansResult {
  state: "LIVE" | "DEGRADED";
  matched: number;
  updated: number;
}

/**
 * Actualise les SuperfanProfile EXISTANTS depuis les interactions réelles.
 * AUCUNE création (naissance = geste humain). Chaque écriture est ré-émise
 * via le spine (`SESHAT_REGISTER_SUPERFAN`, source SOCIAL) — jamais un write
 * direct depuis le cron. Sémantique jamais-dégrader : max() sur depth /
 * interactions / lastActiveAt ; segment recalculé du depth final.
 */
export async function updateKnownSuperfansFromInbox(
  strategyId: string,
): Promise<UpdateKnownSuperfansResult> {
  const [aggregates, profiles] = await Promise.all([
    aggregateInboxAuthors(strategyId),
    db.superfanProfile.findMany({
      where: { strategyId },
      select: { platform: true, handle: true, engagementDepth: true, interactions: true, lastActiveAt: true, segment: true },
    }),
  ]);
  if (aggregates.length === 0) return { state: "LIVE", matched: 0, updated: 0 };

  const byKey = new Map(profiles.map((p) => [`${p.platform}::${p.handle}`, p]));
  const { emitIntentTyped } = await import("@/server/services/mestor/intents");

  let matched = 0;
  let updated = 0;
  for (const agg of aggregates) {
    const profile = byKey.get(`${agg.platform}::${agg.handle}`);
    if (!profile) continue; // inconnu → candidat (revue humaine), jamais créé ici
    matched += 1;

    const measuredDepth = computeInboxEngagementDepth(agg);
    const finalDepth = Math.max(profile.engagementDepth, measuredDepth);
    const finalInteractions = Math.max(profile.interactions, agg.interactions);
    const finalLastActive =
      profile.lastActiveAt && profile.lastActiveAt > agg.lastActiveAt
        ? profile.lastActiveAt
        : agg.lastActiveAt;

    // Segment : ne recule jamais — max(position actuelle, position du depth final).
    const currentTier = (DEVOTION_LADDER_TIERS as readonly string[]).includes(profile.segment)
      ? (profile.segment as DevotionLadderTier)
      : "SPECTATEUR";
    const measuredTier = tierFromEngagementDepth(finalDepth);
    const finalTier =
      devotionLadderPosition(measuredTier) > devotionLadderPosition(currentTier)
        ? measuredTier
        : currentTier;

    const changed =
      finalDepth !== profile.engagementDepth ||
      finalInteractions !== profile.interactions ||
      finalTier !== currentTier ||
      (profile.lastActiveAt?.getTime() ?? 0) !== finalLastActive.getTime();
    if (!changed) continue;

    try {
      await emitIntentTyped(
        {
          kind: "SESHAT_REGISTER_SUPERFAN",
          strategyId,
          platform: agg.platform,
          handle: agg.handle,
          segment: finalTier,
          engagementDepth: finalDepth,
          interactions: finalInteractions,
          lastActiveAt: finalLastActive.toISOString(),
          source: "SOCIAL",
          displayName: agg.displayName,
        },
        { caller: "cron:social-sync:superfans" },
      );
      updated += 1;
    } catch {
      // Best-effort : un veto/échec d'émission n'arrête pas le lot.
    }
  }

  return { state: "LIVE", matched, updated };
}

// ── Candidats (revue humaine) ────────────────────────────────────────────────

export interface SuperfanCandidate extends InboxAuthorAggregate {
  /** Profondeur PROPOSÉE (formule inbox, cap 0.60) — l'opérateur reste juge. */
  proposedDepth: number;
  proposedSegment: DevotionLadderTier;
}

/**
 * Fans détectés dans les interactions réelles, PAS ENCORE suivis — calcul à
 * la volée (aucun modèle) : agrégats − profils existants, seuil conservateur
 * ≥ 3 interactions ET ≥ 2 jours actifs, tri par volume, top 20. La naissance
 * reste le clic humain (`superfan.register`).
 */
export async function listSuperfanCandidates(
  strategyId: string,
  windowDays: number = INBOX_AGGREGATION_WINDOW_DAYS,
): Promise<SuperfanCandidate[]> {
  const [aggregates, profiles] = await Promise.all([
    aggregateInboxAuthors(strategyId, windowDays),
    db.superfanProfile.findMany({
      where: { strategyId },
      select: { platform: true, handle: true },
    }),
  ]);
  const known = new Set(profiles.map((p) => `${p.platform}::${p.handle}`));

  return aggregates
    .filter(
      (a) =>
        !known.has(`${a.platform}::${a.handle}`) &&
        a.interactions >= CANDIDATE_MIN_INTERACTIONS &&
        a.activeDays >= CANDIDATE_MIN_ACTIVE_DAYS,
    )
    .slice(0, CANDIDATE_LIST_LIMIT)
    .map((a) => {
      const proposedDepth = computeInboxEngagementDepth(a);
      return { ...a, proposedDepth, proposedSegment: tierFromEngagementDepth(proposedDepth) };
    });
}
