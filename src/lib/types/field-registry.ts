/**
 * FIELD REGISTRY — Maps every ADVE pillar field to its proper editor type.
 * Used by SmartFieldEditor to render the correct input control.
 */

import {
  ARCHETYPES, SCHWARTZ_VALUES, LIFE_FORCE_8, DEVOTION_LEVELS,
  CHANNELS, TOUCHPOINT_TYPES, RITUAL_TYPES, MASLOW_LEVELS,
  PRODUCT_CATEGORIES, PRODUCT_LIFECYCLE, AARRR_STAGES,
} from "./taxonomies";

// ─── Field type definitions ──────────────────────────────────────────────

export type FieldDef =
  | { kind: "enum"; options: readonly string[]; label: string; nullable?: boolean }
  | { kind: "text"; label: string; maxLength?: number; multiline?: boolean; placeholder?: string }
  | { kind: "number"; label: string; min?: number; max?: number; unit?: string }
  | { kind: "multi-enum"; options: readonly string[]; label: string }
  | { kind: "object"; label: string; fields: Record<string, FieldDef> }
  | { kind: "array-of-objects"; label: string; itemLabel?: string; itemFields: Record<string, FieldDef> }
  | { kind: "array-of-strings"; label: string; placeholder?: string }
  | { kind: "json"; label: string };

// ─── Shared sub-field definitions ────────────────────────────────────────

const textField = (label: string, opts?: Partial<Extract<FieldDef, { kind: "text" }>>): FieldDef =>
  ({ kind: "text", label, ...opts });

const numberField = (label: string, opts?: Partial<Extract<FieldDef, { kind: "number" }>>): FieldDef =>
  ({ kind: "number", label, ...opts });

const enumField = (label: string, options: readonly string[], nullable?: boolean): FieldDef =>
  ({ kind: "enum", label, options, nullable });

const multiEnumField = (label: string, options: readonly string[]): FieldDef =>
  ({ kind: "multi-enum", label, options });

const stringsField = (label: string, placeholder?: string): FieldDef =>
  ({ kind: "array-of-strings", label, placeholder });

// ─── PILLAR A — Authenticite ─────────────────────────────────────────────

const PILLAR_A: Record<string, FieldDef> = {
  archetype: enumField("Archetype", ARCHETYPES),
  archetypeSecondary: enumField("Archetype secondaire", ARCHETYPES, true),
  noyauIdentitaire: textField("Noyau identitaire", { maxLength: 200 }),
  citationFondatrice: textField("Citation fondatrice", { multiline: true }),
  ikigai: {
    kind: "object", label: "Ikigai de marque",
    fields: {
      love: textField("Ce qu'on aime"),
      competence: textField("Notre competence"),
      worldNeed: textField("Besoin du monde"),
      remuneration: textField("Comment on se remunere"),
    },
  },
  valeurs: {
    kind: "array-of-objects", label: "Valeurs", itemLabel: "Valeur",
    itemFields: {
      value: enumField("Valeur Schwartz", SCHWARTZ_VALUES),
      customName: textField("Nom personnalise"),
      rank: numberField("Rang", { min: 1, max: 10 }),
      justification: textField("Justification", { multiline: true }),
      costOfHolding: textField("Cout de cette valeur"),
      tensionWith: textField("Tension avec"),
    },
  },
  herosJourney: {
    kind: "array-of-objects", label: "Parcours du heros", itemLabel: "Acte",
    itemFields: {
      actNumber: numberField("Numero d'acte", { min: 1, max: 5 }),
      title: textField("Titre"),
      narrative: textField("Narration", { multiline: true }),
      emotionalArc: textField("Arc emotionnel"),
      causalLink: textField("Lien causal"),
    },
  },
  timelineNarrative: {
    kind: "object", label: "Timeline narrative",
    fields: {
      origine: textField("Origine"),
      transformation: textField("Transformation"),
      present: textField("Present"),
      futur: textField("Futur"),
    },
  },
  prophecy: {
    kind: "object", label: "Prophetie",
    fields: {
      worldTransformed: textField("Le monde transforme", { multiline: true }),
      pioneers: textField("Pionniers"),
      urgency: textField("Urgence"),
      horizon: textField("Horizon"),
    },
  },
  enemy: {
    kind: "object", label: "Ennemi",
    fields: {
      name: textField("Nom de l'ennemi"),
      manifesto: textField("Manifeste", { multiline: true }),
      narrative: textField("Narration", { multiline: true }),
      enemySchwartzValues: multiEnumField("Valeurs Schwartz de l'ennemi", SCHWARTZ_VALUES),
    },
  },
  doctrine: {
    kind: "object", label: "Doctrine",
    fields: {
      dogmas: stringsField("Dogmes", "Regle non-negociable"),
      principles: stringsField("Principes", "Principe directeur"),
      practices: stringsField("Pratiques", "Pratique quotidienne"),
    },
  },
  livingMythology: {
    kind: "object", label: "Mythologie vivante",
    fields: {
      canon: textField("Canon", { multiline: true }),
      extensionRules: textField("Regles d'extension"),
      captureSystem: textField("Systeme de capture"),
    },
  },
  hierarchieCommunautaire: {
    kind: "array-of-objects", label: "Hierarchie communautaire", itemLabel: "Niveau",
    itemFields: {
      level: enumField("Niveau", DEVOTION_LEVELS),
      description: textField("Description", { multiline: true }),
      privileges: textField("Privileges"),
      entryCriteria: textField("Criteres d'entree"),
    },
  },
};

// ─── PILLAR D — Distinction ──────────────────────────────────────────────

const PILLAR_D: Record<string, FieldDef> = {
  positionnement: textField("Positionnement", { maxLength: 200, placeholder: "Nous sommes les seuls a..." }),
  promesseMaitre: textField("Promesse maitre", { maxLength: 150 }),
  sousPromesses: stringsField("Sous-promesses"),
  personas: {
    kind: "array-of-objects", label: "Personas", itemLabel: "Persona",
    itemFields: {
      name: textField("Prenom"),
      age: textField("Age"),
      csp: textField("CSP"),
      location: textField("Localisation"),
      income: textField("Revenus"),
      familySituation: textField("Situation familiale"),
      tensionProfile: textField("Profil de tension"),
      lf8Dominant: enumField("LF8 dominant", LIFE_FORCE_8),
      schwartzValues: multiEnumField("Valeurs Schwartz", SCHWARTZ_VALUES),
      lifestyle: textField("Style de vie"),
      mediaConsumption: textField("Consommation media"),
      brandRelationships: textField("Relation aux marques"),
      motivations: stringsField("Motivations"),
      fears: stringsField("Craintes"),
      hiddenDesire: textField("Desir cache"),
      whatTheyActuallyBuy: textField("Ce qu'ils achetent vraiment"),
      jobsToBeDone: stringsField("Jobs to be done"),
      decisionProcess: textField("Processus de decision"),
      devotionPotential: enumField("Potentiel de devotion", ["LOW", "MEDIUM", "HIGH", "FANATIC"] as const),
      rank: numberField("Rang", { min: 1, max: 10 }),
    },
  },
  paysageConcurrentiel: {
    kind: "array-of-objects", label: "Paysage concurrentiel", itemLabel: "Concurrent",
    itemFields: {
      name: textField("Nom"),
      partDeMarcheEstimee: textField("Part de marche estimee"),
      avantagesCompetitifs: stringsField("Avantages competitifs"),
      faiblesses: stringsField("Faiblesses"),
      strategiePos: textField("Strategie de positionnement"),
      distinctiveAssets: stringsField("Assets distinctifs"),
    },
  },
  tonDeVoix: {
    kind: "object", label: "Ton de voix",
    fields: {
      personnalite: stringsField("Traits de personnalite"),
      onDit: stringsField("On dit"),
      onNeditPas: stringsField("On ne dit pas"),
    },
  },
  assetsLinguistiques: {
    kind: "object", label: "Assets linguistiques",
    fields: {
      slogan: textField("Slogan", { maxLength: 50 }),
      tagline: textField("Tagline", { maxLength: 100 }),
      motto: textField("Motto", { maxLength: 150 }),
      mantras: stringsField("Mantras"),
      lexiquePropre: { kind: "array-of-objects", label: "Lexique propre", itemLabel: "Mot", itemFields: {
        word: textField("Mot"), definition: textField("Definition"),
      }},
    },
  },
  sacredObjects: {
    kind: "array-of-objects", label: "Objets sacres", itemLabel: "Objet",
    itemFields: {
      name: textField("Nom"), form: textField("Forme"), narrative: textField("Narration", { multiline: true }),
      stage: textField("Etape"), socialSignal: textField("Signal social"),
    },
  },
  proofPoints: {
    kind: "array-of-objects", label: "Proof Points", itemLabel: "Preuve",
    itemFields: {
      type: textField("Type"), claim: textField("Affirmation"), evidence: textField("Preuve"), source: textField("Source"),
    },
  },
  symboles: {
    kind: "array-of-objects", label: "Symboles", itemLabel: "Symbole",
    itemFields: {
      symbol: textField("Symbole"), meanings: stringsField("Significations"), usageContexts: stringsField("Contextes d'usage"),
    },
  },
};

// ─── PILLAR V — Valeur ───────────────────────────────────────────────────

const PILLAR_V: Record<string, FieldDef> = {
  promesseDeValeur: textField("Promesse de valeur", { multiline: true }),
  produitsCatalogue: {
    kind: "array-of-objects", label: "Catalogue produits", itemLabel: "Produit",
    itemFields: {
      nom: textField("Nom"),
      categorie: enumField("Categorie", PRODUCT_CATEGORIES),
      prix: numberField("Prix", { min: 0, unit: "FCFA" }),
      cout: numberField("Cout", { min: 0, unit: "FCFA" }),
      margeUnitaire: numberField("Marge unitaire", { min: 0, unit: "FCFA" }),
      gainClientConcret: textField("Gain client concret"),
      gainClientAbstrait: textField("Gain client abstrait"),
      gainMarqueConcret: textField("Gain marque concret"),
      gainMarqueAbstrait: textField("Gain marque abstrait"),
      coutClientConcret: textField("Cout client concret"),
      coutClientAbstrait: textField("Cout client abstrait"),
      coutMarqueConcret: textField("Cout marque concret"),
      coutMarqueAbstrait: textField("Cout marque abstrait"),
      lienPromesse: textField("Lien avec la promesse"),
      segmentCible: textField("Segment cible"),
      phaseLifecycle: enumField("Phase lifecycle", PRODUCT_LIFECYCLE),
      leviersPsychologiques: stringsField("Leviers psychologiques"),
      maslowMapping: enumField("Niveau Maslow", MASLOW_LEVELS),
      lf8Trigger: multiEnumField("Triggers LF8", LIFE_FORCE_8),
      scoreEmotionnelADVE: numberField("Score emotionnel ADVE", { min: 0, max: 100 }),
      canalDistribution: multiEnumField("Canaux de distribution", CHANNELS),
      disponibilite: textField("Disponibilite"),
      skuRef: textField("Reference SKU"),
    },
  },
  productLadder: {
    kind: "array-of-objects", label: "Echelle produit", itemLabel: "Palier",
    itemFields: {
      tier: enumField("Palier", ["ENTREE", "COEUR", "PREMIUM", "SIGNATURE"] as const),
      prix: numberField("Prix", { min: 0, unit: "FCFA" }),
      description: textField("Description"),
      cible: textField("Cible"),
      position: numberField("Position", { min: 1, max: 4 }),
    },
  },
  unitEconomics: {
    kind: "object", label: "Unit Economics",
    fields: {
      cac: numberField("CAC", { min: 0, unit: "FCFA" }),
      ltv: numberField("LTV", { min: 0, unit: "FCFA" }),
      ltvCacRatio: numberField("Ratio LTV/CAC", { min: 0 }),
      pointMort: numberField("Point mort", { min: 0 }),
      margeNette: numberField("Marge nette", { min: 0, max: 100, unit: "%" }),
      paybackPeriod: numberField("Payback period", { min: 0, unit: "mois" }),
      budgetCom: numberField("Budget com", { min: 0, unit: "FCFA/an" }),
      caVise: numberField("CA vise", { min: 0, unit: "FCFA/an" }),
    },
  },
  valeurClientTangible: stringsField("Valeur client tangible"),
  valeurClientIntangible: stringsField("Valeur client intangible"),
  coutClientTangible: stringsField("Cout client tangible"),
  coutClientIntangible: stringsField("Cout client intangible"),
  valeurMarqueTangible: stringsField("Valeur marque tangible"),
  valeurMarqueIntangible: stringsField("Valeur marque intangible"),
};

// ─── PILLAR E — Engagement ───────────────────────────────────────────────

const PILLAR_E: Record<string, FieldDef> = {
  aarrr: {
    kind: "object", label: "Funnel AARRR",
    fields: {
      acquisition: textField("Acquisition", { multiline: true }),
      activation: textField("Activation", { multiline: true }),
      retention: textField("Retention", { multiline: true }),
      revenue: textField("Revenue", { multiline: true }),
      referral: textField("Referral", { multiline: true }),
    },
  },
  touchpoints: {
    kind: "array-of-objects", label: "Points de contact", itemLabel: "Touchpoint",
    itemFields: {
      canal: textField("Canal"),
      type: enumField("Type", ["OWNED", "EARNED", "PAID", "SHARED"] as const),
      channelRef: enumField("Channel ref", CHANNELS),
      role: textField("Role"),
      aarrStage: enumField("Etape AARRR", AARRR_STAGES),
      devotionLevel: multiEnumField("Niveaux devotion", DEVOTION_LEVELS),
      priority: enumField("Priorite", ["HIGH", "MEDIUM", "LOW"] as const),
      frequency: textField("Frequence"),
    },
  },
  rituels: {
    kind: "array-of-objects", label: "Rituels", itemLabel: "Rituel",
    itemFields: {
      nom: textField("Nom"),
      type: enumField("Type", RITUAL_TYPES),
      frequency: textField("Frequence"),
      description: textField("Description", { multiline: true }),
      devotionLevels: multiEnumField("Niveaux devotion", DEVOTION_LEVELS),
      touchpoints: stringsField("Touchpoints"),
      aarrPrimary: enumField("AARRR primaire", AARRR_STAGES),
      kpiMeasure: textField("KPI de mesure"),
    },
  },
  principesCommunautaires: {
    kind: "array-of-objects", label: "Principes communautaires", itemLabel: "Principe",
    itemFields: {
      principle: textField("Principe"),
      enforcement: textField("Application"),
    },
  },
  kpis: {
    kind: "array-of-objects", label: "KPIs", itemLabel: "KPI",
    itemFields: {
      name: textField("Nom"),
      metricType: enumField("Type", ["ENGAGEMENT", "FINANCIAL", "BEHAVIORAL", "SATISFACTION"] as const),
      target: textField("Objectif"),
      frequency: enumField("Frequence", ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"] as const),
    },
  },
  hierarchieCommunautaire: {
    kind: "array-of-objects", label: "Hierarchie communautaire", itemLabel: "Niveau",
    itemFields: {
      level: enumField("Niveau", DEVOTION_LEVELS),
      description: textField("Description", { multiline: true }),
      privileges: textField("Privileges"),
      entryCriteria: textField("Criteres d'entree"),
    },
  },
  sacredCalendar: {
    kind: "array-of-objects", label: "Calendrier sacre", itemLabel: "Evenement",
    itemFields: {
      date: textField("Date ou periode"),
      name: textField("Nom"),
      significance: textField("Signification", { multiline: true }),
    },
  },
  commandments: {
    kind: "array-of-objects", label: "Commandements", itemLabel: "Commandement",
    itemFields: {
      commandment: textField("Commandement"),
      justification: textField("Justification"),
    },
  },
  taboos: {
    kind: "array-of-objects", label: "Tabous", itemLabel: "Tabou",
    itemFields: {
      taboo: textField("Tabou"),
      consequence: textField("Consequence"),
    },
  },
  gamification: {
    kind: "object", label: "Gamification",
    fields: {
      niveaux: { kind: "array-of-objects", label: "Niveaux", itemLabel: "Niveau", itemFields: {
        niveau: textField("Niveau"), condition: textField("Condition"), reward: textField("Recompense"),
      }},
      recompenses: stringsField("Recompenses"),
    },
  },
  ritesDePassage: {
    kind: "array-of-objects", label: "Rites de passage", itemLabel: "Rite",
    itemFields: {
      fromStage: enumField("De", DEVOTION_LEVELS),
      toStage: enumField("Vers", DEVOTION_LEVELS),
      rituelEntree: textField("Rituel d'entree", { multiline: true }),
      symboles: stringsField("Symboles"),
    },
  },
  sacraments: {
    kind: "array-of-objects", label: "Sacrements", itemLabel: "Sacrement",
    itemFields: {
      nomSacre: textField("Nom sacre"),
      trigger: textField("Declencheur"),
      action: textField("Action"),
      reward: textField("Recompense"),
      kpi: textField("KPI"),
      aarrStage: enumField("Etape AARRR", AARRR_STAGES),
    },
  },
};

// ─── PILLAR R — Risk ─────────────────────────────────────────────────────

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;

const PILLAR_R: Record<string, FieldDef> = {
  globalSwot: {
    kind: "object", label: "SWOT Global",
    fields: {
      strengths: stringsField("Forces"),
      weaknesses: stringsField("Faiblesses"),
      opportunities: stringsField("Opportunites"),
      threats: stringsField("Menaces"),
    },
  },
  probabilityImpactMatrix: {
    kind: "array-of-objects", label: "Matrice Risques", itemLabel: "Risque",
    itemFields: {
      risk: textField("Risque"),
      probability: enumField("Probabilite", RISK_LEVELS),
      impact: enumField("Impact", RISK_LEVELS),
      mitigation: textField("Mitigation", { multiline: true }),
    },
  },
  mitigationPriorities: {
    kind: "array-of-objects", label: "Plan de mitigation", itemLabel: "Action",
    itemFields: {
      action: textField("Action", { multiline: true }),
      owner: textField("Responsable"),
      timeline: textField("Delai"),
      investment: textField("Investissement"),
    },
  },
  riskScore: numberField("Score de risque", { min: 0, max: 100 }),
};

// ─── PILLAR T — Track ────────────────────────────────────────────────────

const PILLAR_T: Record<string, FieldDef> = {
  triangulation: {
    kind: "object", label: "Triangulation marche",
    fields: {
      customerInterviews: textField("Interviews clients", { multiline: true }),
      competitiveAnalysis: textField("Analyse concurrentielle", { multiline: true }),
      trendAnalysis: textField("Analyse tendances", { multiline: true }),
      financialBenchmarks: textField("Benchmarks financiers", { multiline: true }),
    },
  },
  hypothesisValidation: {
    kind: "array-of-objects", label: "Hypotheses", itemLabel: "Hypothese",
    itemFields: {
      hypothesis: textField("Hypothese"),
      validationMethod: textField("Methode de validation"),
      status: enumField("Statut", ["HYPOTHESIS", "TESTING", "VALIDATED", "INVALIDATED"] as const),
      evidence: textField("Evidence"),
    },
  },
  tamSamSom: {
    kind: "object", label: "TAM / SAM / SOM",
    fields: {
      tam: { kind: "object", label: "TAM", fields: { value: numberField("Valeur"), description: textField("Description") } },
      sam: { kind: "object", label: "SAM", fields: { value: numberField("Valeur"), description: textField("Description") } },
      som: { kind: "object", label: "SOM", fields: { value: numberField("Valeur"), description: textField("Description") } },
    },
  },
  brandMarketFitScore: numberField("Brand-Market Fit", { min: 0, max: 100 }),
  marketReality: {
    kind: "object", label: "Realite marche",
    fields: {
      macroTrends: stringsField("Macro-tendances"),
      weakSignals: stringsField("Signaux faibles"),
    },
  },
};

// ─── PILLAR I — Implementation ───────────────────────────────────────────

const PILLAR_I: Record<string, FieldDef> = {
  sprint90Days: {
    kind: "array-of-objects", label: "Sprint 90 jours", itemLabel: "Action",
    itemFields: {
      action: textField("Action", { multiline: true }),
      owner: textField("Responsable"),
      kpi: textField("KPI"),
      priority: numberField("Priorite", { min: 1, max: 10 }),
      isRiskMitigation: enumField("Mitigation risque", ["true", "false"] as const),
    },
  },
  annualCalendar: {
    kind: "array-of-objects", label: "Calendrier annuel", itemLabel: "Campagne",
    itemFields: {
      name: textField("Nom"),
      quarter: enumField("Trimestre", ["1", "2", "3", "4"] as const),
      objective: textField("Objectif"),
      budget: numberField("Budget", { min: 0, unit: "FCFA" }),
      drivers: multiEnumField("Canaux", CHANNELS),
    },
  },
  globalBudget: numberField("Budget global", { min: 0, unit: "FCFA" }),
  budgetBreakdown: {
    kind: "object", label: "Ventilation budget",
    fields: {
      production: numberField("Production", { unit: "FCFA" }),
      media: numberField("Media", { unit: "FCFA" }),
      talent: numberField("Talent", { unit: "FCFA" }),
      logistics: numberField("Logistique", { unit: "FCFA" }),
      technology: numberField("Technologie", { unit: "FCFA" }),
      legal: numberField("Legal", { unit: "FCFA" }),
      contingency: numberField("Contingence", { unit: "FCFA" }),
      agencyFees: numberField("Frais agence", { unit: "FCFA" }),
    },
  },
  teamStructure: {
    kind: "array-of-objects", label: "Equipe", itemLabel: "Membre",
    itemFields: {
      name: textField("Nom"),
      title: textField("Titre"),
      responsibility: textField("Responsabilite"),
    },
  },
  brandPlatform: {
    kind: "object", label: "Brand Platform",
    fields: {
      name: textField("Nom"), benefit: textField("Benefice"), target: textField("Cible"),
      competitiveAdvantage: textField("Avantage competitif"), emotionalBenefit: textField("Benefice emotionnel"),
      functionalBenefit: textField("Benefice fonctionnel"), supportedBy: textField("Supporte par"),
    },
  },
  copyStrategy: {
    kind: "object", label: "Copy Strategy",
    fields: {
      promise: textField("Promesse"), rtb: textField("Raison de croire"), tonOfVoice: textField("Ton de voix"),
      keyMessages: stringsField("Messages cles"), doNot: stringsField("A ne pas faire"),
    },
  },
  bigIdea: {
    kind: "object", label: "Big Idea",
    fields: {
      concept: textField("Concept"), mechanism: textField("Mecanisme"),
      insight: textField("Insight"), adaptations: stringsField("Adaptations"),
    },
  },
  year1: textField("Plan annee 1", { multiline: true }),
  vision3years: textField("Vision 3 ans", { multiline: true }),
};

// ─── PILLAR S — Strategie ────────────────────────────────────────────────

const PILLAR_S: Record<string, FieldDef> = {
  syntheseExecutive: textField("Synthese executive", { multiline: true }),
  visionStrategique: textField("Vision strategique", { multiline: true }),
  coherencePiliers: {
    kind: "array-of-objects", label: "Coherence piliers", itemLabel: "Lien",
    itemFields: {
      pilier: textField("Pilier (ex: A vers D)"),
      contribution: textField("Contribution"),
      articulation: textField("Articulation"),
    },
  },
  facteursClesSucces: stringsField("Facteurs cles de succes"),
  recommandationsPrioritaires: {
    kind: "array-of-objects", label: "Recommandations", itemLabel: "Recommandation",
    itemFields: {
      recommendation: textField("Recommandation", { multiline: true }),
      source: enumField("Source pilier", ["A", "D", "V", "E", "R", "T", "I", "S"] as const),
      priority: numberField("Priorite", { min: 1, max: 10 }),
    },
  },
  axesStrategiques: {
    kind: "array-of-objects", label: "Axes strategiques", itemLabel: "Axe",
    itemFields: {
      axe: textField("Axe"),
      pillarsLinked: multiEnumField("Piliers lies", ["A", "D", "V", "E", "R", "T", "I", "S"] as const),
      kpis: stringsField("KPIs"),
    },
  },
  sprint90Recap: stringsField("Recap Sprint 90 jours"),
  kpiDashboard: {
    kind: "array-of-objects", label: "Dashboard KPI", itemLabel: "KPI",
    itemFields: {
      name: textField("Nom"),
      pillar: enumField("Pilier", ["A", "D", "V", "E", "R", "T", "I", "S"] as const),
      target: textField("Objectif"),
      frequency: enumField("Frequence", ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"] as const),
    },
  },
  coherenceScore: numberField("Score coherence", { min: 0, max: 100 }),
};

// ─── Export registry ─────────────────────────────────────────────────────

export const FIELD_REGISTRY: Record<string, Record<string, FieldDef>> = {
  a: PILLAR_A,
  d: PILLAR_D,
  v: PILLAR_V,
  e: PILLAR_E,
  r: PILLAR_R,
  t: PILLAR_T,
  i: PILLAR_I,
  s: PILLAR_S,
};

/** Get field definition for a pillar + field key. Falls back to JSON editor. */
export function getFieldDef(pillarKey: string, fieldKey: string): FieldDef {
  return FIELD_REGISTRY[pillarKey]?.[fieldKey] ?? { kind: "json", label: fieldKey };
}
