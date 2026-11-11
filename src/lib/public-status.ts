/**
 * Verdict public de la page /status (F16, recette des promesses publiques).
 *
 * La page promet un état mesuré. Un verdict n'est donc rendu que sur des
 * opérations réellement journalisées : une lecture échouée (`null`) ou une
 * fenêtre sans activité ne vaut jamais « opérationnel ».
 */

export type PublicStatusVerdict = "OPERATIONAL" | "DEGRADED" | "INCIDENT" | "UNKNOWN";
export type PublicStatusReason = "MEASURED" | "UNREACHABLE" | "NO_ACTIVITY";

export interface PublicStatus {
  verdict: PublicStatusVerdict;
  reason: PublicStatusReason;
  /** Pourcentage de réussite sur la fenêtre, `null` sans mesure. */
  successRate: number | null;
}

/** `null` = la lecture du compteur a échoué (base injoignable). */
export function derivePublicStatus(input: { ok: number | null; failed: number | null }): PublicStatus {
  if (input.ok === null || input.failed === null) {
    return { verdict: "UNKNOWN", reason: "UNREACHABLE", successRate: null };
  }
  const total = input.ok + input.failed;
  if (total === 0) return { verdict: "UNKNOWN", reason: "NO_ACTIVITY", successRate: null };
  const successRate = (input.ok / total) * 100;
  const verdict: PublicStatusVerdict =
    successRate >= 99 ? "OPERATIONAL" : successRate >= 95 ? "DEGRADED" : "INCIDENT";
  return { verdict, reason: "MEASURED", successRate };
}
