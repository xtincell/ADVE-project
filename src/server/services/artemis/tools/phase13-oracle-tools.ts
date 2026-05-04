/**
 * Phase 13 — Oracle 35-section Glory tools (B2)
 *
 * 7 nouveaux Glory tools pour produire les sections étendues de l'Oracle
 * (7 Big4 baseline + 5 distinctives + 2 dormantes — cf. ADR-0014).
 *
 * Layout:
 * - 7 DC layer (Direction de Création — evaluation, architecture, presentation,
 *   diagnostic stratégique). Les outils sont analytiques (McKinsey 7S, BCG Portfolio,
 *   3-Horizons, Overton, Cult Index, Bain NPS, Tarsis), pas du visual identity
 *   pipeline (qui reste réservé au layer BRAND legacy de 10 tools cohérent avec
 *   la séquence BRAND historique se terminant par brand-guidelines-generator).
 *
 * Cascade hash-chain Glory→Brief→Forge (commit f9cd9de) préservée :
 * - Outputs avec `forgeOutput` (3 tools : bcg-portfolio-plotter, mckinsey-3-horizons-mapper,
 *   creative-evaluation-matrix étendu B2 in-place) déclenchent `chainGloryToPtah`
 * - Pendant `enrichAllSectionsNeteru()` (B4), le flag `oracleEnrichmentMode: true`
 *   court-circuite l'auto-trigger Ptah → forge déclenché manuellement via boutons B8
 *
 * Tous les tools réutilisent les services existants (anti-doublon NEFER §3) :
 * - cult-index-scorer → invoque `cult-index-engine` SESHAT (`src/server/services/cult-index-engine/`)
 * - tarsis-signal-detector → invoque `seshat/tarsis/` (weak signals)
 * - Aucun `new XxxEngine()` direct — tout via mestor.emitIntent()
 *
 * APOGEE compliance :
 * - Sous-système : Propulsion (Mission #1) — thrusters spécialisés
 * - Pilier 2 (Capability) : 7 champs manifest minimum (input/output schemas inferred,
 *   sideEffects via execution-journal)
 * - Pilier 4 (Pre-conditions) : tools forgeOutput déclarent manipulationProfile
 *   (gate MANIPULATION_COHERENCE enforced par ptah/governance.ts)
 * - Loi 3 (Conservation carburant) : qualityTier + costEstimate alimentent LLM Gateway
 */

import type { GloryToolDef } from "./registry";

export const PHASE13_ORACLE_TOOLS: GloryToolDef[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // BRAND layer — Big4 stratégie & analyse
  // ──────────────────────────────────────────────────────────────────────────

  {
    slug: "mckinsey-7s-analyzer",
    name: "Analyseur McKinsey 7S",
    layer: "DC",
    order: 41,
    executionType: "LLM",
    pillarKeys: ["A", "T"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Diagnostic structuré 7S (Strategy, Structure, Systems, Shared values, Style, Staff, Skills) — framework McKinsey baseline pour Oracle section 22.",
    inputFields: ["brand_dna", "current_strategy", "organization_structure", "core_values"],
    pillarBindings: {
      brand_dna: "a.noyauIdentitaire",
      current_strategy: "s.roadmap",
      organization_structure: "i.equipe",
      core_values: "a.valeurs",
    },
    outputFormat: "mckinsey_7s_map",
    promptTemplate: `Tu es un consultant McKinsey senior. Produis une analyse 7S complète pour cette marque.

ADN marque : {{brand_dna}}
Stratégie actuelle : {{current_strategy}}
Organisation : {{organization_structure}}
Valeurs centrales : {{core_values}}

Pour CHACUNE des 7 dimensions (Strategy, Structure, Systems, Shared Values, Style, Staff, Skills) :
- état actuel (factuel)
- gap vs ICONE target
- recommandation alignement (concrète, executable T+90 days)
- score d'alignement /10

Format JSON strict : { "strategy": {state, gap, recommendation, score}, ... 7 entries }.`,
    status: "ACTIVE",
  },

  {
    slug: "bcg-portfolio-plotter",
    name: "Traceur BCG Growth-Share Matrix",
    layer: "DC",
    order: 42,
    executionType: "COMPOSE", // CALC pour positionnement, COMPOSE pour visualisation Figma
    pillarKeys: ["T", "S"],
    requiredDrivers: [],
    dependencies: ["competitive-map-builder"],
    description:
      "Trace la BCG Growth-Share Matrix (Stars/Cash Cows/Question Marks/Dogs) pour le portefeuille business — Oracle section 23. Forgeable en deck Figma.",
    inputFields: ["business_units", "market_growth_rates", "relative_market_shares", "competitive_landscape"],
    pillarBindings: {
      business_units: "v.offresPrincipales",
      market_growth_rates: "t.tamSamSom",
      competitive_landscape: "t.competitivePositioning",
    },
    outputFormat: "bcg_portfolio_matrix",
    promptTemplate: `BCG Growth-Share Matrix :
Business units : {{business_units}}
Croissance marché : {{market_growth_rates}}
Part de marché relative : {{relative_market_shares}}

Pour chaque BU positionne en quadrant (Star / Cash Cow / Question Mark / Dog) avec coordonnées (growth_rate, relative_share).
Output JSON : { "quadrants": { "stars": [...], "cash_cows": [...], "question_marks": [...], "dogs": [...] }, "portfolio_health_score": 0-100, "strategic_recommendations": [...], "prompt": "<brief Figma deck description for forge>" }`,
    status: "ACTIVE",
    // forgeOutput déclenché manuellement via bouton "Forge now" B8 (oracleEnrichmentMode=false)
    forgeOutput: {
      forgeKind: "design",
      providerHint: "figma",
      modelHint: "deck",
      manipulationProfile: ["facilitator", "dealer"],
      briefTextPath: "prompt",
      defaultPillarSource: "T",
      // Phase 17 (ADR-0037) — bcg-portfolio-plotter : analyse stratégique sur positionnement
      requires: ["POSITIONING"],
    },
  },

  {
    slug: "mckinsey-3-horizons-mapper",
    name: "Mappeur McKinsey 3-Horizons of Growth",
    layer: "DC",
    order: 43,
    executionType: "LLM",
    pillarKeys: ["S", "I"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Cartographie les 3 horizons de croissance (H1 core, H2 emerging, H3 transformational) — framework McKinsey baseline pour Oracle section 26. Forgeable en deck Figma.",
    inputFields: ["current_business", "emerging_opportunities", "future_visions", "innovation_pipeline"],
    pillarBindings: {
      current_business: "v.offresPrincipales",
      emerging_opportunities: "t.signauxFaibles",
      future_visions: "s.roadmap",
      innovation_pipeline: "i.innovationPipeline",
    },
    outputFormat: "three_horizons_map",
    promptTemplate: `Mapping McKinsey 3-Horizons of Growth :

H1 (12 mois — core business actuel) : {{current_business}}
H2 (1-3 ans — opportunités émergentes) : {{emerging_opportunities}}
H3 (3-5+ ans — transformations stratégiques) : {{future_visions}}
Pipeline innovation : {{innovation_pipeline}}

Pour chaque horizon : objectifs, initiatives clés, KPIs, ressources allocation %, risques.
Output JSON : { "h1": {...}, "h2": {...}, "h3": {...}, "allocation_percentages": {h1, h2, h3}, "prompt": "<brief Figma deck>" }`,
    status: "ACTIVE",
    // forgeOutput déclenché manuellement via bouton "Forge now" B8
    forgeOutput: {
      forgeKind: "design",
      providerHint: "figma",
      modelHint: "deck",
      manipulationProfile: ["entertainer", "facilitator"],
      briefTextPath: "prompt",
      defaultPillarSource: "S",
      // Phase 17 (ADR-0037) — mckinsey-3-horizons-mapper : vision stratégique ancrée sur positionnement
      requires: ["POSITIONING"],
    },
  },

  {
    slug: "overton-window-mapper",
    name: "Cartographe Fenêtre d'Overton",
    layer: "DC",
    order: 44,
    executionType: "LLM",
    pillarKeys: ["S", "T"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Cartographie la position actuelle et cible de la marque dans la fenêtre d'Overton sectorielle — distinctif Oracle section 32 (vs Big4 qui n'analysent pas le déplacement culturel).",
    inputFields: ["sector", "current_brand_positioning", "cultural_signals", "audience_appetite"],
    pillarBindings: {
      sector: "t.secteurContexte",
      current_brand_positioning: "a.positionnement",
      cultural_signals: "t.signauxFaibles",
      audience_appetite: "e.audienceProfil",
    },
    outputFormat: "overton_window_map",
    promptTemplate: `Mapping fenêtre d'Overton sectorielle :

Secteur : {{sector}}
Positionnement actuel : {{current_brand_positioning}}
Signaux culturels : {{cultural_signals}}
Appétit audience : {{audience_appetite}}

Identifie :
1. État actuel de la fenêtre Overton sur les axes culturels critiques (3-5 axes)
2. Position actuelle de la marque sur chaque axe (mainstream / acceptable / sensible / radical / unthinkable)
3. Position cible APOGEE-compatible (pour devenir référence sectorielle)
4. Gap entre actuel et cible
5. 5 manœuvres concrètes pour déplacer la fenêtre (manipulationMode requis pour chaque)

Output JSON : { "axes": [{name, current_position, target_position, gap}], "maneuvers": [...] }`,
    status: "ACTIVE",
  },

  {
    slug: "cult-index-scorer",
    name: "Scoreur Cult Index",
    layer: "DC",
    order: 45,
    executionType: "CALC",
    pillarKeys: ["E", "A"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Calcule le Cult Index (score composite de masse culturelle) en invoquant le cult-index-engine SESHAT existant — distinctif Oracle section 29.",
    inputFields: ["devotion_metrics", "ritual_density", "vocabulary_internal", "enemy_named", "manifesto_strength"],
    pillarBindings: {
      devotion_metrics: "e.superfanScore",
      ritual_density: "e.rituelsCommunaute",
      vocabulary_internal: "d.assetsLinguistiques",
      enemy_named: "a.ennemi",
      manifesto_strength: "a.manifesto",
    },
    outputFormat: "cult_index_score",
    promptTemplate: `Cult Index calculation (formula reference: cult-index-engine SESHAT) :

Devotion metrics : {{devotion_metrics}}
Ritual density : {{ritual_density}}
Vocabulary internal : {{vocabulary_internal}}
Enemy named : {{enemy_named}}
Manifesto strength : {{manifesto_strength}}

Output JSON : { "cult_index_score": 0-100, "tier": "ZOMBIE|FRAGILE|ORDINAIRE|FORTE|CULTE|ICONE", "components": {devotion_pct, ritual_pct, vocabulary_pct, enemy_pct, manifesto_pct}, "tier_progression_recommendations": [...] }
Note : ce tool invoque cult-index-engine via mestor.emitIntent({kind: "RANK_PEERS"}) pour benchmark sectoriel — ne ré-implémente PAS la formule.`,
    status: "ACTIVE",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // DC layer — diagnostic & calcul
  // ──────────────────────────────────────────────────────────────────────────

  {
    slug: "bain-nps-calculator",
    name: "Calculateur Bain NPS (Net Promoter System)",
    layer: "DC",
    order: 46,
    executionType: "CALC",
    pillarKeys: ["E"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Calcule le NPS (Net Promoter Score) + segments Promoteurs/Passifs/Détracteurs + cohort drift selon framework Bain — Oracle section 24.",
    inputFields: ["customer_feedback", "satisfaction_scores", "cohort_data", "loyalty_indicators"],
    pillarBindings: {
      customer_feedback: "e.feedbackClient",
      satisfaction_scores: "e.satisfactionScore",
      cohort_data: "e.cohorts",
      loyalty_indicators: "e.fidelite",
    },
    outputFormat: "bain_nps_report",
    promptTemplate: `NPS Calculation Bain framework :

Feedback clients : {{customer_feedback}}
Scores satisfaction : {{satisfaction_scores}}
Cohort data : {{cohort_data}}
Indicateurs fidélité : {{loyalty_indicators}}

Calcul NPS :
- Score = % Promoters (9-10) - % Detractors (0-6)
- Segmentation 3 buckets avec counts
- Cohort drift over time
- Top 3 drivers Promoters / Top 3 drivers Detractors
- Industry benchmark sectoriel

Output JSON : { "nps_score": -100 to +100, "promoters_pct": 0-100, "passives_pct": 0-100, "detractors_pct": 0-100, "cohort_drift": [...], "drivers": {promoters, detractors}, "benchmark_vs_sector": delta }`,
    status: "ACTIVE",
  },

  {
    slug: "tarsis-signal-detector",
    name: "Détecteur de Signaux Faibles Tarsis",
    layer: "DC",
    order: 47,
    executionType: "LLM",
    pillarKeys: ["T"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Détecte les signaux faibles sectoriels (Tarsis = sous-organe sensoriel SESHAT) avec scoring impact + horizon — distinctif Oracle section 33.",
    inputFields: ["sector_news", "competitor_moves", "cultural_shifts", "regulation_changes", "tech_emergent"],
    pillarBindings: {
      sector_news: "t.actualites",
      competitor_moves: "t.competitivePositioning",
      cultural_shifts: "t.signauxFaibles",
      regulation_changes: "t.cadreReglementaire",
      tech_emergent: "t.technologiesEmergentes",
    },
    outputFormat: "tarsis_weak_signals",
    promptTemplate: `Détection signaux faibles Tarsis (invocation seshat/tarsis/) :

Actualités secteur : {{sector_news}}
Mouvements concurrents : {{competitor_moves}}
Shifts culturels : {{cultural_shifts}}
Changements réglementaires : {{regulation_changes}}
Tech émergent : {{tech_emergent}}

Pour chaque signal détecté :
- Description (1 phrase)
- Catégorie (cultural / competitive / regulatory / technological / economic)
- Impact estimé sur la marque (-10 à +10)
- Horizon de matérialisation (J+30 / J+90 / J+180 / J+365+)
- Action recommandée (monitor / prepare / pivot / capitalize)
- Confidence score 0-100

Output JSON : { "signals": [{description, category, impact, horizon, action, confidence}], "summary": "...", "top_3_priority": [...] }
Note : ce tool invoque tarsis via mestor.emitIntent({kind: "JEHUTY_FEED_REFRESH"}) pour scan sectoriel — ne ré-implémente PAS la détection.`,
    status: "ACTIVE",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 13 R4 — DEVOTION-LADDER tools (closure résidu B5)
  // 2 tools complémentaires pour la séquence DEVOTION-LADDER (section
  // distinctive Oracle 31). Réutilise services SESHAT existants
  // (devotion-engine, cult-index-engine) — anti-doublon NEFER §3.
  // ──────────────────────────────────────────────────────────────────────────

  {
    slug: "superfan-journey-mapper",
    name: "Mappeur Parcours Superfan",
    layer: "DC",
    order: 48,
    executionType: "LLM",
    pillarKeys: ["E", "A"],
    requiredDrivers: [],
    dependencies: [],
    description:
      "Cartographie l'échelle de devotion (visiteur → suiveur → fan → superfan → ambassadeur) avec triggers, expériences clés et taux de conversion par palier — section distinctive DEVOTION-LADDER.",
    inputFields: ["devotion_data", "personas", "touchpoints", "cult_signals", "current_devotion_score"],
    pillarBindings: {
      devotion_data: "e.feedbackClient",
      personas: "d.personas",
      touchpoints: "e.touchpoints",
      cult_signals: "e.rituelsCommunaute",
      current_devotion_score: "e.superfanScore",
    },
    outputFormat: "devotion_levels",
    promptTemplate: `Mapping devotion ladder pour la marque (invocation devotion-engine SESHAT) :

Devotion data : {{devotion_data}}
Personas : {{personas}}
Touchpoints : {{touchpoints}}
Cult signals : {{cult_signals}}
Current devotion score : {{current_devotion_score}}

Pour CHACUN des 5 paliers (visiteur, suiveur, fan, superfan, ambassadeur) :
- Définition opérationnelle (qui en fait partie ?)
- Trigger d'entrée (quel événement fait passer du palier précédent ?)
- Expérience clé (quoi vit le user à ce palier ?)
- Taux de conversion estimé vers le palier suivant (%)
- KPIs de mesure (3-5 par palier)
- Risques de redescente (drift signals)

Output JSON : { "levels": [{ palier, definition, trigger, experience, conversionPct, kpis, drifts }], "summary": "...", "current_distribution": {visiteurs, suiveurs, fans, superfans, ambassadeurs} }
Note : ce tool invoque devotion-engine SESHAT via mestor.emitIntent({kind: "RANK_PEERS"}) pour benchmark sectoriel.`,
    status: "ACTIVE",
  },

  {
    slug: "engagement-rituals-designer",
    name: "Designer Rituels d'Engagement",
    layer: "DC",
    order: 49,
    executionType: "LLM",
    pillarKeys: ["E", "D"],
    requiredDrivers: [],
    dependencies: ["superfan-journey-mapper"],
    description:
      "Conçoit les rituels d'engagement par palier devotion (cérémonies, codes, vocabulaire interne, badges, status symbols) — alimente la section DEVOTION-LADDER avec les artefacts culturels qui matérialisent l'appartenance.",
    inputFields: ["devotion_levels", "brand_dna", "tone_voice", "existing_rituals", "manipulation_mode"],
    pillarBindings: {
      brand_dna: "a.noyauIdentitaire",
      tone_voice: "d.tonDeVoix.personnalite",
      existing_rituals: "e.rituelsCommunaute",
      manipulation_mode: "s.manipulationMix",
    },
    outputFormat: "engagement_rituals",
    promptTemplate: `Design rituels d'engagement pour la marque :

Devotion levels (output superfan-journey-mapper) : {{devotion_levels}}
ADN marque : {{brand_dna}}
Ton de voix : {{tone_voice}}
Rituels existants : {{existing_rituals}}
Manipulation mode visé : {{manipulation_mode}}

Pour CHAQUE palier devotion (5 paliers du superfan-journey-mapper) :
- 2-3 rituels distinctifs (nom, description, fréquence, lieu/canal)
- Codes verbaux internes (vocabulaire, signe de reconnaissance)
- Status symbols (badges, items, accès exclusif)
- Cérémonies de promotion (passage au palier suivant)
- Compatibilité manipulation mode (peddler/dealer/facilitator/entertainer)

Output JSON : { "rituals_by_level": [{ palier, rituals: [{ name, description, frequency, channel }], codes, symbols, ceremonies }], "manifesto_extract": "...", "implementation_priorities": [...] }`,
    status: "ACTIVE",
  },
];
