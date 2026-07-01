/**
 * SourceCertainty — niveau de certitude opérateur sur une `BrandDataSource`.
 *
 * Source de vérité TypeScript pour le `certainty` field du model Prisma
 * `BrandDataSource` (cf. prisma/schema.prisma). Ajouté par PR-A (ADR-0032).
 *
 * **Layer 0** : zero IO, zero Prisma. Pure domain enum.
 *
 * Pourquoi ce champ existe :
 * Avant ADR-0032, toutes les sources étaient traitées comme égales — un upload
 * de KBIS officiel et un texte libre extrait par IA depuis l'intake avaient le
 * même poids dans Notoria/Artemis/Ptah. Conséquence : hallucinations IA
 * remontaient au même niveau que des faits déclarés ou vérifiés. Le champ
 * certainty rend cette hiérarchie explicite et la rend exploitable par les
 * forges en aval (extra-context Notoria peut down-weighter les INFERRED, le
 * scoring Seshat peut filtrer, etc.).
 */

import { z } from "zod";

/**
 * Taxonomie ordonnée du plus fiable (OFFICIAL) au moins fiable (ARBITRARY).
 * L'ordre du tableau reflète la confiance décroissante — utilisé pour le
 * tri UI et pour les comparaisons "au moins X".
 */
export const SOURCE_CERTAINTY_LEVELS = [
  /** Pièce officielle vérifiée — KBIS, contrat, deck investor signé, audit. */
  "OFFICIAL",
  /** Déclaré par fondateur/opérateur via intake ou saisie manuelle. */
  "DECLARED",
  /** Extrait IA depuis texte libre / OCR — hallucinable, à valider. */
  "INFERRED",
  /** Décrété sans source — placeholder, hypothèse de travail, devinette. */
  "ARBITRARY",
] as const;

export type SourceCertainty = (typeof SOURCE_CERTAINTY_LEVELS)[number];

export const SourceCertaintySchema = z.enum(SOURCE_CERTAINTY_LEVELS);

/**
 * Validateur runtime — vérifie qu'une string est un SourceCertainty connu.
 */
export function isSourceCertainty(value: unknown): value is SourceCertainty {
  return typeof value === "string" && (SOURCE_CERTAINTY_LEVELS as readonly string[]).includes(value);
}

/**
 * Présentation FR — label court à afficher dans la cockpit UI.
 */
export const SOURCE_CERTAINTY_LABEL: Record<SourceCertainty, string> = {
  OFFICIAL: "Officiel",
  DECLARED: "Déclaré",
  INFERRED: "Inféré",
  ARBITRARY: "Arbitraire",
};

/**
 * Description longue — tooltip / help text dans la cockpit UI.
 */
export const SOURCE_CERTAINTY_DESCRIPTION: Record<SourceCertainty, string> = {
  OFFICIAL: "Pièce officielle vérifiée (KBIS, contrat, deck investor signé). Source de plus haute confiance.",
  DECLARED: "Déclaré par le fondateur ou l'opérateur via intake ou saisie manuelle. Non vérifié mais assumé.",
  INFERRED: "Extrait par IA depuis du texte libre ou de l'OCR. Hallucinable — à valider avant usage stratégique.",
  ARBITRARY: "Décrété sans source — placeholder, hypothèse de travail ou devinette. À remplacer dès que possible.",
};

/**
 * Compare deux niveaux de certitude. Retourne :
 * - négatif si `a` est moins fiable que `b`
 * - 0 si égaux
 * - positif si `a` est plus fiable que `b`
 *
 * Exemple : `compareCertainty("OFFICIAL", "INFERRED") > 0` (OFFICIAL plus fiable).
 */
export function compareCertainty(a: SourceCertainty, b: SourceCertainty): number {
  const ai = SOURCE_CERTAINTY_LEVELS.indexOf(a);
  const bi = SOURCE_CERTAINTY_LEVELS.indexOf(b);
  // Tableau trié du plus fiable au moins fiable → index plus petit = plus fiable.
  return bi - ai;
}
