// ============================================================================
// Evidence ceiling — gates the top tiers (CULTE/ICONE) on proven cultural mass.
// ============================================================================
//
// Extrait de `index.ts` (ADR-0167) pour devenir la SOURCE UNIQUE de la mesure
// d'évidence : le scorer la consomme pour plafonner le composite (cap FORTE
// sans preuve) ET le gate `PALIER_PROMOTION_PROOFS` la consomme pour refuser
// une promotion CULTE/ICONE non méritée avec une raison chiffrée honnête.
// Déplacement behavior-preserving — gardé par advertis-scorer.test.ts +
// scoring-scale-aware.test.ts.

import { db } from "@/lib/db";
import { TIER_UPPER_BOUNDS_200, resolveEvidenceTargets } from "@/domain";

// Weights sum to 1.0. Superfans + cult-index dominate (they ARE the proof of
// mass); age (patrimony) and Tarsis (cultural relevance proxy) are minor.
//
// ADR-0126 — the superfans/tarsis saturation targets are NO LONGER universal
// absolutes: they come from the brand's DECLARED market scale (+ addressable
// audience density cap) via `resolveEvidenceTargets` (src/domain/market-scale).
// A neighborhood brand is no longer asked for a nation's worth of superfans,
// and a big footprint no longer banks free evidence. No declared scale →
// historical targets (NATION band) — zero silent regression (Loi 1).
const SUPERFANS_WEIGHT = 0.45; // saturated at resolveEvidenceTargets().superfansTarget
const CULT_INDEX_WEIGHT = 0.3; // saturated at cult-index score 80
const AGE_WEIGHT = 0.1; // saturated at 5 years of BRAND age (declared brandFoundedYear)
const TARSIS_WEIGHT = 0.15; // saturated at resolveEvidenceTargets().tarsisTarget
const CULT_INDEX_TARGET = 80;
const AGE_YEARS_TARGET = 5;

/** Minimum evidence (0-1) to be eligible for the two apex tiers. */
export const EVIDENCE_FOR_CULTE = 0.2;
export const EVIDENCE_FOR_ICONE = 0.5;

/**
 * Returns the maximum composite (/200) a brand may be classified at given how
 * much cultural mass it has PROVEN. No proof → capped at FORTE; this is a
 * CEILING, never a floor (a strong structural strategy keeps its FORTE score).
 */
export function evidenceTierCeiling(evidence: number): number {
  if (evidence >= EVIDENCE_FOR_ICONE) return 200; // ICONE eligible
  if (evidence >= EVIDENCE_FOR_CULTE) return TIER_UPPER_BOUNDS_200.CULTE; // 180
  return TIER_UPPER_BOUNDS_200.FORTE; // 160
}

/** Décomposition de l'évidence — les chiffres bruts pour une raison honnête. */
export interface EvidenceBreakdown {
  /** Score d'évidence agrégé [0, 1]. */
  evidence: number;
  superfanCount: number;
  superfansTarget: number;
  cultIndex: number | null;
  cultFraction: number;
  ageYears: number;
  tarsisCount: number;
  tarsisTarget: number;
  /** Échelle de marché résolue (null = non déclarée → cibles NATION historiques). */
  marketScale: string | null;
}

/**
 * Décompose l'évidence d'une marque (superfans, cult-index, patrimoine, signaux
 * Tarsis) versus DÉCLARÉ. Pure lecture, aucun effet de bord. Échec → tout à
 * zéro (conservateur : plafond FORTE, jamais bloquant). Source unique — le
 * score agrégé `evidence` sort d'ici, `computeEvidenceScore` en est un alias.
 */
export async function computeEvidenceBreakdown(strategyId: string): Promise<EvidenceBreakdown> {
  try {
    const [strategy, superfanCount, latestCult, tarsisCount] = await Promise.all([
      db.strategy.findUnique({
        where: { id: strategyId },
        select: {
          createdAt: true,
          marketScale: true,
          addressableAudience: true,
          brandFoundedYear: true,
        },
      }),
      db.superfanProfile.count({ where: { strategyId } }).catch(() => 0),
      db.cultIndexSnapshot
        .findFirst({
          where: { strategyId },
          orderBy: { measuredAt: "desc" },
          select: { compositeScore: true },
        })
        .catch(() => null),
      db.signal.count({ where: { strategyId, type: { contains: "TARSIS" } } }).catch(() => 0),
    ]);

    // ADR-0126 — targets calibrated to the DECLARED market scale (+ optional
    // addressable-audience density cap). Nothing declared → historical values.
    const targets = resolveEvidenceTargets({
      marketScale: strategy?.marketScale ?? null,
      addressableAudience: strategy?.addressableAudience ?? null,
    });

    const superfansFraction = Math.min(1, superfanCount / targets.superfansTarget);
    const cultIndex = latestCult?.compositeScore ?? null;
    const cultFraction = cultIndex != null ? Math.min(1, cultIndex / CULT_INDEX_TARGET) : 0;
    // Patrimony = declared BRAND founding year when available; the account's
    // createdAt is only the honest fallback (tenure in the system, not brand age).
    const nowMs = Date.now();
    const foundedMs = strategy?.brandFoundedYear
      ? Date.UTC(strategy.brandFoundedYear, 0, 1)
      : (strategy?.createdAt?.getTime() ?? nowMs);
    const ageMs = Math.max(0, nowMs - foundedMs);
    const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
    const ageFraction = Math.min(1, Math.max(0, ageYears / AGE_YEARS_TARGET));
    const tarsisFraction = Math.min(1, tarsisCount / targets.tarsisTarget);

    const evidence = Math.min(
      1,
      superfansFraction * SUPERFANS_WEIGHT +
        cultFraction * CULT_INDEX_WEIGHT +
        ageFraction * AGE_WEIGHT +
        tarsisFraction * TARSIS_WEIGHT,
    );

    return {
      evidence,
      superfanCount,
      superfansTarget: targets.superfansTarget,
      cultIndex,
      cultFraction,
      ageYears,
      tarsisCount,
      tarsisTarget: targets.tarsisTarget,
      marketScale: strategy?.marketScale ?? null,
    };
  } catch {
    return {
      evidence: 0,
      superfanCount: 0,
      superfansTarget: resolveEvidenceTargets({ marketScale: null, addressableAudience: null }).superfansTarget,
      cultIndex: null,
      cultFraction: 0,
      ageYears: 0,
      tarsisCount: 0,
      tarsisTarget: resolveEvidenceTargets({ marketScale: null, addressableAudience: null }).tarsisTarget,
      marketScale: null,
    };
  }
}

/**
 * Evidence score in [0, 1] — how much the brand has PROVEN (superfans, cult
 * index, patrimony, weak signals) versus merely DECLARED. Pure read, no side
 * effects. Alias de `computeEvidenceBreakdown().evidence` (source unique).
 */
export async function computeEvidenceScore(strategyId: string): Promise<number> {
  return (await computeEvidenceBreakdown(strategyId)).evidence;
}
