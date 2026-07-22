/**
 * brand-book-ingestion/schema.ts — le CONTRAT d'extraction d'un brand book officiel
 * (ADR-0173, Lot 1b).
 *
 * Doctrine invariante : **zéro fabrication** (interdit NEFER n°3). CHAQUE champ est
 * `.nullable().optional()` → l'extracteur émet `null` quand l'info est absente du
 * document, et l'application n'écrit RIEN pour un `null`. On ne remplit que ce que
 * le book contient réellement.
 *
 * Le contrat mappe vers les piliers A/D/V + les assets vault visuels. Il est partagé
 * par les DEUX extracteurs (parité manual-first ADR-0060) :
 *   - `extractor-llm.ts`   : `executeStructuredLLMCall` sur le texte du PDF ;
 *   - `extractor-structured.ts` : parseur pur déterministe (hex, familles de police,
 *     URLs) — null sur absence, aucune dépendance LLM.
 *
 * Confiance : l'écriture pose `fieldProvenance:"SOURCE"` (le garde de provenance
 * empêche un SOURCE d'écraser un champ HUMAIN amendé) et la SOURCE uploadée passe
 * `BrandDataSource.certainty="OFFICIAL"`. La certitude PAR CHAMP (`fieldCertainty`
 * OFFICIAL/INFERRED) n'est PAS posée à l'écriture aujourd'hui — déféré (RESIDUAL-DEBT
 * §ADR-0173). On n'invente aucune certitude ; les JUGEMENTS (archétype) ne sont pas
 * écrits en dur (risque hors-enum).
 */
import { z } from "zod";

const s = z.string().min(1).nullable().optional();
const arr = <T extends z.ZodTypeAny>(t: T) => z.array(t).nullable().optional();

/** Pilier A — Authenticité / Identité. */
export const BrandBookIdentitySchema = z.object({
  brandName: s,
  tagline: s, // accroche / baseline / signature
  mission: s,
  vision: s,
  values: arr(z.object({ name: z.string().min(1), description: s })),
  story: s, // histoire / mythe d'origine
  archetypeHint: s, // libellé d'archétype SI présent dans le book (jugement → INFERRED)
  toneOfVoice: arr(z.string().min(1)),
  manifesto: s,
});

/** Pilier D — Distinction. */
export const BrandBookDistinctionSchema = z.object({
  positioning: s,
  masterPromise: s,
  subPromises: arr(z.string().min(1)),
  personas: arr(z.object({ name: z.string().min(1), description: s })),
  differentiators: arr(z.string().min(1)),
  competitors: arr(z.string().min(1)),
});

/** Pilier V — Valeur / Produit. */
export const BrandBookValueSchema = z.object({
  valueProposition: s,
  products: arr(z.object({ nom: z.string().min(1), description: s, prix: s })),
  productSystemNote: s, // note libre sur le système produit (structuré via Glory ensuite)
});

/** Assets vault visuels (CHROMATIC_STRATEGY / TYPOGRAPHY_SYSTEM / LOGO). */
export const BrandBookVisualSchema = z.object({
  colors: arr(z.object({ hex: s, name: s, role: s })), // hex "#RRGGBB" si lisible, sinon nom seul
  fonts: arr(z.object({ family: z.string().min(1), role: s })),
  logoDescription: s, // description (le binaire image n'est PAS extrait — ré-upload séparé)
});

/** Contrat complet d'extraction — tout optional/nullable (zéro fabrication). */
export const BrandBookExtractionSchema = z.object({
  identity: BrandBookIdentitySchema.nullable().optional(),
  distinction: BrandBookDistinctionSchema.nullable().optional(),
  value: BrandBookValueSchema.nullable().optional(),
  visual: BrandBookVisualSchema.nullable().optional(),
});

export type BrandBookExtraction = z.infer<typeof BrandBookExtractionSchema>;
