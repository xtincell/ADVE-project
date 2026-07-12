/**
 * src/domain/market-scale.ts — Layer 0. Échelle de marché déclarée d'une marque
 * (ADR-0126, enfant d'ADR-0086).
 *
 * Répond à l'angle mort « le score est aveugle à l'échelle » : une marque de
 * quartier, une nationale et une mondiale étaient étalonnées sur les MÊMES
 * cibles d'évidence absolues (1000 superfans / 20 signaux), comme si
 * l'entreprise nationale d'électricité et Apple jouaient la même partie.
 *
 * Trois usages :
 *   1. `EVIDENCE_TARGETS_BY_SCALE` — cibles de preuve culturelle par échelle,
 *      consommées par le plafond d'évidence CULTE/ICONE (`advertis-scorer`).
 *   2. `resolveEvidenceTargets` — résolution déterministe (échelle déclarée +
 *      audience adressable optionnelle → cibles). Fallback échelle absente =
 *      les constantes historiques (NATION) : ZÉRO régression silencieuse
 *      (Loi 1) pour les stratégies non encore qualifiées.
 *   3. `formatTierReferential` — libellé business du référentiel d'un palier
 *      (« Forte — échelle nationale »), pour que le score ne s'affiche plus
 *      jamais sans son échelle (registre client ADR-0123 respecté).
 *
 * Pure : zod only, aucune I/O, aucun LLM, variance 0 (LOI 9).
 */

import { z } from "zod";
import type { BrandTier } from "./brand-tier";
import { TIER_DEFINITIONS } from "./brand-tier";

/** Échelles ordonnées, du terrain le plus local au plus large. */
export const MARKET_SCALES = [
  "QUARTIER",
  "VILLE",
  "REGION",
  "NATION",
  "CONTINENT",
  "MONDE",
] as const;

export type MarketScale = (typeof MARKET_SCALES)[number];

export const MarketScaleSchema = z.enum(MARKET_SCALES);

/** Libellés business (client-safe — registre ADR-0123). */
export const MARKET_SCALE_LABELS: Record<MarketScale, string> = {
  QUARTIER: "échelle de quartier",
  VILLE: "échelle d'une ville",
  REGION: "échelle régionale",
  NATION: "échelle nationale",
  CONTINENT: "échelle continentale",
  MONDE: "échelle mondiale",
};

export interface EvidenceTargets {
  /** Nombre de superfans trackés au-delà duquel le bras « superfans » sature. */
  superfansTarget: number;
  /** Nombre de signaux faibles captés au-delà duquel le bras « signaux » sature. */
  tarsisTarget: number;
}

/**
 * Cibles de preuve culturelle par échelle déclarée.
 *
 * NATION == les constantes historiques du plafond d'évidence (1000 / 20) —
 * c'est le point de continuité : une stratégie sans échelle déclarée est
 * traitée comme avant l'ADR-0126. Les valeurs croissent avec l'échelle parce
 * que la MÊME masse absolue prouve moins à mesure que le terrain s'élargit
 * (1000 fans dévoués sont une secte à l'échelle d'un quartier, un bruit de
 * fond à l'échelle d'un continent).
 */
export const EVIDENCE_TARGETS_BY_SCALE: Record<MarketScale, EvidenceTargets> = {
  QUARTIER: { superfansTarget: 50, tarsisTarget: 5 },
  VILLE: { superfansTarget: 150, tarsisTarget: 8 },
  REGION: { superfansTarget: 400, tarsisTarget: 12 },
  NATION: { superfansTarget: 1000, tarsisTarget: 20 },
  CONTINENT: { superfansTarget: 3000, tarsisTarget: 30 },
  MONDE: { superfansTarget: 8000, tarsisTarget: 40 },
};

/** Fallback historique (== NATION) pour les stratégies sans échelle déclarée. */
export const LEGACY_EVIDENCE_TARGETS: EvidenceTargets =
  EVIDENCE_TARGETS_BY_SCALE.NATION;

/**
 * Part de l'audience adressable qui, convertie en superfans trackés, sature le
 * bras « superfans » de l'évidence. 5 % d'évangélistes/ambassadeurs d'une
 * audience adressable est une densité de culte de classe mondiale — au-delà,
 * exiger plus n'étalonne plus la dévotion, seulement la taille.
 */
export const ADDRESSABLE_SATURATION_SHARE = 0.05;

/** Plancher : en-dessous, le comptage n'est plus significatif. */
export const MIN_SUPERFANS_TARGET = 25;

// ── Suggestion d'audience adressable (amendement ADR-0126, 2026-07-12) ──────
//
// L'audience adressable reste DÉCLARÉE par le porteur — jamais auto-écrite
// (le système ne note pas son propre devoir). Mais on peut lui PROPOSER un
// plancher factuel : sa communauté déjà mesurée sur les réseaux connectés.
// Zéro estimation inventée — uniquement des relevés réels ; le recouvrement
// entre réseaux étant inconnu, on livre la somme (haut) ET le plus grand
// réseau (bas). Le clic du porteur fait la déclaration, pas ce module.

export interface AudienceSuggestionRow {
  platform: string;
  followerCount: number;
}

export interface AudienceSuggestion {
  /** Somme des derniers relevés par réseau (recouvrement possible). */
  suggested: number;
  /** Borne basse certaine : le plus grand réseau à lui seul. */
  floor: number;
  /** Détail par réseau, trié décroissant. */
  perPlatform: AudienceSuggestionRow[];
}

export function computeAudienceSuggestion(
  rows: readonly AudienceSuggestionRow[],
): AudienceSuggestion | null {
  const clean = rows
    .filter((r) => Number.isFinite(r.followerCount) && r.followerCount > 0)
    .map((r) => ({ platform: r.platform, followerCount: Math.round(r.followerCount) }))
    .sort((a, b) => b.followerCount - a.followerCount);
  if (clean.length === 0) return null;
  const suggested = clean.reduce((n, r) => n + r.followerCount, 0);
  return { suggested, floor: clean[0]!.followerCount, perPlatform: clean };
}

/**
 * Résolution déterministe des cibles d'évidence.
 *
 * - Échelle déclarée → cibles de sa bande.
 * - Audience adressable déclarée → le bras superfans est plafonné à 5 % de
 *   l'adressable (borné à [MIN_SUPERFANS_TARGET, cible d'échelle]) : la
 *   densité prime sur l'absolu quand on connaît le dénominateur.
 * - Rien de déclaré → cibles historiques (fallback honnête, Loi 1).
 */
export function resolveEvidenceTargets(input: {
  marketScale: MarketScale | null | undefined;
  addressableAudience: number | null | undefined;
}): EvidenceTargets {
  const base = input.marketScale
    ? EVIDENCE_TARGETS_BY_SCALE[input.marketScale]
    : LEGACY_EVIDENCE_TARGETS;

  const addressable = input.addressableAudience;
  if (addressable == null || !Number.isFinite(addressable) || addressable <= 0) {
    return base;
  }

  const densityTarget = Math.round(addressable * ADDRESSABLE_SATURATION_SHARE);
  const superfansTarget = Math.min(
    base.superfansTarget,
    Math.max(MIN_SUPERFANS_TARGET, densityTarget),
  );
  return { superfansTarget, tarsisTarget: base.tarsisTarget };
}

/**
 * Libellé business du référentiel d'un palier — le palier ne se dit plus sans
 * son échelle. Sans échelle déclarée, l'absence est affichée honnêtement
 * (« échelle non déclarée »), jamais masquée.
 *
 * @example formatTierReferential("FORTE", "NATION")   // "Forte — échelle nationale"
 * @example formatTierReferential("CULTE", null)        // "Culte — échelle non déclarée"
 */
export function formatTierReferential(
  tier: BrandTier,
  marketScale: MarketScale | null | undefined,
): string {
  const scaleLabel = marketScale
    ? MARKET_SCALE_LABELS[marketScale]
    : "échelle non déclarée";
  return `${TIER_DEFINITIONS[tier].label} — ${scaleLabel}`;
}
