/**
 * product-system.ts — le SYSTÈME produit d'une marque (ADR-0170, pilier V).
 *
 * « La Fusée doit penser produit dans le pilier Valeur. » Le pilier V modélisait
 * l'ÉCONOMIE du produit (catalogue, ladder, unit-economics, MVP, IP) mais pas son
 * **mécanisme interne** : ce qui fait FONCTIONNER le produit et crée de la valeur
 * structurellement — le « Système Palais » de SPAWT (5 axes gustatifs × 13
 * archétypes × 5 stades × modes UX × cartes collectibles) vivait en prose éparse.
 *
 * Ce module donne un foyer STRUCTURÉ, générique (pas SPAWT-spécifique) et
 * queryable au mécanisme produit — six dimensions optionnelles, chacune une liste
 * ouverte. Un produit physique (une boutique de matériel) remplira `mechanics` +
 * `artifacts` ; une plateforme gamifiée remplira les six.
 *
 * Layer-0 pur (zod, zéro dépendance). Réutilisé comme `outputSchema` du Glory tool
 * `product-system-architect` (parité manuelle ADR-0060) ET composé dans
 * `PillarVSchema` (`v.productSystem`).
 */

import { z } from "zod";

/** Les six dimensions canoniques d'un système produit. */
export const PRODUCT_SYSTEM_DIMENSIONS = [
  "axes", // les dimensions mesurables du mécanisme
  "archetypes", // les profils émergents (combinaison d'axes)
  "progressionStages", // les paliers de maturité/progression (ordonnés)
  "modes", // les modes d'interaction / contextes d'usage
  "artifacts", // les artefacts/collectibles produits par le système
  "mechanics", // les règles fondatrices qui pilotent le système
] as const;
export type ProductSystemDimension = (typeof PRODUCT_SYSTEM_DIMENSIONS)[number];

const s = z.string().min(1).max(200);
const sLong = z.string().min(1);

/** Un axe/dimension du mécanisme (bipolaire ou non). */
export const ProductAxisSchema = z.object({
  id: s.optional(),
  label: s,
  poleLow: s.optional(),
  poleHigh: s.optional(),
  description: s.optional(),
});

/** Un archétype/profil émergent du système. */
export const ProductArchetypeSchema = z.object({
  name: s,
  axesSignature: s.optional(), // ex. « Nomade + Maquis »
  essence: s.optional(), // la devise / l'esprit
  progressionNames: z.array(s).optional(), // noms progressifs par stade
});

/** Un palier de progression/maturité (l'ordre du tableau = l'ordre canonique). */
export const ProductProgressionStageSchema = z.object({
  name: s,
  threshold: s.optional(), // ex. « 0-10 spots »
  signals: z.array(s).optional(),
  unlocks: z.array(s).optional(),
});

/** Un mode d'interaction / contexte d'usage. */
export const ProductModeSchema = z.object({
  name: s,
  trigger: s.optional(), // ex. « Midi (11h-14h) »
  format: s.optional(),
  description: s.optional(),
});

/** Un artefact/collectible produit par le système. */
export const ProductArtifactSchema = z.object({
  name: s,
  kind: s.optional(), // carte, badge, titre, certificat…
  description: s.optional(),
  socialSignal: s.optional(), // pourquoi on le partage
});

/** Une règle/mécanique fondatrice. */
export const ProductMechanicSchema = z.object({
  name: s,
  rule: sLong,
});

/**
 * Le système produit complet. Toutes les dimensions optionnelles — une marque en
 * remplit autant que son produit en porte. Pas de champ requis : un produit sans
 * mécanique gamifiée reste légitimement vide (pas de fabrication).
 */
export const ProductSystemSchema = z.object({
  coreConcept: sLong.optional(), // le concept central en une phrase
  axes: z.array(ProductAxisSchema).optional(),
  archetypes: z.array(ProductArchetypeSchema).optional(),
  progressionStages: z.array(ProductProgressionStageSchema).optional(),
  modes: z.array(ProductModeSchema).optional(),
  artifacts: z.array(ProductArtifactSchema).optional(),
  mechanics: z.array(ProductMechanicSchema).optional(),
});

export type ProductSystem = z.infer<typeof ProductSystemSchema>;

/** Nombre de dimensions renseignées (0-6) — signal de profondeur du système. */
export function productSystemDepth(ps: ProductSystem | null | undefined): number {
  if (!ps || typeof ps !== "object") return 0;
  let n = 0;
  if (typeof ps.coreConcept === "string" && ps.coreConcept.trim()) n += 0; // le concept ne compte pas comme dimension
  for (const dim of PRODUCT_SYSTEM_DIMENSIONS) {
    const v = (ps as Record<string, unknown>)[dim];
    if (Array.isArray(v) && v.length > 0) n += 1;
  }
  return n;
}

/** true si le système produit est vide (aucune dimension + pas de concept). */
export function isProductSystemEmpty(ps: ProductSystem | null | undefined): boolean {
  if (!ps || typeof ps !== "object") return true;
  const hasConcept = typeof ps.coreConcept === "string" && ps.coreConcept.trim().length > 0;
  return !hasConcept && productSystemDepth(ps) === 0;
}
