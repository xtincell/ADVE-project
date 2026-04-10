/**
 * GLORY Sequences — Orchestration Layer
 *
 * Each sequence is an ordered chain of heterogeneous steps that produces
 * a concrete deliverable. Steps can invoke different services:
 *
 *   GLORY   — A GLORY tool (registry.ts slug)
 *   ARTEMIS — An Artemis diagnostic framework (fw-XX-slug)
 *   SESHAT  — A Seshat Knowledge Graph query
 *   MESTOR  — A Mestor cascade or insight generation
 *   PILLAR  — Pure data injection from an ADVE-RTIS pillar (no AI)
 *   CALC    — Financial/mathematical calculation (no AI)
 *
 * 31 sequences organized in 4 families:
 *   PILLAR      — 8 fundamental deliverables (one per ADVE-RTIS letter)
 *   PRODUCTION  — 11 creative deliverables (KV, spot, print, social, etc.)
 *   STRATEGIC   — 5 strategic orchestrations (campaign, launch, pitch, etc.)
 *   OPERATIONAL — 7 operational workflows incl. 3 financial (no AI)
 *
 * Tools are ABSOLUTE and don't know about sequences.
 * Sequences reference tools by slug and chain their input→output.
 */

import type { GloryToolDef } from "./registry";
import { getGloryTool } from "./registry";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SequenceStepType = "GLORY" | "ARTEMIS" | "SESHAT" | "MESTOR" | "PILLAR" | "CALC" | "SEQUENCE" | "ASSET";

export type GlorySequenceFamily = "PILLAR" | "PRODUCTION" | "STRATEGIC" | "OPERATIONAL";

export type GlorySequenceKey =
  // Pillar (8)
  | "MANIFESTE-A" | "BRANDBOOK-D" | "OFFRE-V" | "PLAYBOOK-E"
  | "AUDIT-R" | "ETUDE-T" | "BRAINSTORM-I" | "ROADMAP-S"
  // Crystallisation (2) — T0.5
  | "POSITIONING" | "PERSONA-MAP"
  // Identity (4) — T1
  | "BRAND" | "NAMING" | "MESSAGING" | "BRAND-AUDIT"
  // Production (9) — T2
  | "KV" | "SPOT-VIDEO" | "SPOT-RADIO" | "PRINT-AD" | "OOH"
  | "SOCIAL-POST" | "STORY-ARC" | "WEB-COPY" | "PACKAGING"
  // Planification (2) — T2.5
  | "MEDIA-PLAN" | "CONTENT-CALENDAR"
  // Campaign (5) — T3
  | "CAMPAIGN-360" | "CAMPAIGN-SINGLE" | "LAUNCH" | "REBRAND" | "PITCH"
  // Strategy (2) — T4
  | "ANNUAL-PLAN" | "QUARTERLY-REVIEW"
  // Operational (8) — T5
  | "OPS" | "GUARD" | "EVAL" | "INFLUENCE"
  | "COST-SERVICE" | "COST-CAMPAIGN" | "PROFITABILITY" | "RETAINER-REPORT"
  // Creative Frameworks
  | "CHARACTER-LSI"
  | "MASCOTTE";

export interface SequenceStep {
  type: SequenceStepType;
  /** Slug of the tool/framework/query to invoke */
  ref: string;
  /** Human-readable step name */
  name: string;
  /** Which output keys feed into subsequent steps */
  outputKeys: string[];
  /** ACTIVE = exists and works. PLANNED = to be built. */
  status: "ACTIVE" | "PLANNED";
}

/** Prerequisite for the skill tree combo system */
export type SequencePrerequisite =
  | { type: "SEQUENCE"; key: GlorySequenceKey; status: "ACCEPTED" }
  | { type: "SEQUENCE_ANY"; tier: number; count: number; status: "ACCEPTED" }
  | { type: "PILLAR"; key: string; maturity: "ENRICHED" | "COMPLETE" }
  ;

export interface GlorySequenceDef {
  key: GlorySequenceKey;
  family: GlorySequenceFamily;
  name: string;
  description: string;
  /** For pillar sequences: which ADVE-RTIS letter */
  pillar?: string;
  /** Ordered steps — heterogeneous types */
  steps: SequenceStep[];
  /** Whether any step uses AI (LLM). False = pure COMPOSE/CALC/data */
  aiPowered: boolean;
  /** True if the sequence has been refined and validated */
  refined: boolean;
  /** Skill tree tier (0=foundation, 1=identity, 2=production, 3=campaign, 4=strategy, 5=operations) */
  tier: number;
  /** Prerequisites that must be ACCEPTED before this sequence can execute */
  requires: SequencePrerequisite[];
}

// ─── Helper: build steps ─────────────────────────────────────────────────────

const glory = (ref: string, outputs: string[] = []): SequenceStep => ({
  type: "GLORY", ref, name: getGloryTool(ref)?.name ?? ref, outputKeys: outputs, status: "ACTIVE",
});
const artemis = (ref: string, name: string, outputs: string[] = []): SequenceStep => ({
  type: "ARTEMIS", ref, name, outputKeys: outputs, status: "ACTIVE",
});
const seshat = (ref: string, name: string, outputs: string[] = []): SequenceStep => ({
  type: "SESHAT", ref, name, outputKeys: outputs, status: "ACTIVE",
});
const mestor = (ref: string, name: string, outputs: string[] = []): SequenceStep => ({
  type: "MESTOR", ref, name, outputKeys: outputs, status: "ACTIVE",
});
const pillar = (ref: string, name: string, outputs: string[] = []): SequenceStep => ({
  type: "PILLAR", ref, name, outputKeys: outputs, status: "ACTIVE",
});
const calc = (ref: string, name: string, outputs: string[] = []): SequenceStep => ({
  type: "CALC", ref, name, outputKeys: outputs, status: "ACTIVE",
});
const planned = (type: SequenceStepType, ref: string, name: string, outputs: string[] = []): SequenceStep => ({
  type, ref, name, outputKeys: outputs, status: "PLANNED",
});
/** Encapsulate an entire sub-sequence as a step. The ref is the sub-sequence key. */
const sequence = (ref: string, name: string, outputs: string[] = []): SequenceStep => ({
  type: "SEQUENCE", ref, name, outputKeys: outputs, status: "ACTIVE",
});
/** Inject accepted BrandAsset from vault. Format: "SEQUENCE_KEY:asset_field" */
const asset = (ref: string, name: string, outputs: string[] = []): SequenceStep => ({
  type: "ASSET", ref, name, outputKeys: outputs, status: "ACTIVE",
});

// ═════════════════════════════════════════════════════════════════════════════
// PILLAR SEQUENCES — 8 fundamental deliverables (one per ADVE-RTIS letter)
// ═════════════════════════════════════════════════════════════════════════════

const PILLAR_SEQUENCES: GlorySequenceDef[] = [
  {
    key: "MANIFESTE-A",
    family: "PILLAR",
    name: "Le Manifeste",
    description: "Document fondateur de l'Authenticité — ADN, archétype, prophétie, voix, manifeste rédigé.",
    pillar: "A",
    steps: [
      pillar("a", "Injection données pilier A", ["archetype", "prophecy", "brand_dna", "values"]),
      artemis("fw-01-brand-archeology", "Archéologie de Marque", ["analysis", "archetypeDeep"]),
      seshat("cultural-refs", "Références culturelles", ["references"]),
      glory("wordplay-cultural-bank", ["wordplay_bank"]),
      glory("concept-generator", ["concepts_list"]),
      glory("tone-of-voice-designer", ["tone_charter"]),
      glory("claim-baseline-factory", ["claims_list"]),
      glory("manifesto-writer", ["manifesto"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 0,
    requires: [{ type: "PILLAR", key: "a", maturity: "ENRICHED" }],
  },
  {
    key: "BRANDBOOK-D",
    family: "PILLAR",
    name: "Le Brandbook",
    description: "Système visuel complet du pilier Distinction — identité, codes, guidelines.",
    pillar: "D",
    steps: [
      pillar("d", "Injection données pilier D", ["directionArtistique", "brand_personality"]),
      glory("semiotic-brand-analyzer", ["semiotic_analysis"]),
      glory("visual-landscape-mapper", ["visual_landscape_map"]),
      glory("visual-moodboard-generator", ["moodboard_directions"]),
      glory("photography-style-guide", ["photo_guidelines"]),
      glory("chromatic-strategy-builder", ["chromatic_strategy"]),
      glory("typography-system-architect", ["typography_system"]),
      glory("logo-type-advisor", ["logotype_direction"]),
      glory("logo-validation-protocol", ["logo_validation_report"]),
      glory("design-token-architect", ["design_tokens"]),
      glory("iconography-system-builder", ["icon_system"]),
      glory("motion-identity-designer", ["motion_identity"]),
      glory("brand-guidelines-generator", ["brand_guidelines"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 0,
    requires: [{ type: "PILLAR", key: "d", maturity: "ENRICHED" }],
  },
  {
    key: "OFFRE-V",
    family: "PILLAR",
    name: "L'Offre Commerciale",
    description: "Document de Valeur — proposition de valeur, pricing, argumentaire, deck commercial.",
    pillar: "V",
    steps: [
      pillar("v", "Injection données pilier V", ["pricing", "proofPoints", "guarantees", "unitEconomics"]),
      seshat("sector-benchmarks", "Benchmarks sectoriels", ["benchmarks"]),
      glory("benchmark-reference-finder", ["benchmark_report"]),
      glory("value-proposition-builder", ["value_proposition"]),
      glory("claim-baseline-factory", ["claims_list"]),
      calc("pricing-strategy-advisor", "Stratégie Pricing", ["pricing_strategy"]),
      glory("devis-generator", ["devis"]),
      glory("client-presentation-strategist", ["presentation_strategy"]),
      glory("sales-deck-builder", ["sales_deck"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 0,
    requires: [{ type: "PILLAR", key: "v", maturity: "ENRICHED" }],
  },
  {
    key: "PLAYBOOK-E",
    family: "PILLAR",
    name: "Le Playbook Engagement",
    description: "Playbook communauté, content, rituels de marque, parcours superfan.",
    pillar: "E",
    steps: [
      pillar("e", "Injection données pilier E", ["touchpoints", "rituals", "devotionLadder", "community"]),
      artemis("fw-07-touchpoint-mapping", "Cartographie Touchpoints", ["touchpoints_enriched"]),
      artemis("fw-08-ritual-design", "Design de Rituels", ["rituals_enriched"]),
      glory("concept-generator", ["concepts_list"]),
      glory("social-copy-engine", ["social_copy_set"]),
      glory("storytelling-sequencer", ["story_sequence"]),
      glory("content-calendar-strategist", ["content_calendar"]),
      glory("community-playbook-generator", ["community_playbook"]),
      glory("superfan-journey-mapper", ["superfan_journey"]),
      glory("engagement-rituals-designer", ["brand_rituals"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 0,
    requires: [{ type: "PILLAR", key: "e", maturity: "ENRICHED" }],
  },
  {
    key: "AUDIT-R",
    family: "PILLAR",
    name: "L'Audit Interne",
    description: "Diagnostic risques de marque, conformité, vulnérabilités, plan de mitigation.",
    pillar: "R",
    steps: [
      pillar("r", "Injection données pilier R", ["globalSwot", "mitigationPriorities"]),
      mestor("actualize-r", "Actualisation pilier R", ["riskScore", "riskMatrix"]),
      artemis("fw-22-risk-matrix", "Matrice de Risques", ["risk_analysis"]),
      glory("brand-guardian-system", ["compliance_report"]),
      glory("risk-matrix-builder", ["risk_matrix"]),
      glory("crisis-communication-planner", ["crisis_plan"]),
      glory("creative-evaluation-matrix", ["evaluation_matrix"]),
      glory("compliance-checklist-generator", ["compliance_checklist"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 0,
    requires: [{ type: "PILLAR", key: "r", maturity: "ENRICHED" }],
  },
  {
    key: "ETUDE-T",
    family: "PILLAR",
    name: "L'Étude de Marché",
    description: "Intelligence marché, analyse concurrentielle, tendances, sizing, insights.",
    pillar: "T",
    steps: [
      pillar("t", "Injection données pilier T", ["tamSamSom", "triangulation", "hypothesisValidation"]),
      seshat("market-intelligence", "Intelligence marché Seshat", ["market_data"]),
      artemis("fw-11-brand-market-fit", "Brand-Market Fit", ["market_fit"]),
      artemis("fw-12-tam-sam-som", "TAM/SAM/SOM", ["market_sizing"]),
      glory("benchmark-reference-finder", ["benchmark_report"]),
      glory("competitive-analysis-builder", ["competitive_analysis"]),
      calc("market-sizing-estimator", "Estimation Taille Marché", ["market_size"]),
      glory("trend-radar-builder", ["trend_radar"]),
      mestor("actualize-t", "Actualisation pilier T", ["trackScore"]),
      glory("post-campaign-reader", ["post_campaign_report"]),
      glory("insight-synthesizer", ["insights"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 0,
    requires: [{ type: "PILLAR", key: "t", maturity: "ENRICHED" }],
  },
  {
    key: "BRAINSTORM-I",
    family: "PILLAR",
    name: "Le Brainstorm 360",
    description: "Idéation multi-canaux, architecture de campagne, allocation ressources.",
    pillar: "I",
    steps: [
      pillar("i", "Injection données pilier I", ["catalogueParCanal", "assetsProduisibles"]),
      mestor("actualize-i", "Actualisation pilier I", ["actionCatalog"]),
      glory("brief-creatif-interne", ["creative_brief"]),
      glory("ideation-workshop-facilitator", ["ideation_output"]),
      glory("concept-generator", ["concepts_list"]),
      glory("campaign-architecture-planner", ["campaign_architecture"]),
      glory("creative-direction-memo", ["direction_memo"]),
      glory("production-budget-optimizer", ["budget_optimization"]),
      glory("resource-allocation-planner", ["resource_plan"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 0,
    requires: [{ type: "PILLAR", key: "i", maturity: "ENRICHED" }],
  },
  {
    key: "ROADMAP-S",
    family: "PILLAR",
    name: "La Roadmap Stratégique",
    description: "Vision long terme, objectifs, KPIs, jalons, gouvernance stratégique.",
    pillar: "S",
    steps: [
      pillar("s", "Injection données pilier S", ["fenetreOverton", "roadmap", "sprint90Days", "kpiDashboard"]),
      mestor("actualize-s", "Actualisation pilier S", ["syntheseExecutive"]),
      glory("benchmark-reference-finder", ["benchmark_report"]),
      glory("strategic-diagnostic", ["swot_augmented"]),
      glory("campaign-architecture-planner", ["campaign_architecture"]),
      glory("kpi-framework-builder", ["kpi_framework"]),
      glory("digital-planner", ["digital_plan"]),
      glory("milestone-roadmap-builder", ["roadmap"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 0,
    requires: [{ type: "PILLAR", key: "s", maturity: "ENRICHED" }],
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// PRODUCTION SEQUENCES — one deliverable = one sequence
// ═════════════════════════════════════════════════════════════════════════════

const PRODUCTION_SEQUENCES: GlorySequenceDef[] = [
  {
    key: "BRAND",
    family: "PRODUCTION",
    name: "Identité Visuelle",
    description: "Pipeline séquentiel de 10 outils — de l'analyse sémiotique aux brand guidelines.",
    steps: [
      glory("semiotic-brand-analyzer", ["semiotic_analysis"]),
      glory("visual-landscape-mapper", ["visual_landscape_map"]),
      glory("visual-moodboard-generator", ["moodboard_directions"]),
      glory("chromatic-strategy-builder", ["chromatic_strategy"]),
      glory("typography-system-architect", ["typography_system"]),
      glory("logo-type-advisor", ["logotype_direction"]),
      glory("logo-validation-protocol", ["logo_validation_report"]),
      glory("design-token-architect", ["design_tokens"]),
      glory("motion-identity-designer", ["motion_identity"]),
      glory("brand-guidelines-generator", ["brand_guidelines"]),
    ],
    aiPowered: true,
    refined: true,
    tier: 1,
    requires: [{ type: "SEQUENCE", key: "MANIFESTE-A", status: "ACCEPTED" }, { type: "SEQUENCE", key: "BRANDBOOK-D", status: "ACCEPTED" }],
  },
  {
    key: "KV",
    family: "PRODUCTION",
    name: "Key Visual de Campagne",
    description: "Du concept au prompt AI image optimisé pour KV — avec validation brand.",
    steps: [
      pillar("a", "Injection A (archétype, prophétie)", ["archetype", "prophecy", "personality"]),
      pillar("d", "Injection D (chromatic, typo, moodboard)", ["chromatic_strategy", "typography_system", "moodboard"]),
      glory("concept-generator", ["concepts_list"]),
      glory("claim-baseline-factory", ["claims_list"]),
      glory("creative-evaluation-matrix", ["evaluation_matrix"]),
      glory("idea-killer-saver", ["idea_triage"]),
      glory("kv-art-direction-brief", ["kv_brief"]),
      glory("kv-banana-prompt-generator", ["kv_prompts_list"]),
      glory("kv-review-validator", ["kv_validation"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 2,
    requires: [{ type: "SEQUENCE", key: "BRAND", status: "ACCEPTED" }, { type: "SEQUENCE", key: "OFFRE-V", status: "ACCEPTED" }],
  },
  {
    key: "SPOT-VIDEO",
    family: "PRODUCTION",
    name: "Spot Pub Vidéo / TV",
    description: "Du concept au dossier de production vidéo — script, dialogues, storyboard, briefs.",
    steps: [
      pillar("a", "Injection A (ton, personnalité)", ["tone_of_voice", "personality"]),
      glory("concept-generator", ["concepts_list"]),
      glory("script-writer", ["script"]),
      glory("dialogue-writer", ["dialogue"]),
      glory("storyboard-generator", ["storyboard"]),
      glory("casting-brief-generator", ["casting_brief"]),
      glory("music-sound-brief", ["sound_brief"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 2,
    requires: [{ type: "SEQUENCE", key: "BRAND", status: "ACCEPTED" }, { type: "SEQUENCE", key: "PLAYBOOK-E", status: "ACCEPTED" }],
  },
  {
    key: "SPOT-RADIO",
    family: "PRODUCTION",
    name: "Spot Radio / Audio",
    description: "Du concept au spot radio — script, dialogues, brief voix off et son.",
    steps: [
      pillar("a", "Injection A (ton)", ["tone_of_voice"]),
      glory("concept-generator", ["concepts_list"]),
      glory("script-writer", ["script"]),
      glory("dialogue-writer", ["dialogue"]),
      glory("voiceover-brief-generator", ["voiceover_brief"]),
      glory("music-sound-brief", ["sound_brief"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 2,
    requires: [{ type: "SEQUENCE", key: "BRAND", status: "ACCEPTED" }],
  },
  {
    key: "PRINT-AD",
    family: "PRODUCTION",
    name: "Annonce Presse",
    description: "Du concept à la maquette presse — claim, layout, body copy, brand check.",
    steps: [
      pillar("d", "Injection D (chromatic, typo)", ["chromatic_strategy", "typography_system"]),
      glory("concept-generator", ["concepts_list"]),
      glory("claim-baseline-factory", ["claims_list"]),
      glory("print-ad-architect", ["print_ad_spec"]),
      glory("long-copy-craftsman", ["long_copy"]),
      glory("brand-guardian-system", ["compliance_report"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 2,
    requires: [{ type: "SEQUENCE", key: "BRAND", status: "ACCEPTED" }],
  },
  {
    key: "OOH",
    family: "PRODUCTION",
    name: "Affichage Extérieur",
    description: "Du concept au pack OOH multi-formats — claim, layout, déclinaisons.",
    steps: [
      pillar("d", "Injection D (chromatic, typo)", ["chromatic_strategy", "typography_system"]),
      glory("concept-generator", ["concepts_list"]),
      glory("claim-baseline-factory", ["claims_list"]),
      glory("print-ad-architect", ["print_ad_spec"]),
      glory("format-declination-engine", ["format_specs"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 2,
    requires: [{ type: "SEQUENCE", key: "BRAND", status: "ACCEPTED" }, { type: "SEQUENCE", key: "KV", status: "ACCEPTED" }],
  },
  {
    key: "SOCIAL-POST",
    family: "PRODUCTION",
    name: "Post Social Unitaire",
    description: "Du concept au post social finalisé — copy plateforme, brand check.",
    steps: [
      pillar("e", "Injection E (community, tone)", ["community", "tone_of_voice"]),
      glory("concept-generator", ["concepts_list"]),
      glory("social-copy-engine", ["social_copy_set"]),
      glory("brand-guardian-system", ["compliance_report"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 2,
    requires: [{ type: "SEQUENCE", key: "BRANDBOOK-D", status: "ACCEPTED" }, { type: "SEQUENCE_ANY", tier: 2, count: 1, status: "ACCEPTED" }],
  },
  {
    key: "STORY-ARC",
    family: "PRODUCTION",
    name: "Arc Narratif Multi-Contenus",
    description: "Du concept à l'arc en épisodes avec calendrier de publication.",
    steps: [
      pillar("a", "Injection A (storytelling)", ["personality", "values"]),
      glory("concept-generator", ["concepts_list"]),
      glory("storytelling-sequencer", ["story_sequence"]),
      glory("social-copy-engine", ["social_copy_set"]),
      glory("content-calendar-strategist", ["content_calendar"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 2,
    requires: [{ type: "SEQUENCE", key: "MANIFESTE-A", status: "ACCEPTED" }, { type: "SEQUENCE", key: "PLAYBOOK-E", status: "ACCEPTED" }],
  },
  {
    key: "WEB-COPY",
    family: "PRODUCTION",
    name: "Contenu Web / Landing Page",
    description: "Du concept au contenu web long-format — copy persuasif, brand check.",
    steps: [
      pillar("v", "Injection V (proposition valeur)", ["proofPoints", "guarantees"]),
      glory("concept-generator", ["concepts_list"]),
      glory("long-copy-craftsman", ["long_copy"]),
      glory("seo-copy-optimizer", ["seo_report"]),
      glory("brand-guardian-system", ["compliance_report"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 2,
    requires: [{ type: "SEQUENCE", key: "BRANDBOOK-D", status: "ACCEPTED" }, { type: "SEQUENCE", key: "OFFRE-V", status: "ACCEPTED" }],
  },
  {
    key: "NAMING",
    family: "PRODUCTION",
    name: "Naming Marque / Produit",
    description: "De l'analyse sémiotique au nom validé — exploration, claims, évaluation, check légal.",
    steps: [
      pillar("a", "Injection A (ADN, valeurs)", ["brand_dna", "values"]),
      glory("semiotic-brand-analyzer", ["semiotic_analysis"]),
      glory("wordplay-cultural-bank", ["wordplay_bank"]),
      glory("naming-generator", ["name_proposals"]),
      glory("claim-baseline-factory", ["claims_list"]),
      glory("creative-evaluation-matrix", ["evaluation_matrix"]),
      glory("naming-legal-checker", ["legal_check"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 1,
    requires: [{ type: "SEQUENCE", key: "MANIFESTE-A", status: "ACCEPTED" }],
  },
  {
    key: "PACKAGING",
    family: "PRODUCTION",
    name: "Direction Packaging",
    description: "De l'analyse sémiotique au brief packaging — chromatic, typo, layout, vendor.",
    steps: [
      pillar("d", "Injection D (direction artistique)", ["directionArtistique"]),
      glory("semiotic-brand-analyzer", ["semiotic_analysis"]),
      glory("chromatic-strategy-builder", ["chromatic_strategy"]),
      glory("typography-system-architect", ["typography_system"]),
      glory("packaging-layout-advisor", ["packaging_layout"]),
      glory("vendor-brief-generator", ["vendor_brief"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 2,
    requires: [{ type: "SEQUENCE", key: "BRAND", status: "ACCEPTED" }, { type: "SEQUENCE", key: "OFFRE-V", status: "ACCEPTED" }],
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// STRATEGIC SEQUENCES
// ═════════════════════════════════════════════════════════════════════════════

const STRATEGIC_SEQUENCES: GlorySequenceDef[] = [
  {
    key: "CAMPAIGN-360",
    family: "STRATEGIC",
    name: "Campagne 360°",
    description: "Du brief à la simulation — architecture, direction créative, plan média, simulation.",
    steps: [
      pillar("i", "Injection I (catalogue actions)", ["catalogueParCanal"]),
      glory("brief-creatif-interne", ["creative_brief"]),
      glory("concept-generator", ["concepts_list"]),
      glory("campaign-architecture-planner", ["campaign_architecture"]),
      glory("creative-direction-memo", ["direction_memo"]),
      glory("media-plan-builder", ["media_plan"]),
      glory("digital-planner", ["digital_plan"]),
      glory("campaign-360-simulator", ["simulation_report"]),
      glory("multi-team-coherence-checker", ["coherence_report"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 3,
    requires: [{ type: "SEQUENCE_ANY", tier: 2, count: 3, status: "ACCEPTED" }, { type: "SEQUENCE", key: "ROADMAP-S", status: "ACCEPTED" }],
  },
  {
    key: "LAUNCH",
    family: "STRATEGIC",
    name: "Lancement Produit / Marque",
    description: "Du benchmark au plan de lancement — analyse, brief, campagne, timeline.",
    steps: [
      seshat("market-intel", "Intelligence marché", ["market_data"]),
      glory("benchmark-reference-finder", ["benchmark_report"]),
      glory("competitive-analysis-builder", ["competitive_analysis"]),
      glory("brief-creatif-interne", ["creative_brief"]),
      glory("concept-generator", ["concepts_list"]),
      glory("campaign-architecture-planner", ["campaign_architecture"]),
      glory("digital-planner", ["digital_plan"]),
      glory("campaign-360-simulator", ["simulation_report"]),
      glory("launch-timeline-planner", ["launch_timeline"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 3,
    requires: [{ type: "SEQUENCE", key: "CAMPAIGN-360", status: "ACCEPTED" }, { type: "SEQUENCE", key: "ETUDE-T", status: "ACCEPTED" }],
  },
  {
    key: "REBRAND",
    family: "STRATEGIC",
    name: "Rebranding",
    description: "De l'audit à la migration — audit existant, pipeline brand, migration guidelines.",
    steps: [
      glory("brand-audit-scanner", ["brand_audit"]),
      glory("semiotic-brand-analyzer", ["semiotic_analysis"]),
      glory("visual-landscape-mapper", ["visual_landscape_map"]),
      glory("visual-moodboard-generator", ["moodboard_directions"]),
      glory("chromatic-strategy-builder", ["chromatic_strategy"]),
      glory("typography-system-architect", ["typography_system"]),
      glory("logo-type-advisor", ["logotype_direction"]),
      glory("logo-validation-protocol", ["logo_validation_report"]),
      glory("design-token-architect", ["design_tokens"]),
      glory("brand-guidelines-generator", ["brand_guidelines"]),
      glory("migration-playbook-generator", ["migration_playbook"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 3,
    requires: [{ type: "SEQUENCE", key: "BRAND", status: "ACCEPTED" }, { type: "SEQUENCE", key: "AUDIT-R", status: "ACCEPTED" }],
  },
  {
    key: "PITCH",
    family: "STRATEGIC",
    name: "Pitch & Compétition",
    description: "Du benchmark au deck de pitch — références, brief, concept, pitch, présentation.",
    steps: [
      seshat("competitive-refs", "Références compétitives", ["references"]),
      glory("benchmark-reference-finder", ["benchmark_report"]),
      glory("competitive-analysis-builder", ["competitive_analysis"]),
      glory("brief-creatif-interne", ["creative_brief"]),
      glory("concept-generator", ["concepts_list"]),
      glory("pitch-architect", ["pitch_structure"]),
      glory("client-presentation-strategist", ["presentation_strategy"]),
      glory("credentials-deck-builder", ["credentials_deck"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 3,
    requires: [{ type: "SEQUENCE_ANY", tier: 0, count: 8, status: "ACCEPTED" }, { type: "SEQUENCE", key: "BRAND", status: "ACCEPTED" }],
  },
  {
    key: "ANNUAL-PLAN",
    family: "STRATEGIC",
    name: "Planning Annuel Éditorial",
    description: "Du calendrier annuel au budget content — thématiques, fréquences, allocation.",
    steps: [
      pillar("e", "Injection E (rituels, touchpoints)", ["rituals", "touchpoints"]),
      glory("content-calendar-strategist", ["content_calendar"]),
      glory("seasonal-theme-planner", ["seasonal_themes"]),
      glory("digital-planner", ["digital_plan"]),
      glory("content-mix-optimizer", ["content_mix"]),
      glory("production-budget-optimizer", ["budget_optimization"]),
    ],
    aiPowered: false,
    refined: false,
    tier: 4,
    requires: [{ type: "SEQUENCE", key: "CAMPAIGN-360", status: "ACCEPTED" }, { type: "SEQUENCE", key: "ROADMAP-S", status: "ACCEPTED" }],
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// OPERATIONAL SEQUENCES (incl. financial — no AI)
// ═════════════════════════════════════════════════════════════════════════════

const OPERATIONAL_SEQUENCES: GlorySequenceDef[] = [
  {
    key: "OPS",
    family: "OPERATIONAL",
    name: "Opérations Production",
    description: "Budget → devis → brief fournisseur → workflow d'approbation.",
    steps: [
      glory("production-budget-optimizer", ["budget_optimization"]),
      glory("devis-generator", ["devis"]),
      glory("vendor-brief-generator", ["vendor_brief"]),
      glory("approval-workflow-manager", ["workflow_definition"]),
    ],
    aiPowered: false,
    refined: false,
    tier: 5,
    requires: [],
  },
  {
    key: "GUARD",
    family: "OPERATIONAL",
    name: "Brand Governance",
    description: "Conformité → cohérence → approbation → audit.",
    steps: [
      pillar("d", "Injection D (guidelines)", ["brand_guidelines"]),
      glory("brand-guardian-system", ["compliance_report"]),
      glory("multi-team-coherence-checker", ["coherence_report"]),
      glory("approval-workflow-manager", ["workflow_definition"]),
      glory("brand-audit-scanner", ["brand_audit"]),
    ],
    aiPowered: false,
    refined: false,
    tier: 5,
    requires: [],
  },
  {
    key: "EVAL",
    family: "OPERATIONAL",
    name: "Post-Campagne & Awards",
    description: "Résultats → ROI → évaluation → case study awards.",
    steps: [
      glory("post-campaign-reader", ["post_campaign_report"]),
      calc("roi-calculator", "Calculateur ROI", ["roi_metrics"]),
      glory("creative-evaluation-matrix", ["evaluation_matrix"]),
      glory("award-case-builder", ["award_case"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 5,
    requires: [],
  },
  {
    key: "INFLUENCE",
    family: "OPERATIONAL",
    name: "Campagne Influenceurs / KOL",
    description: "Du benchmark au brief influenceur — concept, copy, calendrier, UGC.",
    steps: [
      seshat("influencer-refs", "Références influenceurs", ["influencer_data"]),
      glory("benchmark-reference-finder", ["benchmark_report"]),
      glory("concept-generator", ["concepts_list"]),
      glory("influencer-brief-generator", ["influencer_brief"]),
      glory("social-copy-engine", ["social_copy_set"]),
      glory("content-calendar-strategist", ["content_calendar"]),
      glory("ugc-framework-builder", ["ugc_framework"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 5,
    requires: [],
  },

  // ─── Financial sequences (CALC only — no AI) ──────────────────────────────

  {
    key: "COST-SERVICE",
    family: "OPERATIONAL",
    name: "Coût du Service",
    description: "Taux horaire, cost of doing business, marge nette. Base de tout pricing.",
    steps: [
      calc("hourly-rate-calculator", "Calculateur Taux Horaire", ["hourly_rates"]),
      calc("codb-calculator", "Calculateur CODB", ["codb"]),
      calc("service-margin-analyzer", "Analyseur Marge par Service", ["margins"]),
    ],
    aiPowered: false,
    refined: false,
    tier: 5,
    requires: [],
  },
  {
    key: "COST-CAMPAIGN",
    family: "OPERATIONAL",
    name: "Coût de Campagne",
    description: "Estimation et suivi du coût total — production, média, honoraires, marge.",
    steps: [
      glory("production-budget-optimizer", ["budget_optimization"]),
      calc("campaign-cost-estimator", "Estimateur Coût Campagne", ["cost_estimate"]),
      glory("devis-generator", ["devis"]),
      calc("budget-tracker", "Suivi Budgétaire", ["budget_tracking"]),
    ],
    aiPowered: false,
    refined: false,
    tier: 5,
    requires: [{ type: "SEQUENCE", key: "CAMPAIGN-360", status: "ACCEPTED" }],
  },
  {
    key: "PROFITABILITY",
    family: "OPERATIONAL",
    name: "Rentabilité Client / Projet",
    description: "P&L, heures consommées, marge réelle par client/projet.",
    steps: [
      calc("project-pnl-calculator", "P&L Projet", ["project_pnl"]),
      calc("client-profitability-analyzer", "Rentabilité Client", ["client_profitability"]),
      calc("utilization-rate-tracker", "Taux d'Utilisation", ["utilization"]),
    ],
    aiPowered: false,
    refined: false,
    tier: 5,
    requires: [{ type: "SEQUENCE", key: "COST-SERVICE", status: "ACCEPTED" }, { type: "SEQUENCE", key: "COST-CAMPAIGN", status: "ACCEPTED" }],
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// NETERU SEQUENCES — 9 new sequences completing the skill tree
// ═════════════════════════════════════════════════════════════════════════════

const NETERU_SEQUENCES: GlorySequenceDef[] = [
  // ── T0.5 CRYSTALLISATION ──────────────────────────────────────────────────
  {
    key: "POSITIONING",
    family: "PILLAR",
    name: "Cristallisation du Positionnement",
    description: "Cristallise le positionnement de marque depuis les piliers A+D avant le travail visuel. Pont entre les fondations et l'identité.",
    pillar: "A",
    steps: [
      pillar("a", "Injection ADN marque", ["archetype", "brand_dna", "values"]),
      pillar("d", "Injection positionnement actuel", ["positionnement", "personas"]),
      seshat("sector-benchmarks", "Benchmarks positionnement secteur", ["sector_positioning"]),
      glory("concept-generator", ["positioning_concepts"]),
      glory("competitive-map-builder", ["competitive_landscape"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 0,
    requires: [
      { type: "PILLAR", key: "a", maturity: "ENRICHED" },
      { type: "PILLAR", key: "d", maturity: "ENRICHED" },
    ],
  },
  {
    key: "PERSONA-MAP",
    family: "PILLAR",
    name: "Cartographie des Personas",
    description: "Développe les personas en profondeur : motivations, freins, rituels, parcours. Enrichit toutes les séquences de production.",
    pillar: "D",
    steps: [
      pillar("d", "Injection personas existantes", ["personas", "brand_personality"]),
      pillar("t", "Injection données marché", ["tam_sam_som", "tendances"]),
      seshat("persona-refs", "Archétypes persona secteur", ["persona_archetypes"]),
      glory("persona-constellation-deep", ["personas_enriched"]),
      glory("touchpoint-journey-mapper", ["persona_journeys"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 0,
    requires: [
      { type: "PILLAR", key: "d", maturity: "ENRICHED" },
      { type: "PILLAR", key: "t", maturity: "ENRICHED" },
    ],
  },

  // ── T1 IDENTITY ───────────────────────────────────────────────────────────
  {
    key: "MESSAGING",
    family: "PRODUCTION",
    name: "Identité Verbale",
    description: "Pipeline messaging complet : claim hierarchy → tone matrix → vocabulaire → templates → copy guidelines. Le 'brand book verbal'.",
    steps: [
      pillar("a", "Injection ADN marque", ["brand_dna", "archetype"]),
      pillar("d", "Injection ton de voix", ["tone_of_voice", "personas"]),
      glory("claim-architect", ["master_claim", "sub_claims", "rtb"]),
      glory("tone-matrix", ["tone_matrix"]),
      glory("vocabulary-builder", ["vocabulary"]),
      glory("message-templater", ["templates"]),
      glory("copy-guidelines", ["copy_guidelines_doc"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 1,
    requires: [
      { type: "SEQUENCE", key: "MANIFESTE-A", status: "ACCEPTED" },
      { type: "SEQUENCE", key: "BRANDBOOK-D", status: "ACCEPTED" },
    ],
  },
  {
    key: "BRAND-AUDIT",
    family: "STRATEGIC",
    name: "Audit de Marque Existante",
    description: "Évalue l'identité de marque existante (pour marques qui n'ont pas besoin de recréer BRAND from scratch). Débloquer T2 en mode adaptation.",
    steps: [
      pillar("r", "Injection forces/faiblesses", ["forces", "faiblesses"]),
      pillar("d", "Injection identité actuelle", ["directionArtistique", "brand_personality"]),
      artemis("fw-11-brand-market-fit", "Brand-Market Fit", ["fit_score", "gap_analysis"]),
      glory("brand-guardian", ["coherence_report"]),
      glory("competitive-map-builder", ["competitive_landscape"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 1,
    requires: [
      { type: "SEQUENCE", key: "AUDIT-R", status: "ACCEPTED" },
      { type: "SEQUENCE", key: "BRANDBOOK-D", status: "ACCEPTED" },
    ],
  },

  // ── T1 MASCOTTE (combo : sous-sequence CHARACTER-LSI + raccords branding) ──
  {
    key: "MASCOTTE",
    family: "PRODUCTION",
    name: "Creation de Mascotte",
    description: "Combo sequence : encapsule CHARACTER-LSI (character design LSI) puis ajoute les outils de raccord marque (brand guardian, guidelines). Recommande pour CHARACTER_IP mais applicable a toute marque avec mascotte.",
    steps: [
      // Raccord amont : contexte marque
      pillar("a", "Injection ADN marque", ["brand_dna", "archetype", "values"]),
      pillar("d", "Injection identite visuelle", ["directionArtistique", "chromatique"]),
      pillar("e", "Injection touchpoints", ["touchpoints", "rituels"]),
      seshat("mascot-refs", "References mascottes secteur + IP", ["mascot_references"]),
      asset("BRAND:brand_guidelines", "Guidelines visuelles acceptees", ["brand_guidelines_ref"]),
      // Sous-sequence : CHARACTER-LSI (9 steps encapsules)
      sequence("CHARACTER-LSI", "Character Design LSI (6 phases)", ["character_sheet", "morpho_semantic", "artifacts", "universe_setup"]),
      // Raccord aval : coherence + integration marque
      glory("brand-guardian", ["brand_coherence_report"]),
      glory("brand-guidelines-generator", ["mascot_guidelines"]),
    ],
    aiPowered: true,
    refined: true,
    tier: 1,
    requires: [
      { type: "SEQUENCE", key: "BRAND", status: "ACCEPTED" },
      { type: "SEQUENCE", key: "MANIFESTE-A", status: "ACCEPTED" },
    ],
  },

  // ── T2 CHARACTER DESIGN (LSI Framework — pour IP/univers) ──────────────────
  {
    key: "CHARACTER-LSI",
    family: "PRODUCTION",
    name: "Character Design LSI",
    description: "Framework Layered Semantic Integration — creation de personnage iconique pour IP/univers. 6 phases : Setup → Alchimie Symboles → Matrice Distribution 5x5 → Sublimation → Morpho-Semantique → Fiche Personnage. Recommande pour les marques-produit IP. Integrables dans des sequences plus longues (mascotte, etc.).",
    steps: [
      pillar("a", "Injection ADN marque", ["brand_dna", "archetype"]),
      pillar("d", "Injection direction artistique", ["directionArtistique", "chromatique"]),
      seshat("character-refs", "References character design secteur", ["character_references"]),
      glory("lsi-universe-setup", ["universe_setup"]),
      glory("lsi-symbol-alchemy", ["artifacts"]),
      glory("lsi-distribution-matrix", ["distribution_matrix"]),
      glory("lsi-sublimation", ["sublimation_report"]),
      glory("lsi-morpho-semantic", ["morpho_semantic"]),
      glory("lsi-character-sheet", ["character_sheet"]),
    ],
    aiPowered: true,
    refined: true,
    tier: 2,
    requires: [
      { type: "SEQUENCE", key: "BRAND", status: "ACCEPTED" },
      { type: "SEQUENCE", key: "MANIFESTE-A", status: "ACCEPTED" },
    ],
  },

  // ── T2.5 PLANIFICATION ────────────────────────────────────────────────────
  {
    key: "MEDIA-PLAN",
    family: "STRATEGIC",
    name: "Plan Médias",
    description: "Stratégie de distribution : canaux × budget × timing. Pont entre la production et la campagne.",
    steps: [
      pillar("i", "Injection catalogue d'actions", ["actions", "parCanal"]),
      pillar("v", "Injection unit economics", ["unitEconomics", "pricing"]),
      seshat("media-benchmarks", "Benchmarks reach/CPM par canal", ["channel_benchmarks"]),
      calc("channel-scorer", "Scoring canaux par objectif", ["channel_scores"]),
      calc("budget-allocator", "Répartition budget × canaux", ["budget_allocation"]),
      glory("campaign-calendar-builder", ["flight_plan"]),
    ],
    aiPowered: false,
    refined: false,
    tier: 2,
    requires: [
      { type: "SEQUENCE", key: "BRAINSTORM-I", status: "ACCEPTED" },
      { type: "SEQUENCE", key: "OFFRE-V", status: "ACCEPTED" },
      { type: "SEQUENCE_ANY", tier: 2, count: 2, status: "ACCEPTED" },
    ],
  },
  {
    key: "CONTENT-CALENDAR",
    family: "STRATEGIC",
    name: "Calendrier Éditorial",
    description: "Planification éditoriale sur timeline. Combine les templates messaging avec le plan médias.",
    steps: [
      glory("claim-architect", ["claims_recap"]),
      glory("message-templater", ["message_templates"]),
      glory("campaign-calendar-builder", ["editorial_calendar"]),
    ],
    aiPowered: false,
    refined: false,
    tier: 2,
    requires: [
      { type: "SEQUENCE", key: "MESSAGING", status: "ACCEPTED" },
      { type: "SEQUENCE", key: "MEDIA-PLAN", status: "ACCEPTED" },
    ],
  },

  // ── T3 CAMPAIGN ───────────────────────────────────────────────────────────
  {
    key: "CAMPAIGN-SINGLE",
    family: "STRATEGIC",
    name: "Campagne Mono-Canal",
    description: "Campagne focalisée sur un seul canal (alternative légère à CAMPAIGN-360). Pour des activations ciblées.",
    steps: [
      pillar("i", "Injection actions par canal", ["parCanal"]),
      glory("campaign-simulator", ["campaign_simulation"]),
      glory("campaign-calendar-builder", ["single_channel_plan"]),
      glory("kpi-dashboard-designer", ["campaign_kpis"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 3,
    requires: [
      { type: "SEQUENCE_ANY", tier: 2, count: 1, status: "ACCEPTED" },
      { type: "SEQUENCE", key: "BRAINSTORM-I", status: "ACCEPTED" },
    ],
  },

  // ── T4 STRATEGY ───────────────────────────────────────────────────────────
  {
    key: "QUARTERLY-REVIEW",
    family: "STRATEGIC",
    name: "Bilan Trimestriel",
    description: "Analyse performance réelle vs objectifs. Ajustements recommandés. Alimente le plan annuel.",
    steps: [
      pillar("s", "Injection roadmap", ["roadmap", "sprint90Days"]),
      calc("kpi-tracker", "Performance réelle vs objectifs", ["kpi_comparison"]),
      glory("performance-report-builder", ["performance_analysis"]),
      glory("insight-opportunity-scanner", ["adjustment_recommendations"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 4,
    requires: [
      { type: "SEQUENCE", key: "CAMPAIGN-360", status: "ACCEPTED" },
    ],
  },

  // ── T5 OPERATIONS ─────────────────────────────────────────────────────────
  {
    key: "RETAINER-REPORT",
    family: "OPERATIONAL",
    name: "Rapport Retainer",
    description: "Le livrable récurrent du retainer : agrégation des métriques, narration des résultats, document formaté mensuel/trimestriel.",
    steps: [
      calc("kpi-aggregator", "Agrégation métriques période", ["kpi_aggregate"]),
      glory("performance-report-builder", ["report_narrative"]),
      glory("campaign-calendar-builder", ["next_period_preview"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 5,
    requires: [
      { type: "SEQUENCE", key: "CAMPAIGN-360", status: "ACCEPTED" },
    ],
  },
];

// ─── All sequences ───────────────────────────────────────────────────────────

export const ALL_SEQUENCES: GlorySequenceDef[] = [
  ...PILLAR_SEQUENCES,
  ...PRODUCTION_SEQUENCES,
  ...STRATEGIC_SEQUENCES,
  ...OPERATIONAL_SEQUENCES,
  ...NETERU_SEQUENCES,
];

// ─── Query helpers ───────────────────────────────────────────────────────────

export function getSequence(key: GlorySequenceKey): GlorySequenceDef | undefined {
  return ALL_SEQUENCES.find((s) => s.key === key);
}

export function getSequencesByFamily(family: GlorySequenceFamily): GlorySequenceDef[] {
  return ALL_SEQUENCES.filter((s) => s.family === family);
}

export function getSequencesByPillar(pillarKey: string): GlorySequenceDef[] {
  return ALL_SEQUENCES.filter((s) => s.pillar === pillarKey);
}

/** Find all sequences that use a given tool slug */
export function getSequencesForTool(toolSlug: string): GlorySequenceDef[] {
  return ALL_SEQUENCES.filter((s) => s.steps.some((step) => step.ref === toolSlug));
}

/** Get all PLANNED steps across all sequences — the build backlog */
export function getAllPlannedSteps(): Array<{ sequence: GlorySequenceKey; step: SequenceStep }> {
  const result: Array<{ sequence: GlorySequenceKey; step: SequenceStep }> = [];
  for (const seq of ALL_SEQUENCES) {
    for (const step of seq.steps) {
      if (step.status === "PLANNED") {
        result.push({ sequence: seq.key, step });
      }
    }
  }
  return result;
}

/** Deduplicated list of missing tools/frameworks/calcs to build */
export function getUniquePlannedSlugs(): Array<{ type: SequenceStepType; slug: string; name: string; usedIn: GlorySequenceKey[] }> {
  const map = new Map<string, { type: SequenceStepType; slug: string; name: string; usedIn: GlorySequenceKey[] }>();
  for (const seq of ALL_SEQUENCES) {
    for (const step of seq.steps) {
      if (step.status === "PLANNED") {
        const existing = map.get(step.ref);
        if (existing) {
          existing.usedIn.push(seq.key);
        } else {
          map.set(step.ref, { type: step.type, slug: step.ref, name: step.name, usedIn: [seq.key] });
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => b.usedIn.length - a.usedIn.length);
}

/** Get active GLORY tools referenced in a sequence's steps */
export function getSequenceGloryTools(key: GlorySequenceKey): GloryToolDef[] {
  const seq = getSequence(key);
  if (!seq) return [];
  return seq.steps
    .filter((s) => s.type === "GLORY" && s.status === "ACTIVE")
    .map((s) => getGloryTool(s.ref))
    .filter((t): t is GloryToolDef => t !== undefined);
}
