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
  // Identité
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

  // TAM / SAM / SOM
  tamSamSom: z.object({
    tam: z.object({ value: currency, description: textShort }),
    sam: z.object({ value: currency, description: textShort }),
    som: z.object({ value: currency, description: textShort }),
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
// PILIER I — IMPLEMENTATION
// ============================================================================

const MarketingActionSchema = z.object({
  action: z.string().min(1),
  owner: textShort.optional(),
  kpi: textShort,
  priority: rank,
  isRiskMitigation: z.boolean().optional(),
});

export const PillarISchema = z.object({
  // Synthèses des piliers précédents
  syntheses: z.object({
    brandIdentity: textMedium.optional(),
    positioning: textMedium.optional(),
    valueArchitecture: textMedium.optional(),
    engagementStrategy: textMedium.optional(),
    riskSynthesis: textMedium.optional(),
    marketValidation: textMedium.optional(),
  }).optional(),

  // Roadmap
  sprint90Days: z.array(MarketingActionSchema).min(8),
  year1: z.string().min(1).optional(),
  vision3years: z.string().min(1).optional(),

  // Campagnes
  annualCalendar: z.array(z.object({
    name: textShort,
    quarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    objective: textShort,
    budget: currency.optional(),
    drivers: z.array(z.enum(CHANNELS)).optional(),
  })).min(6),

  // Budget
  globalBudget: currency.optional(),
  budgetBreakdown: z.object({
    production: currency.optional(),
    media: currency.optional(),
    talent: currency.optional(),
    logistics: currency.optional(),
    technology: currency.optional(),
    legal: currency.optional(),
    contingency: currency.optional(),
    agencyFees: currency.optional(),
  }).optional(),

  // Opérationnel
  teamStructure: z.array(z.object({
    name: textShort,
    title: textShort,
    responsibility: textShort,
  })).min(3).optional(),

  // UPGRADERS configuration
  brandPlatform: z.object({
    name: textShort.optional(),
    benefit: textShort.optional(),
    target: textShort.optional(),
    competitiveAdvantage: textShort.optional(),
    emotionalBenefit: textShort.optional(),
    functionalBenefit: textShort.optional(),
    supportedBy: textShort.optional(),
  }).optional(),
  copyStrategy: z.object({
    promise: textShort.optional(),
    rtb: textShort.optional(), // Reason to believe
    tonOfVoice: textShort.optional(),
    keyMessages: z.array(textShort).optional(),
    doNot: z.array(textShort).optional(),
  }).optional(),
  bigIdea: z.object({
    concept: textShort.optional(),
    mechanism: textShort.optional(),
    insight: textShort.optional(),
    adaptations: z.array(textShort).optional(),
  }).optional(),

  // ── Havas-level premium extensions ─────────────────────────────────────
  // Media Plan structuré
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

  // Generation metadata (GLORY tools, quality score, passes)
  generationMeta: z.object({
    gloryToolsUsed: z.array(z.string()).optional(),
    qualityScore: z.number().min(0).max(100).optional(),
    qualityAssessment: z.record(z.unknown()).optional(),
    generatedAt: z.string().optional(),
    passes: z.number().optional(),
  }).optional(),
});

// ============================================================================
// PILIER S — STRATÉGIE
// ============================================================================

export const PillarSSchema = z.object({
  syntheseExecutive: z.string().min(1),
  visionStrategique: z.string().min(1).optional(),

  coherencePiliers: z.array(z.object({
    pilier: textShort,
    contribution: textShort,
    articulation: textShort,
  })).min(7).optional(),

  facteursClesSucces: z.array(textShort).min(5),

  recommandationsPrioritaires: z.array(z.object({
    recommendation: textShort,
    source: z.enum(["A", "D", "V", "E", "R", "T", "I", "S"]).optional(),
    priority: rank,
  })).min(8),

  axesStrategiques: z.array(z.object({
    axe: textShort,
    pillarsLinked: z.array(z.enum(["A", "D", "V", "E", "R", "T", "I", "S"])).min(2),
    kpis: z.array(textShort).min(1),
  })).min(3),

  sprint90Recap: z.array(textShort).min(8).optional(),

  kpiDashboard: z.array(z.object({
    name: textShort,
    pillar: z.enum(["A", "D", "V", "E", "R", "T", "I", "S"]),
    target: textShort,
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]),
  })).min(7).optional(),

  coherenceScore: z.number().min(0).max(100).optional(),
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
