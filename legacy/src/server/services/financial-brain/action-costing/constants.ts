/**
 * Thot — action-costing pure constants (ADR-0093 / ADR-0087 §3).
 *
 * Economic-neighbor fallback chains + currency blocs. Kept DB-free so the seed
 * scripts and the pure estimator can import them without pulling `@/lib/db`.
 */

/** Ordered economic-neighbor fallback chains — canonical ADR-0087 §3. */
export const ECONOMIC_NEIGHBORS: Record<string, string[]> = {
  // UEMOA (XOF)
  BF: ["CI", "ML", "SN"],
  CI: ["SN", "BF", "TG"],
  SN: ["CI", "ML", "BF"],
  ML: ["BF", "SN", "CI"],
  TG: ["BJ", "CI", "GH"],
  BJ: ["TG", "CI", "NG"],
  NE: ["BF", "ML", "TD"],
  // CEMAC (XAF)
  CM: ["GA", "CG", "TD"],
  GA: ["CM", "CG", "GQ"],
  CG: ["CM", "GA", "CD"],
  TD: ["CM", "CF", "NE"],
  CF: ["CM", "TD", "CG"],
  GQ: ["GA", "CM", "CG"],
  // Diaspora francophone
  FR: ["BE", "CA"],
  BE: ["FR", "CA"],
  CA: ["FR", "BE"],
};

export const UEMOA = ["BJ", "BF", "CI", "GW", "ML", "NE", "SN", "TG"];
export const CEMAC = ["CM", "CF", "TD", "CG", "GQ", "GA"];
