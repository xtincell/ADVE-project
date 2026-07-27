/**
 * Signalement d'une écriture pilier refusée, pour les chemins de SERVICE.
 *
 * La gateway refuse pour cinq raisons (pilier LOCKED, validation stricte
 * ADR-0063, SHAPE gate, garde de provenance, exception de transaction) et ne
 * jette jamais : elle rend `{ success: false, error }`. Un `await` nu perdait
 * donc l'information — la marque repartait avec un pilier non écrit et
 * personne, ni log ni écran, n'en portait la trace.
 *
 * Les routeurs, eux, lèvent (`_pillar-write-guard.assertWritten`) : un humain
 * attend une réponse. Les services sont dans l'autre cas — pipelines,
 * cascades, amorçages — où faire tomber toute la chaîne pour un pilier serait
 * pire que continuer. D'où ce point milieu : **on continue, mais on le dit**,
 * et l'appelant reçoit un booléen dont il peut faire ce qu'il veut.
 *
 * Ce n'est PAS un blanc-seing : un service qui rapporte ensuite un succès à un
 * humain doit propager ce booléen jusqu'à lui (cf. le remplisseur automatique,
 * `auto-filler.ts`, qui rend `persisted: false`).
 */

export interface PillarWriteVerdictLike {
  success: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * @returns `true` si l'écriture a bien eu lieu, `false` si elle a été refusée.
 */
export function reportRefusedWrite(
  verdict: PillarWriteVerdictLike | null | undefined,
  context: string,
): boolean {
  if (verdict?.success) return true;
  const reason = verdict?.error ?? "verdict absent";
  const warnings =
    verdict?.warnings && verdict.warnings.length > 0 ? ` | ${verdict.warnings.join(" · ")}` : "";
  console.warn(`[pillar-gateway] écriture REFUSÉE — ${context} : ${reason}${warnings}`);
  return false;
}
