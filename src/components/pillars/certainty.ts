/**
 * Certainty — lecture pure du `Pillar.certainty` (doctrine needsHuman) :
 *   DECLARED — validé par l'humain (opérateur/fondateur)
 *   INFERRED — draft proposé (IA ou dérivation) : « à valider »
 * Un champ rempli SANS marque de certitude reste « rempli » (provenance
 * inconnue — on ne l'invente pas) ; un champ vide est « vide ».
 */
import { isFilled } from "@/domain/scoring";
import type { FieldDef } from "@/domain/pillar-fields";

export type FieldCertaintyStatus = "declared" | "inferred" | "filled" | "empty";

/** Statut d'un champ depuis le contenu et la certainty du pilier. */
export function fieldStatus(
  content: Record<string, unknown>,
  certainty: Record<string, unknown>,
  fieldId: string,
): FieldCertaintyStatus {
  if (!isFilled(content[fieldId])) return "empty";
  const mark = certainty[fieldId];
  if (mark === "DECLARED") return "declared";
  if (mark === "INFERRED") return "inferred";
  return "filled";
}

export type CertaintyCounts = {
  filled: number;
  declared: number;
  inferred: number;
  total: number;
};

/** Compte remplis / déclarés / à valider sur les champs canoniques du pilier. */
export function certaintyCounts(
  content: Record<string, unknown>,
  certainty: Record<string, unknown>,
  fields: readonly FieldDef[],
): CertaintyCounts {
  let filled = 0;
  let declared = 0;
  let inferred = 0;
  for (const field of fields) {
    const status = fieldStatus(content, certainty, field.id);
    if (status !== "empty") filled += 1;
    if (status === "declared") declared += 1;
    if (status === "inferred") inferred += 1;
  }
  return { filled, declared, inferred, total: fields.length };
}
