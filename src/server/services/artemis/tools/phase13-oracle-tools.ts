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
 *   (gate MANIPULATION_COHERENCE — pre-flight Mestor, cf.
 *   `src/server/services/mestor/gates/manipulation-coherence.ts`, ADR-0038
 *   Phase 16-bis. Avant cette phase le gate était fantôme — comments only.)
 * - Loi 3 (Conservation carburant) : qualityTier + costEstimate alimentent LLM Gateway
 */

import { z } from "zod";
import type { GloryToolDef } from "./tool-types";

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
      organization_structure: "a.equipeDirigeante",
      core_values: "a.valeurs",
    },
    outputFormat: "mckinsey_7s_map",
        outputSchema: z.object({
      seven_s_map: z.object({
        strategy: z.object({ state: z.string(), gap: z.string(), recommendation: z.string(), score: z.number() }),
        structure: z.object({ state: z.string(), gap: z.string(), recommendation: z.string(), score: z.number() }),
        systems: z.object({ state: z.string(), gap: z.string(), recommendation: z.string(), score: z.number() }),
        shared_values: z.object({ state: z.string(), gap: z.string(), recommendation: z.string(), score: z.number() }),
        style: z.object({ state: z.string(), gap: z.string(), recommendation: z.string(), score: z.number() }),
        staff: z.object({ state: z.string(), gap: z.string(), recommendation: z.string(), score: z.number() }),
        skills: z.object({ state: z.string(), gap: z.string(), recommendation: z.string(), score: z.number() }),
      }),
      alignment_scores: z.object({ global: z.number(), weakest_dimension: z.string(), strongest_dimension: z.string() })
    }),
    promptTemplate: `Tu es un consultant McKinsey senior. Produis une analyse 7S complète pour cette marque.

ADN marque : {{brand_dna}}
Stratégie actuelle : {{current_strategy}}
Organisation : {{organization_structure}}
Valeurs centrales : {{core_values}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown autour. Si donnée manquante : "à enrichir" pour string, 5 pour score.

Schéma EXACT (clé "seven_s_map" obligatoire au top-level) :
{
  "seven_s_map": {
    "strategy":      { "state": "<état factuel 1-2 phrases>", "gap": "<écart vs ICONE>", "recommendation": "<action T+90j>", "score": <0-10> },
    "structure":     { "state": "...", "gap": "...", "recommendation": "...", "score": <0-10> },
    "systems":       { "state": "...", "gap": "...", "recommendation": "...", "score": <0-10> },
    "shared_values": { "state": "...", "gap": "...", "recommendation": "...", "score": <0-10> },
    "style":         { "state": "...", "gap": "...", "recommendation": "...", "score": <0-10> },
    "staff":         { "state": "...", "gap": "...", "recommendation": "...", "score": <0-10> },
    "skills":        { "state": "...", "gap": "...", "recommendation": "...", "score": <0-10> }
  },
  "alignment_scores": { "global": <0-10>, "weakest_dimension": "<nom>", "strongest_dimension": "<nom>" }
}

Règles : 7 clés OBLIGATOIRES (strategy/structure/systems/shared_values/style/staff/skills). score entier ∈ [0,10]. Pas de wrapper "result"/"data"/"output". Pas de champ supplémentaire.`,
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
    dependencies: ["competitive-analysis-builder"],
    description:
      "Trace la BCG Growth-Share Matrix (Stars/Cash Cows/Question Marks/Dogs) pour le portefeuille business — Oracle section 23. Forgeable en deck Figma.",
    inputFields: ["business_units", "market_growth_rates", "relative_market_shares", "competitive_landscape"],
    pillarBindings: {
      business_units: "v.produitsCatalogue",
      market_growth_rates: "t.tamSamSom",
      competitive_landscape: "d.paysageConcurrentiel",
    },
    outputFormat: "bcg_portfolio_matrix",
        outputSchema: z.object({
      bcg_quadrants: z.object({
        stars: z.array(z.object({ name: z.string(), growth_rate: z.number(), relative_share: z.number(), rationale: z.string() })),
        cash_cows: z.array(z.object({ name: z.string(), growth_rate: z.number(), relative_share: z.number(), rationale: z.string() })),
        question_marks: z.array(z.object({ name: z.string(), growth_rate: z.number(), relative_share: z.number(), rationale: z.string() })),
        dogs: z.array(z.object({ name: z.string(), growth_rate: z.number(), relative_share: z.number(), rationale: z.string() }))
      }),
      portfolio_health_score: z.number(),
      strategic_recommendations: z.array(z.string()),
      prompt: z.string()
    }),
    promptTemplate: `BCG Growth-Share Matrix :
Business units : {{business_units}}
Croissance marché : {{market_growth_rates}}
Part de marché relative : {{relative_market_shares}}
Paysage concurrentiel : {{competitive_landscape}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown.

Schéma EXACT :
{
  "bcg_quadrants": {
    "stars":          [{ "name": "<nom BU>", "growth_rate": <0-100>, "relative_share": <0-10>, "rationale": "<pourquoi star>" }],
    "cash_cows":      [{ "name": "...", "growth_rate": <0-100>, "relative_share": <0-10>, "rationale": "..." }],
    "question_marks": [{ "name": "...", "growth_rate": <0-100>, "relative_share": <0-10>, "rationale": "..." }],
    "dogs":           [{ "name": "...", "growth_rate": <0-100>, "relative_share": <0-10>, "rationale": "..." }]
  },
  "portfolio_health_score": <0-100>,
  "strategic_recommendations": ["<action 1>", "<action 2>", "<action 3>"],
  "prompt": "<brief Figma deck — 2-3 phrases>"
}

Règles : 4 clés quadrants OBLIGATOIRES (tableau vide [] si pas de BU dans ce quadrant — JAMAIS null). portfolio_health_score entier ∈ [0,100]. MIN 1 reco (max 5). Si business_units manquant : créer 1 BU "à enrichir" dans question_marks. Pas de wrapper. Pas de champ supplémentaire.`,
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
      current_business: "v.produitsCatalogue",
      emerging_opportunities: "t.marketReality.weakSignals",
      future_visions: "s.roadmap",
      innovation_pipeline: "i.innovationsProduit",
    },
    outputFormat: "three_horizons_map",
        outputSchema: z.object({
      h1: z.object({ objective: z.string(), initiatives: z.array(z.string()), kpis: z.array(z.string()), risks: z.array(z.string()) }),
      h2: z.object({ objective: z.string(), initiatives: z.array(z.string()), kpis: z.array(z.string()), risks: z.array(z.string()) }),
      h3: z.object({ objective: z.string(), initiatives: z.array(z.string()), kpis: z.array(z.string()), risks: z.array(z.string()) }),
      allocation_percentages: z.object({ h1: z.number(), h2: z.number(), h3: z.number() }),
      prompt: z.string()
    }),
    promptTemplate: `Mapping McKinsey 3-Horizons of Growth :

H1 (12 mois — core business actuel) : {{current_business}}
H2 (1-3 ans — opportunités émergentes) : {{emerging_opportunities}}
H3 (3-5+ ans — transformations stratégiques) : {{future_visions}}
Pipeline innovation : {{innovation_pipeline}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown.

Schéma EXACT :
{
  "h1": { "objective": "<obj H1>", "initiatives": ["...", "...", "..."], "kpis": ["...", "...", "..."], "risks": ["..."] },
  "h2": { "objective": "<obj H2>", "initiatives": ["...", "...", "..."], "kpis": ["...", "...", "..."], "risks": ["..."] },
  "h3": { "objective": "<obj H3>", "initiatives": ["...", "...", "..."], "kpis": ["...", "...", "..."], "risks": ["..."] },
  "allocation_percentages": { "h1": <0-100>, "h2": <0-100>, "h3": <0-100> },
  "prompt": "<brief Figma deck — 2-3 phrases>"
}

Règles : h1+h2+h3 OBLIGATOIRES. Somme h1+h2+h3 DOIT = 100 (typique 70/20/10). Chaque horizon : MIN 2 initiatives, MIN 2 KPIs, MIN 1 risque. Si manquant : "à enrichir" pour string, JAMAIS array vide. Pas de wrapper. Pas de champ supplémentaire.`,
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
      sector: "a.secteur",
      current_brand_positioning: "d.positionnement",
      cultural_signals: "t.marketReality.weakSignals",
      audience_appetite: "e.superfanPortrait",
    },
    outputFormat: "overton_window_map",
        outputSchema: z.object({
      axes: z.array(z.object({ name: z.string(), current_position: z.enum(['mainstream','acceptable','sensible','radical','unthinkable']), target_position: z.enum(['mainstream','acceptable','sensible','radical','unthinkable']), gap: z.string(), rationale: z.string() })),
      maneuvers: z.array(z.object({ title: z.string(), description: z.string(), manipulation_mode: z.enum(['peddler','dealer','facilitator','entertainer']), horizon: z.enum(['J+30','J+90','J+180','J+365']), expected_impact: z.string() }))
    }),
    promptTemplate: `Mapping fenêtre d'Overton sectorielle :

Secteur : {{sector}}
Positionnement actuel : {{current_brand_positioning}}
Signaux culturels : {{cultural_signals}}
Appétit audience : {{audience_appetite}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown.

Schéma EXACT :
{
  "axes": [
    { "name": "<axe culturel>", "current_position": "mainstream" | "acceptable" | "sensible" | "radical" | "unthinkable", "target_position": "mainstream" | "acceptable" | "sensible" | "radical" | "unthinkable", "gap": "<écart 1 phrase>", "rationale": "<pourquoi stratégique>" }
  ],
  "maneuvers": [
    { "title": "<intitulé>", "description": "<2-3 phrases>", "manipulation_mode": "peddler" | "dealer" | "facilitator" | "entertainer", "horizon": "J+30" | "J+90" | "J+180" | "J+365", "expected_impact": "<comment ça déplace la fenêtre>" }
  ]
}

Règles : axes MIN 3, MAX 5 (JAMAIS vide). maneuvers EXACTEMENT 5. current/target_position : utiliser STRICTEMENT une des 5 valeurs énumérées. manipulation_mode : STRICTEMENT une des 4 valeurs. Si manquant : "à enrichir" pour strings, JAMAIS array vide. Pas de wrapper. Pas de champ supplémentaire.`,
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
      devotion_metrics: "e.superfanPortrait",
      ritual_density: "e.rituels",
      vocabulary_internal: "d.assetsLinguistiques",
      enemy_named: "a.enemy",
      manifesto_strength: "a.missionStatement",
    },
    outputFormat: "cult_index_score",
        outputSchema: z.object({
      cult_index_score: z.number(),
      tier: z.enum(['LATENT','FRAGILE','ORDINAIRE','FORTE','CULTE','ICONE']),
      components: z.object({ devotion_pct: z.number(), ritual_pct: z.number(), vocabulary_pct: z.number(), enemy_pct: z.number(), manifesto_pct: z.number() }),
      tier_progression_recommendations: z.array(z.string())
    }),
    promptTemplate: `Cult Index calculation (formula reference: cult-index-engine SESHAT) :

Devotion metrics : {{devotion_metrics}}
Ritual density : {{ritual_density}}
Vocabulary internal : {{vocabulary_internal}}
Enemy named : {{enemy_named}}
Manifesto strength : {{manifesto_strength}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown.

Schéma EXACT :
{
  "cult_index_score": <0-100>,
  "tier": "LATENT" | "FRAGILE" | "ORDINAIRE" | "FORTE" | "CULTE" | "ICONE",
  "components": {
    "devotion_pct":   <0-100>,
    "ritual_pct":     <0-100>,
    "vocabulary_pct": <0-100>,
    "enemy_pct":      <0-100>,
    "manifesto_pct":  <0-100>
  },
  "tier_progression_recommendations": ["<action 1>", "<action 2>", "<action 3>"]
}

Règles : cult_index_score entier ∈ [0,100]. tier : STRICTEMENT une des 6 valeurs énumérées (majuscules). components : 5 clés OBLIGATOIRES, chacune entier ∈ [0,100] (estimation conservatrice ≤30 si donnée manquante). tier_progression_recommendations : MIN 2, MAX 5. Mapping score→tier : 0-15 LATENT, 16-30 FRAGILE, 31-50 ORDINAIRE, 51-70 FORTE, 71-90 CULTE, 91-100 ICONE. Pas de wrapper. Pas de champ supplémentaire.`,
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
      customer_feedback: "e.rituels",
      satisfaction_scores: "e.kpis",
      cohort_data: "e.superfanPortrait",
      loyalty_indicators: "e.superfanPortrait",
    },
    outputFormat: "bain_nps_report",
        outputSchema: z.object({
      nps_score: z.number(),
      promoters_pct: z.number(),
      passives_pct: z.number(),
      detractors_pct: z.number(),
      cohort_drift: z.array(z.object({ period: z.string(), nps: z.number(), trend: z.enum(['up','stable','down']) })),
      drivers: z.object({ promoters: z.array(z.string()), detractors: z.array(z.string()) }),
      benchmark_vs_sector: z.number()
    }),
    promptTemplate: `NPS Calculation Bain framework :

Feedback clients : {{customer_feedback}}
Scores satisfaction : {{satisfaction_scores}}
Cohort data : {{cohort_data}}
Indicateurs fidélité : {{loyalty_indicators}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown.

Schéma EXACT :
{
  "nps_score":      <-100 à +100>,
  "promoters_pct":  <0-100>,
  "passives_pct":   <0-100>,
  "detractors_pct": <0-100>,
  "cohort_drift": [
    { "period": "<ex: Q1 2026>", "nps": <-100 à +100>, "trend": "up" | "stable" | "down" }
  ],
  "drivers": {
    "promoters":  ["<driver 1>", "<driver 2>", "<driver 3>"],
    "detractors": ["<driver 1>", "<driver 2>", "<driver 3>"]
  },
  "benchmark_vs_sector": <-50 à +50>
}

Règles : nps_score = promoters_pct - detractors_pct (cohérent). promoters+passives+detractors = 100. drivers.promoters et drivers.detractors : EXACTEMENT 3 entrées chacun. cohort_drift : MIN 1 entrée (sinon "à enrichir"/nps=0/trend="stable"). benchmark_vs_sector : delta sectoriel (positif=meilleur). Si manquant : NPS=0, distribution conservatrice 20/60/20. trend : STRICTEMENT "up"|"stable"|"down". Pas de wrapper. Pas de champ supplémentaire.`,
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
      sector_news: "t.marketReality.macroTrends",
      competitor_moves: "d.paysageConcurrentiel",
      cultural_shifts: "t.marketReality.weakSignals",
      regulation_changes: "t.marketReality.macroTrends",
      tech_emergent: "t.marketReality.macroTrends",
    },
    outputFormat: "tarsis_weak_signals",
        outputSchema: z.object({
      signals: z.array(z.object({ description: z.string(), category: z.enum(['cultural','competitive','regulatory','technological','economic']), impact: z.number(), horizon: z.enum(['J+30','J+90','J+180','J+365']), action: z.enum(['monitor','prepare','pivot','capitalize']), confidence: z.number() })),
      summary: z.string(),
      top_3_priority: z.array(z.object({ description: z.string(), rationale: z.string() }))
    }),
    promptTemplate: `Détection signaux faibles Tarsis (invocation seshat/tarsis/) :

Actualités secteur : {{sector_news}}
Mouvements concurrents : {{competitor_moves}}
Shifts culturels : {{cultural_shifts}}
Changements réglementaires : {{regulation_changes}}
Tech émergent : {{tech_emergent}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown.

Schéma EXACT :
{
  "signals": [
    {
      "description": "<signal 1 phrase>",
      "category":    "cultural" | "competitive" | "regulatory" | "technological" | "economic",
      "impact":      <-10 à +10>,
      "horizon":     "J+30" | "J+90" | "J+180" | "J+365",
      "action":      "monitor" | "prepare" | "pivot" | "capitalize",
      "confidence":  <0-100>
    }
  ],
  "summary": "<synthèse 2-3 phrases sur la dynamique sectorielle globale>",
  "top_3_priority": [
    { "description": "<signal prioritaire 1>", "rationale": "<pourquoi prioritaire>" },
    { "description": "<signal prioritaire 2>", "rationale": "..." },
    { "description": "<signal prioritaire 3>", "rationale": "..." }
  ]
}

Règles : signals MIN 5, MAX 12 (JAMAIS vide). category/horizon/action : STRICTEMENT les valeurs énumérées. impact entier ∈ [-10,+10]. confidence entier ∈ [0,100]. top_3_priority EXACTEMENT 3 entrées (sélectionnées parmi signals à fort impact*confidence). summary JAMAIS vide (2-3 phrases). Si données vides : "à enrichir" pour description, impact=0. Pas de wrapper. Pas de champ supplémentaire.`,
    status: "ACTIVE",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 13 R4 — DEVOTION-LADDER tools (closure résidu B5)
  // 2 tools complémentaires pour la séquence DEVOTION-LADDER (section
  // distinctive Oracle 31). Réutilise services SESHAT existants
  // (devotion-engine, cult-index-engine) — anti-doublon NEFER §3.
  // ──────────────────────────────────────────────────────────────────────────

  {
    // Renommé depuis "superfan-journey-mapper" (audit Oracle 2026-06-11) : le slug
    // était DUPLIQUÉ avec l'outil legacy PLAYBOOK-E du registry (NEFER interdit #1).
    // getGloryTool = first-match → DEVOTION-LADDER recevait l'outil legacy sans
    // outputSchema et la section Oracle §33 restait vide.
    slug: "devotion-levels-mapper",
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
      devotion_data: "e.rituels",
      personas: "d.personas",
      touchpoints: "e.touchpoints",
      cult_signals: "e.rituels",
      current_devotion_score: "e.superfanPortrait",
    },
    outputFormat: "devotion_levels",
        outputSchema: z.object({
      devotion_levels: z.array(z.object({ palier: z.enum(['visiteur','suiveur','fan','superfan','ambassadeur']), definition: z.string(), trigger: z.string(), experience: z.string(), conversionPct: z.number(), kpis: z.array(z.string()), drifts: z.array(z.string()) })),
      summary: z.string(),
      current_distribution: z.object({ visiteurs: z.number(), suiveurs: z.number(), fans: z.number(), superfans: z.number(), ambassadeurs: z.number() })
    }),
    promptTemplate: `Mapping devotion ladder pour la marque (invocation devotion-engine SESHAT) :

Devotion data : {{devotion_data}}
Personas : {{personas}}
Touchpoints : {{touchpoints}}
Cult signals : {{cult_signals}}
Current devotion score : {{current_devotion_score}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown.

Schéma EXACT :
{
  "devotion_levels": [
    {
      "palier":        "visiteur" | "suiveur" | "fan" | "superfan" | "ambassadeur",
      "definition":    "<qui en fait partie — 1 phrase>",
      "trigger":       "<événement déclencheur>",
      "experience":    "<expérience clé>",
      "conversionPct": <0-100>,
      "kpis":          ["<KPI 1>", "<KPI 2>", "<KPI 3>"],
      "drifts":        ["<risque redescente 1>", "<risque 2>"]
    }
  ],
  "summary": "<synthèse 2-3 phrases sur la maturité actuelle de la ladder>",
  "current_distribution": {
    "visiteurs":     <0-100>,
    "suiveurs":      <0-100>,
    "fans":          <0-100>,
    "superfans":     <0-100>,
    "ambassadeurs":  <0-100>
  }
}

Règles : devotion_levels EXACTEMENT 5 entrées (visiteur → suiveur → fan → superfan → ambassadeur). palier : STRICTEMENT une des 5 valeurs énumérées. conversionPct : taux conversion vers palier SUIVANT (ambassadeur = 0 ou taux d'évangélisation). kpis MIN 3, MAX 5 par palier. drifts MIN 1, MAX 3. current_distribution : 5 clés OBLIGATOIRES, somme proche 100 (pyramide typique 70/20/7/2/1). summary JAMAIS vide. Si manquant : "à enrichir" pour strings. Pas de wrapper. Pas de champ supplémentaire.`,
    status: "ACTIVE",
  },

  {
    // Renommé depuis "engagement-rituals-designer" (même doublon, audit 2026-06-11).
    slug: "devotion-rituals-designer",
    name: "Designer Rituels d'Engagement",
    layer: "DC",
    order: 49,
    executionType: "LLM",
    pillarKeys: ["E", "D"],
    requiredDrivers: [],
    dependencies: ["devotion-levels-mapper"],
    description:
      "Conçoit les rituels d'engagement par palier devotion (cérémonies, codes, vocabulaire interne, badges, status symbols) — alimente la section DEVOTION-LADDER avec les artefacts culturels qui matérialisent l'appartenance.",
    inputFields: ["devotion_levels", "brand_dna", "tone_voice", "existing_rituals", "manipulation_mode"],
    // manipulation_mode : vit sur Strategy.manipulationMix (pas un pilier) —
    // fourni par le contexte de séquence / l'appelant, jamais via binding.
    pillarBindings: {
      brand_dna: "a.noyauIdentitaire",
      tone_voice: "d.tonDeVoix.personnalite",
      existing_rituals: "e.rituels",
    },
    outputFormat: "engagement_rituals",
        outputSchema: z.object({
      rituals_by_level: z.array(z.object({ palier: z.enum(['visiteur','suiveur','fan','superfan','ambassadeur']), rituals: z.array(z.object({ name: z.string(), description: z.string(), frequency: z.enum(['daily','weekly','monthly','quarterly','event-based']), channel: z.string() })), codes: z.array(z.string()), symbols: z.array(z.string()), ceremonies: z.array(z.string()) })),
      manifesto_extract: z.string(),
      implementation_priorities: z.array(z.object({ priority: z.number(), action: z.string(), owner: z.string() }))
    }),
    promptTemplate: `Design rituels d'engagement pour la marque :

Devotion levels (output superfan-journey-mapper) : {{devotion_levels}}
ADN marque : {{brand_dna}}
Ton de voix : {{tone_voice}}
Rituels existants : {{existing_rituals}}
Manipulation mode visé : {{manipulation_mode}}

⚠️ FORMAT DE SORTIE VERROUILLÉ — Réponds UNIQUEMENT avec ce JSON exact, aucun préambule, aucun markdown.

Schéma EXACT :
{
  "rituals_by_level": [
    {
      "palier":  "visiteur" | "suiveur" | "fan" | "superfan" | "ambassadeur",
      "rituals": [
        { "name": "<nom>", "description": "<2 phrases>", "frequency": "daily" | "weekly" | "monthly" | "quarterly" | "event-based", "channel": "<canal/lieu>" }
      ],
      "codes":      ["<code verbal 1>"],
      "symbols":    ["<badge/item 1>"],
      "ceremonies": ["<cérémonie passage palier suivant>"]
    }
  ],
  "manifesto_extract": "<extrait 2-3 phrases qui ancre les rituels>",
  "implementation_priorities": [
    { "priority": <1-5>, "action": "<action concrète T+30j>", "owner": "<rôle responsable>" }
  ]
}

Règles : rituals_by_level EXACTEMENT 5 entrées (1 par palier, ordre visiteur → ambassadeur). rituals MIN 2, MAX 3 par palier. frequency : STRICTEMENT une des 5 valeurs. codes MIN 1, MAX 4. symbols MIN 1, MAX 3. ceremonies MIN 1, MAX 2. implementation_priorities MIN 3, MAX 7 (priority entier ∈ [1,5], 1=top). manifesto_extract JAMAIS vide. Si manquant : "à enrichir" pour strings. Pas de wrapper. Pas de champ supplémentaire.`,
    status: "ACTIVE",
  },
];
