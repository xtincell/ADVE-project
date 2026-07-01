/**
 * evidence.ts — Chaîne de preuve déterministe (ADR-0113, acteur Conseil).
 *
 * Une hypothèse est SUPPORTED/REFUTED/OPEN selon le POIDS NET de ses évidences
 * (pour − contre). 100 % PUR, zéro LLM : le statut d'une hypothèse — donc le
 * « pourquoi » d'une recommandation adossée — remonte à des preuves datées et
 * pondérées, pas à un avis.
 */

export interface EvidenceLike {
  stance: string; // SUPPORTS|REFUTES
  weight: number; // 0.0-1.0
}

export interface HypothesisVerdict {
  netSupport: number; // somme(SUPPORTS) − somme(REFUTES)
  status: "OPEN" | "SUPPORTED" | "REFUTED";
  supportWeight: number;
  refuteWeight: number;
}

/**
 * Évalue une hypothèse depuis ses évidences. `threshold` = poids net requis pour
 * trancher (défaut 0.5). PUR, déterministe.
 */
export function evaluateHypothesis(evidences: EvidenceLike[], threshold = 0.5): HypothesisVerdict {
  let support = 0;
  let refute = 0;
  for (const e of evidences) {
    const w = Number.isFinite(e.weight) ? Math.max(0, Math.min(1, e.weight)) : 0;
    if (e.stance === "SUPPORTS") support += w;
    else if (e.stance === "REFUTES") refute += w;
  }
  const netSupport = Math.round((support - refute) * 100) / 100;
  let status: HypothesisVerdict["status"] = "OPEN";
  if (netSupport >= threshold) status = "SUPPORTED";
  else if (netSupport <= -threshold) status = "REFUTED";
  return {
    netSupport,
    status,
    supportWeight: Math.round(support * 100) / 100,
    refuteWeight: Math.round(refute * 100) / 100,
  };
}
