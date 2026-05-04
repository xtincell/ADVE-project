/**
 * Domain helper — invariants APOGEE de cohérence Classification ↔ Superfans ↔ Cult Tier.
 *
 * Référence : CLAUDE.md §Mission, APOGEE.md §13 (Loi 4 maintien orbite ICONE).
 * Audit ADR-0045 — observé sur Makrea : classification `ICONE` avec
 * `superfanCount = 0`, ce qui contredit la définition canonique de ICONE
 * comme « superfans en orbite stable ». Le scorer math-pur `classifyBrand()`
 * ne lit pas les superfans ; cet helper reformule l'invariant à un endroit
 * unique, exposable comme assertion test ou pre-flight gate.
 */

import type { BrandClassification } from "@/lib/types/advertis-vector";

/**
 * Seuils plancher de superfans actifs requis par tier de classification
 * (ICONE/CULTE = catégories où la masse critique d'ambassadeurs/évangélistes
 * est constitutive de la définition).
 *
 * Les seuils sont délibérément modestes : ils servent à attraper l'incohérence
 * "ICONE sans superfans" (état qu'aucun produit ne devrait jamais publier)
 * plutôt qu'à valider une vraie masse critique en orbite. Une trajectoire de
 * croissance vers ICONE peut commencer avec peu de superfans visibles ; ce
 * qui n'est pas légitime, c'est de **dire** ICONE quand on en a zéro.
 *
 * Si le métier veut un threshold "vraie orbite stable" plus élevé pour gating
 * marketing/PR ailleurs, il vit dans son propre helper — pas ici.
 */
export const MIN_SUPERFANS_BY_CLASSIFICATION: Record<BrandClassification, number> = {
  ZOMBIE: 0,
  ORDINAIRE: 0,
  FORTE: 0,
  CULTE: 1,
  ICONE: 1,
};

export interface ClassificationCoherenceCheck {
  ok: boolean;
  violations: string[];
}

/**
 * Vérifie qu'une classification annoncée pour un brand est cohérente avec
 * son état observable (count superfans, tier devotion ladder courant si dispo).
 *
 * Use cases :
 * - Pre-flight gate avant `mestor.emitIntent({ kind: "CLASSIFY_BRAND_TIER" })`
 *   pour refuser un downgrade silencieux qui violerait Loi 1 conservation altitude.
 * - Test invariant CI : pour toute brand active, `assertClassificationCoherence`
 *   ne doit jamais retourner `ok: false`.
 * - Pre-flight UI : avant d'afficher un badge `ICONE` côté Cockpit, on vérifie
 *   que la classification est cohérente — sinon on rétrograde l'affichage à
 *   la classe immédiatement inférieure et on signale le drift dans highlights.
 */
export function checkClassificationCoherence(args: {
  classification: BrandClassification;
  superfanCount: number;
}): ClassificationCoherenceCheck {
  const { classification, superfanCount } = args;
  const violations: string[] = [];

  const minSuperfans = MIN_SUPERFANS_BY_CLASSIFICATION[classification];
  if (superfanCount < minSuperfans) {
    violations.push(
      `Classification ${classification} requiert au moins ${minSuperfans} superfan(s) ; ${superfanCount} observé(s).`,
    );
  }

  return { ok: violations.length === 0, violations };
}

/**
 * Variante throwing — utile dans les flows où l'incohérence doit interrompre
 * l'opération (Intent handler refusant la classification).
 */
export class ClassificationCoherenceError extends Error {
  constructor(public readonly violations: string[]) {
    super(`Classification coherence violated:\n  - ${violations.join("\n  - ")}`);
    this.name = "ClassificationCoherenceError";
  }
}

export function assertClassificationCoherence(args: {
  classification: BrandClassification;
  superfanCount: number;
}): void {
  const result = checkClassificationCoherence(args);
  if (!result.ok) throw new ClassificationCoherenceError(result.violations);
}
