/**
 * FieldProvenance — qui a posé la valeur d'un champ de pilier ADVE.
 *
 * **Layer 0** : zéro IO, zéro Prisma. Pure domain.
 *
 * Distinct de `SourceCertainty` (`source-certainty.ts`), qui note la fiabilité
 * d'une *source de fichier* (OFFICIAL/DECLARED/INFERRED/ARBITRARY). Ici on note
 * l'origine d'une *valeur de champ* déjà posée dans un pilier, pour faire
 * respecter la règle opérateur :
 *
 *     HUMAIN  >  SOURCE  >  INFÉRÉ
 *
 * - **HUMAN**     : valeur saisie/validée explicitement par un opérateur ou un
 *                   founder (OPERATOR_AMEND_PILLAR, confirmInferredField, édition
 *                   manuelle). La parole de l'humain. Ne se fait jamais écraser
 *                   silencieusement.
 * - **SOURCE**    : valeur extraite d'une `BrandDataSource` importée (document
 *                   client, formulaire intake). Peut corriger un INFERRED ;
 *                   si elle contredit un HUMAN → CHALLENGE (arbitrage humain),
 *                   jamais d'écriture silencieuse.
 * - **INFERRED**  : valeur générée par IA / dérivée (cross-pilier, calcul). La
 *                   plus basse autorité : ne peut JAMAIS écraser SOURCE ni HUMAN.
 * - **UNKNOWN**   : pas de provenance tracée (champ vide, legacy). Tout écrit
 *                   l'emporte.
 *
 * Pourquoi une échelle propre et pas SourceCertainty : SourceCertainty classe
 * OFFICIAL > DECLARED, soit « document vérifié > parole humaine ». La doctrine
 * opérateur ici est l'inverse au niveau champ — la décision humaine explicite
 * prime sur ce qu'un document dit, et une contradiction document↔humain se
 * tranche par l'humain (CHALLENGE), jamais en silence. Les deux échelles
 * coexistent : SourceCertainty pondère l'ingestion, FieldProvenance arbitre
 * l'écrasement.
 */

import { z } from "zod";

/** Du plus autoritaire (HUMAN) au moins (UNKNOWN). */
export const FIELD_PROVENANCE_LEVELS = ["HUMAN", "SOURCE", "INFERRED", "UNKNOWN"] as const;

export type FieldProvenance = (typeof FIELD_PROVENANCE_LEVELS)[number];

export const FieldProvenanceSchema = z.enum(FIELD_PROVENANCE_LEVELS);

const RANK: Record<FieldProvenance, number> = {
  HUMAN: 3,
  SOURCE: 2,
  INFERRED: 1,
  UNKNOWN: 0,
};

export function provenanceRank(p: FieldProvenance): number {
  return RANK[p];
}

export function isFieldProvenance(value: unknown): value is FieldProvenance {
  return typeof value === "string" && (FIELD_PROVENANCE_LEVELS as readonly string[]).includes(value);
}

/** Normalise une valeur inconnue/legacy en FieldProvenance (défaut UNKNOWN). */
export function coerceProvenance(value: unknown): FieldProvenance {
  return isFieldProvenance(value) ? value : "UNKNOWN";
}

/**
 * Décision d'écrasement d'un champ existant (provenance `existing`) par une
 * écriture entrante (provenance `incoming`).
 *
 * - `ALLOW`     : écrire la valeur et taguer le champ avec `incoming`.
 * - `CHALLENGE` : ne PAS écraser ; remonter une recommandation CHALLENGE pour
 *                 arbitrage humain (une source contredit une valeur humaine).
 * - `DENY`      : autorité inférieure — ignorer silencieusement (avec warning).
 *                 Un INFERRED ne peut jamais écraser un SOURCE/HUMAN.
 */
export type OverwriteDecision = "ALLOW" | "CHALLENGE" | "DENY";

export function decideOverwrite(
  incoming: FieldProvenance,
  existing: FieldProvenance,
): OverwriteDecision {
  // Champ sans provenance tracée (vide/legacy) → tout écrit l'emporte.
  if (existing === "UNKNOWN") return "ALLOW";

  // La parole humaine l'emporte toujours.
  if (incoming === "HUMAN") return "ALLOW";

  // L'inféré ne peut jamais écraser une valeur humaine ou sourcée.
  if (incoming === "INFERRED" && (existing === "HUMAN" || existing === "SOURCE")) {
    return "DENY";
  }

  // Une source qui contredirait une valeur humaine → arbitrage, jamais en silence.
  if (incoming === "SOURCE" && existing === "HUMAN") return "CHALLENGE";

  // Source→(source|inferred), inferred→inferred : rafraîchissement autorisé.
  return "ALLOW";
}

/** Label FR court pour la cockpit UI (badge provenance). */
export const FIELD_PROVENANCE_LABEL: Record<FieldProvenance, string> = {
  HUMAN: "Saisi par l'humain",
  SOURCE: "Issu d'une source",
  INFERRED: "Inféré IA",
  UNKNOWN: "Origine inconnue",
};
