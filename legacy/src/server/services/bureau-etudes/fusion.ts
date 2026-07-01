/**
 * fusion.ts — Fusion pondérée de sources + erreur honnête (ADR-0114, Bureau d'étude).
 *
 * Plusieurs sources estiment une même grandeur (ex. TAM, part de marché). On les
 * fusionne par MOYENNE PONDÉRÉE par leur fiabilité (`reliability`, déjà une donnée
 * par-source, mutable) et on renvoie une DISPERSION honnête (écart-type pondéré) —
 * jamais un point unique faussement précis. 100 % PUR, zéro LLM, zéro constante de
 * pondération en dur : le poids EST la fiabilité de la source.
 */

export interface SourcePoint {
  value: number;
  reliability: number | null; // poids ∈ [0,1]. null → source exclue (pas inventée).
  provenanceClass?: string | null; // métadonnée surfacée, n'altère pas le calcul
}

export interface FusionResult {
  fused: number; // moyenne pondérée
  dispersion: number; // écart-type pondéré (erreur honnête)
  totalWeight: number;
  usedN: number; // nb de sources réellement pondérées
  excludedN: number; // nb de sources sans fiabilité (exclues)
  byProvenance: Record<string, number>; // comptage par classe (transparence)
}

/**
 * Fusionne des estimations. `null` si aucune source pondérable (jamais de chiffre
 * inventé). La dispersion = sqrt(Σ w(v−µ)² / Σ w). PUR.
 */
export function fuseEstimates(points: SourcePoint[]): FusionResult | null {
  const usable = points.filter(
    (p) => Number.isFinite(p.value) && p.reliability !== null && Number.isFinite(p.reliability) && p.reliability > 0,
  );
  const byProvenance: Record<string, number> = {};
  for (const p of points) {
    const k = p.provenanceClass ?? "UNKNOWN";
    byProvenance[k] = (byProvenance[k] ?? 0) + 1;
  }
  const excludedN = points.length - usable.length;
  if (usable.length === 0) return null;

  const totalWeight = usable.reduce((s, p) => s + (p.reliability as number), 0);
  const fusedRaw = usable.reduce((s, p) => s + p.value * (p.reliability as number), 0) / totalWeight;
  const varianceRaw =
    usable.reduce((s, p) => s + (p.reliability as number) * Math.pow(p.value - fusedRaw, 2), 0) / totalWeight;

  return {
    fused: Math.round(fusedRaw * 10000) / 10000,
    dispersion: Math.round(Math.sqrt(varianceRaw) * 10000) / 10000,
    totalWeight: Math.round(totalWeight * 10000) / 10000,
    usedN: usable.length,
    excludedN,
    byProvenance,
  };
}
