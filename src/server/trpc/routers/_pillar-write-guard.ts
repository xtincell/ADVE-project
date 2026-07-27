/**
 * Garde d'écriture pilier — une mutation ne rapporte pas un succès qu'elle
 * n'a pas obtenu.
 *
 * `writePillar`/`writePillarAndScore` refusent pour cinq raisons (pilier
 * LOCKED, validation stricte ADR-0063, SHAPE gate, garde de provenance,
 * exception de transaction) et renvoient alors `{ success: false, error }`
 * **sans rien écrire**.
 *
 * Or plusieurs mutations du routeur pilier jetaient ce verdict puis
 * retournaient un `{ success: true }` écrit en dur — `addProduct`,
 * `addPersona`, `addTouchpoint`… Le fondateur ajoutait un produit, l'écran
 * confirmait, la base ne bougeait pas. Le compteur renvoyé (`productCount`)
 * était lui aussi calculé sur le tableau en mémoire : il grimpait à chaque
 * clic sur un catalogue qui restait vide.
 *
 * `assertWritten` transforme le refus en erreur tRPC visible, en conservant la
 * raison de la gateway — c'est elle qui nomme le champ fautif, et c'est cette
 * phrase-là qui permet à l'opérateur de débloquer.
 */

import { TRPCError } from "@trpc/server";

/** Forme minimale du verdict — commune à `writePillar` et `writePillarAndScore`. */
export interface PillarWriteVerdict {
  success: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Laisse passer une écriture acceptée ; lève sinon.
 *
 * @param verdict ce que la gateway a répondu
 * @param what libellé de l'action, pour un message lisible par un humain
 */
export function assertWritten<T extends PillarWriteVerdict>(verdict: T, what: string): T {
  if (verdict.success) return verdict;
  const detail = verdict.error ?? "raison non communiquée par la gouvernance des piliers";
  const extra =
    verdict.warnings && verdict.warnings.length > 0 ? ` (${verdict.warnings.join(" · ")})` : "";
  throw new TRPCError({
    // CONFLICT et non INTERNAL_SERVER_ERROR : le refus est un état légitime
    // (verrou, forme, provenance), pas une panne — et le client doit pouvoir
    // le distinguer pour afficher la raison plutôt qu'un « réessayez ».
    code: "CONFLICT",
    message: `${what} — enregistrement refusé : ${detail}${extra}`,
  });
}
