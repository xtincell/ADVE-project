/**
 * Strategy Presentation — Types
 * Typed interfaces for the 13-section shareable strategic proposal document.
 * All data is assembled from existing pillars, Glory outputs, and variables.
 */

import type { AdvertisVector, BrandClassification } from "@/lib/types/advertis-vector";

// ─── Personas & Navigation ───────────────────────────────────────────────────

export type PresentationPersona = "consultant" | "client" | "creative";

export interface SectionMeta {
  id: string;
  number: string;
  title: string;
  personas: PresentationPersona[];
}

export const SECTION_REGISTRY: SectionMeta[] = [
  // ── Phase 1: ADVE — Identite ──────────────────────────────────────────────
  { id: "executive-summary", number: "01", title: "Executive Summary", personas: ["consultant", "client", "creative"] },
  { id: "contexte-defi", number: "02", title: "Contexte & Defi", personas: ["consultant", "client"] },
  { id: "plateforme-strategique", number: "03", title: "Plateforme Strategique", personas: ["consultant", "client", "creative"] },
  { id: "proposition-valeur", number: "04", title: "Proposition de Valeur", personas: ["consultant", "client"] },
  { id: "territoire-creatif", number: "05", title: "Territoire Creatif", personas: ["consultant", "client", "creative"] },
  { id: "experience-engagement", number: "06", title: "Experience & Engagement", personas: ["consultant", "client"] },
  // ── Phase 2: R+T — Diagnostic ─────────────────────────────────────────────
  { id: "swot-interne", number: "07", title: "SWOT Interne (Risk)", personas: ["consultant"] },
  { id: "swot-externe", number: "08", title: "SWOT Externe (Track)", personas: ["consultant", "client"] },
  { id: "signaux-opportunites", number: "09", title: "Signaux & Opportunites", personas: ["consultant", "client"] },
  // ── Phase 3: I+S — Recommandations ────────────────────────────────────────
  { id: "catalogue-actions", number: "10", title: "Catalogue d'Actions (Implementation)", personas: ["consultant", "client", "creative"] },
  { id: "plan-activation", number: "11", title: "Plan d'Activation", personas: ["consultant", "client"] },
  { id: "fenetre-overton", number: "12", title: "Fenetre d'Overton (Strategy)", personas: ["consultant", "client"] },
  { id: "medias-distribution", number: "13", title: "Medias & Distribution", personas: ["consultant", "creative"] },
  { id: "production-livrables", number: "14", title: "Production & Livrables", personas: ["consultant", "creative"] },
  // ── Mesure & Superfan ─────────────────────────────────────────────────────
  { id: "profil-superfan", number: "15", title: "Profil Superfan", personas: ["consultant", "client"] },
  { id: "kpis-mesure", number: "16", title: "KPIs & Mesure de Performance", personas: ["consultant", "client"] },
  { id: "croissance-evolution", number: "17", title: "Croissance & Evolution", personas: ["consultant", "client"] },
  // ── Operationnel ──────────────────────────────────────────────────────────
  { id: "budget", number: "18", title: "Budget", personas: ["consultant", "client"] },
  { id: "timeline-gouvernance", number: "19", title: "Timeline & Gouvernance", personas: ["consultant", "client"] },
  { id: "equipe", number: "20", title: "Equipe", personas: ["consultant"] },
  { id: "conditions-etapes", number: "21", title: "Conditions & Prochaines Etapes", personas: ["consultant", "client"] },
];

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
