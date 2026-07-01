/**
 * rice.ts — Priorisation RICE déterministe (ADR-0109, acteur Conseil).
 *
 * RICE = (Reach × Impact × Confidence) / Effort. Cadre canon de priorisation des
 * recommandations (Intercom). 100 % PUR, zéro LLM, zéro hasard.
 *
 * Doctrine reference-data (ADR-0099/0093) : les valeurs numériques des libellés
 * (« Massive » → 3, « High » → 2…) ne sont JAMAIS des constantes en code — elles
 * vivent dans la table `RiceScale`, seedée et mutable. Ce module ne contient que
 * les FORMULES ; les barèmes viennent de la base.
 */

export interface RiceInputs {
  /** Portée : nombre de cibles touchées / période, OU valeur d'échelle seedée. */
  reach: number;
  /** Impact : multiplicateur (échelle RICE seedée). */
  impact: number;
  /** Confiance : 0.0 - 1.0. */
  confidence: number;
  /** Effort : personne-mois (> 0). */
  effort: number;
}

/** Ligne de barème telle que stockée en base. */
export interface RiceScaleRow {
  dimension: string;
  label: string;
  value: number;
}

/**
 * Calcule le score RICE. PUR. Renvoie `null` si l'effort est ≤ 0 (division
 * impossible) ou si une entrée n'est pas finie — jamais NaN/Infinity, jamais un
 * faux score. Arrondi à 2 décimales pour un tri stable.
 */
export function computeRiceScore(inputs: RiceInputs): number | null {
  const { reach, impact, confidence, effort } = inputs;
  if (![reach, impact, confidence, effort].every((n) => Number.isFinite(n))) return null;
  if (effort <= 0) return null;
  const raw = (reach * impact * confidence) / effort;
  if (!Number.isFinite(raw)) return null;
  return Math.round(raw * 100) / 100;
}

/**
 * Résout la valeur numérique d'un libellé pour une dimension donnée depuis les
 * lignes de barème. `null` si le couple (dimension, label) n'existe pas — le
 * caller décide (jamais d'invention de valeur).
 */
export function resolveScaleValue(rows: RiceScaleRow[], dimension: string, label: string): number | null {
  const row = rows.find((r) => r.dimension === dimension && r.label.toLowerCase() === label.toLowerCase());
  return row ? row.value : null;
}

/**
 * Tri décroissant par riceScore (les non-scorés en queue). PUR, stable.
 */
export function sortByRice<T extends { riceScore?: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.riceScore ?? -1) - (a.riceScore ?? -1));
}

/**
 * Mappe l'impact catégoriel existant d'une Recommendation (LOW/MEDIUM/HIGH) vers
 * un libellé de l'échelle IMPACT RICE — passerelle pour un score par défaut avant
 * affinage opérateur. PUR.
 */
export function categoricalImpactToRiceLabel(impact: string): "High" | "Medium" | "Low" {
  switch (impact.toUpperCase()) {
    case "HIGH":
      return "High";
    case "LOW":
      return "Low";
    default:
      return "Medium";
  }
}
