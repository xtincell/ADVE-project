import type { AdvertisVector, PillarKey } from "@/lib/types/advertis-vector";

export interface PillarScoreInput {
  atomesValides: number;
  atomesRequis: number;
  collectionsCompletes: number;
  collectionsTotales: number;
  crossRefsValides: number;
  crossRefsRequises: number;
}

/**
 * Deterministic structural scoring per pillar (Annexe G formula)
 * score = (atomes_valides/atomes_requis * 15) + (collections_completes/collections_totales * 7) + (cross_refs_valides/cross_refs_requises * 3)
 * Then multiplied by quality modulator (0.70-1.00)
 */
export function scorePillarStructural(input: PillarScoreInput): number {
  const atomScore = input.atomesRequis > 0 ? (input.atomesValides / input.atomesRequis) * 15 : 0;
  const collectionScore = input.collectionsTotales > 0 ? (input.collectionsCompletes / input.collectionsTotales) * 7 : 0;
  const crossRefScore = input.crossRefsRequises > 0 ? (input.crossRefsValides / input.crossRefsRequises) * 3 : 0;
  return Math.min(25, atomScore + collectionScore + crossRefScore);
}

export function applyQualityModulator(structuralScore: number, modulator: number): number {
  const clampedModulator = Math.max(0.70, Math.min(1.00, modulator));
  return structuralScore * clampedModulator;
}

export function computeComposite(pillars: Record<PillarKey, number>): number {
  return pillars.a + pillars.d + pillars.v + pillars.e + pillars.r + pillars.t + pillars.i + pillars.s;
}
