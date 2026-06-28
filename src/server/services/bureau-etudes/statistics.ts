/**
 * statistics.ts — Statistiques d'étude DÉTERMINISTES (ADR-0110, acteur Bureau d'étude).
 *
 * Marge d'erreur (n → MoE), taille d'échantillon requise, et significativité
 * inter-vagues (z-test deux proportions). 100 % PUR, zéro LLM, zéro hasard. Les
 * NORMES (n typiques, T2B par catégorie) vivent en base (`MethodologyReference`),
 * pas ici — ce module ne contient que les FORMULES.
 */

/** Score z bilatéral pour un niveau de confiance courant. PUR. */
export function zForConfidence(confidenceLevel: number): number {
  if (confidenceLevel >= 0.99) return 2.576;
  if (confidenceLevel >= 0.95) return 1.96;
  if (confidenceLevel >= 0.9) return 1.645;
  return 1.96; // défaut prudent 95 %
}

/**
 * Marge d'erreur (%) pour un échantillon de taille `n`. Pire cas p=0.5 par défaut.
 * MoE = z × sqrt(p(1-p)/n) × 100. `null` si n ≤ 0. n≈384 → ≈ ±5 % à 95 %.
 */
export function marginOfErrorPct(n: number, confidenceLevel = 0.95, p = 0.5): number | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  const z = zForConfidence(confidenceLevel);
  const moe = z * Math.sqrt((p * (1 - p)) / n) * 100;
  return Math.round(moe * 100) / 100;
}

/**
 * Taille d'échantillon requise pour une marge d'erreur cible (%). Pire cas p=0.5.
 * n = (z/E)² · p(1-p), arrondi au supérieur. `null` si MoE cible ≤ 0.
 */
export function requiredSampleForMoe(targetMoePct: number, confidenceLevel = 0.95, p = 0.5): number | null {
  if (!Number.isFinite(targetMoePct) || targetMoePct <= 0) return null;
  const z = zForConfidence(confidenceLevel);
  const e = targetMoePct / 100;
  return Math.ceil(((z * z) * p * (1 - p)) / (e * e));
}

export interface WaveComparison {
  delta: number; // p2 - p1 (points de proportion, ex. 0.04 = +4 pts)
  z: number | null;
  significant: boolean;
  confidenceLevel: number;
}

/**
 * Significativité inter-vagues (z-test deux proportions). p1/p2 en [0,1], n1/n2 > 0.
 * Significatif si |z| > z(conf). PUR — `z=null`/`significant=false` si entrées
 * invalides (jamais d'erreur jetée, jamais de faux verdict).
 */
export function waveOnWaveSignificance(
  p1: number,
  n1: number,
  p2: number,
  n2: number,
  confidenceLevel = 0.95,
): WaveComparison {
  const valid =
    [p1, p2].every((p) => Number.isFinite(p) && p >= 0 && p <= 1) &&
    [n1, n2].every((n) => Number.isFinite(n) && n > 0);
  const delta = Math.round((p2 - p1) * 10000) / 10000;
  if (!valid) return { delta, z: null, significant: false, confidenceLevel };

  const pPool = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  if (se === 0) return { delta, z: null, significant: false, confidenceLevel };
  const z = (p2 - p1) / se;
  const zCrit = zForConfidence(confidenceLevel);
  return {
    delta,
    z: Math.round(z * 1000) / 1000,
    significant: Math.abs(z) > zCrit,
    confidenceLevel,
  };
}
