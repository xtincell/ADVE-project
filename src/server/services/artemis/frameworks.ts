/**
 * ARTEMIS — 24 Analytical Frameworks across 9 Philosophy Layers
 * Each framework has dependencies, inputs, outputs, and prompt templates
 */

export type FrameworkLayer =
  | "IDENTITY"
  | "VALUE"
  | "EXPERIENCE"
  | "VALIDATION"
  | "EXECUTION"
  | "MEASUREMENT"
  | "GROWTH"
  | "EVOLUTION"
  | "SURVIVAL";

export interface FrameworkDef {
  slug: string;
  name: string;
  layer: FrameworkLayer;
  pillarKeys: string[];
  dependencies: string[];
  description: string;
  inputFields: string[];
  outputFields: string[];
  promptTemplate: string;
}

export const FRAMEWORKS: FrameworkDef[] = [
  // === IDENTITY (Couche 1) ===
  {
    slug: "fw-01-brand-archeology",
    name: "Archéologie de Marque",
    layer: "IDENTITY",
    pillarKeys: ["A"],
    dependencies: [],
    description: "Fouille les origines, mythes fondateurs et ADN culturel de la marque",
    inputFields: ["founding_story", "values", "cultural_context", "hero_journey"],
    outputFields: ["brand_dna", "founding_myth", "cultural_anchors", "identity_tensions"],
    promptTemplate: `Analyse l'archéologie de marque en examinant :
1. L'histoire fondatrice et ses éléments mythiques
2. Les valeurs profondes (déclarées vs. vécues)
3. Le contexte culturel d'émergence
4. Les tensions identitaires (ce que la marque est vs. veut être)
Produis un diagnostic structuré avec score de cohérence identitaire.`,
  },
  {
    slug: "fw-02-persona-constellation",
    name: "Constellation de Personas",
    layer: "IDENTITY",
    pillarKeys: ["A", "E"],
    dependencies: ["fw-01-brand-archeology"],
    description: "Cartographie les segments d'audience et leurs motivations profondes",
    inputFields: ["personas", "behaviors", "motivations", "pain_points"],
    outputFields: ["persona_map", "motivation_matrix", "segment_priorities", "engagement_potential"],
    promptTemplate: `Analyse les personas de la marque :
1. Cartographie les segments clés avec motivations profondes
2. Identifie les pain points et aspirations par segment
3. Évalue le potentiel d'engagement de chaque persona
4. Recommande la priorisation des segments
Score de couverture persona et cohérence avec l'identité.`,
  },
  {
    slug: "fw-03-hero-journey-audit",
    name: "Audit du Parcours Héroïque",
    layer: "IDENTITY",
    pillarKeys: ["A"],
    dependencies: ["fw-01-brand-archeology"],
    description: "Évalue la structure narrative du Hero's Journey de la marque",
    inputFields: ["hero_journey_acts", "narrative_elements", "brand_story"],
    outputFields: ["journey_completeness", "narrative_gaps", "story_strength", "recommendations"],
    promptTemplate: `Audite le parcours héroïque de la marque selon les 5 actes :
1. L'Appel (origine du fondateur/marque)
2. L'Épreuve (obstacles surmontés)
3. La Transformation (pivot/évolution)
4. La Mission (raison d'être actuelle)
5. L'Héritage (vision future)
Évalue la complétude et la puissance narrative.`,
  },

  // === VALUE (Couche 2) ===
  {
    slug: "fw-04-value-architecture",
    name: "Architecture de Valeur",
    layer: "VALUE",
    pillarKeys: ["V"],
    dependencies: [],
    description: "Analyse la proposition de valeur et la stratégie prix",
    inputFields: ["products", "pricing", "value_proposition", "competitors"],
    outputFields: ["value_map", "pricing_coherence", "differentiation_score", "optimization_paths"],
    promptTemplate: `Analyse l'architecture de valeur :
1. Map produits/services avec pricing ladder
2. Évalue la cohérence prix-valeur perçue
3. Compare au positionnement concurrentiel
4. Identifie les opportunités d'optimisation
Score de solidité de l'offre.`,
  },
  {
    slug: "fw-05-pricing-psychology",
    name: "Psychologie du Prix",
    layer: "VALUE",
    pillarKeys: ["V", "D"],
    dependencies: ["fw-04-value-architecture"],
    description: "Analyse l'impact psychologique de la stratégie prix",
    inputFields: ["pricing_ladder", "positioning", "target_perception", "market_context"],
    outputFields: ["price_perception_map", "anchor_strategy", "bundle_opportunities", "premium_indicators"],
    promptTemplate: `Analyse la psychologie du prix :
1. Perception prix vs. valeur par segment
2. Stratégie d'ancrage et de cadrage
3. Opportunités de bundling
4. Indicateurs de premium viable
Score d'alignement prix-positionnement.`,
  },
  {
    slug: "fw-06-unit-economics",
    name: "Unit Economics",
    layer: "VALUE",
    pillarKeys: ["V", "T"],
    dependencies: ["fw-04-value-architecture"],
    description: "Analyse les métriques unitaires de rentabilité",
    inputFields: ["cac", "ltv", "margins", "churn_rate", "payback_period"],
    outputFields: ["ltv_cac_ratio", "margin_analysis", "viability_score", "improvement_levers"],
    promptTemplate: `Analyse les unit economics :
1. Ratio LTV/CAC et benchmarks sectoriels
2. Analyse des marges par produit/canal
3. Période de remboursement
4. Leviers d'amélioration prioritaires
Score de viabilité économique.`,
  },

  // === EXPERIENCE (Couche 3) ===
  {
    slug: "fw-07-touchpoint-mapping",
    name: "Cartographie des Points de Contact",
    layer: "EXPERIENCE",
    pillarKeys: ["E", "D"],
    dependencies: ["fw-02-persona-constellation"],
    description: "Map tous les touchpoints marque-audience avec qualité d'expérience",
    inputFields: ["touchpoints", "channels", "customer_journey"],
    outputFields: ["touchpoint_map", "experience_gaps", "consistency_score", "priority_fixes"],
    promptTemplate: `Cartographie les points de contact :
1. Inventaire de tous les touchpoints (digital, physique, humain)
2. Qualité d'expérience à chaque point
3. Cohérence cross-canal
4. Gaps et points de friction
Score de couverture et cohérence expérientielle.`,
  },
  {
    slug: "fw-08-ritual-design",
    name: "Design de Rituels",
    layer: "EXPERIENCE",
    pillarKeys: ["E"],
    dependencies: ["fw-07-touchpoint-mapping"],
    description: "Conçoit et évalue les rituels de marque qui créent l'habitude",
    inputFields: ["existing_rituals", "brand_values", "audience_habits"],
    outputFields: ["ritual_portfolio", "adoption_potential", "gamification_hooks", "ritual_calendar"],
    promptTemplate: `Analyse et conçois les rituels de marque :
1. Inventaire des rituels existants (achat, usage, communauté)
2. Potentiel de ritualisation pour chaque touchpoint
3. Hooks de gamification applicables
4. Calendrier de rituels proposé
Score d'adoption rituelle.`,
  },
  {
    slug: "fw-09-devotion-pathway",
    name: "Parcours de Dévotion",
    layer: "EXPERIENCE",
    pillarKeys: ["E"],
    dependencies: ["fw-08-ritual-design", "fw-02-persona-constellation"],
    description: "Définit le chemin de SPECTATEUR à ÉVANGÉLISTE",
    inputFields: ["devotion_ladder", "current_distribution", "triggers"],
    outputFields: ["pathway_design", "conversion_triggers", "barrier_analysis", "acceleration_strategy"],
    promptTemplate: `Conçois le parcours de dévotion :
1. Analyse de la distribution actuelle sur la Devotion Ladder
2. Triggers de conversion entre chaque palier
3. Barrières identifiées à chaque transition
4. Stratégie d'accélération
Score de potentiel de conversion vers l'évangélisme.`,
  },

  // === VALIDATION (Couche 4) ===
  {
    slug: "fw-10-attribution-model",
    name: "Modèle d'Attribution",
    layer: "VALIDATION",
    pillarKeys: ["T"],
    dependencies: [],
    description: "Définit le modèle d'attribution marketing multi-touch",
    inputFields: ["channels", "conversion_data", "customer_journeys"],
    outputFields: ["attribution_model", "channel_weights", "roi_by_channel", "optimization_recommendations"],
    promptTemplate: `Conçois le modèle d'attribution :
1. Cartographie des parcours de conversion
2. Pondération des canaux (first-touch, last-touch, multi-touch)
3. ROI par canal et action
4. Recommandations d'optimisation budget
Score de fiabilité du modèle.`,
  },
  {
    slug: "fw-11-brand-market-fit",
    name: "Brand-Market Fit",
    layer: "VALIDATION",
    pillarKeys: ["T", "D"],
    dependencies: ["fw-04-value-architecture", "fw-02-persona-constellation"],
    description: "Évalue l'adéquation marque-marché",
    inputFields: ["market_data", "brand_metrics", "competitor_data", "customer_feedback"],
    outputFields: ["fit_score", "gap_analysis", "market_opportunity", "repositioning_options"],
    promptTemplate: `Évalue le Brand-Market Fit :
1. Adéquation produit-marché (demande vs. offre)
2. Perception de marque vs. positionnement voulu
3. Gaps concurrentiels exploitables
4. Options de repositionnement si nécessaire
Score de Brand-Market Fit.`,
  },
  {
    slug: "fw-12-tam-sam-som",
    name: "TAM/SAM/SOM",
    layer: "VALIDATION",
    pillarKeys: ["T"],
    dependencies: [],
    description: "Calcule les marchés total, adressable et obtensible",
    inputFields: ["market_size", "segments", "penetration_rate", "growth_rate"],
    outputFields: ["tam", "sam", "som", "market_share_trajectory", "scaling_strategy"],
    promptTemplate: `Calcule les marchés :
1. TAM (marché total) avec sources et méthode
2. SAM (marché adressable) avec critères de filtrage
3. SOM (marché obtensible) avec plan de capture
4. Trajectoire de part de marché à 1-3-5 ans
Score de réalisme des projections.`,
  },

  // === EXECUTION (Couche 5) ===
  {
    slug: "fw-13-90-day-roadmap",
    name: "Roadmap 90 Jours",
    layer: "EXECUTION",
    pillarKeys: ["I"],
    dependencies: ["fw-04-value-architecture", "fw-07-touchpoint-mapping"],
    description: "Plan d'action opérationnel sur 90 jours",
    inputFields: ["priorities", "resources", "budget", "team"],
    outputFields: ["weekly_plan", "milestones", "resource_allocation", "risk_mitigations"],
    promptTemplate: `Crée la roadmap 90 jours :
1. Objectifs par mois (M1: fondations, M2: accélération, M3: mesure)
2. Plan hebdomadaire avec livrables
3. Allocation des ressources et budget
4. Points de contrôle et plans de mitigation
Score de faisabilité opérationnelle.`,
  },
  {
    slug: "fw-14-campaign-architecture",
    name: "Architecture de Campagne",
    layer: "EXECUTION",
    pillarKeys: ["I", "E"],
    dependencies: ["fw-13-90-day-roadmap"],
    description: "Conçoit l'architecture globale des campagnes",
    inputFields: ["objectives", "budget", "drivers", "timeline"],
    outputFields: ["campaign_plan", "channel_mix", "content_calendar", "budget_allocation"],
    promptTemplate: `Conçois l'architecture de campagne :
1. Objectifs AARRR par phase
2. Mix canal optimal (ATL/BTL/TTL)
3. Calendrier éditorial et de diffusion
4. Allocation budgétaire détaillée
Score de cohérence stratégie-exécution.`,
  },
  {
    slug: "fw-15-team-blueprint",
    name: "Blueprint Équipe",
    layer: "EXECUTION",
    pillarKeys: ["I"],
    dependencies: ["fw-13-90-day-roadmap"],
    description: "Définit la structure d'équipe optimale",
    inputFields: ["scope", "budget", "timeline", "skill_needs"],
    outputFields: ["team_structure", "role_definitions", "hiring_priorities", "outsourcing_strategy"],
    promptTemplate: `Conçois le blueprint équipe :
1. Structure organisationnelle recommandée
2. Rôles et responsabilités clés
3. Priorités de recrutement/outsourcing
4. Budget RH et plan de montée en charge
Score de couverture compétences.`,
  },

  // === MEASUREMENT (Couche 6) ===
  {
    slug: "fw-16-kpi-framework",
    name: "Framework KPI",
    layer: "MEASUREMENT",
    pillarKeys: ["T"],
    dependencies: ["fw-10-attribution-model"],
    description: "Définit les KPI par pilier et par objectif",
    inputFields: ["objectives", "channels", "team_capacity"],
    outputFields: ["kpi_tree", "targets", "measurement_cadence", "dashboard_specs"],
    promptTemplate: `Conçois le framework KPI :
1. KPI par pilier ADVE (indicateurs de marque)
2. KPI par objectif AARRR (indicateurs business)
3. Targets par période avec benchmarks
4. Cadence de mesure et format de reporting
Score de mesurabilité.`,
  },
  {
    slug: "fw-17-cohort-analysis",
    name: "Analyse de Cohortes",
    layer: "MEASUREMENT",
    pillarKeys: ["T", "E"],
    dependencies: ["fw-16-kpi-framework"],
    description: "Analyse les comportements par cohorte temporelle",
    inputFields: ["user_data", "conversion_events", "time_periods"],
    outputFields: ["cohort_tables", "retention_curves", "ltv_by_cohort", "insights"],
    promptTemplate: `Réalise l'analyse de cohortes :
1. Segmentation en cohortes (acquisition, comportement)
2. Courbes de rétention par cohorte
3. LTV par cohorte avec tendances
4. Insights et recommandations d'optimisation
Score de qualité des données cohort.`,
  },

  // === GROWTH (Couche 7) ===
  {
    slug: "fw-18-growth-loops",
    name: "Boucles de Croissance",
    layer: "GROWTH",
    pillarKeys: ["E", "T"],
    dependencies: ["fw-09-devotion-pathway", "fw-16-kpi-framework"],
    description: "Identifie et conçoit les boucles de croissance virales",
    inputFields: ["current_channels", "viral_coefficient", "referral_data"],
    outputFields: ["loop_designs", "viral_potential", "activation_plan", "expected_impact"],
    promptTemplate: `Identifie les boucles de croissance :
1. Boucles virales existantes (organique, mécanique, payée)
2. Coefficient viral actuel et potentiel
3. Design de nouvelles boucles
4. Plan d'activation et impact attendu
Score de potentiel de croissance organique.`,
  },
  {
    slug: "fw-19-expansion-strategy",
    name: "Stratégie d'Expansion",
    layer: "GROWTH",
    pillarKeys: ["T", "I"],
    dependencies: ["fw-12-tam-sam-som", "fw-11-brand-market-fit"],
    description: "Plan d'expansion géographique et sectorielle",
    inputFields: ["current_markets", "target_markets", "resources", "competition"],
    outputFields: ["expansion_priority", "market_entry_plan", "resource_needs", "risk_assessment"],
    promptTemplate: `Conçois la stratégie d'expansion :
1. Priorisation des marchés cibles
2. Stratégie d'entrée par marché
3. Besoins en ressources et calendrier
4. Évaluation des risques et mitigation
Score de faisabilité d'expansion.`,
  },

  // === EVOLUTION (Couche 8) ===
  {
    slug: "fw-20-brand-evolution",
    name: "Évolution de Marque",
    layer: "EVOLUTION",
    pillarKeys: ["A", "D"],
    dependencies: ["fw-01-brand-archeology", "fw-11-brand-market-fit"],
    description: "Planifie l'évolution de la marque dans le temps",
    inputFields: ["brand_history", "market_trends", "vision"],
    outputFields: ["evolution_roadmap", "pivot_scenarios", "brand_extension_options", "legacy_plan"],
    promptTemplate: `Planifie l'évolution de marque :
1. Trajectoire actuelle et tendances marché
2. Scénarios de pivot/évolution (3 options)
3. Opportunités d'extension de marque
4. Vision à long terme et plan d'héritage
Score d'adaptabilité de marque.`,
  },
  {
    slug: "fw-21-innovation-pipeline",
    name: "Pipeline d'Innovation",
    layer: "EVOLUTION",
    pillarKeys: ["V", "I"],
    dependencies: ["fw-04-value-architecture"],
    description: "Gère le pipeline d'innovation produit/service",
    inputFields: ["current_products", "market_gaps", "trends", "resources"],
    outputFields: ["innovation_pipeline", "priority_matrix", "resource_plan", "time_to_market"],
    promptTemplate: `Conçois le pipeline d'innovation :
1. Inventaire des opportunités d'innovation
2. Matrice de priorisation (impact × faisabilité)
3. Plan de ressources et calendrier
4. Time-to-market estimé par initiative
Score de vitalité du pipeline.`,
  },

  // === SURVIVAL (Couche 9) ===
  {
    slug: "fw-22-risk-matrix",
    name: "Matrice de Risques",
    layer: "SURVIVAL",
    pillarKeys: ["R"],
    dependencies: [],
    description: "Cartographie et priorise les risques stratégiques",
    inputFields: ["internal_risks", "external_risks", "market_threats"],
    outputFields: ["risk_matrix", "mitigation_plans", "early_warnings", "contingencies"],
    promptTemplate: `Construis la matrice de risques :
1. Risques internes (opérationnels, financiers, RH)
2. Risques externes (marché, concurrence, réglementation)
3. Impact × Probabilité pour chaque risque
4. Plans de mitigation et signaux d'alerte
Score de résilience.`,
  },
  {
    slug: "fw-23-crisis-playbook",
    name: "Playbook de Crise",
    layer: "SURVIVAL",
    pillarKeys: ["R"],
    dependencies: ["fw-22-risk-matrix"],
    description: "Prépare les protocoles de gestion de crise",
    inputFields: ["risk_scenarios", "team", "communication_channels"],
    outputFields: ["crisis_protocols", "response_templates", "escalation_matrix", "recovery_plan"],
    promptTemplate: `Conçois le playbook de crise :
1. Scénarios de crise les plus probables
2. Protocoles de réponse par scénario
3. Templates de communication (interne, externe, media)
4. Matrice d'escalation et plan de recovery
Score de préparation aux crises.`,
  },
  {
    slug: "fw-24-competitive-defense",
    name: "Défense Concurrentielle",
    layer: "SURVIVAL",
    pillarKeys: ["R", "D"],
    dependencies: ["fw-22-risk-matrix", "fw-11-brand-market-fit"],
    description: "Stratégies de défense face à la concurrence",
    inputFields: ["competitors", "market_position", "moats", "vulnerabilities"],
    outputFields: ["defense_strategy", "moat_strengthening", "counter_moves", "early_warning_system"],
    promptTemplate: `Conçois la défense concurrentielle :
1. Carte concurrentielle avec forces/faiblesses
2. Avantages compétitifs à renforcer (moats)
3. Contre-mesures par menace concurrentielle
4. Système d'alerte précoce
Score de solidité concurrentielle.`,
  },
  // === BERKUS VALUATION (Cross-pillar) ===
  {
    slug: "fw-25-berkus-team-assessment",
    name: "Berkus — Evaluation Equipe Dirigeante",
    layer: "IDENTITY",
    pillarKeys: ["A"],
    dependencies: ["fw-01-brand-archeology"],
    description: "Evalue l'equipe dirigeante selon la methode Berkus : experience, complementarite des competences, capacite d'execution",
    inputFields: ["team_members", "brand_context", "sector"],
    outputFields: ["team_profiles", "complementarity_score", "execution_capacity", "skill_gaps", "berkus_team_score"],
    promptTemplate: `Evalue l'equipe dirigeante selon la methode Berkus :
1. Profile chaque membre : experience passee, competences cles, credentials
2. Evalue la complementarite : technique × commercial × operationnel
3. Capacite d'execution : track record, allocation temps, engagement
4. Identifie les lacunes critiques et les recrutements prioritaires
5. Score Berkus equipe (0-500K$ equiv, convertir en score 0-10)
Fournis un diagnostic structure avec prescriptions.`,
  },
  {
    slug: "fw-26-berkus-traction",
    name: "Berkus — Traction & Signaux Precoces",
    layer: "VALIDATION",
    pillarKeys: ["T"],
    dependencies: ["fw-12-tam-sam-som"],
    description: "Evalue la traction selon Berkus : LOI, utilisateurs, croissance, revenus, preuves de marche",
    inputFields: ["traction_data", "market_size", "hypothesis_validation"],
    outputFields: ["traction_score", "traction_evidence", "growth_trajectory", "risk_factors", "berkus_traction_score"],
    promptTemplate: `Evalue la traction selon la methode Berkus :
1. Signaux precoces : LOI signees, precommandes, pilotes
2. Metriques utilisateurs : inscrits, actifs, croissance WoW
3. Revenus : MRR/ARR, tendance, unit economics
4. North Star Metric : identification et trajectoire
5. Score Berkus traction (0-500K$ equiv, convertir en score 0-10)
Sois rigoureux : sans donnees chiffrees, le score est bas.`,
  },
  {
    slug: "fw-27-berkus-product",
    name: "Berkus — Produit & Prototype",
    layer: "VALUE",
    pillarKeys: ["V"],
    dependencies: ["fw-04-value-architecture"],
    description: "Evalue le produit/MVP selon Berkus : existence, maturite, feedback utilisateur, product-market fit",
    inputFields: ["mvp_data", "product_catalog", "user_feedback"],
    outputFields: ["product_maturity", "pmf_indicators", "iteration_velocity", "berkus_product_score"],
    promptTemplate: `Evalue le produit selon la methode Berkus :
1. Stade du produit : idee → POC → prototype → MVP → produit → scale
2. Feedback utilisateur : qualite, volume, NPS si disponible
3. Product-market fit : indicateurs concrets (retention, referral, willingness to pay)
4. Vitesse d'iteration : frequence de releases, capacite d'adaptation
5. Score Berkus produit (0-500K$ equiv, convertir en score 0-10)
Sois factuel : pas de score eleve sans preuves tangibles.`,
  },
  {
    slug: "fw-28-berkus-ip",
    name: "Berkus — Propriete Intellectuelle & Barrieres",
    layer: "SURVIVAL",
    pillarKeys: ["R", "V"],
    dependencies: ["fw-22-risk-matrix"],
    description: "Evalue la propriete intellectuelle et les barrieres a l'entree selon Berkus",
    inputFields: ["ip_data", "competitive_landscape", "technology_stack"],
    outputFields: ["ip_strength", "barrier_assessment", "defensibility", "berkus_ip_score"],
    promptTemplate: `Evalue la propriete intellectuelle selon Berkus :
1. Brevets : deposes, accordes, en cours — portee de protection
2. Secrets commerciaux : processus proprietaires, donnees exclusives
3. Technologie proprietaire : avantage technique defensible
4. Barrieres a l'entree : effets de reseau, couts de switching, reglementation
5. Licences et accords d'exclusivite
6. Score Berkus IP (0-500K$ equiv, convertir en score 0-10)
Sans brevets ni technologie proprietaire, le score est bas.`,
  },
];

export function getFramework(slug: string): FrameworkDef | undefined {
  return FRAMEWORKS.find((f) => f.slug === slug);
}

export function getFrameworksByLayer(layer: FrameworkLayer): FrameworkDef[] {
  return FRAMEWORKS.filter((f) => f.layer === layer);
}

export function getFrameworksByPillar(pillarKey: string): FrameworkDef[] {
  return FRAMEWORKS.filter((f) => f.pillarKeys.includes(pillarKey));
}
