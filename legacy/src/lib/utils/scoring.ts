import type { PillarKey } from "@/lib/types/advertis-vector";

export interface PillarScoreInput {
  atomesValides: number;
  atomesRequis: number;
  collectionsCompletes: number;
  collectionsTotales: number;
  crossRefsValides: number;
  crossRefsRequises: number;
}

/**
 * Canon — base de scoring structurelle ADVE par pilier (Annexe G).
 *
 * Score d'un pilier sur /`PILLAR_MAX_SCORE` = somme pondérée de trois axes de
 * complétude (atomes, collections, cross-refs). Les poids sont la **constante
 * canonique figée** de la base : toute modification est un changement de
 * doctrine de scoring (cf. ADR-0102) et doit passer par
 * `tests/unit/governance/scoring-base-canon.test.ts`.
 *
 * LOI 9 (CdC v4 Chantier 2) — le scoring est une fonction **pure et
 * déterministe** : aucun LLM, aucun « quality modulator », variance = 0. Le
 * coefficient qualité LLM-assisté de l'ère pré-refonte (`applyQualityModulator`)
 * a été retiré (ADR-0102) — il contredisait LOI 9 et n'avait plus d'appelant.
 */
export const STRUCTURAL_WEIGHTS = {
  /** Atomes = exigences COMPLETE du contrat de maturité satisfaites. */
  atoms: 15,
  /** Collections = champs-tableaux au nombre minimal d'items satisfait. */
  collections: 7,
  /** Cross-refs = exigences ENRICHED (enrichissement cross-pilier RTIS). */
  crossRefs: 3,
} as const;

/** Plafond canonique d'un pilier = somme des poids structurels (= 25). */
export const PILLAR_MAX_SCORE =
  STRUCTURAL_WEIGHTS.atoms + STRUCTURAL_WEIGHTS.collections + STRUCTURAL_WEIGHTS.crossRefs;

/** Plafond composite = 8 piliers × `PILLAR_MAX_SCORE` (= 200, échelle brand-tier). */
export const COMPOSITE_MAX_SCORE = PILLAR_MAX_SCORE * 8;

/**
 * Scoring structurel déterministe par pilier (formule Annexe G) :
 *   score = (atomes/requis · 15) + (collections/totales · 7) + (cross_refs/requises · 3)
 * Plafonné à `PILLAR_MAX_SCORE`. Variance = 0 pour une même entrée (LOI 9).
 */
export function scorePillarStructural(input: PillarScoreInput): number {
  const atomScore =
    input.atomesRequis > 0
      ? (input.atomesValides / input.atomesRequis) * STRUCTURAL_WEIGHTS.atoms
      : 0;
  const collectionScore =
    input.collectionsTotales > 0
      ? (input.collectionsCompletes / input.collectionsTotales) * STRUCTURAL_WEIGHTS.collections
      : 0;
  const crossRefScore =
    input.crossRefsRequises > 0
      ? (input.crossRefsValides / input.crossRefsRequises) * STRUCTURAL_WEIGHTS.crossRefs
      : 0;
  return Math.min(PILLAR_MAX_SCORE, atomScore + collectionScore + crossRefScore);
}

/** Composite = somme déterministe des 8 piliers (/`COMPOSITE_MAX_SCORE`). */
export function computeComposite(pillars: Record<PillarKey, number>): number {
  return pillars.a + pillars.d + pillars.v + pillars.e + pillars.r + pillars.t + pillars.i + pillars.s;
}
