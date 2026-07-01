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

// ─── LAYER CR (suite) — copywriting stratégique ─────────────────────────────

/** tone-of-voice-designer — charte de ton de voix. */
export const toneOfVoiceOutputSchema = z.object({
  personnalite: z.array(z.string()).min(1),
  registreLinguistique: z.string(),
  vocabulaireSignature: z.array(z.string()).min(1),
  expressionsInterdites: z.array(z.string()),
  doDontParCanal: z
    .array(
      z.object({
        canal: z.string(),
        dos: z.array(z.string()),
        donts: z.array(z.string()),
      }),
    )
    .min(1),
  reformulations: z
    .array(z.object({ avant: z.string(), apres: z.string() }))
    .min(1),
});

/** manifesto-writer — texte fondateur (constat → révolte → vision → promesse → appel). */
export const manifestoOutputSchema = z.object({
  manifesto: z.string().min(1),
});

/** engagement-rituals-designer — 5-8 rituels récurrents détaillés. */
export const engagementRitualsOutputSchema = z.object({
  rituels: z
    .array(
      z.object({
        nom: z.string(),
        frequence: z.string(),
        mecanique: z.string(),
        canal: z.string(),
        niveauDevotionCible: z.string(),
        kpi: z.string(),
        coutEstime: z.string(),
      }),
    )
    .min(1),
});

/** claim-architect — hiérarchie de claims (master / sub / proofs / RTB). */
export const claimArchitectOutputSchema = z.object({
  masterClaim: z.string(),
  subClaims: z
    .array(z.object({ persona: z.string(), claim: z.string() }))
    .min(1),
  proofPoints: z.array(z.string()).min(1),
  rtb: z
    .array(z.object({ persona: z.string(), reasons: z.array(z.string()) }))
    .min(1),
});

/** vocabulary-builder — lexique de marque (5 catégories). */
export const vocabularyBuilderOutputSchema = z.object({
  motsSacres: z.array(z.string()),
  motsInterdits: z.array(z.string()),
  expressionsSignatures: z.array(z.string()),
  vocabulaireTechnique: z.array(
    z.object({ terme: z.string(), traduction: z.string() }),
  ),
  alternatives: z.array(
    z.object({ cliche: z.string(), alternative: z.string() }),
  ),
});

// ─── LAYER BRAND (forge-couplé) ─────────────────────────────────────────────

/** visual-moodboard-generator — 3 directions. `moodboard_brief` préservé pour le handoff forge (forgeOutput.briefTextPath). */
export const visualMoodboardOutputSchema = z.object({
  directions: z
    .array(
      z.object({
        concept: z.string(),
        ambiance: z.string(),
        referencesVisuelles: z.array(z.string()),
        paletteSuggere: z.array(z.string()),
      }),
    )
    .min(1),
  moodboard_brief: z.string().optional(),
});

// ─── Oracle ─────────────────────────────────────────────────────────────────

/** synthesize-section — narratif + payload structuré fidèle au draft (contrat explicite). */
export const synthesizeSectionOutputSchema = z.object({
  narrative: z.string(),
  structured_payload: z.unknown(),
});

// ─── LSI (Logo/Symbol/IP — character design) ────────────────────────────────

/** lsi-universe-setup. */
export const lsiUniverseSetupOutputSchema = z.object({
  genreMaitre: z.string(),
  themesCles: z.array(z.string()),
  vibeSensorielle: z.array(z.string()),
  contraintes: z.array(z.string()),
  justification: z.string(),
});

/** lsi-symbol-alchemy — formule de fusion 4 thèmes. */
export const lsiSymbolAlchemyOutputSchema = z.object({
  artifacts: z
    .array(
      z.object({
        baseSymbol: z.string(),
        themeApplications: z.object({
          forme: z.string(),
          matiere: z.string(),
          fonction: z.string(),
          symbolique: z.string(),
        }),
        name: z.string(),
        description: z.string(),
      }),
    )
    .min(1),
});

/** lsi-distribution-matrix — 5 couches visuelles. */
export const lsiDistributionMatrixOutputSchema = z.object({
  matrix: z
    .array(
      z.object({
        artifact: z.string(),
        anatomie: z.string(),
        outfit: z.string(),
        texture: z.string(),
        accessoires: z.string(),
        attitude: z.string(),
      }),
    )
    .min(1),
});

/** lsi-sublimation — reality check final. */
export const lsiSublimationOutputSchema = z.object({
  adjustments: z.array(
    z.object({ element: z.string(), issue: z.string(), fix: z.string() }),
  ),
  echos: z.array(
    z.object({ primaryElement: z.string(), echoLocations: z.array(z.string()) }),
  ),
  silhouetteRead: z.string(),
  verdict: z.enum(["APPROVED", "NEEDS_REVISION"]),
});

/** lsi-morpho-semantic — prompt génératif structuré. */
export const lsiMorphoSemanticOutputSchema = z.object({
  promptSections: z.object({
    anatomie: z.string(),
    outfit: z.string(),
    texture: z.string(),
    accessoires: z.string(),
    attitude: z.string(),
    lighting: z.string(),
    camera: z.string(),
  }),
  fullPrompt: z.string(),
  negativePrompt: z.string(),
  styleTags: z.array(z.string()),
});

// ─── Phase 14 — Imhotep (Crew) ──────────────────────────────────────────────

/** crew-matcher — appariement talents/mission (contrat explicite). */
export const crewMatcherOutputSchema = z.object({
  ranked: z
    .array(
      z.object({
        talentProfileId: z.string(),
        matchScore: z.number(),
        matchReasons: z.array(z.string()),
        devotionAlignment: z.string().optional(),
      }),
    )
    .min(1),
  rationale: z.string(),
});

/** formation-recommender — 3 cours pour combler un gap. */
export const formationRecommenderOutputSchema = z.object({
  courses: z
    .array(
      z.object({
        courseId: z.string(),
        title: z.string(),
        rationale: z.string(),
        estimatedDurationMin: z.number(),
      }),
    )
    .min(1),
});

/** qc-evaluator — QC deliverable (contrat explicite). */
export const qcEvaluatorOutputSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(
    z.object({
      type: z.string(),
      severity: z.string(),
      message: z.string(),
      fix: z.string(),
    }),
  ),
});

// ─── Phase 15 — Anubis (Comms) ──────────────────────────────────────────────

/** ad-copy-generator — 3 variants A/B/C (contrat explicite). */
export const adCopyOutputSchema = z.object({
  variants: z
    .array(
      z.object({
        label: z.string(),
        copy: z.string(),
        cta: z.string(),
        hashtags: z.array(z.string()).optional(),
      }),
    )
    .min(1),
  rationale: z.string().optional(),
});

/** audience-targeter — règles de targeting queryables (rules souple par ad-network). */
export const audienceTargeterOutputSchema = z.object({
  rules: z
    .object({
      demographics: z.unknown().optional(),
      interests: z.array(z.string()).optional(),
      behaviors: z.array(z.string()).optional(),
      exclusions: z.unknown().optional(),
    })
    .passthrough(),
  estimatedReach: z.string(),
  rationale: z.string().optional(),
});

// ─── AD/OPS (Direction de Création — research) ──────────────────────────────

/** adops-expand-semantic-field — champ sémantique 5D. */
export const adopsExpandOutputSchema = z.object({
  movements: z.array(z.string()),
  artists: z.array(z.string()),
  materials: z.array(z.string()),
  eras: z.array(z.string()),
  adjacent: z.array(z.string()),
});

/** adops-cross-pollinate-concepts — hybridation 2 concepts. */
export const adopsCrossPollinateOutputSchema = z.object({
  brief: z.string(),
  ratio: z.string(),
  tensions: z.object({
    formal: z.string(),
    reading: z.string(),
    pitfall: z.string(),
  }),
  activation_query: z.string(),
});

/** adops-decode-reference-grid — grille 8 axes. */
export const adopsDecodeGridOutputSchema = z.object({
  axes: z
    .array(
      z.object({
        key: z.string(),
        title: z.string(),
        answers: z.array(z.string()),
      }),
    )
    .min(1),
});

/** adops-defend-creative-direction — speech défensif 6 sections. */
export const adopsDefendOutputSchema = z.object({
  sections: z.array(z.object({ h: z.string(), body: z.string() })).min(1),
});

// ─── Phase 19 — postmortem ──────────────────────────────────────────────────

const postmortemAnswerSchema = z.object({
  answer: z.string(),
  score: z.number().min(0).max(1),
  evidenceUrls: z.array(z.string()).optional(),
});
/** postmortem-12q — 12 questions canoniques (qN → {answer, score, evidenceUrls}). */
export const postmortem12qOutputSchema = z.record(z.string(), postmortemAnswerSchema);
