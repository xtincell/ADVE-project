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
  { id: "executive-summary", number: "01", title: "Executive Summary", personas: ["consultant", "client", "creative"] },
  { id: "contexte-defi", number: "02", title: "Contexte & Defi", personas: ["consultant", "client"] },
  { id: "audit-diagnostic", number: "03", title: "Audit & Diagnostic", personas: ["consultant"] },
  { id: "plateforme-strategique", number: "04", title: "Plateforme Strategique", personas: ["consultant", "client", "creative"] },
  { id: "territoire-creatif", number: "05", title: "Territoire Creatif", personas: ["consultant", "client", "creative"] },
  { id: "plan-activation", number: "06", title: "Plan d'Activation", personas: ["consultant", "client"] },
  { id: "production-livrables", number: "07", title: "Production & Livrables", personas: ["consultant", "creative"] },
  { id: "medias-distribution", number: "08", title: "Medias & Distribution", personas: ["consultant", "creative"] },
  { id: "kpis-mesure", number: "09", title: "KPIs & Mesure de Performance", personas: ["consultant", "client"] },
  { id: "budget", number: "10", title: "Budget", personas: ["consultant", "client"] },
  { id: "timeline-gouvernance", number: "11", title: "Timeline & Gouvernance", personas: ["consultant", "client"] },
  { id: "equipe", number: "12", title: "Equipe", personas: ["consultant"] },
  { id: "conditions-etapes", number: "13", title: "Conditions & Prochaines Etapes", personas: ["consultant", "client"] },
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
    executiveSummary: ExecutiveSummarySection;
    contexteDefi: ContexteDefiSection;
    auditDiagnostic: AuditDiagnosticSection;
    plateformeStrategique: PlateformeStrategiqueSection;
    territoireCreatif: TerritoireCreatifSection;
    planActivation: PlanActivationSection;
    productionLivrables: ProductionLivrablesSection;
    mediasDistribution: MediasDistributionSection;
    kpisMesure: KpisMesureSection;
    budget: BudgetSection;
    timelineGouvernance: TimelineGouvernanceSection;
    equipe: EquipeSection;
    conditionsEtapes: ConditionsEtapesSection;
  };
}

// ─── Completeness Check ──────────────────────────────────────────────────────

export type SectionCompleteness = "complete" | "partial" | "empty";

export type CompletenessReport = Record<string, SectionCompleteness>;
