/**
 * Strategy Presentation — Types
 *
 * Source unique de vérité pour les 35 sections de l'Oracle (livrable consulting
 * dynamique modulaire — produit phare La Fusée).
 *
 * **Phase 13 — Oracle 35-section canonical framework lock (ADR-0014)**.
 *
 * Composition cible (post Phase 14/15 cleanup — ADR-0045) :
 * - 23 sections CORE actives (Phase 1 ADVE + Phase 2 R+T + Phase 3 I+S + Mesure
 *   + Operationnel + Imhotep Crew Program + Anubis Plan Comms)
 * - 7 sections baseline Big4 (McKinsey 7S, BCG Portfolio, Bain NPS, McKinsey 3-Horizons,
 *   BCG Strategy Palette, Deloitte Greenhouse, Deloitte Budget)
 * - 5 sections distinctives (Cult Index, Manipulation Matrix, Devotion Ladder,
 *   Overton Distinctive, Tarsis Weak Signals)
 *
 * Sections Imhotep + Anubis : pré-réservées Phase 13 (ADR-0017/0018), promues CORE
 * Phase 14/15 (ADR-0019 + ADR-0020). Le tier "DORMANT" est supprimé en
 * Phase 17 cleanup (ADR-0045) — aucune section ne devrait jamais y revenir.
 *
 * Chaque section est un **SuperAsset** (`BrandAsset.kind`) produit par une **séquence
 * Artemis** qui chaîne des Glory tools, certains avec `forgeOutput` matérialisé via
 * Ptah à la demande (boutons "Forge now", flag `oracleEnrichmentMode` court-circuite
 * l'auto-trigger pendant l'enrichissement Oracle — cf. ADR-0014).
 */

import type { AdvertisVector, BrandClassification } from "@/lib/types/advertis-vector";
import type { BrandAssetKind } from "@/domain/brand-asset-kinds";

// ─── Personas & Navigation ───────────────────────────────────────────────────

export type PresentationPersona = "consultant" | "client" | "creative";

/**
 * Tier d'une section Oracle (Phase 13 framework canonical, cleanup Phase 17 ADR-0045).
 *
 * - **CORE** : 23 sections actives (Phase 1-3 ADVERTIS + Mesure + Operationnel + Imhotep Crew + Anubis Comms)
 * - **BIG4_BASELINE** : 7 sections baseline consulting one-shot (McKinsey/BCG/Bain/Deloitte)
 * - **DISTINCTIVE** : 5 sections distinctives La Fusée (Cult/Manipulation/Devotion/Overton/Tarsis)
 *
 * Le tier `"DORMANT"` historique (Phase 13 ADR-0017/0018, sections Imhotep/Anubis
 * pré-réservées) est **supprimé** post-Phase 14/15 (ADR-0019 + ADR-0020). Toute
 * référence résiduelle = drift à corriger.
 */
export type SectionTier = "CORE" | "BIG4_BASELINE" | "DISTINCTIVE";

export interface SectionMeta {
  id: string;
  number: string;
  title: string;
  personas: PresentationPersona[];
  /**
   * Tier framework canonical Phase 13. Default "CORE" pour 21 sections actives.
   */
  tier?: SectionTier;
  /**
   * BrandAsset.kind cible pour la promotion BrandVault post-enrichissement (B4 writeback).
   * Source : `src/domain/brand-asset-kinds.ts`.
   */
  brandAssetKind?: BrandAssetKind;
  /**
   * GlorySequenceKey de la séquence Artemis qui produit cette section.
   * Typé en `string` car certaines séquences Phase 13 sont ajoutées dans B3.
   * Validé runtime par `audit-oracle-registry-completeness.ts`.
   */
  sequenceKey?: string;
  /**
   * True pour sections distinctives La Fusée (Cult Index, Manipulation Matrix, etc.).
   * Affichage UI mis en avant, tokens domain `--classification-*` (B5).
   */
  isDistinctive?: boolean;
  /**
   * True pour sections baseline Big4 (McKinsey/BCG/Bain/Deloitte) — affichage UI
   * neutre data-dense (B5).
   */
  isBaseline?: boolean;
}

export const SECTION_REGISTRY: SectionMeta[] = [
  // ─── CORE (21 sections actives — Phase 1-3 ADVERTIS + Mesure + Operationnel) ──
  // ── Phase 1: ADVE — Identite ──────────────────────────────────────────────
  { id: "executive-summary", number: "01", title: "Executive Summary", personas: ["consultant", "client", "creative"], tier: "CORE", brandAssetKind: "GENERIC" },
  { id: "contexte-defi", number: "02", title: "Contexte & Defi", personas: ["consultant", "client"], tier: "CORE", brandAssetKind: "MANIFESTO" },
  { id: "plateforme-strategique", number: "03", title: "Plateforme Strategique", personas: ["consultant", "client", "creative"], tier: "CORE", brandAssetKind: "POSITIONING" },
  { id: "proposition-valeur", number: "04", title: "Proposition de Valeur", personas: ["consultant", "client"], tier: "CORE", brandAssetKind: "VALUE_PROPOSITION" },
  { id: "territoire-creatif", number: "05", title: "Territoire Creatif", personas: ["consultant", "client", "creative"], tier: "CORE", brandAssetKind: "CHROMATIC_STRATEGY", sequenceKey: "BRAND" },
  { id: "experience-engagement", number: "06", title: "Experience & Engagement", personas: ["consultant", "client"], tier: "CORE", brandAssetKind: "PERSONA" },
  // ── Phase 2: R+T — Diagnostic ─────────────────────────────────────────────
  { id: "swot-interne", number: "07", title: "SWOT Interne (Risk)", personas: ["consultant"], tier: "CORE", brandAssetKind: "GENERIC" },
  { id: "swot-externe", number: "08", title: "SWOT Externe (Track)", personas: ["consultant", "client"], tier: "CORE", brandAssetKind: "GENERIC" },
  { id: "signaux-opportunites", number: "09", title: "Signaux & Opportunites", personas: ["consultant", "client"], tier: "CORE", brandAssetKind: "TREND_RADAR" },
  // ── Phase 3: I+S — Recommandations ────────────────────────────────────────
  { id: "catalogue-actions", number: "10", title: "Catalogue d'Actions (Implementation)", personas: ["consultant", "client", "creative"], tier: "CORE", brandAssetKind: "BRAINSTORM" },
  { id: "plan-activation", number: "11", title: "Plan d'Activation", personas: ["consultant", "client"], tier: "CORE", brandAssetKind: "GENERIC" },
  { id: "fenetre-overton", number: "12", title: "Fenetre d'Overton (Strategy)", personas: ["consultant", "client"], tier: "CORE", brandAssetKind: "GENERIC" },
  { id: "medias-distribution", number: "13", title: "Medias & Distribution", personas: ["consultant", "creative"], tier: "CORE", brandAssetKind: "GENERIC" },
  { id: "production-livrables", number: "14", title: "Production & Livrables", personas: ["consultant", "creative"], tier: "CORE", brandAssetKind: "GENERIC" },
  // ── Mesure & Superfan ─────────────────────────────────────────────────────
  { id: "profil-superfan", number: "15", title: "Profil Superfan", personas: ["consultant", "client"], tier: "CORE", brandAssetKind: "SUPERFAN_JOURNEY" },
  { id: "kpis-mesure", number: "16", title: "KPIs & Mesure de Performance", personas: ["consultant", "client"], tier: "CORE", brandAssetKind: "GENERIC" },
  { id: "croissance-evolution", number: "17", title: "Croissance & Evolution", personas: ["consultant", "client"], tier: "CORE", brandAssetKind: "GENERIC" },
  // ── Operationnel ──────────────────────────────────────────────────────────
  { id: "budget", number: "18", title: "Budget", personas: ["consultant", "client"], tier: "CORE", brandAssetKind: "GENERIC" },
  { id: "timeline-gouvernance", number: "19", title: "Timeline & Gouvernance", personas: ["consultant", "client"], tier: "CORE", brandAssetKind: "GENERIC" },
  { id: "equipe", number: "20", title: "Equipe", personas: ["consultant"], tier: "CORE", brandAssetKind: "GENERIC" },
  { id: "conditions-etapes", number: "21", title: "Conditions & Prochaines Etapes", personas: ["consultant", "client"], tier: "CORE", brandAssetKind: "GENERIC" },

  // ─── BIG4_BASELINE (7 sections — frameworks consulting one-shot) ──────────
  { id: "mckinsey-7s", number: "22", title: "McKinsey 7S Framework", personas: ["consultant", "client"], tier: "BIG4_BASELINE", isBaseline: true, brandAssetKind: "MCK_7S", sequenceKey: "MCK-7S" },
  { id: "bcg-portfolio", number: "23", title: "BCG Growth-Share Matrix", personas: ["consultant", "client"], tier: "BIG4_BASELINE", isBaseline: true, brandAssetKind: "BCG_PORTFOLIO", sequenceKey: "BCG-PORTFOLIO" },
  { id: "bain-nps", number: "24", title: "Bain Net Promoter System", personas: ["consultant", "client"], tier: "BIG4_BASELINE", isBaseline: true, brandAssetKind: "BAIN_NPS", sequenceKey: "BAIN-NPS" },
  { id: "deloitte-greenhouse", number: "25", title: "Deloitte Greenhouse (Talent Program)", personas: ["consultant"], tier: "BIG4_BASELINE", isBaseline: true, brandAssetKind: "DELOITTE_GREENHOUSE", sequenceKey: "DELOITTE-GREENHOUSE" },
  { id: "mckinsey-3-horizons", number: "26", title: "McKinsey Three Horizons of Growth", personas: ["consultant", "client"], tier: "BIG4_BASELINE", isBaseline: true, brandAssetKind: "MCK_3H", sequenceKey: "MCK-3H" },
  { id: "bcg-strategy-palette", number: "27", title: "BCG Strategy Palette", personas: ["consultant", "client"], tier: "BIG4_BASELINE", isBaseline: true, brandAssetKind: "BCG_STRATEGY_PALETTE", sequenceKey: "BCG-PALETTE" },
  { id: "deloitte-budget", number: "28", title: "Deloitte Budget Framework", personas: ["consultant", "client"], tier: "BIG4_BASELINE", isBaseline: true, brandAssetKind: "DELOITTE_BUDGET", sequenceKey: "DELOITTE-BUDGET" },

  // ─── DISTINCTIVE (5 sections — valeur ajoutée La Fusée vs Big4) ───────────
  { id: "cult-index", number: "29", title: "Cult Index — Score de masse culturelle", personas: ["consultant", "client"], tier: "DISTINCTIVE", isDistinctive: true, brandAssetKind: "CULT_INDEX", sequenceKey: "CULT-INDEX" },
  { id: "manipulation-matrix", number: "30", title: "Manipulation Matrix — 4 modes d'engagement", personas: ["consultant", "client", "creative"], tier: "DISTINCTIVE", isDistinctive: true, brandAssetKind: "MANIPULATION_MATRIX", sequenceKey: "MANIP-MATRIX" },
  { id: "devotion-ladder", number: "31", title: "Devotion Ladder — Hiérarchie superfans", personas: ["consultant", "client"], tier: "DISTINCTIVE", isDistinctive: true, brandAssetKind: "SUPERFAN_JOURNEY", sequenceKey: "DEVOTION-LADDER" },
  { id: "overton-distinctive", number: "32", title: "Overton Distinctive — Position fenêtre culturelle", personas: ["consultant", "client"], tier: "DISTINCTIVE", isDistinctive: true, brandAssetKind: "OVERTON_WINDOW", sequenceKey: "OVERTON-DISTINCTIVE" },
  { id: "tarsis-weak-signals", number: "33", title: "Tarsis — Signaux faibles sectoriels", personas: ["consultant"], tier: "DISTINCTIVE", isDistinctive: true, brandAssetKind: "TREND_RADAR", sequenceKey: "TARSIS-WEAK" },

  // ─── CORE — Imhotep Crew Program + Anubis Plan Comms (Phase 14/15 actifs, ADR-0019 + ADR-0020) ──
  { id: "imhotep-crew-program", number: "34", title: "Crew Program (Imhotep)", personas: ["consultant"], tier: "CORE", brandAssetKind: "GENERIC", sequenceKey: "IMHOTEP-CREW" },
  { id: "anubis-plan-comms", number: "35", title: "Plan Comms (Anubis)", personas: ["consultant"], tier: "CORE", brandAssetKind: "GENERIC", sequenceKey: "ANUBIS-COMMS" },
];

/**
 * Set des `BrandAssetKind` valides pour les sections Oracle 35-section.
 * Utilisé par writeback BrandAsset promotion (B4) + audit completeness.
 */
export const ORACLE_SECTION_BRAND_ASSET_KINDS: ReadonlySet<BrandAssetKind> = new Set(
  SECTION_REGISTRY.map((s) => s.brandAssetKind).filter(
    (k): k is BrandAssetKind => k !== undefined,
  ),
);

/**
 * Helper — récupère une section par id (typage strict source unique).
 */
export function getSectionMeta(id: string): SectionMeta | undefined {
  return SECTION_REGISTRY.find((s) => s.id === id);
}

/**
 * Helper — filtre les sections par tier (CORE / BIG4_BASELINE / DISTINCTIVE).
 * Default tier = "CORE" si non déclaré (compat backward 21 sections legacy).
 */
export function getSectionsByTier(tier: SectionTier): SectionMeta[] {
  return SECTION_REGISTRY.filter((s) => (s.tier ?? "CORE") === tier);
}

// ─── Section Data Types ──────────────────────────────────────────────────────

export interface ExecutiveSummarySection {
  vector: AdvertisVector;
  classification: BrandClassification;
  cultIndex: { score: number; tier: string } | null;
  devotionScore: number | null;
  superfanCount: number;
  brandName: string;
  topStrengths: { pillar: string; score: number; name: string }[];
  topWeaknesses: { pillar: string; score: number; name: string }[];
  highlights: string[];
}

export interface ContexteDefiSection {
  businessContext: {
    sector: string | null;
    businessModel: string | null;
    positioningArchetype: string | null;
    economicModels: string[];
    salesChannels: string[];
  };
  enemy: {
    name: string;
    manifesto: string;
    narrative: string;
  } | null;
  prophecy: {
    worldTransformed: string;
    urgency: string;
    horizon: string;
  } | null;
  client: {
    sector: string | null;
    country: string | null;
    contactName: string | null;
  } | null;
  personas: Array<{
    nom: string;
    trancheAge: string;
    csp: string;
    insightCle: string;
    freinsAchat: string[];
    motivations: string[];
  }>;
  /**
   * ADR-0037 PR-K3 — fields canon manuel ADVE narratifs.
   * Surface dans Oracle Section 02 Contexte & Défi quand renseignés
   * (par opérateur, auto-fill, ou LLM-infer at activateBrand).
   */
  canonNarrativeFields?: {
    missionStatement: string | null;       // A — Mission Statement (verbe d'action)
    originMythElevator: string | null;     // A — Origin Myth version 50 mots
    positionnementEmotionnel: string | null; // D — ressenti unique 1ère personne
    sacrificeRequis: {                       // V — sacrifice + justification
      prix: string | null;
      temps: string | null;
      effort: string | null;
      justification: string | null;
    } | null;
  };
}

export interface AuditDiagnosticSection {
  competitors: Array<{
    nom: string;
    positionnement: string;
    forces: string[];
    faiblesses: string[];
    partDeMarche: string | null;
  }>;
  semioticAnalysis: {
    dominantSigns: string[];
    archetypeVisual: string;
    recommendations: string[];
  } | null;
  gloryOutput: Record<string, unknown> | null;
  diagnosticSummary: string | null;
}

export interface PlateformeStrategiqueSection {
  archetype: string | null;
  citationFondatrice: string | null;
  doctrine: string | null;
  ikigai: {
    love: string;
    competence: string;
    worldNeed: string;
    remuneration: string;
  } | null;
  valeurs: Array<{ valeur: string; rang: number; justification: string }>;
  positionnement: string | null;
  promesseMaitre: string | null;
  sousPromesses: string[];
  tonDeVoix: {
    personnalite: string[];
    onDit: string[];
    onNeDitPas: string[];
  } | null;
  assetsLinguistiques: {
    slogan: string | null;
    tagline: string | null;
    motto: string | null;
    mantras: string[];
  } | null;
  messagingFramework: Array<{
    audience: string;
    messagePrincipal: string;
    messagesSupport: string[];
    callToAction: string;
  }>;
}

export interface TerritoireCreatifSection {
  conceptGenerator: Record<string, unknown> | null;
  moodboard: Record<string, unknown> | null;
  chromaticStrategy: Record<string, unknown> | null;
  directionArtistique: Record<string, unknown> | null;
  kvPrompts: Record<string, unknown> | null;
  typographySystem: Record<string, unknown> | null;
  logoAdvice: Record<string, unknown> | null;
}

export interface PlanActivationSection {
  campaigns: Array<{
    name: string;
    status: string;
    budget: number | null;
    startDate: string | null;
    endDate: string | null;
    aarrTargets: Record<string, unknown> | null;
    actions: Array<{
      name: string;
      category: string;
      actionType: string;
      driverName: string | null;
      budget: number | null;
      aarrStage: string | null;
    }>;
  }>;
  aarrr: Record<string, unknown> | null;
  touchpoints: Array<{
    nom: string;
    canal: string;
    type: string;
    stadeAarrr: string;
    niveauDevotion: string;
  }>;
  rituels: Array<{
    nom: string;
    frequence: string;
    description: string;
  }>;
  drivers: Array<{
    name: string;
    channel: string;
    channelType: string;
    status: string;
  }>;
}

export interface ProductionLivrablesSection {
  missions: Array<{
    title: string;
    status: string;
    mode: string;
    priority: string | null;
    budget: number | null;
    driverName: string | null;
    deliverables: Array<{
      label: string;
      format: string | null;
      status: string;
    }>;
  }>;
  gloryOutputsByLayer: Record<string, Array<{ toolSlug: string; toolName: string; createdAt: string }>>;
}

export interface MediasDistributionSection {
  drivers: Array<{
    name: string;
    channel: string;
    channelType: string;
    status: string;
  }>;
  digitalPlannerOutput: Record<string, unknown> | null;
  mediaActions: Array<{
    name: string;
    category: string;
    budget: number | null;
    driverName: string | null;
  }>;
}

export interface KpisMesureSection {
  kpis: Array<{
    name: string;
    metricType: string;
    target: string;
    frequency: string;
  }>;
  devotion: {
    spectateur: number;
    interesse: number;
    participant: number;
    engage: number;
    ambassadeur: number;
    evangeliste: number;
    devotionScore: number;
  } | null;
  cultIndex: {
    compositeScore: number;
    tier: string;
    engagementVelocity: number | null;
    communityHealth: number | null;
    superfanVelocity: number | null;
  } | null;
  superfans: Array<{
    platform: string;
    handle: string;
    engagementDepth: number;
    segment: string | null;
  }>;
  communitySnapshots: Array<{
    platform: string;
    size: number;
    engagement: number | null;
    growth: number | null;
  }>;
  aarrr: Record<string, unknown> | null;
}

export interface BudgetSection {
  unitEconomics: {
    cac: number | null;
    ltv: number | null;
    ltvCacRatio: number | null;
    margeNette: number | null;
    roiEstime: number | null;
    budgetCom: number | null;
    caVise: number | null;
  } | null;
  campaignBudgets: Array<{
    name: string;
    budget: number | null;
    status: string;
  }>;
  totalBudget: number;
  /**
   * Phase 18 (ADR-0043) — Budget annuel/stratégique global, lu depuis
   * `pillarS.globalBudget`. Permet à une marque BOOT (sans Campaign
   * encore lancée) de compiler une section budget complete, à condition
   * que l'opérateur ait chiffré son enveloppe via `OPERATOR_AMEND_PILLAR`.
   */
  globalBudget: number | null;
  /**
   * Phase 18 (ADR-0043) — Ventilation budgétaire par poste, lu depuis
   * `pillarS.budgetBreakdown`. Optionnel, présent si renseigné.
   */
  budgetBreakdown: {
    production?: number;
    media?: number;
    talent?: number;
    logistics?: number;
    technology?: number;
    contingency?: number;
    agencyFees?: number;
  } | null;
}

export interface TimelineGouvernanceSection {
  campaigns: Array<{
    name: string;
    startDate: string | null;
    endDate: string | null;
    status: string;
    milestones: Array<{
      title: string;
      dueDate: string | null;
      status: string;
    }>;
  }>;
  missions: Array<{
    title: string;
    status: string;
    createdAt: string;
    deadline: string | null;
  }>;
  teamMembers: Array<{
    name: string;
    role: string;
    email: string | null;
  }>;
}

export interface EquipeSection {
  operator: {
    name: string;
    slug: string;
  } | null;
  owner: {
    name: string | null;
    email: string | null;
  };
  teamMembers: Array<{
    name: string;
    role: string;
    email: string | null;
    image: string | null;
  }>;
  // ── Berkus: Equipe Dirigeante (from Pillar A) ─────────────────────────
  equipeDirigeante: Array<{
    nom: string;
    role: string;
    bio: string;
    experiencePasse: string[];
    competencesCles: string[];
    credentials: string[];
  }>;
  equipeComplementarite: {
    scoreGlobal: number;
    couvertureTechnique: boolean;
    couvertureCommerciale: boolean;
    couvertureOperationnelle: boolean;
    capaciteExecution: string;
    lacunes: string[];
    verdict: string;
  } | null;
  // ── Berkus aggregate scores ───────────────────────────────────────────
  berkus: {
    teamScore: number | null;
    tractionScore: number | null;
    productScore: number | null;
    ipScore: number | null;
    totalScore: number | null;      // Sum of 4 dimensions (0-40 → mapped 0-2M$)
  } | null;
}

export interface ConditionsEtapesSection {
  client: {
    contactName: string | null;
    contactEmail: string | null;
    sector: string | null;
  } | null;
  contracts: Array<{
    title: string;
    contractType: string;
    status: string;
    value: number | null;
    startDate: string | null;
    endDate: string | null;
    signedAt: string | null;
  }>;
  strategyStatus: string;
}

// ─── NEW SECTIONS (v3 Oracle enrichment) ────────────────────────────────────

export interface PropositionValeurSection {
  pricing: { strategy: string; ladderDescription: string; competitorComparison: string | null } | null;
  proofPoints: string[];
  guarantees: string[];
  innovationPipeline: string[];
  unitEconomics: {
    cac: number | null;
    ltv: number | null;
    ltvCacRatio: number | null;
  } | null;
}

export interface ExperienceEngagementSection {
  touchpoints: Array<{ nom: string; canal: string; qualite: string; stadeAarrr: string }>;
  rituels: Array<{ nom: string; frequence: string; description: string; adoptionScore: number | null }>;
  devotionPathway: {
    currentDistribution: Record<string, number>;
    conversionTriggers: Array<{ from: string; to: string; trigger: string }>;
    barriers: string[];
  } | null;
  communityStrategy: string | null;
}

export interface SwotInterneSection {
  forces: string[];
  faiblesses: string[];
  menaces: string[];
  opportunites: string[];
  mitigations: Array<{ risque: string; action: string; priorite: string }>;
  resilienceScore: number | null;
  artemisResults: Array<{ framework: string; score: number | null; prescriptions: string[] }>;
}

export interface SwotExterneSection {
  marche: { tam: string | null; sam: string | null; som: string | null; growth: string | null };
  concurrents: Array<{ nom: string; forces: string[]; faiblesses: string[]; partDeMarche: string | null }>;
  tendances: string[];
  brandMarketFit: { score: number | null; gaps: string[]; opportunities: string[] } | null;
  validationTerrain: string | null;
}

export interface SignauxOpportunitesSection {
  signauxFaibles: Array<{ signal: string; source: string; severity: string; detectedAt: string }>;
  opportunitesPriseDeParole: Array<{ contexte: string; canal: string; timing: string; impact: string }>;
  mestorInsights: Array<{ type: string; title: string; description: string; actionable: boolean }>;
  seshatReferences: Array<{ title: string; type: string; relevance: number; excerpt: string }>;
}

export interface CatalogueActionsSection {
  parCanal: Record<string, Array<{ action: string; format: string; cout: string | null; impact: string }>>;
  parPilier: Record<string, Array<{ action: string; objectif: string }>>;
  totalActions: number;
  drivers: Array<{ name: string; channel: string; status: string }>;
}

export interface FenetreOvertonSection {
  perceptionActuelle: string | null;
  perceptionCible: string | null;
  ecart: string | null;
  strategieDeplacment: Array<{ etape: string; action: string; canal: string; horizon: string }>;
  roadmap: Array<{ phase: string; objectif: string; livrables: string[]; budget: number | null; duree: string }>;
  jalons: Array<{ date: string; milestone: string; critereSucces: string }>;
}

export interface ProfilSuperfanSection {
  portrait: { nom: string; trancheAge: string; description: string; motivations: string[]; freins: string[] } | null;
  parcoursDevotionCible: Array<{ palier: string; trigger: string; experience: string }>;
  metriquesSuperfan: { actifs: number; evangelistes: number; ratio: number; velocite: number | null };
  cultIndex: { score: number; tier: string } | null;
}

export interface CroissanceEvolutionSection {
  bouclesCroissance: Array<{ nom: string; type: string; potentielViral: number | null; plan: string }>;
  expansionStrategy: Array<{ marche: string; priorite: number; planEntree: string }> | null;
  evolutionMarque: { trajectoire: string; scenariosPivot: string[]; extensionsMarque: string[] } | null;
  pipelineInnovation: Array<{ initiative: string; impact: string; faisabilite: string; timeToMarket: string }>;
}

// ─── Complete Document ───────────────────────────────────────────────────────

export interface StrategyPresentationDocument {
  meta: {
    strategyId: string;
    brandName: string;
    operatorName: string | null;
    generatedAt: string;
    vector: AdvertisVector;
    classification: BrandClassification;
  };
  sections: {
    // Phase 1: ADVE
    executiveSummary: ExecutiveSummarySection;
    contexteDefi: ContexteDefiSection;
    plateformeStrategique: PlateformeStrategiqueSection;
    propositionValeur: PropositionValeurSection;
    territoireCreatif: TerritoireCreatifSection;
    experienceEngagement: ExperienceEngagementSection;
    // Phase 2: R+T
    swotInterne: SwotInterneSection;
    swotExterne: SwotExterneSection;
    signaux: SignauxOpportunitesSection;
    // Phase 3: I+S
    catalogueActions: CatalogueActionsSection;
    planActivation: PlanActivationSection;
    fenetreOverton: FenetreOvertonSection;
    mediasDistribution: MediasDistributionSection;
    productionLivrables: ProductionLivrablesSection;
    // Mesure & Superfan
    profilSuperfan: ProfilSuperfanSection;
    kpisMesure: KpisMesureSection;
    croissanceEvolution: CroissanceEvolutionSection;
    // Operationnel
    budget: BudgetSection;
    timelineGouvernance: TimelineGouvernanceSection;
    equipe: EquipeSection;
    conditionsEtapes: ConditionsEtapesSection;
    // Legacy compat (kept for existing queries)
    auditDiagnostic: AuditDiagnosticSection;
  };
}

// ─── Completeness Check ──────────────────────────────────────────────────────

export type SectionCompleteness = "complete" | "partial" | "empty";

export type CompletenessReport = Record<string, SectionCompleteness>;
