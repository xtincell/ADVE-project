/**
 * ZOD SCHEMAS — Ontologie N0-N6 pour les 8 piliers ADVE-RTIS
 * Encode les contraintes atomiques, composites, collections et cross-refs
 * du Cahier des Charges (Annexe H)
 */

import { z } from "zod";
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

  // Valeurs Schwartz (3-7 valeurs)
  valeurs: z.array(BrandValueSchema).min(3).max(7),

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
});

// ============================================================================
// PILIER D — DISTINCTION
// ============================================================================

/** N2.04 — Persona */
const PersonaSchema = z.object({
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
      spacing: z.record(z.string()).optional(),
      borderRadius: z.record(z.string()).optional(),
      shadows: z.record(z.string()).optional(),
      breakpoints: z.record(z.string()).optional(),
      customTokens: z.record(z.string()).optional(),
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
      layers: z.record(z.array(textShort)).optional(),
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
  proofPoints: z.array(z.object({
    type: textShort,
    claim: textShort,
    evidence: textShort.optional(),
    source: textShort.optional(),
  })).optional(),
  symboles: z.array(z.object({
    symbol: textShort,
    meanings: z.array(textShort).optional(),
    usageContexts: z.array(textShort).optional(),
  })).optional(),
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
});

// ============================================================================
// PILIER R — RISK
// ============================================================================

const SWOTQuadrantSchema = z.object({
  strengths: z.array(textShort).min(3),
  weaknesses: z.array(textShort).min(3),
  opportunities: z.array(textShort).min(3),
  threats: z.array(textShort).min(3),
});

const RiskEntrySchema = z.object({
  risk: textShort,
  probability: z.enum(RISK_LEVELS),
  impact: z.enum(RISK_LEVELS),
  mitigation: z.string().min(1),
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
  microSWOTs: z.record(SWOTQuadrantSchema).optional(),

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
    riskRef: z.string().min(1).optional(),                   // Ref R.probabilityImpactMatrix[i].risk
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

/** N2 — Action Potentielle (catalogue, pas planifiee) */
const PotentialActionSchema = z.object({
  action: z.string().min(1),
  format: textShort,
  objectif: textShort,
  pilierImpact: z.enum(["A", "D", "V", "E"]).optional(),
  devotionImpact: z.enum(DEVOTION_LEVELS).optional(),        // Quel niveau de la Ladder cette action active
  overtonShift: z.string().min(1).optional(),                // Comment cette action déplace la perception
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
    riskRef: z.string().min(1).optional(),                   // Ref R.probabilityImpactMatrix[i].risk
    action: z.string().min(1),
    canal: z.string().min(1).optional(),
    expectedImpact: z.string().min(1).optional(),
  })).optional(),
  hypothesisTestActions: z.array(z.object({
    hypothesisRef: z.string().min(1).optional(),             // Ref T.hypothesisValidation[i].hypothesis
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
  catalogueParCanal: z.record(z.array(PotentialActionSchema)).optional(),

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
  // ── Fenetre d'Overton — LE CŒUR DE S (required, pas optional) ────────
  fenetreOverton: z.object({
    perceptionActuelle: textMedium,                          // Déduit de T.overtonPosition
    perceptionCible: textMedium,                             // Déduit de A.prophecy + D.positionnement
    ecart: textMedium,                                       // Déduit de T.perceptionGap
    strategieDeplacement: z.array(z.object({
      etape: textShort,
      action: textShort,
      canal: textShort.optional(),
      horizon: textShort.optional(),
      devotionTarget: z.enum(DEVOTION_LEVELS).optional(),    // Quel niveau Devotion cette étape cible
      riskRef: z.string().optional(),                        // Ref R.overtonBlockers[i] mitigé
      hypothesisRef: z.string().optional(),                  // Ref T.hypothesisValidation[i] validé
    })).min(3),
  }),

  // ── Vision & Axes ─────────────────────────────────────────────────────
  visionStrategique: textMedium.optional(),
  syntheseExecutive: textMedium.optional(),

  axesStrategiques: z.array(z.object({
    axe: textShort,
    pillarsLinked: z.array(z.enum(["A", "D", "V", "E", "R", "T", "I", "S"])).min(2),
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
    sourceRef: z.string().optional(),                        // Ref I.catalogueParCanal path d'où vient l'action
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
    pillar: z.enum(["A", "D", "V", "E", "R", "T", "I", "S"]),
    target: textShort,
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]),
  })).min(5).optional(),

  // ── Score de coherence ────────────────────────────────────────────────
  coherenceScore: z.number().min(0).max(100).optional(),

  // ── Transitions I→S (traçabilité + objectifs Devotion) ────────────────
  selectedFromI: z.array(z.object({
    sourceRef: z.string().min(1),                            // Path dans I (ex: "catalogueParCanal.DIGITAL[3]")
    action: z.string().min(1),
    phase: z.string().min(1).optional(),                     // Phase roadmap où l'action est planifiée
    priority: rank.optional(),
  })).optional(),
  rejectedFromI: z.array(z.object({
    sourceRef: z.string().min(1),
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

  // ── Legacy compat ─────────────────────────────────────────────────────
  recommandationsPrioritaires: z.array(z.object({
    recommendation: textShort,
    source: z.enum(["A", "D", "V", "E", "R", "T", "I", "S"]).optional(),
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
