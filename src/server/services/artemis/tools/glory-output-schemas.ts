/**
 * glory-output-schemas.ts — schémas de sortie Zod réels des Glory tools LLM
 * (LOT 1c du plan de durcissement, ADR-0067).
 *
 * Fichier feuille (n'importe QUE `zod`) pour éviter les cycles madge avec
 * registry.ts / phase*-tools.ts. Chaque schéma reflète FIDÈLEMENT le contrat de
 * sortie décrit dans le `promptTemplate` de l'outil — pas de schéma permissif
 * « attrape-tout » (qui cocherait l'audit sans rien valider). Bornes volontairement
 * souples (`.min(1)`, champs vagues `.optional()`) : `executeStructuredLLMCall`
 * réinjecte le schéma dans le prompt → le LLM est guidé vers cette forme, on
 * valide sans sur-rejeter.
 *
 * Noms de champs en français = ceux que les prompts élicitaient déjà (préserve
 * la forme de sortie consommée en aval).
 */
import { z } from "zod";

// ─── LAYER CR — Concepteur-Rédacteur ────────────────────────────────────────

/** concept-generator — « 5 concepts : titre, accroche, description, déclinaisons ». */
export const conceptGeneratorOutputSchema = z.object({
  concepts: z
    .array(
      z.object({
        titre: z.string(),
        accroche: z.string(),
        description: z.string(),
        declinaisons: z.array(z.string()).optional(),
      }),
    )
    .min(1),
});

/** script-writer — script structuré Accroche → Développement → Climax → CTA. */
export const scriptWriterOutputSchema = z.object({
  accroche: z.string(),
  developpement: z.string(),
  climax: z.string(),
  cta: z.string(),
  indicationsRealisation: z.string().optional(),
  musiqueSfx: z.string().optional(),
});

/** long-copy-craftsman — narratif Hook → Problem → Agitation → Solution → Proof → CTA. */
export const longCopyOutputSchema = z.object({
  hook: z.string(),
  problem: z.string(),
  agitation: z.string(),
  solution: z.string(),
  proof: z.string(),
  cta: z.string(),
});

/** dialogue-writer — dialogue (répliques par personnage). */
export const dialogueWriterOutputSchema = z.object({
  lignes: z
    .array(
      z.object({
        personnage: z.string(),
        replique: z.string(),
      }),
    )
    .min(1),
});

/** claim-baseline-factory — « 10 claims : version courte, version longue, justification ». */
export const claimBaselineOutputSchema = z.object({
  claims: z
    .array(
      z.object({
        courte: z.string(),
        longue: z.string(),
        justification: z.string(),
      }),
    )
    .min(1),
});

/** storytelling-sequencer — épisodes : titre, hook, contenu, cliffhanger, CTA. */
export const storytellingSequencerOutputSchema = z.object({
  episodes: z
    .array(
      z.object({
        titre: z.string(),
        hook: z.string(),
        contenu: z.string(),
        cliffhanger: z.string(),
        cta: z.string(),
      }),
    )
    .min(1),
});

/** wordplay-cultural-bank — 4 catégories de matériel linguistique. */
export const wordplayBankOutputSchema = z.object({
  jeuxDeMots: z.array(z.string()),
  referencesPopCulture: z.array(z.string()),
  expressionsLocales: z.array(z.string()),
  doublesSens: z.array(z.string()),
});
