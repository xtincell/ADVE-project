/**
 * ZOD SCHEMAS — Ontologie N0-N6 pour les 8 piliers ADVE-RTIS
 * Encode les contraintes atomiques, composites, collections et cross-refs
 * du Cahier des Charges (Annexe H)
 */

import { z } from "zod";
import { PILLAR_KEYS, ADVE_KEYS } from "@/domain";
import {
  ARCHETYPES, SCHWARTZ_VALUES, LIFE_FORCE_8, AARRR_STAGES,
  DEVOTION_LEVELS, CHANNELS, TOUCHPOINT_TYPES, RITUAL_TYPES,
  MASLOW_LEVELS, PRODUCT_CATEGORIES, PRODUCT_LIFECYCLE, RISK_LEVELS,
} from "./taxonomies";
// Types from business-context used as documentation references in Zod comments
// (Zod uses z.string() with runtime validation rather than TS-only enums)

// ============================================================================
// ENUMS PARTAGÉS (réutilisés dans les variables de transition)
// ============================================================================

const SALES_CHANNELS = ["DIRECT", "INTERMEDIATED", "HYBRID"] as const;
const DATA_SOURCES = ["ai_estimate", "verified", "calculated", "operator_input"] as const;

// ============================================================================
// ATOMS RÉUTILISABLES (N1)
// ============================================================================

// Convention recommandation : quand un champ ne peut pas être renseigné (marque trop
// jeune, pas de site, pas de prix), la valeur est une recommandation Mestor :
// "À créer", "À concevoir", etc. — .min(1) accepte ces valeurs courtes.
// Le scorer sémantique différencie : contenu réel (50+ chars) vs reco (courte).
const textShort = z.string().min(1).max(200);
const textMedium = z.string().min(1);
const textLong = z.string().min(1);
const currency = z.number().min(0);
const percentage = z.number().min(0).max(100);
const rank = z.number().int().min(1);

// Stable identity for relational entities living inside the JSON pillar blob
// (risks, initiatives/actions, personas, hypotheses). Optional at the lenient
// validation layer for backward-compat with pre-backfill rows; REQUIRED in the
// strict v2 parse path (see *V2 schemas + validatePillarContentV2 at EOF).
// Core-Engine refactor — ADR-0088.
const entityId = z.string().uuid();

// ============================================================================
// PILIER A — AUTHENTICITÉ
// ============================================================================

/** N2.01 — BrandValue (Schwartz) */
const BrandValueSchema = z.object({
  value: z.enum(SCHWARTZ_VALUES),
  customName: textShort,
  rank: rank,
  justification: z.string().min(1),
  costOfHolding: z.string().min(1),
  tensionWith: z.array(z.enum(SCHWARTZ_VALUES)).optional(),
});

/** N2.02 — HeroJourneyAct */
const HeroJourneyActSchema = z.object({
  actNumber: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  title: textShort,
  narrative: z.string().min(1),
  emotionalArc: textShort,
  causalLink: z.string().optional(), // Required for acts 2-5
});

/** N2.03 — BrandIkigai */
const BrandIkigaiSchema = z.object({
  love: z.string().min(1),
  competence: z.string().min(1),
  worldNeed: z.string().min(1),
  remuneration: z.string().min(1),
});

/** Timeline narrative (4 sections) */
const TimelineNarrativeSchema = z.object({
  origine: z.string().min(1).optional(),
  transformation: z.string().min(1).optional(),
  present: z.string().min(1).optional(),
  futur: z.string().min(1).optional(),
});

/** Communauté hiérarchique (mapped to Devotion Ladder) */
const CommunityLevelSchema = z.object({
  level: z.enum(DEVOTION_LEVELS),
  description: z.string().min(1),
  privileges: z.string().min(1),
  entryCriteria: textShort.optional(),
});

/** PILIER A COMPLET */
export const PillarASchema = z.object({
  // ── Fondamentaux (migrés de Strategy — Chantier -1 §-1.2) ────────────
  nomMarque: z.string().min(1),                           // Le nom de la marque
  accroche: z.string().max(100).optional(),                // Phrase identitaire < 15 mots (pas le slogan pub de D)
  description: z.string().min(1),                          // Ce que fait la marque, 2-3 phrases
  secteur: z.string().min(1),                              // Secteur d'activité (FMCG, TECH, BANQUE, etc.)
  pays: z.string().min(1),                                 // Pays/marché d'origine
  brandNature: z.string().min(1).optional(),                // PRODUCT, SERVICE, FESTIVAL_IP, MEDIA_IP, etc. (BrandNatureKey)
  langue: z.string().min(1).optional(),                    // Langue principale de la marque

  // ── Transition A→D (exports que D consomme) ──────────────────────────
  publicCible: z.string().min(1).optional(),               // Qui vise-t-on ? En 1 phrase. D détaille en personas.
  promesseFondamentale: z.string().min(1).optional(),      // Croyance intime : "On croit que le monde devrait être X"

  // ── Identité (existant) ──────────────────────────────────────────────
  archetype: z.enum(ARCHETYPES),
  archetypeSecondary: z.enum(ARCHETYPES).optional(),
  citationFondatrice: z.string().min(1),
  noyauIdentitaire: z.string().min(1),

  // Hero's Journey (5 actes)
  herosJourney: z.array(HeroJourneyActSchema).min(3).max(5),

  // Ikigai
  ikigai: BrandIkigaiSchema,

  // Valeurs Schwartz (1-3 valeurs max — une marque forte ne dépasse jamais 3 valeurs)
  valeurs: z.array(BrandValueSchema).min(1).max(3),

  // Hiérarchie communautaire
  hierarchieCommunautaire: z.array(CommunityLevelSchema).min(4).max(6),

  // Timeline narrative
  timelineNarrative: TimelineNarrativeSchema.optional(),

  // Extensions mouvement/cult marketing (Annexe G v2)
  prophecy: z.union([
    z.object({
      worldTransformed: z.string().min(1),
      pioneers: z.string().min(1),
      urgency: z.string().min(1),
      horizon: z.string().min(1),
    }),
    z.string().min(1), // legacy flat string
  ]).optional(),
  enemy: z.object({
    name: textShort,
    manifesto: textMedium.optional(),
    narrative: textMedium.optional(),
    enemySchwartzValues: z.array(z.enum(SCHWARTZ_VALUES)).optional(),
    overtonMap: z.object({
      ourPosition: z.string().min(1).optional(),
      enemyPosition: z.string().min(1).optional(),
      battleground: z.string().min(1).optional(),
      shiftDirection: z.string().min(1).optional(),
    }).optional(),
    enemyBrands: z.array(z.object({
      name: textShort,
      howTheyFight: textShort.optional(),
    })).optional(),
    activeOpposition: z.array(z.string().min(1)).optional(),
    passiveOpposition: z.array(z.string().min(1)).optional(),
    counterStrategy: z.object({
      marketingCounter: textMedium.optional(),
      alliances: z.array(textShort).optional(),
    }).optional(),
    fraternityFuel: z.object({
      sharedHatred: z.string().min(1).optional(),
      bondingRituals: z.array(z.string().min(1)).optional(),
    }).optional(),
  }).optional(),
  doctrine: z.union([
    z.object({
      dogmas: z.array(z.string().min(1)).min(3),
      principles: z.array(z.string().min(1)).min(3),
      practices: z.array(z.string().min(1)).optional(),
    }),
    z.string().min(1), // legacy flat string
  ]).optional(),
  livingMythology: z.object({
    canon: z.string().min(1),
    extensionRules: z.string().min(1),
    captureSystem: z.string().min(1).optional(),
  }).optional(),

  // ── Equipe Dirigeante (Berkus: Quality of Management Team) ──────────────
  // L'equipe dirigeante determine les competences de la marque.
  // Chaque membre est profile individuellement : experience, skills, credentials.
  equipeDirigeante: z.array(z.object({
    nom: textShort,
    role: textShort,                        // CEO, CTO, CMO, COO, CFO, etc.
    bio: textMedium,                         // Parcours en 2-3 phrases
    experiencePasse: z.array(z.string().min(1)).min(1),  // Postes/entreprises precedents
    competencesCles: z.array(z.string().min(1)).min(2),  // Skills techniques et business
    credentials: z.array(z.string().min(1)).optional(),   // Diplomes, certifications, prix
    linkedinUrl: z.string().url().optional(),
    allocationPct: z.number().min(0).max(100).optional(), // % temps dedie a la marque
  })).min(1).max(10).optional(),

  // Score de complementarite equipe (derive automatiquement)
  equipeComplementarite: z.object({
    scoreGlobal: z.number().min(0).max(10),              // 0-10
    couvertureTechnique: z.boolean(),                     // Au moins 1 profil tech
    couvertureCommerciale: z.boolean(),                   // Au moins 1 profil commercial
    couvertureOperationnelle: z.boolean(),                // Au moins 1 profil ops/execution
    capaciteExecution: z.enum(["faible", "moyenne", "forte", "exceptionnelle"]),
    lacunes: z.array(z.string().min(1)).optional(),       // Competences manquantes
    verdict: z.string().min(1),                           // Synthese en 1-2 phrases
  }).optional(),

  // ── ADR-0037 PR-K — nouveaux fields canon manuel ADVE ────────────────
  messieFondateur: z.object({
    nom: z.string().min(1),
    role: z.string().min(1),
    charismaScore: z.object({
      conviction: z.number().min(0).max(10),
      storytelling: z.number().min(0).max(10),
      presence: z.number().min(0).max(10),
      authenticity: z.number().min(0).max(10),
    }).optional(),
    narrative: z.string().min(50),
  }).optional(),
  competencesDivines: z.array(z.object({
    competence: z.string().min(50),
    justification: z.string().min(1),
    exclusivityProof: z.string().min(1),
  })).min(1).max(3).optional(),
  // Deux formes légitimes : compacte (canon/humain — preuve en chaîne nue) OU
  // structurée {type, claim, evidence, source, year}. Le renderer ProofList
  // affiche les deux (cf. pilier D proofPoints, même motif).
  preuvesAuthenticite: z.array(z.union([
    z.string().min(1),
    z.object({
      type: z.enum(["heritage", "certification", "recognition", "press", "datapoint"]),
      claim: z.string().min(1),
      evidence: z.string().min(1),
      source: z.string().min(1),
      year: z.number().int().optional(),
    }),
  ])).optional(),
  indexReputation: z.object({
    source: z.enum(["GOOGLE_REVIEWS", "TRUSTPILOT", "NPS", "YELP", "TRIPADVISOR", "OTHER"]),
    score: z.number(),
    sampleSize: z.number().int(),
    lastMeasured: z.string(),
    publicProofUrl: z.string().url().optional(),
  }).optional(),
  eNps: z.object({
    score: z.number().min(-100).max(100),
    sampleSize: z.number().int(),
    frequency: z.enum(["QUARTERLY", "ANNUAL"]),
    lastMeasured: z.string(),
    verbatims: z.array(z.string()).optional(),
  }).optional(),
  turnoverRate: z.number().min(0).max(1).optional(),
  missionStatement: z.string().max(200).optional(),
  originMyth: z.object({
    elevator: z.string().max(400),
    storytelling: z.string().min(100).optional(),
    longue: z.string().min(500).optional(),
  }).optional(),
});

// ============================================================================
// PILIER D — DISTINCTION
// ============================================================================

/** N2.04 — Persona */
const PersonaSchema = z.object({
  id: entityId.optional(),                                  // FK target for I.PotentialAction.targetsPersonaIds (ADR-0088)
  name: textShort,
  age: z.number().int().min(1).max(120).optional(),
  csp: textShort.optional(),
  location: textShort.optional(),
  income: textShort.optional(),
  familySituation: textShort.optional(),

  // Psychométrie
  tensionProfile: z.object({
    segmentId: textShort,
    category: z.string(),
    position: textShort, // Où se situe le persona sur l'axe de tension
  }).optional(),
  lf8Dominant: z.array(z.enum(LIFE_FORCE_8)).min(1).max(3).optional(),
  schwartzValues: z.array(z.enum(SCHWARTZ_VALUES)).min(1).max(3).optional(),

  // Psychographie
  lifestyle: z.string().min(1).optional(),
  mediaConsumption: z.string().min(1).optional(),
  brandRelationships: z.string().min(1).optional(),

  // Motivation & Friction
  motivations: z.string().min(1),
  fears: z.string().min(1).optional(),
  hiddenDesire: z.string().min(1).optional(),
  whatTheyActuallyBuy: z.string().min(1).optional(),

  // Jobs to be done
  jobsToBeDone: z.array(textShort).min(1).max(3).optional(),
  decisionProcess: textShort.optional(),
  devotionPotential: z.enum(DEVOTION_LEVELS).optional(),

  rank: rank, // 1 = primary persona
});

/** Concurrent */
const CompetitorSchema = z.object({
  name: textShort,
  partDeMarcheEstimee: percentage.optional(),
  avantagesCompetitifs: z.array(z.string().min(1)).min(1),
  faiblesses: z.array(textShort).optional(),
  strategiePos: textShort.optional(),
  distinctiveAssets: z.array(textShort).optional(),
});

/** PILIER D COMPLET */
export const PillarDSchema = z.object({
  // ── Transition A→D (pont archétype → expression) ─────────────────────
  archetypalExpression: z.object({
    visualTranslation: z.string().min(1).optional(),       // Comment l'archétype A se traduit visuellement
    verbalTranslation: z.string().min(1).optional(),       // Comment il se traduit verbalement
    emotionalRegister: z.string().min(1).optional(),       // Le registre émotionnel dérivé
  }).optional(),

  // Personas (2-5)
  personas: z.array(PersonaSchema).min(2).max(5),

  // Paysage concurrentiel (3+ concurrents)
  paysageConcurrentiel: z.array(CompetitorSchema).min(3),

  // Promesses de marque
  promesseMaitre: z.string().max(150, "La promesse maître doit faire ≤150 caractères"),
  sousPromesses: z.array(z.string().min(1)).min(2),

  // Positionnement
  positionnement: z.string().max(200, "Le positionnement doit faire ≤200 caractères"),

  // Ton de voix
  tonDeVoix: z.object({
    personnalite: z.array(textShort).min(5).max(7),
    onDit: z.array(z.string().min(1)).min(3),
    onNeditPas: z.array(z.string().min(1)).min(2),
  }),

  // Assets linguistiques
  assetsLinguistiques: z.object({
    languePrincipale: z.string().min(1).optional(),          // Langue principale (FR, EN, AR, etc.)
    languesSecondaires: z.array(z.string().min(1)).optional(),// Marchés multilingues (CM: FR/EN, MA: FR/AR)
    slogan: z.string().max(50).optional(),
    tagline: z.string().max(100).optional(),
    motto: z.string().min(1).max(150).optional(),
    mantras: z.array(z.string().min(1)).optional(),
    lexiquePropre: z.array(z.object({ word: textShort, definition: textShort })).min(3).optional(),
  }).optional(),

  // Direction artistique (BRAND pipeline outputs — remplis progressivement par GLORY)
  directionArtistique: z.object({
    // Forme compacte (canon / humain) — la matière réelle d'un Brand Book
    // (énoncé d'univers + principes directeurs). Coexiste avec les sous-objets
    // riches ci-dessous (sortie des Glory créatifs). Cf. renderer pillar-d-fields.
    univers: z.string().min(1).optional(),
    principes: z.array(textShort).optional(),
    semioticAnalysis: z.object({
      gloryOutputId: z.string().optional(),
      dominantSigns: z.array(z.object({ sign: textShort, meaning: textShort, culturalContext: textShort.optional() })).optional(),
      archetypeVisual: textShort.optional(),
      semioticTensions: z.array(z.object({ tension: textShort, resolution: textShort })).optional(),
      recommendations: z.array(textShort).optional(),
    }).optional(),
    visualLandscape: z.object({
      gloryOutputId: z.string().optional(),
      competitors: z.array(z.object({ name: textShort, visualIdentity: textShort, differentiator: textShort })).optional(),
      whitespace: z.array(textShort).optional(),
      positioningMap: z.object({ xAxis: textShort, yAxis: textShort, brandPosition: textShort }).optional(),
      opportunities: z.array(textShort).optional(),
    }).optional(),
    moodboard: z.object({
      gloryOutputId: z.string().optional(),
      theme: textShort.optional(),
      keywords: z.array(textShort).optional(),
      colorPalette: z.array(z.object({ hex: z.string(), name: textShort, usage: textShort })).optional(),
      textures: z.array(textShort).optional(),
      references: z.array(z.object({ source: textShort, description: textShort })).optional(),
    }).optional(),
    chromaticStrategy: z.object({
      gloryOutputId: z.string().optional(),
      primaryColors: z.array(z.object({ hex: z.string(), name: textShort, emotion: textShort, usage: textShort })).optional(),
      secondaryColors: z.array(z.object({ hex: z.string(), name: textShort, usage: textShort })).optional(),
      gradients: z.array(z.object({ from: z.string(), to: z.string(), usage: textShort })).optional(),
      forbiddenColors: z.array(z.object({ hex: z.string(), reason: textShort })).optional(),
      accessibilityNotes: textShort.optional(),
    }).optional(),
    typographySystem: z.object({
      gloryOutputId: z.string().optional(),
      primaryFont: z.object({ name: textShort, category: textShort, usage: textShort }).optional(),
      secondaryFont: z.object({ name: textShort, category: textShort, usage: textShort }).optional(),
      hierarchy: z.array(z.object({ level: textShort, font: textShort, size: textShort, weight: textShort })).optional(),
      rules: z.array(textShort).optional(),
    }).optional(),
    logoTypeRecommendation: z.object({
      gloryOutputId: z.string().optional(),
      logoType: textShort.optional(),
      rationale: textShort.optional(),
      variations: z.array(z.object({ name: textShort, usage: textShort, description: textShort })).optional(),
      doNots: z.array(textShort).optional(),
    }).optional(),
    logoValidation: z.object({
      gloryOutputId: z.string().optional(),
      score: z.number().min(0).max(100).optional(),
      strengths: z.array(textShort).optional(),
      weaknesses: z.array(textShort).optional(),
      recommendations: z.array(textShort).optional(),
      culturalFit: textShort.optional(),
    }).optional(),
    designTokens: z.object({
      gloryOutputId: z.string().optional(),
      spacing: z.record(z.string(), z.string()).optional(),
      borderRadius: z.record(z.string(), z.string()).optional(),
      shadows: z.record(z.string(), z.string()).optional(),
      breakpoints: z.record(z.string(), z.string()).optional(),
      customTokens: z.record(z.string(), z.string()).optional(),
    }).optional(),
    motionIdentity: z.object({
      gloryOutputId: z.string().optional(),
      personality: textShort.optional(),
      principles: z.array(textShort).optional(),
      transitions: z.array(z.object({ name: textShort, duration: textShort, easing: textShort, usage: textShort })).optional(),
      microInteractions: z.array(z.object({ trigger: textShort, animation: textShort })).optional(),
    }).optional(),
    brandGuidelines: z.object({
      gloryOutputId: z.string().optional(),
      sections: z.array(z.object({ title: textShort, content: z.string().min(1) })).optional(),
      dosAndDonts: z.array(z.object({ do: textShort, dont: textShort })).optional(),
      applicationExamples: z.array(z.object({ medium: textShort, description: textShort })).optional(),
    }).optional(),
    lsiMatrix: z.object({
      concepts: z.array(textShort).min(3).max(5).optional(),
      layers: z.record(z.string(), z.array(textShort)).optional(),
      sublimationRules: z.array(z.object({ literal: textShort, sublimated: textShort })).optional(),
    }).optional(),
  }).optional(),

  // Extensions Annexe G v2
  sacredObjects: z.array(z.object({
    name: textShort,
    form: textShort.optional(),
    narrative: textShort.optional(),
    stage: textShort.optional(),
    socialSignal: textShort.optional(),
  })).optional(),
  // Deux formes légitimes : compacte (canon/humain — une preuve écrite en
  // chaîne nue, la matière brute) OU structurée {type, claim, evidence, source}
  // (sortie enrichie). Le renderer ProofList affiche les deux.
  proofPoints: z.array(z.union([
    z.string().min(1),
    z.object({
      type: textShort,
      claim: textShort,
      evidence: textShort.optional(),
      source: textShort.optional(),
    }),
  ])).optional(),
  symboles: z.array(z.object({
    symbol: textShort,
    meanings: z.array(textShort).optional(),
    usageContexts: z.array(textShort).optional(),
  })).optional(),

  // ── ADR-0037 PR-K — nouveaux fields canon manuel ADVE ────────────────
  positionnementEmotionnel: z.string().max(200).optional(),
  swotFlash: z.object({
    strength: z.string().max(120),
    weakness: z.string().max(120),
    opportunity: z.string().max(120),
    threat: z.string().max(120),
  }).optional(),
  esov: z.object({
    value: z.number().min(-1).max(1),
    measurementMethod: z.string().min(1),
    lastMeasured: z.string(),
    source: z.string().min(1),
  }).optional(),
  barriersImitation: z.array(z.object({
    barrier: z.string().min(40),
    defensibility: z.enum(["LOW", "MEDIUM", "HIGH"]),
    expectedDuration: z.number().int().optional(),
    category: z.enum(["data", "network", "brand", "process", "cost"]).optional(),
  })).optional(),
  storyEvidenceRatio: z.object({
    storytellingPct: z.number().min(0).max(100),
    evidencePct: z.number().min(0).max(100),
    target: z.string().optional(),
  }).optional(),
});

// ============================================================================
// PILIER V — VALEUR
// ============================================================================

/** N2.05 — ProduitService (atomisé V2) */
const ProduitServiceSchema = z.object({
  id: textShort.optional(),
  nom: textShort,
  categorie: z.enum(PRODUCT_CATEGORIES),
  prix: currency.optional(),
  cout: currency.optional(),
  margeUnitaire: currency.optional(), // Derived: prix - cout

  // Matrice de valeur 2×2×2
  gainClientConcret: z.string().min(1),
  gainClientAbstrait: z.string().min(1),
  gainMarqueConcret: z.string().min(1).optional(),
  gainMarqueAbstrait: z.string().min(1).optional(),
  coutClientConcret: z.string().min(1).optional(),
  coutClientAbstrait: z.string().min(1).optional(),
  coutMarqueConcret: currency.optional(),
  coutMarqueAbstrait: z.string().min(1).optional(),

  // Positionnement produit
  lienPromesse: z.string().min(1),
  segmentCible: textShort, // Persona ID/name
  phaseLifecycle: z.enum(PRODUCT_LIFECYCLE),

  // Persuasion
  leviersPsychologiques: z.array(textShort).min(1).optional(),
  maslowMapping: z.enum(MASLOW_LEVELS).optional(),
  lf8Trigger: z.array(z.enum(LIFE_FORCE_8)).min(1).max(3).optional(),
  scoreEmotionnelADVE: z.number().min(0).max(100).optional(),

  // Distribution
  canalDistribution: z.array(z.enum(CHANNELS)).min(1),
  disponibilite: z.enum(["ALWAYS", "SEASONAL", "LIMITED", "PRE_ORDER", "PENDING"]).optional(),

  // Catalogue
  skuRef: textShort.optional(),
});

/** N2.07 — ProductLadderTier */
const ProductLadderTierSchema = z.object({
  tier: textShort,
  prix: currency.optional(),
  produitIds: z.array(textShort).min(1),
  cible: textShort, // Persona name/ID
  description: z.string().min(1),
  position: rank,
});

/** Unit Economics */
const UnitEconomicsSchema = z.object({
  cac: currency.optional(),
  ltv: currency.optional(),
  ltvCacRatio: z.number().optional(), // Derived
  pointMort: textShort.optional(),
  margeNette: z.number().optional(), // Derived
  roiEstime: percentage.optional(),
  paybackPeriod: z.number().optional(), // months
  budgetCom: currency, // V7 — annual marketing budget
  caVise: currency, // V8 — targeted annual revenue
});

/** PILIER V COMPLET */
export const PillarVSchema = z.object({
  // ── Fondamentaux économiques (migrés de Strategy.businessContext) ─────
  businessModel: z.string().min(1).optional(),             // BusinessModelKey (PRODUCTION, DISTRIBUTION, etc.)
  economicModels: z.array(z.string().min(1)).optional(),
  positioningArchetype: z.string().min(1).optional(),      // PositioningArchetypeKey (ULTRA_LUXE, PREMIUM, etc.)
  salesChannel: z.enum(SALES_CHANNELS).optional(),
  freeLayer: z.object({
    whatIsFree: z.string().min(1),
    whatIsPaid: z.string().min(1),
    conversionLever: z.string().min(1),
  }).optional(),

  // ── Transition D→V (pont positionnement → valeur) ────────────────────
  pricingJustification: z.string().min(1).optional(),        // Pourquoi CE prix pour CE positionnement ?
  personaSegmentMap: z.array(z.object({
    personaName: z.string().min(1),                          // Ref D.personas[].name
    productNames: z.array(z.string().min(1)),                // Ref V.produitsCatalogue[].nom
    devotionLevel: z.enum(DEVOTION_LEVELS).optional(),       // Quel niveau Devotion ce persona peut atteindre
    revenueContributionPct: z.number().min(0).max(100).optional(),
  })).optional(),

  // Catalogue produits (1-50)
  produitsCatalogue: z.array(ProduitServiceSchema).min(1).max(50),

  // Product Ladder (2-5 tiers)
  productLadder: z.array(ProductLadderTierSchema).min(2).max(5),

  // Unit Economics
  unitEconomics: UnitEconomicsSchema,

  // Promesse de valeur
  promesseDeValeur: textMedium.optional(),

  // Quadrants Valeur/Cout brand-level (Annexe G §V.1)
  valeurMarqueTangible: z.array(z.string().min(1)).optional(),
  valeurMarqueIntangible: z.array(z.string().min(1)).optional(),
  valeurClientTangible: z.array(z.string().min(1)).optional(),
  valeurClientIntangible: z.array(z.string().min(1)).optional(),
  coutMarqueTangible: z.array(z.string().min(1)).optional(),
  coutMarqueIntangible: z.array(z.string().min(1)).optional(),
  coutClientTangible: z.array(z.string().min(1)).optional(),
  coutClientIntangible: z.array(z.string().min(1)).optional(),

  // ── Berkus: Product / MVP ──────────────────────────────────────────────
  mvp: z.object({
    exists: z.boolean(),
    stage: z.enum(["IDEA", "POC", "PROTOTYPE", "MVP", "PRODUCT", "SCALED"]),
    description: z.string().min(1),
    features: z.array(z.string().min(1)).optional(),
    launchDate: z.string().optional(),               // ISO date or "pre-launch"
    userCount: z.number().min(0).optional(),
    feedbackSummary: z.string().optional(),
  }).optional(),

  // ── Berkus: Propriete Intellectuelle / Barrieres a l'entree ────────────
  proprieteIntellectuelle: z.object({
    brevets: z.array(z.object({
      titre: z.string().min(1),
      statut: z.enum(["DEPOSE", "EN_COURS", "ACCORDE", "REFUSE"]),
      numero: z.string().optional(),
    })).optional(),
    secretsCommerciaux: z.array(z.string().min(1)).optional(),
    technologieProprietary: z.string().optional(),   // Description de l'avantage techno
    barrieresEntree: z.array(z.string().min(1)).optional(), // Moats / barrieres
    licences: z.array(z.object({
      nom: z.string().min(1),
      type: z.string().min(1),                       // Exclusive, non-exclusive, etc.
    })).optional(),
    protectionScore: z.number().min(0).max(10).optional(), // Derive automatiquement
  }).optional(),

  // ── ADR-0037 PR-K — nouveaux fields canon manuel ADVE ────────────────
  roiProofs: z.array(z.object({
    client: z.string().optional(),
    beforeMetric: z.string().min(1),
    afterMetric: z.string().min(1),
    lift: z.string().min(1),
    timeframe: z.string().min(1),
    attestation: z.string().optional(),
  })).optional(),
  experienceMultisensorielle: z.object({
    vue: z.string().nullable().optional(),
    ouie: z.string().nullable().optional(),
    odorat: z.string().nullable().optional(),
    toucher: z.string().nullable().optional(),
    gout: z.string().nullable().optional(),
  }).optional(),
  sacrificeRequis: z.object({
    prix: z.string().optional(),
    temps: z.string().optional(),
    effort: z.string().optional(),
    justification: z.string().min(1),
  }).optional(),
  packagingExperience: z.object({
    unboxingRitual: z.array(z.string()).optional(),
    packagingMaterial: z.enum(["premium", "standard", "eco"]).optional(),
    deliveryMode: z.enum(["express", "standard", "event"]).optional(),
    sensoryNotes: z.string().optional(),
    instagrammable: z.boolean().optional(),
  }).optional(),
});

// ============================================================================
// PILIER E — ENGAGEMENT
// ============================================================================

/** N2.08 — Touchpoint */
const TouchpointSchema = z.object({
  canal: textShort,
  type: z.enum(TOUCHPOINT_TYPES),
  channelRef: z.enum(CHANNELS),
  role: z.string().min(1),
  aarrStage: z.enum(AARRR_STAGES),
  devotionLevel: z.array(z.enum(DEVOTION_LEVELS)).min(1),
  priority: rank.optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "AD_HOC"]).optional(),
});

/** N2.09 — Ritual */
const RitualSchema = z.object({
  nom: textShort,
  type: z.enum(RITUAL_TYPES),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "SEASONAL", "AD_HOC"]).optional(),
  description: z.string().min(1),
  devotionLevels: z.array(z.enum(DEVOTION_LEVELS)).min(1),
  touchpoints: z.array(textShort).optional(),
  aarrPrimary: z.enum(AARRR_STAGES),
  kpiMeasure: textShort,
});

/** KPI */
const KPISchema = z.object({
  name: textShort,
  metricType: z.enum(["ENGAGEMENT", "FINANCIAL", "BEHAVIORAL", "SATISFACTION"]),
  target: z.number(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
});

/** PILIER E COMPLET */
export const PillarESchema = z.object({
  // ── Fondamentaux engagement (Chantier -1 §-1.2) ─────────────────────
  promesseExperience: z.string().min(1).optional(),          // L'expérience que chaque interaction garantit
  primaryChannel: z.enum(CHANNELS).optional(),               // Canal principal d'engagement (migré de Strategy)

  // ── Superfan portrait (Chantier -1 §-1.2) ───────────────────────────
  superfanPortrait: z.object({
    personaRef: z.string().min(1).optional(),                // Ref D.personas[] — quel persona devient superfan
    motivations: z.array(z.string().min(1)).optional(),      // Ce qui pousse au stade évangéliste
    barriers: z.array(z.string().min(1)).optional(),         // Ce qui empêche la montée
    profile: z.string().min(1).optional(),                   // Description du superfan idéal
  }).optional(),

  // ── Transitions V→E (pont offre → engagement) ───────────────────────
  productExperienceMap: z.array(z.object({
    productRef: z.string().min(1),                           // Ref V.produitsCatalogue[].nom
    experienceDescription: z.string().min(1),
    touchpointRefs: z.array(z.string().min(1)).optional(),   // Refs E.touchpoints
    emotionalOutcome: z.string().min(1).optional(),
  })).optional(),
  ladderProductAlignment: z.array(z.object({
    devotionLevel: z.enum(DEVOTION_LEVELS),
    productTierRef: z.string().min(1).optional(),            // Ref V.productLadder[].tier
    entryAction: z.string().min(1).optional(),               // Comment on entre à ce niveau
    upgradeAction: z.string().min(1).optional(),             // Comment on monte au suivant
  })).optional(),
  channelTouchpointMap: z.array(z.object({
    salesChannel: z.enum(SALES_CHANNELS),
    touchpointRefs: z.array(z.string().min(1)),
  })).optional(),

  // ── Conversion mechanics (Chantier -1 §-1.2) ────────────────────────
  conversionTriggers: z.array(z.object({
    fromLevel: z.enum(DEVOTION_LEVELS),
    toLevel: z.enum(DEVOTION_LEVELS),
    trigger: z.string().min(1),                              // Ce qui déclenche la transition
    channel: z.string().min(1).optional(),
  })).optional(),
  barriersEngagement: z.array(z.object({
    level: z.enum(DEVOTION_LEVELS),
    barrier: z.string().min(1),
    mitigation: z.string().min(1).optional(),
  })).optional(),

  // Touchpoints (5-15)
  touchpoints: z.array(TouchpointSchema).min(5).max(15),

  // Rituels (3-10)
  rituels: z.array(RitualSchema).min(3).max(10),

  // Principes communautaires
  principesCommunautaires: z.array(z.object({
    principle: z.string().min(1),
    enforcement: textShort,
  })).min(3).optional(),

  // Gamification
  gamification: z.object({
    niveaux: z.array(z.object({
      niveau: textShort,
      condition: textShort,
      reward: textShort,
      duration: textShort.optional(),
    })).min(3),
    recompenses: z.array(textShort).optional(),
  }).optional(),

  // AARRR Funnel
  aarrr: z.object({
    acquisition: z.string().min(1),
    activation: z.string().min(1),
    retention: z.string().min(1),
    revenue: z.string().min(1),
    referral: z.string().min(1),
  }),

  // KPIs (6+)
  kpis: z.array(KPISchema).min(6),

  // Tabous communautaires
  taboos: z.array(z.object({
    taboo: textShort,
    consequence: textShort.optional(),
  })).optional(),

  // Extensions engagement sacré
  sacredCalendar: z.array(z.object({
    date: textShort,
    name: textShort,
    significance: textShort,
  })).min(4).optional(),

  commandments: z.array(z.object({
    commandment: textShort,
    justification: textShort,
  })).max(10).optional(),

  ritesDePassage: z.array(z.object({
    fromStage: z.enum(DEVOTION_LEVELS),
    toStage: z.enum(DEVOTION_LEVELS),
    rituelEntree: textShort,
    symboles: z.array(textShort).optional(),
  })).optional(),

  sacraments: z.array(z.object({
    nomSacre: textShort,
    trigger: textShort,
    action: textShort,
    reward: textShort,
    kpi: textShort,
    aarrStage: z.enum(AARRR_STAGES),
  })).min(5).optional(),

  // ── ADR-0037 PR-K — nouveaux fields canon manuel ADVE ────────────────
  clergeStructure: z.object({
    communityManager: z.object({
      name: z.string().min(1),
      role: z.string().min(1),
      status: z.enum(["FULL_TIME", "PART_TIME", "VOLUNTEER"]),
    }).nullable().optional(),
    ambassadeurs: z.array(z.object({
      name: z.string().min(1),
      reach: z.number().int().optional(),
      tier: z.enum(["ALPHA", "BETA", "MICRO"]).optional(),
    })).optional(),
    supportTeam: z.object({
      size: z.number().int().min(0),
      sla: z.string().optional(),
    }).optional(),
    specialists: z.array(z.object({
      name: z.string().min(1),
      expertise: z.string().min(1),
    })).optional(),
  }).optional(),
  pelerinages: z.array(z.object({
    name: z.string().min(1),
    frequency: z.enum(["ANNUAL", "BIANNUAL", "QUARTERLY"]),
    location: z.string().min(1),
    expectedAttendance: z.number().int().min(0).optional(),
    devotionLevelTarget: z.enum(DEVOTION_LEVELS).optional(),
    entryRitual: z.string().optional(),
  })).optional(),
  programmeEvangelisation: z.object({
    referralProgram: z.object({
      incentive: z.string().min(1),
      viralCoefficient: z.number().optional(),
      launchedAt: z.string().optional(),
    }).nullable().optional(),
    brandAdvocacyProgram: z.object({
      tiers: z.array(z.string()).optional(),
      rewards: z.string().optional(),
      kpi: z.string().optional(),
    }).nullable().optional(),
    communityRecruitment: z.object({
      channels: z.array(z.string()).optional(),
      conversionRate: z.number().optional(),
    }).nullable().optional(),
  }).optional(),
  communityBuilding: z.object({
    platforms: z.array(z.object({
      name: z.string().min(1),
      type: z.enum(["DISCORD", "SLACK", "FACEBOOK_GROUP", "FORUM", "CIRCLE", "OTHER"]),
      memberCount: z.number().int().min(0).optional(),
    })).min(1).optional(),
    moderationRules: z.array(z.string()).min(3).optional(),
    growthMechanics: z.array(z.enum(["referral", "content", "events"])).optional(),
  }).optional(),
});

// ============================================================================
// PILIER R — RISK
// ============================================================================

// Exported (ADR-0063) so LLM-response sub-schemas in rtis-protocols can
// validate items without the parent-level `.min(N)` count constraints.
export const SWOTQuadrantSchema = z.object({
  strengths: z.array(textShort).min(3),
  weaknesses: z.array(textShort).min(3),
  opportunities: z.array(textShort).min(3),
  threats: z.array(textShort).min(3),
});

// Risk taxonomy for the structured backbone (ADR-0088). `category` classifies
// the risk for dashboard grouping; `status` drives the mitigation workflow.
export const RISK_CATEGORIES = ["COHERENCE", "OVERTON", "DEVOTION", "MARKET"] as const;
export const RISK_STATUSES = ["UNMITIGATED", "MITIGATED", "ACCEPTED"] as const;

// Pure, exported: maps the ordinal probability×impact (LOW/MEDIUM/HIGH) onto a
// 0-100 numeric severity so dashboards compute instead of rendering empty boxes.
// Reused by the backfill script, computePillarS, and rtis-protocols/risk.ts.
const RISK_LEVEL_WEIGHT: Record<(typeof RISK_LEVELS)[number], number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};
export function deriveSeverity(
  probability: (typeof RISK_LEVELS)[number],
  impact: (typeof RISK_LEVELS)[number],
): number {
  const p = RISK_LEVEL_WEIGHT[probability] ?? 1;
  const i = RISK_LEVEL_WEIGHT[impact] ?? 1;
  return Math.round(((p * i) / 9) * 100); // 9 = max(3×3)
}

export const RiskEntrySchema = z.object({
  risk: textShort,
  probability: z.enum(RISK_LEVELS),
  impact: z.enum(RISK_LEVELS),
  mitigation: z.string().min(1),
  // ── Structured backbone (ADR-0088) — optional for back-compat, backfilled ──
  id: entityId.optional(),                                  // stable FK target for I.mitigatesRiskIds
  severity: z.number().min(0).max(100).optional(),          // numeric, deriveSeverity(probability, impact)
  status: z.enum(RISK_STATUSES).optional(),                 // mitigation workflow state
  category: z.enum(RISK_CATEGORIES).optional(),             // dashboard grouping
});

export const MitigationPrioritySchema = z.object({
  action: z.string().min(1),
  owner: textShort.optional(),
  timeline: textShort.optional(),
  investment: textShort.optional(),
});

export const OvertonBlockerSchema = z.object({
  risk: z.string().min(1),
  blockingPerception: z.string().min(1),
  mitigation: z.string().min(1),
  devotionLevelBlocked: z.enum(DEVOTION_LEVELS).optional(),
});

export const PillarRSchema = z.object({
  // ── Diagnostic ADVE (transition E→R) ─────────────────────────────────
  pillarGaps: z.object({
    a: z.object({ score: z.number().optional(), gaps: z.array(z.string()).optional() }).optional(),
    d: z.object({ score: z.number().optional(), gaps: z.array(z.string()).optional() }).optional(),
    v: z.object({ score: z.number().optional(), gaps: z.array(z.string()).optional() }).optional(),
    e: z.object({ score: z.number().optional(), gaps: z.array(z.string()).optional() }).optional(),
  }).optional(),
  coherenceRisks: z.array(z.object({
    pillar1: z.string().min(1),
    pillar2: z.string().min(1),
    field1: z.string().min(1),
    field2: z.string().min(1),
    contradiction: z.string().min(1),
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  })).optional(),

  // ── Overton blockers (Chantier -1 §-1.2 + §0.4) ────────────────────
  overtonBlockers: z.array(z.object({
    risk: z.string().min(1),
    blockingPerception: z.string().min(1),                   // Quelle perception est bloquée
    mitigation: z.string().min(1),
    devotionLevelBlocked: z.enum(DEVOTION_LEVELS).optional(),// Quel niveau de la ladder est bloqué
  })).optional(),
  devotionVulnerabilities: z.array(z.object({
    level: z.enum(DEVOTION_LEVELS),
    churnCause: z.string().min(1),
    mitigation: z.string().min(1).optional(),
  })).optional(),

  // Micro-SWOTs par pilier (1 par pilier A/D/V/E)
  microSWOTs: z.record(z.string(), SWOTQuadrantSchema).optional(),

  // SWOT global
  globalSwot: SWOTQuadrantSchema,

  // Matrice probabilité × impact (5+ risques)
  probabilityImpactMatrix: z.array(RiskEntrySchema).min(5),

  // Priorités de mitigation (5+ actions)
  mitigationPriorities: z.array(z.object({
    action: z.string().min(1),
    owner: textShort.optional(),
    timeline: textShort.optional(),
    investment: textShort.optional(),
  })).min(5),

  // Score de risque global (0-100)
  riskScore: z.number().min(0).max(100).optional(),
});

// ============================================================================
// PILIER T — TRACK
// ============================================================================

/** Weak Signal with causal chain (Market Intelligence Engine) */
const WeakSignalSchema = z.object({
  id: z.string().optional(),
  thesis: z.string().min(1),
  rawEvent: z.string().min(1),
  causalChain: z.array(z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    mechanism: z.string().min(1),
    confidence: z.number().min(0).max(1),
  })).min(1),
  impactCategory: z.enum(["SUPPLY_CHAIN", "PRICING", "DEMAND", "REGULATORY", "COMPETITIVE", "TECHNOLOGICAL", "SOCIAL"]),
  brandImpact: z.string().min(1),
  confidence: z.number().min(0).max(1),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  relatedPillars: z.array(z.string()).optional(),
  supportingSignals: z.array(z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    addedConfidence: z.number().min(0).max(0.3),
    link: z.string().min(1),
  })).optional(),
  recommendedAction: z.string().min(1).optional(),
});

/** Market data source metadata */
const MarketDataSourceSchema = z.object({
  sourceType: z.string(),
  title: z.string(),
  collectedAt: z.string().optional(),
  reliability: z.number().min(0).max(1).optional(),
});

export const PillarTSchema = z.object({
  // ── Transition R→T (confrontation des risques au marché) ─────────────
  riskValidation: z.array(z.object({
    riskRef: z.string().min(1).optional(),                   // @deprecated (ADR-0088) — text name, use riskId
    riskId: entityId.optional(),                             // FK → R.probabilityImpactMatrix[].id
    marketEvidence: z.string().min(1),
    status: z.enum(["CONFIRMED", "DENIED", "UNKNOWN"]),
    source: z.enum(DATA_SOURCES).optional(),
  })).optional(),

  // ── Fenêtre d'Overton mesurée (Chantier -1 §-1.2) ───────────────────
  overtonPosition: z.object({
    currentPerception: z.string().min(1),                    // Comment le marché perçoit la marque MAINTENANT
    marketSegments: z.array(z.object({
      segment: z.string().min(1),
      perception: z.string().min(1),
    })).optional(),
    measurementMethod: z.string().min(1).optional(),
    measuredAt: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
  }).optional(),
  perceptionGap: z.object({
    currentPerception: z.string().min(1),                    // T.overtonPosition résumé
    targetPerception: z.string().min(1),                     // A.prophecy + D.positionnement résumé
    gapDescription: z.string().min(1),                       // L'écart — KPI d'entrée de S
    gapScore: z.number().min(0).max(100).optional(),         // 0 = aucun écart, 100 = perception opposée
  }).optional(),
  competitorOvertonPositions: z.array(z.object({
    competitorName: z.string().min(1),                       // Ref D.paysageConcurrentiel[].name
    overtonPosition: z.string().min(1),
    relativeToUs: z.enum(["AHEAD", "BEHIND", "PARALLEL", "DIVERGENT"]).optional(),
  })).optional(),

  // Triangulation marché (4 méthodes)
  triangulation: z.object({
    customerInterviews: z.string().min(1).optional(),
    competitiveAnalysis: z.string().min(1).optional(),
    trendAnalysis: z.string().min(1).optional(),
    financialBenchmarks: z.string().min(1).optional(),
  }),

  // Validation d'hypothèses (5+, ≥2 validées)
  hypothesisValidation: z.array(z.object({
    id: entityId.optional(),                                 // stable identity — FK target for I/S hypothesisId (ADR-0088)
    hypothesis: textShort,
    validationMethod: textShort,
    status: z.enum(["HYPOTHESIS", "TESTING", "VALIDATED", "INVALIDATED"]),
    evidence: textShort.optional(),
  })).min(5),

  // Réalité marché
  marketReality: z.object({
    macroTrends: z.array(textShort).min(3),
    weakSignals: z.array(textShort).min(2),
  }).optional(),

  // TAM / SAM / SOM (avec provenance — LOI 4)
  tamSamSom: z.object({
    tam: z.object({ value: currency, description: textShort, source: z.enum(DATA_SOURCES).optional(), sourceRef: z.string().optional() }),
    sam: z.object({ value: currency, description: textShort, source: z.enum(DATA_SOURCES).optional(), sourceRef: z.string().optional() }),
    som: z.object({ value: currency, description: textShort, source: z.enum(DATA_SOURCES).optional(), sourceRef: z.string().optional() }),
  }),

  // Brand-Market Fit Score (0-100)
  brandMarketFitScore: z.number().min(0).max(100).optional(),

  // ── Market Intelligence Engine extensions ──────────────────────────────
  // Weak signals with causal chains and supporting signals
  weakSignalAnalysis: z.array(WeakSignalSchema).optional(),

  // Sources de données marché utilisées
  marketDataSources: z.array(MarketDataSourceSchema).optional(),

  // Horodatage dernière actualisation données marché
  lastMarketDataRefresh: z.string().optional(),

  // True si données sectorielles réutilisées (cross-brand sharing)
  sectorKnowledgeReused: z.boolean().optional(),

  // ── Berkus: Traction / Signaux precoces ────────────────────────────────
  traction: z.object({
    loisSignees: z.array(z.object({
      partenaire: z.string().min(1),
      type: z.enum(["LOI", "MOU", "CONTRAT", "PRECOMMANDE", "PILOTE"]),
      valeur: z.number().optional(),                 // Valeur en devise
      date: z.string().optional(),
    })).optional(),
    utilisateursInscrits: z.number().min(0).optional(),
    utilisateursActifs: z.number().min(0).optional(),
    croissanceHebdo: z.number().optional(),           // % croissance WoW
    revenusRecurrents: z.number().min(0).optional(),  // MRR/ARR
    metriqueCle: z.object({                           // North Star Metric
      nom: z.string().min(1),
      valeur: z.number(),
      tendance: z.enum(["UP", "DOWN", "STABLE"]),
    }).optional(),
    preuvesTraction: z.array(z.string().min(1)).optional(), // Texte libre: preuves qualitatives
    tractionScore: z.number().min(0).max(10).optional(),    // Derive automatiquement
  }).optional(),
});

// ============================================================================
// PILIER I — POTENTIEL (catalogue exhaustif de tout ce que la marque PEUT faire)
// ============================================================================

// Initiative workflow (ADR-0088). DRAFT → RECOMMENDED (AI/Notoria) →
// SELECTED_FOR_ROADMAP (operator picks for S) | REJECTED. Pillar S aggregates
// budgets/coverage over SELECTED_FOR_ROADMAP initiatives only.
export const INITIATIVE_STATUSES = ["DRAFT", "RECOMMENDED", "SELECTED_FOR_ROADMAP", "REJECTED"] as const;
export const INITIATIVE_TIMEFRAMES = ["SPRINT_90", "PHASE_1", "PHASE_2", "LONG_TERM"] as const;

// Three roadmap trajectories (ADR-0088) — Conservateur / Cible (recommandé) /
// Ambitieux. Projections are PURE-COMPUTED (no LLM) from the relational
// backbone ; only genuinely generative content (narrative) may invoke an LLM.
export const ROADMAP_ROUTE_KEYS = ["CONSERVATIVE", "TARGET", "AMBITIOUS"] as const;

/** N2 — Action Potentielle / Initiative (catalogue, pas planifiee) */
const PotentialActionSchema = z.object({
  action: z.string().min(1),
  format: textShort,
  objectif: textShort,
  pilierImpact: z.enum(ADVE_KEYS).optional(),
  devotionImpact: z.enum(DEVOTION_LEVELS).optional(),        // Quel niveau de la Ladder cette action active
  overtonShift: z.string().min(1).optional(),                // Comment cette action déplace la perception
  // ── Structured backbone (ADR-0088) — optional for back-compat, backfilled ──
  id: entityId.optional(),                                   // stable identity, referenced by S.sourceInitiativeId
  status: z.enum(INITIATIVE_STATUSES).optional(),            // selection workflow
  budget: currency.optional(),                               // numeric — feeds S.computed.totalBudget
  budgetEstime: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),// qualitative anchor → numeric budget (normalizeInitiative)
  channel: textShort.optional(),                             // self-describing canal (sinon = clé du conteneur)
  timeframe: z.enum(INITIATIVE_TIMEFRAMES).optional(),       // roadmap phase, feeds S.computed.budgetByPhase
  mitigatesRiskIds: z.array(entityId).optional(),            // FK → R.probabilityImpactMatrix[].id (data lineage)
  targetsPersonaIds: z.array(entityId).optional(),           // FK → D PersonaSchema[].id (data lineage)
});

/** N2 — Asset Produisible */
const ProducibleAssetSchema = z.object({
  asset: z.string().min(1),
  type: z.enum(["VIDEO", "PRINT", "DIGITAL", "PHOTO", "AUDIO", "PACKAGING", "EXPERIENCE"]),
  usage: textShort,
});

/** N2 — Activation Possible */
const PotentialActivationSchema = z.object({
  activation: z.string().min(1),
  canal: textShort,
  cible: textShort,
  budgetEstime: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export const PillarISchema = z.object({
  // ── Transitions T→I (le potentiel guidé par la réalité marché) ───────
  actionsByDevotionLevel: z.object({
    SPECTATEUR: z.array(PotentialActionSchema).optional(),
    INTERESSE: z.array(PotentialActionSchema).optional(),
    PARTICIPANT: z.array(PotentialActionSchema).optional(),
    ENGAGE: z.array(PotentialActionSchema).optional(),
    AMBASSADEUR: z.array(PotentialActionSchema).optional(),
    EVANGELISTE: z.array(PotentialActionSchema).optional(),
  }).optional(),
  actionsByOvertonPhase: z.array(z.object({
    phase: z.string().min(1),                                // "early_adopters", "mainstream", "resistants"
    actions: z.array(PotentialActionSchema),
  })).optional(),
  riskMitigationActions: z.array(z.object({
    riskRef: z.string().min(1).optional(),                   // @deprecated (ADR-0088) — text name, use riskId
    riskId: entityId.optional(),                             // FK → R.probabilityImpactMatrix[].id
    action: z.string().min(1),
    canal: z.string().min(1).optional(),
    expectedImpact: z.string().min(1).optional(),
  })).optional(),
  hypothesisTestActions: z.array(z.object({
    hypothesisRef: z.string().min(1).optional(),             // @deprecated (ADR-0088) — text name, use hypothesisId
    hypothesisId: entityId.optional(),                       // FK → T.hypothesisValidation[].id
    testAction: z.string().min(1),
    expectedOutcome: z.string().min(1).optional(),
    cost: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  })).optional(),

  // ── Innovations produit/marque (Chantier -1 §-1.2) ──────────────────
  innovationsProduit: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(["EXTENSION_GAMME", "EXTENSION_MARQUE", "CO_BRANDING", "PIVOT", "DIVERSIFICATION"]),
    description: z.string().min(1),
    feasibility: z.enum(["HIGH", "MEDIUM", "LOW"]),
    horizon: z.enum(["COURT", "MOYEN", "LONG"]),
    devotionImpact: z.enum(DEVOTION_LEVELS).optional(),
  })).optional(),

  // ── Catalogue d'actions par canal (le coeur de I) ─────────────────────
  catalogueParCanal: z.record(z.string(), z.array(PotentialActionSchema)).optional(),

  // ── Assets produisibles ───────────────────────────────────────────────
  assetsProduisibles: z.array(ProducibleAssetSchema).min(5).optional(),

  // ── Activations possibles ─────────────────────────────────────────────
  activationsPossibles: z.array(PotentialActivationSchema).min(5).optional(),

  // ── Formats disponibles (tous les formats creatifs possibles) ─────────
  formatsDisponibles: z.array(z.string().min(1)).min(5).optional(),

  // ── Total actions (compteur) ──────────────────────────────────────────
  totalActions: z.number().int().min(0).optional(),

  // ── Plateforme de marque (stable, pas temporalisee) ───────────────────
  brandPlatform: z.object({
    name: textShort.optional(),
    benefit: textShort.optional(),
    target: textShort.optional(),
    competitiveAdvantage: textShort.optional(),
    emotionalBenefit: textShort.optional(),
    functionalBenefit: textShort.optional(),
    supportedBy: textShort.optional(),
  }).optional(),

  // ── Copy strategy (stable) ────────────────────────────────────────────
  copyStrategy: z.object({
    promise: textShort.optional(),
    rtb: textShort.optional(),
    tonOfVoice: textShort.optional(),
    keyMessages: z.array(textShort).optional(),
    doNot: z.array(textShort).optional(),
  }).optional(),

  // ── Big Idea (concept central) ────────────────────────────────────────
  bigIdea: z.object({
    concept: textShort.optional(),
    mechanism: textShort.optional(),
    insight: textShort.optional(),
    adaptations: z.array(textShort).optional(),
  }).optional(),

  // ── Budget potentiel (fourchettes, pas le budget affecte) ─────────────
  potentielBudget: z.object({
    production: currency.optional(),
    media: currency.optional(),
    talent: currency.optional(),
    logistics: currency.optional(),
    technology: currency.optional(),
    total: currency.optional(),
  }).optional(),

  // ── Media plan potentiel ──────────────────────────────────────────────
  mediaPlan: z.object({
    totalBudget: currency.optional(),
    channels: z.array(z.object({
      channel: textShort,
      budget: currency.optional(),
      percentage: z.number().min(0).max(100).optional(),
      objective: textShort.optional(),
      kpi: textShort.optional(),
    })).optional(),
  }).optional(),

  // sprint90Days et annualCalendar ont été déplacés dans le pilier S
  // (S pioche dans I pour construire la roadmap — Chantier 0 §0.3)

  // ── Generation metadata ───────────────────────────────────────────────
  generationMeta: z.object({
    gloryToolsUsed: z.array(z.string()).optional(),
    qualityScore: z.number().min(0).max(100).optional(),
    generatedAt: z.string().optional(),
  }).optional(),
});

// ============================================================================
// PILIER S — STRATÉGIE (planification temporalisée qui pioche dans I)
// ============================================================================

export const PillarSSchema = z.object({
  // ── Fenetre d'Overton — cœur de S ────────────────────────────────────
  // (ADR-0088) S = tableau de bord calculé : les perceptions sont DÉRIVÉES
  // (T.overtonPosition / A.prophecy / T.perceptionGap) et écrites par
  // computePillarS, pas saisies. Le bloc devient optional + ses perceptions
  // optional pour que la validation lenient n'exige aucune saisie texte ici.
  fenetreOverton: z.object({
    perceptionActuelle: textMedium.optional(),               // @derived T.overtonPosition (computePillarS)
    perceptionCible: textMedium.optional(),                  // @derived A.prophecy + D.positionnement
    ecart: textMedium.optional(),                            // @derived T.perceptionGap
    strategieDeplacement: z.array(z.object({
      etape: textShort,
      action: textShort,
      canal: textShort.optional(),
      horizon: textShort.optional(),
      devotionTarget: z.enum(DEVOTION_LEVELS).optional(),    // Quel niveau Devotion cette étape cible
      riskRef: z.string().optional(),                        // @deprecated (ADR-0088) — use riskId
      riskId: entityId.optional(),                           // FK → R.overtonBlockers[].id mitigé
      hypothesisRef: z.string().optional(),                  // @deprecated (ADR-0088) — use hypothesisId
      hypothesisId: entityId.optional(),                     // FK → T.hypothesisValidation[].id validé
    })).min(3),
  }).optional(),

  // ── Vision & Axes ─────────────────────────────────────────────────────
  // @deprecated as operator INPUT (ADR-0088). S accepts no static text — these
  // are now produced by the synthesis path / computed dashboard. Kept optional
  // for backward-compat so the 35-section Oracle still renders legacy rows.
  visionStrategique: textMedium.optional(),
  syntheseExecutive: textMedium.optional(),

  axesStrategiques: z.array(z.object({
    axe: textShort,
    pillarsLinked: z.array(z.enum(PILLAR_KEYS)).min(2),
    kpis: z.array(textShort).min(1),
  })).min(3),

  facteursClesSucces: z.array(textShort).min(3),

  // ── Sprint 90 jours (actions choisies PARMI I) ────────────────────────
  sprint90Days: z.array(z.object({
    action: z.string().min(1),
    owner: textShort.optional(),
    kpi: textShort,
    priority: rank,
    isRiskMitigation: z.boolean().optional(),
    devotionImpact: z.enum(DEVOTION_LEVELS).optional(),      // Quel niveau Devotion cette action cible
    sourceRef: z.string().optional(),                        // @deprecated (ADR-0088) — text path, use sourceInitiativeId
    sourceInitiativeId: entityId.optional(),                 // FK → I PotentialAction.id (data lineage)
  })).min(5),

  // ── Roadmap orientée superfan (jalons temporels) ──────────────────────
  roadmap: z.array(z.object({
    phase: textShort,
    objectif: textShort,
    objectifDevotion: z.string().min(1).optional(),          // Ex: "spectateur → intéressé"
    actions: z.array(textShort).optional(),
    budget: currency.optional(),
    duree: textShort.optional(),
  })).min(3).optional(),

  // ── Budget alloue (sous-ensemble de I.potentielBudget) ────────────────
  globalBudget: currency.optional(),
  budgetBreakdown: z.object({
    production: currency.optional(),
    media: currency.optional(),
    talent: currency.optional(),
    logistics: currency.optional(),
    technology: currency.optional(),
    contingency: currency.optional(),
    agencyFees: currency.optional(),
  }).optional(),

  // ── Equipe mobilisee ──────────────────────────────────────────────────
  teamStructure: z.array(z.object({
    name: textShort,
    title: textShort,
    responsibility: textShort,
  })).min(1).optional(),

  // ── KPI Dashboard (metriques de suivi par axe) ────────────────────────
  kpiDashboard: z.array(z.object({
    name: textShort,
    pillar: z.enum(PILLAR_KEYS),
    target: textShort,
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]),
  })).min(5).optional(),

  // ── Score de coherence ────────────────────────────────────────────────
  coherenceScore: z.number().min(0).max(100).optional(),

  // ── Transitions I→S (traçabilité + objectifs Devotion) ────────────────
  selectedFromI: z.array(z.object({
    sourceRef: z.string().min(1),                            // @deprecated (ADR-0088) — path string, use sourceInitiativeId
    sourceInitiativeId: entityId.optional(),                 // FK → I PotentialAction.id (data lineage)
    action: z.string().min(1),
    phase: z.string().min(1).optional(),                     // Phase roadmap où l'action est planifiée
    priority: rank.optional(),
  })).optional(),
  rejectedFromI: z.array(z.object({
    sourceRef: z.string().min(1),                            // @deprecated (ADR-0088) — path string, use sourceInitiativeId
    sourceInitiativeId: entityId.optional(),                 // FK → I PotentialAction.id (data lineage)
    reason: z.string().min(1),                               // Pourquoi pas maintenant
  })).optional(),
  devotionFunnel: z.array(z.object({
    phase: z.string().min(1),                                // Phase roadmap
    spectateurs: z.number().optional(),
    interesses: z.number().optional(),
    participants: z.number().optional(),
    engages: z.number().optional(),
    ambassadeurs: z.number().optional(),
    evangelistes: z.number().optional(),
  })).optional(),
  overtonMilestones: z.array(z.object({
    phase: z.string().min(1),
    currentPerception: z.string().min(1),
    targetPerception: z.string().min(1),
    measurementMethod: z.string().min(1).optional(),
  })).optional(),
  budgetByDevotion: z.object({
    acquisition: currency.optional(),                        // Budget pour spectateur → intéressé
    conversion: currency.optional(),                         // Budget pour intéressé → participant
    retention: currency.optional(),                          // Budget pour participant → engagé
    evangelisation: currency.optional(),                      // Budget pour engagé → ambassadeur/évangéliste
  }).optional(),
  northStarKPI: z.object({
    name: z.string().min(1),                                 // Ex: "Progression Devotion Ladder"
    target: z.string().min(1),
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]),
    currentValue: z.string().optional(),
  }).optional(),

  // ── PURE COMPUTED DASHBOARD (ADR-0088) ────────────────────────────────
  // Pillar S = aggregations only, written by computePillarS (no LLM, no input).
  // Every field here is derived from A/D/V/E/R/T/I — see variable-bible BIBLE_S
  // (each carries `derivedFrom`, keeping listEditableFields("s") === []).
  computed: z.object({
    totalBudget: currency.optional(),                        // Σ budget des initiatives status=SELECTED_FOR_ROADMAP
    budgetByPhase: z.record(z.enum(INITIATIVE_TIMEFRAMES), currency).optional(), // groupé par timeframe
    riskCoverage: percentage.optional(),                     // % risques R couverts par une initiative sélectionnée
    mitigatedRiskIds: z.array(entityId).optional(),          // union des mitigatesRiskIds des initiatives sélectionnées
    selectedInitiativeCount: z.number().int().min(0).optional(),
    devotionFunnel: z.array(z.object({
      phase: z.string().min(1),
      spectateurs: z.number().optional(),
      interesses: z.number().optional(),
      participants: z.number().optional(),
      engages: z.number().optional(),
      ambassadeurs: z.number().optional(),
      evangelistes: z.number().optional(),
    })).optional(),
    overtonPosition: z.object({
      current: z.string().min(1),                            // dérivé T.overtonPosition / T.perceptionGap
      target: z.string().min(1),
      gapScore: percentage.optional(),
    }).optional(),
    coherenceScore: percentage.optional(),                   // dérivé R.coherenceRisks
    // 3 trajectoires de roadmap (ADR-0088) — projections PURES, jamais LLM.
    // ADR-0089 : chaque route porte aussi son JEU DE STRATÉGIE calculé
    // (sous-ensemble d'initiatives + enveloppe budget + posture risque) —
    // 3 jeux déterministes dérivés du même backbone relationnel.
    roadmapRoutes: z.array(z.object({
      key: z.enum(ROADMAP_ROUTE_KEYS),
      label: z.string().min(1),
      recommended: z.boolean(),
      selected: z.boolean().optional(),                      // ambition retenue par l'opérateur (ADR-0089)
      projectedGrowthPct: z.number(),                        // ex: +22 / +58 / +115
      projectedRevenue: currency.optional(),                 // CA projeté 12 mois (si baseRevenue connu)
      targetCultIndex: percentage,                           // Cult Index cible 0-100
      description: z.string().min(1),                         // résumé court (template déterministe)
      // ── Jeu de stratégie par route (ADR-0089, pure-computed) ──
      initiativeIds: z.array(entityId).optional(),           // initiatives du jeu (FK → I PotentialAction.id)
      initiativeCount: z.number().int().min(0).optional(),
      totalBudget: currency.optional(),                      // Σ budget du jeu
      budgetByPhase: z.record(z.enum(INITIATIVE_TIMEFRAMES), currency).optional(),
      riskCoverage: percentage.optional(),                   // % risques R couverts par le jeu
    })).length(3).optional(),
    // ADR-0089 — ambition retenue (sélection opérateur via Intent gouverné
    // SELECT_ROADMAP_ROUTE, jamais saisie texte). Le dashboard principal
    // (totalBudget, budgetByPhase, riskCoverage, …) agrège le jeu de la
    // route sélectionnée. Default : TARGET.
    selectedRouteKey: z.enum(ROADMAP_ROUTE_KEYS).optional(),
    computedAt: z.string().optional(),                       // ISO timestamp du dernier calcul
  }).optional(),

  // ── Legacy compat ─────────────────────────────────────────────────────
  // @deprecated as operator INPUT (ADR-0088) — superseded by `computed`.
  recommandationsPrioritaires: z.array(z.object({
    recommendation: textShort,
    source: z.enum(PILLAR_KEYS).optional(),
    priority: rank.optional(),
  })).optional(),
});

// ============================================================================
// SCHEMA MAP — Accès par clé de pilier
// ============================================================================

export const PILLAR_SCHEMAS = {
  A: PillarASchema,
  D: PillarDSchema,
  V: PillarVSchema,
  E: PillarESchema,
  R: PillarRSchema,
  T: PillarTSchema,
  I: PillarISchema,
  S: PillarSSchema,
} as const;

export type PillarKey = keyof typeof PILLAR_SCHEMAS;

export type PillarAContent = z.infer<typeof PillarASchema>;
export type PillarDContent = z.infer<typeof PillarDSchema>;
export type PillarVContent = z.infer<typeof PillarVSchema>;
export type PillarEContent = z.infer<typeof PillarESchema>;
export type PillarRContent = z.infer<typeof PillarRSchema>;
export type PillarTContent = z.infer<typeof PillarTSchema>;
export type PillarIContent = z.infer<typeof PillarISchema>;
export type PillarSContent = z.infer<typeof PillarSSchema>;

export type PillarContent =
  | PillarAContent
  | PillarDContent
  | PillarVContent
  | PillarEContent
  | PillarRContent
  | PillarTContent
  | PillarIContent
  | PillarSContent;

/**
 * Validate pillar content against its schema
 * Returns { success: true, data } or { success: false, errors }
 */
export function validatePillarContent(key: PillarKey, content: unknown): {
  success: boolean;
  data?: PillarContent;
  errors?: Array<{ path: string; message: string }>;
} {
  const schema = PILLAR_SCHEMAS[key];
  const result = schema.safeParse(content);

  if (result.success) {
    return { success: true, data: result.data as PillarContent };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}

/**
 * Partial validation — validates only filled fields, ignores missing optional fields
 * Useful for incremental editing (save draft before all fields are filled)
 */
export function validatePillarPartial(key: PillarKey, content: unknown): {
  success: boolean;
  data?: Partial<PillarContent>;
  errors?: Array<{ path: string; message: string }>;
  completionPercentage: number;
} {
  const schema = PILLAR_SCHEMAS[key];
  const partialSchema = schema.partial();
  const result = partialSchema.safeParse(content);

  // Calculate completion percentage
  const totalFields = Object.keys(schema.shape).length;
  const filledFields = content && typeof content === "object"
    ? Object.entries(content as Record<string, unknown>).filter(([, v]) =>
        v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
      ).length
    : 0;
  // lafusee:allow-adhoc-completion: schema-level percentage validator constant (Zod validator, not runtime completion)
  const completionPercentage = Math.round((filledFields / totalFields) * 100);

  if (result.success) {
    return { success: true, data: result.data as Partial<PillarContent>, completionPercentage };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
    completionPercentage,
  };
}

// ============================================================================
// STRICT FORWARD-GOING VALIDATORS (v2) — ADR-0088
// ----------------------------------------------------------------------------
// These do NOT replace validatePillarContent/validatePillarPartial (the Pillar
// Gateway keeps using the lenient ones for backward-compat with pre-backfill
// rows). The v2 layer enforces the relational backbone: stable uuid ids on
// risks/initiatives + the numeric/status fields the dashboards compute over.
// Used by (a) the function-calling recommendation apply path (payloads must
// carry ids) and (b) the anti-drift test.
// ============================================================================

/** Risk entry with the structured backbone REQUIRED (id + severity + status). */
export const RiskEntrySchemaV2 = RiskEntrySchema.required({
  id: true,
  severity: true,
  status: true,
});

/** Initiative with identity + selection workflow REQUIRED (id + status). */
export const PotentialActionSchemaV2 = PotentialActionSchema.required({
  id: true,
  status: true,
});

/** Collect every PotentialAction instance scattered across a Pillar I blob. */
export function collectInitiatives(iContent: unknown): unknown[] {
  if (!iContent || typeof iContent !== "object") return [];
  const c = iContent as Record<string, unknown>;
  const out: unknown[] = [];
  const pushArr = (v: unknown) => Array.isArray(v) && out.push(...v);

  pushArr(Object.values((c.catalogueParCanal as Record<string, unknown>) ?? {}).flat());
  if (c.actionsByDevotionLevel && typeof c.actionsByDevotionLevel === "object") {
    for (const v of Object.values(c.actionsByDevotionLevel as Record<string, unknown>)) pushArr(v);
  }
  if (Array.isArray(c.actionsByOvertonPhase)) {
    for (const phase of c.actionsByOvertonPhase as Array<Record<string, unknown>>) pushArr(phase?.actions);
  }
  return out;
}

// ── Unified initiative normalization (the cross-pillar action database) ──────
// Every action in I — éparpillée dans catalogueParCanal (par canal),
// actionsByDevotionLevel (par palier) et actionsByOvertonPhase (par phase), avec
// des champs optionnels hétérogènes et un budgetEstime qualitatif au lieu d'un
// budget numérique — est normalisée en UN seul format étendu uniforme, pour que
// S (et tout croisement de bases) consomme une base d'actions cohérente.
// PURE (lib), client + server.

/** Ancre budget qualitative → médiane numérique FCFA (échelle par action). */
export const BUDGET_ESTIME_FCFA: Record<"LOW" | "MEDIUM" | "HIGH", number> = {
  LOW: 500_000,
  MEDIUM: 2_000_000,
  HIGH: 8_000_000,
};

export interface NormalizedInitiative {
  id: string;
  action: string;
  format: string;
  objectif: string;
  channel: string;
  status: (typeof INITIATIVE_STATUSES)[number];
  timeframe: (typeof INITIATIVE_TIMEFRAMES)[number];
  budget: number;
  budgetEstime?: "LOW" | "MEDIUM" | "HIGH";
  pilierImpact?: (typeof ADVE_KEYS)[number];
  devotionImpact?: string;
  overtonShift?: string;
  overtonPhase?: string;
  mitigatesRiskIds: string[];
  targetsPersonaIds: string[];
  _normalized: true;
}

function stableInitiativeId(seed: string): string {
  // djb2 déterministe — id stable sans dépendance crypto.
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return `init-${(h >>> 0).toString(36)}`;
}

const isNonEmptyStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;

/** Normalise une action brute vers le format étendu unifié. */
export function normalizeInitiative(
  raw: unknown,
  ctx: { channel?: string; devotionLevel?: string; overtonPhase?: string } = {},
): NormalizedInitiative {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const action = isNonEmptyStr(o.action) ? o.action : "";
  const budgetEstime =
    o.budgetEstime === "LOW" || o.budgetEstime === "MEDIUM" || o.budgetEstime === "HIGH"
      ? o.budgetEstime
      : undefined;
  const budget =
    typeof o.budget === "number" && Number.isFinite(o.budget)
      ? o.budget
      : budgetEstime
        ? BUDGET_ESTIME_FCFA[budgetEstime]
        : 0;
  const status = (INITIATIVE_STATUSES as readonly string[]).includes(o.status as string)
    ? (o.status as NormalizedInitiative["status"])
    : "DRAFT";
  const timeframe = (INITIATIVE_TIMEFRAMES as readonly string[]).includes(o.timeframe as string)
    ? (o.timeframe as NormalizedInitiative["timeframe"])
    : "LONG_TERM";
  const channel = isNonEmptyStr(o.channel)
    ? o.channel
    : ctx.channel ?? (ctx.devotionLevel ? "DEVOTION" : ctx.overtonPhase ? "OVERTON" : "GENERAL");
  const id = isNonEmptyStr(o.id) ? o.id : stableInitiativeId(action || JSON.stringify(o).slice(0, 80));
  const devotionImpact = isNonEmptyStr(o.devotionImpact) ? o.devotionImpact : ctx.devotionLevel;
  return {
    id,
    action,
    format: isNonEmptyStr(o.format) ? o.format : "",
    objectif: isNonEmptyStr(o.objectif) ? o.objectif : "",
    channel,
    status,
    timeframe,
    budget,
    ...(budgetEstime ? { budgetEstime } : {}),
    ...(isNonEmptyStr(o.pilierImpact) ? { pilierImpact: o.pilierImpact as NormalizedInitiative["pilierImpact"] } : {}),
    ...(devotionImpact ? { devotionImpact } : {}),
    ...(isNonEmptyStr(o.overtonShift) ? { overtonShift: o.overtonShift } : {}),
    ...(ctx.overtonPhase ? { overtonPhase: ctx.overtonPhase } : {}),
    mitigatesRiskIds: Array.isArray(o.mitigatesRiskIds) ? (o.mitigatesRiskIds as string[]) : [],
    targetsPersonaIds: Array.isArray(o.targetsPersonaIds) ? (o.targetsPersonaIds as string[]) : [],
    _normalized: true,
  };
}

/** Aplati + normalise toutes les initiatives de I (dédupliquées par id). */
export function collectNormalizedInitiatives(iContent: unknown): NormalizedInitiative[] {
  if (!iContent || typeof iContent !== "object") return [];
  const c = iContent as Record<string, unknown>;
  const byId = new Map<string, NormalizedInitiative>();
  const add = (raw: unknown, ctx: Parameters<typeof normalizeInitiative>[1]) => {
    const n = normalizeInitiative(raw, ctx);
    if (!byId.has(n.id)) byId.set(n.id, n); // catalogue d'abord → le canal réel gagne
  };
  const cat = (c.catalogueParCanal as Record<string, unknown>) ?? {};
  for (const [channel, arr] of Object.entries(cat)) {
    if (Array.isArray(arr)) for (const raw of arr) add(raw, { channel });
  }
  const dev = (c.actionsByDevotionLevel as Record<string, unknown>) ?? {};
  for (const [level, arr] of Object.entries(dev)) {
    if (Array.isArray(arr)) for (const raw of arr) add(raw, { devotionLevel: level });
  }
  if (Array.isArray(c.actionsByOvertonPhase)) {
    for (const ph of c.actionsByOvertonPhase as Array<Record<string, unknown>>) {
      if (Array.isArray(ph?.actions)) for (const raw of ph.actions) add(raw, { overtonPhase: isNonEmptyStr(ph.phase) ? ph.phase : "" });
    }
  }
  return [...byId.values()];
}

/**
 * Strict v2 validation: in addition to the structural schema, asserts that the
 * relational entities of R and I carry their stable ids + required backbone
 * fields. Returns the list of offending paths (empty = v2-compliant).
 */
export function validatePillarContentV2(
  key: PillarKey,
  content: unknown,
): { success: boolean; errors: Array<{ path: string; message: string }> } {
  const base = validatePillarContent(key, content);
  const errors: Array<{ path: string; message: string }> = base.success
    ? []
    : (base.errors ?? []);

  if (key === "R" && content && typeof content === "object") {
    const matrix = (content as Record<string, unknown>).probabilityImpactMatrix;
    if (Array.isArray(matrix)) {
      matrix.forEach((risk, i) => {
        const r = RiskEntrySchemaV2.safeParse(risk);
        if (!r.success) {
          for (const issue of r.error.issues) {
            errors.push({ path: `probabilityImpactMatrix.${i}.${issue.path.join(".")}`, message: issue.message });
          }
        }
      });
    }
  }

  if (key === "I") {
    collectInitiatives(content).forEach((init, i) => {
      const r = PotentialActionSchemaV2.safeParse(init);
      if (!r.success) {
        for (const issue of r.error.issues) {
          errors.push({ path: `initiative[${i}].${issue.path.join(".")}`, message: issue.message });
        }
      }
    });
  }

  return { success: errors.length === 0, errors };
}
