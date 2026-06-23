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

// ─── LAYER DC — Direction de Création ───────────────────────────────────────

/** coherence-checker — alignement cross-séquence (contrat explicite du prompt). */
export const coherenceCheckerOutputSchema = z.object({
  aligned: z.boolean(),
  score: z.number().min(0).max(100),
  gaps: z.array(z.string()),
  risks: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const brandGuardianScoreNote = z.object({
  score: z.number().int().min(0).max(100),
  notes: z.string(),
});
/** brand-guardian — audit culturel de marque (schéma VERROUILLÉ dans le prompt). */
export const brandGuardianOutputSchema = z.object({
  brand_culture_audit: z.object({
    coherence_visual: brandGuardianScoreNote,
    coherence_tonal: brandGuardianScoreNote,
    coherence_semiotic: brandGuardianScoreNote,
    alignment_values: brandGuardianScoreNote,
  }),
  coherenceScore: z.number().min(0).max(100),
  violations: z.array(z.string()),
  suggestions: z.array(z.string()).min(1),
  verdict: z.enum(["APPROVED", "NEEDS_REVISION", "REJECTED"]),
});

const insightItemSchema = z.object({
  formulation: z.string(),
  evidence: z.array(z.string()),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  strategic_implication: z.string(),
});
/** insight-synthesizer — insights 4 axes (contrat explicite du prompt). */
export const insightSynthesizerOutputSchema = z.object({
  insights: z.object({
    consumer: z.array(insightItemSchema),
    market: z.array(insightItemSchema),
    cultural: z.array(insightItemSchema),
    weak_signals: z.array(insightItemSchema),
  }),
});

/** idea-killer-saver — triage créatif KILL / SAVE / PIVOT. */
export const ideaKillerSaverOutputSchema = z.object({
  verdicts: z
    .array(
      z.object({
        idee: z.string().optional(),
        verdict: z.enum(["KILL", "SAVE", "PIVOT"]),
        justification: z.string(),
      }),
    )
    .min(1),
});

// ─── LAYER BRAND — Identité visuelle (outils sans forgeOutput couplé) ────────

/** semiotic-brand-analyzer — analyse sémiotique. */
export const semioticBrandAnalyzerOutputSchema = z.object({
  signifiants: z.array(z.string()),
  signifies: z.array(z.string()),
  connotations: z.array(z.string()),
  codesCulturels: z.array(z.string()),
  positionnementSemiotique: z.string(),
});

/** logo-type-advisor — direction logotype. */
export const logoTypeAdvisorOutputSchema = z.object({
  typeRecommande: z.string(),
  directionStylistique: z.string(),
  dos: z.array(z.string()),
  donts: z.array(z.string()),
  declinaisons: z.array(z.string()),
});

/** logo-validation-protocol — évaluation + recommandation finale. */
export const logoValidationOutputSchema = z.object({
  evaluations: z
    .array(
      z.object({
        proposition: z.string(),
        score: z.number().min(0).max(100),
        notes: z.string().optional(),
      }),
    )
    .min(1),
  recommandationFinale: z.string(),
});

/** motion-identity-designer — principes + bibliothèque + guidelines motion. */
export const motionIdentityOutputSchema = z.object({
  principes: z.object({
    easing: z.string(),
    duree: z.string(),
    rythme: z.string(),
  }),
  bibliothequeAnimations: z.array(z.string()),
  guidelines: z.array(z.string()),
});
