"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  Network, Lock, Unlock, ChevronDown, ChevronRight,
  Layers, Play, Building2, Trophy, Brain, Radio, Target,
  Calculator, FileText, Cpu, Zap, Clock, CheckCircle, AlertCircle,
  RotateCcw, ExternalLink,
} from "lucide-react";

// ─── Step type display ───────────────────────────────────────────────────────

const STEP_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Cpu }> = {
  GLORY: { label: "GLORY", color: "text-blue-400", bg: "bg-blue-500/15", icon: Trophy },
  ARTEMIS: { label: "ARTEMIS", color: "text-rose-400", bg: "bg-rose-500/15", icon: Brain },
  SESHAT: { label: "SESHAT", color: "text-teal-400", bg: "bg-teal-500/15", icon: Radio },
  MESTOR: { label: "MESTOR", color: "text-violet-400", bg: "bg-violet-500/15", icon: Target },
  PILLAR: { label: "PILLAR", color: "text-amber-400", bg: "bg-amber-500/15", icon: Layers },
  CALC: { label: "CALC", color: "text-orange-400", bg: "bg-orange-500/15", icon: Calculator },
};

// ─── Sequence definitions (complete with steps) ──────────────────────────────

interface StepInfo {
  type: string;
  ref: string;
  name: string;
  outputKeys: string[];
}

interface SequenceInfo {
  key: string;
  name: string;
  family: string;
  tier: number;
  description: string;
  steps: StepInfo[];
  aiPowered: boolean;
  requires: Array<{ type: string; key?: string; tier?: number; count?: number; maturity?: string }>;
}

// The 40 sequences with their FULL step chains
const ALL_SEQUENCES: SequenceInfo[] = [
  // T0 — Foundation
  { key: "MANIFESTE-A", name: "Le Manifeste", family: "PILLAR", tier: 0, description: "Document fondateur Authenticite", aiPowered: true, requires: [{ type: "PILLAR", key: "a", maturity: "ENRICHED" }], steps: [
    { type: "PILLAR", ref: "a", name: "Injection pilier A", outputKeys: ["archetype", "prophecy", "brand_dna", "values"] },
    { type: "ARTEMIS", ref: "fw-01-brand-archeology", name: "Archeologie de Marque", outputKeys: ["analysis", "archetypeDeep"] },
    { type: "SESHAT", ref: "cultural-refs", name: "References culturelles", outputKeys: ["references"] },
    { type: "GLORY", ref: "wordplay-cultural-bank", name: "Banque culturelle", outputKeys: ["wordplay_bank"] },
    { type: "GLORY", ref: "concept-generator", name: "Generateur de concepts", outputKeys: ["concepts_list"] },
    { type: "GLORY", ref: "tone-of-voice-designer", name: "Designer ton de voix", outputKeys: ["tone_charter"] },
    { type: "GLORY", ref: "claim-baseline-factory", name: "Usine a claims", outputKeys: ["claims_list"] },
    { type: "GLORY", ref: "manifesto-writer", name: "Redacteur de manifeste", outputKeys: ["manifesto"] },
  ]},
  { key: "BRANDBOOK-D", name: "Le Brandbook", family: "PILLAR", tier: 0, description: "Systeme visuel Distinction", aiPowered: true, requires: [{ type: "PILLAR", key: "d", maturity: "ENRICHED" }], steps: [
    { type: "PILLAR", ref: "d", name: "Injection pilier D", outputKeys: ["directionArtistique", "brand_personality"] },
    { type: "GLORY", ref: "semiotic-brand-analyzer", name: "Analyse semiotique", outputKeys: ["semiotic_analysis"] },
    { type: "GLORY", ref: "visual-landscape-mapper", name: "Carte paysage visuel", outputKeys: ["visual_landscape_map"] },
    { type: "GLORY", ref: "visual-moodboard-generator", name: "Generateur moodboard", outputKeys: ["moodboard_directions"] },
    { type: "GLORY", ref: "photography-style-guide", name: "Guide photo", outputKeys: ["photo_guidelines"] },
    { type: "GLORY", ref: "chromatic-strategy-builder", name: "Strategie chromatique", outputKeys: ["chromatic_strategy"] },
    { type: "GLORY", ref: "typography-system-architect", name: "Systeme typographique", outputKeys: ["typography_system"] },
    { type: "GLORY", ref: "logo-type-advisor", name: "Conseiller logotype", outputKeys: ["logotype_direction"] },
    { type: "GLORY", ref: "logo-validation-protocol", name: "Validation logo", outputKeys: ["logo_validation_report"] },
    { type: "GLORY", ref: "design-token-architect", name: "Design tokens", outputKeys: ["design_tokens"] },
    { type: "GLORY", ref: "iconography-system-builder", name: "Systeme icono", outputKeys: ["icon_system"] },
    { type: "GLORY", ref: "motion-identity-designer", name: "Identite motion", outputKeys: ["motion_identity"] },
    { type: "GLORY", ref: "brand-guidelines-generator", name: "Generateur guidelines", outputKeys: ["brand_guidelines"] },
  ]},
  { key: "OFFRE-V", name: "L'Offre Commerciale", family: "PILLAR", tier: 0, description: "Proposition de Valeur", aiPowered: true, requires: [{ type: "PILLAR", key: "v", maturity: "ENRICHED" }], steps: [
    { type: "PILLAR", ref: "v", name: "Injection pilier V", outputKeys: ["pricing", "proofPoints"] },
    { type: "GLORY", ref: "value-proposition-canvas", name: "Canvas proposition valeur", outputKeys: ["value_canvas"] },
    { type: "GLORY", ref: "pricing-strategy-architect", name: "Architecture pricing", outputKeys: ["pricing_strategy"] },
    { type: "GLORY", ref: "offer-structure-designer", name: "Structure offre", outputKeys: ["offer_structure"] },
    { type: "GLORY", ref: "proof-point-generator", name: "Generateur preuves", outputKeys: ["proof_points"] },
    { type: "GLORY", ref: "guarantee-framework-builder", name: "Framework garanties", outputKeys: ["guarantees"] },
    { type: "GLORY", ref: "sales-pitch-creator", name: "Createur pitch vente", outputKeys: ["sales_pitch"] },
  ]},
  { key: "PLAYBOOK-E", name: "Le Playbook", family: "PILLAR", tier: 0, description: "Engagement et touchpoints", aiPowered: true, requires: [{ type: "PILLAR", key: "e", maturity: "ENRICHED" }], steps: [
    { type: "PILLAR", ref: "e", name: "Injection pilier E", outputKeys: ["touchpoints", "rituels"] },
    { type: "GLORY", ref: "touchpoint-journey-mapper", name: "Carte touchpoints", outputKeys: ["journey_map"] },
    { type: "GLORY", ref: "ritual-design-engine", name: "Moteur rituels", outputKeys: ["rituals"] },
    { type: "GLORY", ref: "engagement-mechanic-builder", name: "Mecaniques engagement", outputKeys: ["mechanics"] },
    { type: "GLORY", ref: "community-blueprint-architect", name: "Blueprint communaute", outputKeys: ["community_blueprint"] },
    { type: "GLORY", ref: "loyalty-program-designer", name: "Programme fidelite", outputKeys: ["loyalty_program"] },
    { type: "GLORY", ref: "superfan-activation-planner", name: "Activation superfan", outputKeys: ["activation_plan"] },
  ]},
  { key: "AUDIT-R", name: "Audit de Risques", family: "PILLAR", tier: 0, description: "Diagnostic Risk", aiPowered: true, requires: [{ type: "PILLAR", key: "r", maturity: "ENRICHED" }], steps: [
    { type: "PILLAR", ref: "r", name: "Injection pilier R", outputKeys: ["forces", "faiblesses"] },
    { type: "ARTEMIS", ref: "fw-22-risk-matrix", name: "Matrice de risques", outputKeys: ["risk_matrix"] },
    { type: "ARTEMIS", ref: "fw-23-crisis-playbook", name: "Crisis playbook", outputKeys: ["crisis_protocols"] },
    { type: "GLORY", ref: "competitive-map-builder", name: "Carte concurrentielle", outputKeys: ["competitive_map"] },
    { type: "GLORY", ref: "swot-visualizer", name: "SWOT visuel", outputKeys: ["swot_visual"] },
  ]},
  { key: "ETUDE-T", name: "Etude de Marche", family: "PILLAR", tier: 0, description: "Confrontation Track marche", aiPowered: true, requires: [{ type: "PILLAR", key: "t", maturity: "ENRICHED" }], steps: [
    { type: "PILLAR", ref: "t", name: "Injection pilier T", outputKeys: ["tam_sam_som", "tendances"] },
    { type: "SESHAT", ref: "market-data", name: "Donnees marche Seshat", outputKeys: ["benchmarks"] },
    { type: "ARTEMIS", ref: "fw-12-tam-sam-som", name: "TAM/SAM/SOM", outputKeys: ["market_sizing"] },
    { type: "ARTEMIS", ref: "fw-11-brand-market-fit", name: "Brand-Market Fit", outputKeys: ["fit_score"] },
    { type: "GLORY", ref: "market-opportunity-scorer", name: "Scoring opportunites", outputKeys: ["opportunities"] },
    { type: "GLORY", ref: "trend-impact-analyzer", name: "Analyse tendances", outputKeys: ["trend_impacts"] },
  ]},
  { key: "BRAINSTORM-I", name: "Brainstorm Innovation", family: "PILLAR", tier: 0, description: "Catalogue d'actions", aiPowered: true, requires: [{ type: "PILLAR", key: "i", maturity: "ENRICHED" }], steps: [
    { type: "PILLAR", ref: "i", name: "Injection pilier I", outputKeys: ["actions", "parCanal"] },
    { type: "GLORY", ref: "action-catalogue-builder", name: "Catalogue d'actions", outputKeys: ["action_catalogue"] },
    { type: "GLORY", ref: "campaign-simulator", name: "Simulateur campagne", outputKeys: ["campaign_sim"] },
    { type: "GLORY", ref: "budget-optimizer", name: "Optimiseur budget", outputKeys: ["budget_plan"] },
    { type: "GLORY", ref: "campaign-calendar-builder", name: "Calendrier campagne", outputKeys: ["calendar"] },
  ]},
  { key: "ROADMAP-S", name: "Roadmap Strategique", family: "PILLAR", tier: 0, description: "Plan Strategy", aiPowered: true, requires: [{ type: "PILLAR", key: "s", maturity: "ENRICHED" }], steps: [
    { type: "PILLAR", ref: "s", name: "Injection pilier S", outputKeys: ["roadmap", "sprint90Days"] },
    { type: "ARTEMIS", ref: "fw-13-90-day-roadmap", name: "Roadmap 90 jours", outputKeys: ["weekly_plan"] },
    { type: "GLORY", ref: "kpi-dashboard-designer", name: "Dashboard KPI", outputKeys: ["kpi_dashboard"] },
    { type: "GLORY", ref: "growth-flywheel-architect", name: "Flywheel croissance", outputKeys: ["flywheel"] },
    { type: "GLORY", ref: "innovation-pipeline-designer", name: "Pipeline innovation", outputKeys: ["innovation_pipeline"] },
    { type: "GLORY", ref: "brand-evolution-planner", name: "Plan evolution", outputKeys: ["evolution_plan"] },
  ]},
  // T0.5 — Crystallisation
  { key: "POSITIONING", name: "Cristallisation Positionnement", family: "PILLAR", tier: 0, description: "Pont A+D vers identite", aiPowered: true, requires: [{ type: "PILLAR", key: "a", maturity: "ENRICHED" }, { type: "PILLAR", key: "d", maturity: "ENRICHED" }], steps: [
    { type: "PILLAR", ref: "a", name: "Injection ADN", outputKeys: ["archetype", "brand_dna"] },
    { type: "PILLAR", ref: "d", name: "Injection positionnement", outputKeys: ["positionnement", "personas"] },
    { type: "SESHAT", ref: "sector-benchmarks", name: "Benchmarks secteur", outputKeys: ["sector_positioning"] },
    { type: "GLORY", ref: "concept-generator", name: "Concepts positionnement", outputKeys: ["positioning_concepts"] },
    { type: "GLORY", ref: "competitive-map-builder", name: "Carte concurrentielle", outputKeys: ["competitive_landscape"] },
  ]},
  { key: "PERSONA-MAP", name: "Cartographie Personas", family: "PILLAR", tier: 0, description: "Personas en profondeur", aiPowered: true, requires: [{ type: "PILLAR", key: "d", maturity: "ENRICHED" }, { type: "PILLAR", key: "t", maturity: "ENRICHED" }], steps: [
    { type: "PILLAR", ref: "d", name: "Injection personas", outputKeys: ["personas"] },
    { type: "PILLAR", ref: "t", name: "Injection marche", outputKeys: ["tendances"] },
    { type: "SESHAT", ref: "persona-refs", name: "Archetypes persona", outputKeys: ["persona_archetypes"] },
    { type: "GLORY", ref: "persona-constellation-deep", name: "Personas enrichies", outputKeys: ["personas_enriched"] },
    { type: "GLORY", ref: "touchpoint-journey-mapper", name: "Parcours persona", outputKeys: ["persona_journeys"] },
  ]},
  // T1 — Identity
  { key: "BRAND", name: "Identite Visuelle", family: "PRODUCTION", tier: 1, description: "Pipeline semiotique → guidelines", aiPowered: true, requires: [{ type: "SEQUENCE", key: "MANIFESTE-A" }, { type: "SEQUENCE", key: "BRANDBOOK-D" }], steps: [
    { type: "GLORY", ref: "semiotic-brand-analyzer", name: "Analyse semiotique", outputKeys: ["semiotic"] },
    { type: "GLORY", ref: "visual-landscape-mapper", name: "Paysage visuel", outputKeys: ["landscape"] },
    { type: "GLORY", ref: "visual-moodboard-generator", name: "Moodboard", outputKeys: ["moodboard"] },
    { type: "GLORY", ref: "chromatic-strategy-builder", name: "Chromatique", outputKeys: ["chromatic"] },
    { type: "GLORY", ref: "typography-system-architect", name: "Typographie", outputKeys: ["typography"] },
    { type: "GLORY", ref: "logo-type-advisor", name: "Logo", outputKeys: ["logo"] },
    { type: "GLORY", ref: "logo-validation-protocol", name: "Validation", outputKeys: ["validation"] },
    { type: "GLORY", ref: "design-token-architect", name: "Tokens", outputKeys: ["tokens"] },
    { type: "GLORY", ref: "motion-identity-designer", name: "Motion", outputKeys: ["motion"] },
    { type: "GLORY", ref: "brand-guidelines-generator", name: "Guidelines", outputKeys: ["guidelines"] },
  ]},
  { key: "NAMING", name: "Naming", family: "PRODUCTION", tier: 1, description: "Generation et validation de noms", aiPowered: true, requires: [{ type: "SEQUENCE", key: "MANIFESTE-A" }], steps: [
    { type: "PILLAR", ref: "a", name: "Injection ADN", outputKeys: ["brand_dna"] },
    { type: "GLORY", ref: "wordplay-cultural-bank", name: "Banque culturelle", outputKeys: ["wordplay"] },
    { type: "GLORY", ref: "concept-generator", name: "Concepts de noms", outputKeys: ["name_concepts"] },
    { type: "GLORY", ref: "claim-baseline-factory", name: "Baselines", outputKeys: ["baselines"] },
  ]},
  { key: "MESSAGING", name: "Identite Verbale", family: "PRODUCTION", tier: 1, description: "Claims → ton → vocabulaire → bible", aiPowered: true, requires: [{ type: "SEQUENCE", key: "MANIFESTE-A" }, { type: "SEQUENCE", key: "BRANDBOOK-D" }], steps: [
    { type: "PILLAR", ref: "a", name: "Injection ADN", outputKeys: ["brand_dna", "archetype"] },
    { type: "PILLAR", ref: "d", name: "Injection ton", outputKeys: ["tone_of_voice", "personas"] },
    { type: "GLORY", ref: "claim-architect", name: "Architecte claims", outputKeys: ["master_claim", "sub_claims"] },
    { type: "GLORY", ref: "tone-matrix", name: "Matrice de ton", outputKeys: ["tone_matrix"] },
    { type: "GLORY", ref: "vocabulary-builder", name: "Vocabulaire", outputKeys: ["vocabulary"] },
    { type: "GLORY", ref: "message-templater", name: "Templates messages", outputKeys: ["templates"] },
    { type: "GLORY", ref: "copy-guidelines", name: "Bible editoriale", outputKeys: ["copy_guidelines"] },
  ]},
  { key: "BRAND-AUDIT", name: "Audit Marque Existante", family: "STRATEGIC", tier: 1, description: "Alternatif a BRAND", aiPowered: true, requires: [{ type: "SEQUENCE", key: "AUDIT-R" }, { type: "SEQUENCE", key: "BRANDBOOK-D" }], steps: [
    { type: "PILLAR", ref: "r", name: "Forces/faiblesses", outputKeys: ["forces", "faiblesses"] },
    { type: "PILLAR", ref: "d", name: "Identite actuelle", outputKeys: ["directionArtistique"] },
    { type: "ARTEMIS", ref: "fw-11-brand-market-fit", name: "Brand-Market Fit", outputKeys: ["fit_score"] },
    { type: "GLORY", ref: "brand-guardian", name: "Brand Guardian", outputKeys: ["coherence_report"] },
    { type: "GLORY", ref: "competitive-map-builder", name: "Carte concurrentielle", outputKeys: ["landscape"] },
  ]},
  // T2+ sequences — simplified (key info only)
  ...buildSimpleSequences(),
];

function buildSimpleSequences(): SequenceInfo[] {
  return [
    { key: "KV", name: "Key Visual", family: "PRODUCTION", tier: 2, description: "Direction artistique + KV", aiPowered: true, requires: [{ type: "SEQUENCE", key: "BRAND" }, { type: "SEQUENCE", key: "OFFRE-V" }], steps: [{ type: "PILLAR", ref: "d", name: "Injection DA", outputKeys: [] }, { type: "GLORY", ref: "kv-concept-prompter", name: "Concept KV", outputKeys: ["kv_concept"] }, { type: "GLORY", ref: "kv-copy-composer", name: "Copy KV", outputKeys: ["kv_copy"] }] },
    { key: "SPOT-VIDEO", name: "Spot Video", family: "PRODUCTION", tier: 2, description: "Script + storyboard", aiPowered: true, requires: [{ type: "SEQUENCE", key: "BRAND" }, { type: "SEQUENCE", key: "PLAYBOOK-E" }], steps: [{ type: "GLORY", ref: "script-long-format", name: "Script", outputKeys: ["script"] }, { type: "GLORY", ref: "storyboard-builder", name: "Storyboard", outputKeys: ["storyboard"] }] },
    { key: "SPOT-RADIO", name: "Spot Radio", family: "PRODUCTION", tier: 2, description: "Script audio", aiPowered: true, requires: [{ type: "SEQUENCE", key: "BRAND" }], steps: [{ type: "GLORY", ref: "script-short-format", name: "Script radio", outputKeys: ["script"] }] },
    { key: "PRINT-AD", name: "Print Ad", family: "PRODUCTION", tier: 2, description: "Annonce presse", aiPowered: true, requires: [{ type: "SEQUENCE", key: "BRAND" }], steps: [{ type: "GLORY", ref: "kv-concept-prompter", name: "Concept print", outputKeys: ["concept"] }, { type: "GLORY", ref: "kv-copy-composer", name: "Copy print", outputKeys: ["copy"] }] },
    { key: "OOH", name: "Out-of-Home", family: "PRODUCTION", tier: 2, description: "Affichage exterieur", aiPowered: true, requires: [{ type: "SEQUENCE", key: "BRAND" }, { type: "SEQUENCE", key: "KV" }], steps: [{ type: "GLORY", ref: "kv-concept-prompter", name: "Concept OOH", outputKeys: ["concept"] }] },
    { key: "SOCIAL-POST", name: "Social Post", family: "PRODUCTION", tier: 2, description: "Contenu social", aiPowered: true, requires: [{ type: "SEQUENCE", key: "BRANDBOOK-D" }, { type: "SEQUENCE_ANY", tier: 2, count: 1 }], steps: [{ type: "GLORY", ref: "social-content-creator", name: "Contenu social", outputKeys: ["post"] }] },
    { key: "STORY-ARC", name: "Story Arc", family: "PRODUCTION", tier: 2, description: "Narratif long", aiPowered: true, requires: [{ type: "SEQUENCE", key: "MANIFESTE-A" }, { type: "SEQUENCE", key: "PLAYBOOK-E" }], steps: [{ type: "GLORY", ref: "storytelling-arc-builder", name: "Arc narratif", outputKeys: ["story_arc"] }] },
    { key: "WEB-COPY", name: "Web Copy", family: "PRODUCTION", tier: 2, description: "Contenus web", aiPowered: true, requires: [{ type: "SEQUENCE", key: "BRANDBOOK-D" }, { type: "SEQUENCE", key: "OFFRE-V" }], steps: [{ type: "GLORY", ref: "web-copy-writer", name: "Copy web", outputKeys: ["web_copy"] }] },
    { key: "PACKAGING", name: "Packaging", family: "PRODUCTION", tier: 2, description: "Design packaging", aiPowered: true, requires: [{ type: "SEQUENCE", key: "BRAND" }, { type: "SEQUENCE", key: "OFFRE-V" }], steps: [{ type: "GLORY", ref: "packaging-brief-generator", name: "Brief packaging", outputKeys: ["brief"] }] },
    { key: "MEDIA-PLAN", name: "Plan Medias", family: "STRATEGIC", tier: 2, description: "Canaux x budget x timing", aiPowered: false, requires: [{ type: "SEQUENCE", key: "BRAINSTORM-I" }, { type: "SEQUENCE", key: "OFFRE-V" }, { type: "SEQUENCE_ANY", tier: 2, count: 2 }], steps: [{ type: "CALC", ref: "channel-scorer", name: "Scoring canaux", outputKeys: ["scores"] }, { type: "CALC", ref: "budget-allocator", name: "Allocation budget", outputKeys: ["allocation"] }] },
    { key: "CONTENT-CALENDAR", name: "Calendrier Editorial", family: "STRATEGIC", tier: 2, description: "Planning editorial", aiPowered: false, requires: [{ type: "SEQUENCE", key: "MESSAGING" }, { type: "SEQUENCE", key: "MEDIA-PLAN" }], steps: [{ type: "GLORY", ref: "campaign-calendar-builder", name: "Calendrier", outputKeys: ["calendar"] }] },
    { key: "CAMPAIGN-360", name: "Campagne 360", family: "STRATEGIC", tier: 3, description: "Orchestration multi-canal", aiPowered: true, requires: [{ type: "SEQUENCE_ANY", tier: 2, count: 3 }, { type: "SEQUENCE", key: "ROADMAP-S" }], steps: [{ type: "GLORY", ref: "campaign-simulator", name: "Simulation", outputKeys: ["sim"] }, { type: "GLORY", ref: "campaign-calendar-builder", name: "Planning", outputKeys: ["plan"] }] },
    { key: "CAMPAIGN-SINGLE", name: "Campagne Mono-Canal", family: "STRATEGIC", tier: 3, description: "Activation ciblee", aiPowered: true, requires: [{ type: "SEQUENCE_ANY", tier: 2, count: 1 }, { type: "SEQUENCE", key: "BRAINSTORM-I" }], steps: [{ type: "GLORY", ref: "campaign-simulator", name: "Simulation", outputKeys: ["sim"] }] },
    { key: "LAUNCH", name: "Lancement", family: "STRATEGIC", tier: 3, description: "Plan de lancement", aiPowered: true, requires: [{ type: "SEQUENCE", key: "CAMPAIGN-360" }, { type: "SEQUENCE", key: "ETUDE-T" }], steps: [{ type: "GLORY", ref: "campaign-simulator", name: "Simulation lancement", outputKeys: ["sim"] }] },
    { key: "REBRAND", name: "Rebranding", family: "STRATEGIC", tier: 3, description: "Repositionnement", aiPowered: true, requires: [{ type: "SEQUENCE", key: "BRAND" }, { type: "SEQUENCE", key: "AUDIT-R" }], steps: [{ type: "GLORY", ref: "brand-guardian", name: "Audit coherence", outputKeys: ["audit"] }] },
    { key: "PITCH", name: "Pitch Deck", family: "STRATEGIC", tier: 3, description: "Presentation investisseur", aiPowered: true, requires: [{ type: "SEQUENCE_ANY", tier: 0, count: 8 }, { type: "SEQUENCE", key: "BRAND" }], steps: [{ type: "GLORY", ref: "presentation-deck-builder", name: "Deck", outputKeys: ["deck"] }] },
    { key: "ANNUAL-PLAN", name: "Plan Annuel", family: "STRATEGIC", tier: 4, description: "Planification annuelle", aiPowered: true, requires: [{ type: "SEQUENCE", key: "CAMPAIGN-360" }, { type: "SEQUENCE", key: "ROADMAP-S" }], steps: [{ type: "GLORY", ref: "campaign-calendar-builder", name: "Plan annuel", outputKeys: ["annual"] }] },
    { key: "QUARTERLY-REVIEW", name: "Bilan Trimestriel", family: "STRATEGIC", tier: 4, description: "Performance vs objectifs", aiPowered: true, requires: [{ type: "SEQUENCE", key: "CAMPAIGN-360" }], steps: [{ type: "CALC", ref: "kpi-tracker", name: "KPI tracking", outputKeys: ["kpis"] }, { type: "GLORY", ref: "performance-report-builder", name: "Rapport", outputKeys: ["report"] }] },
    { key: "OPS", name: "Operations", family: "OPERATIONAL", tier: 5, description: "Workflow operationnel", aiPowered: false, requires: [], steps: [{ type: "CALC", ref: "workflow-optimizer", name: "Optimisation", outputKeys: ["workflow"] }] },
    { key: "GUARD", name: "Brand Guardian", family: "OPERATIONAL", tier: 5, description: "Surveillance coherence", aiPowered: true, requires: [], steps: [{ type: "GLORY", ref: "brand-guardian", name: "Guardian", outputKeys: ["report"] }] },
    { key: "EVAL", name: "Evaluation", family: "OPERATIONAL", tier: 5, description: "Evaluation performances", aiPowered: false, requires: [], steps: [{ type: "CALC", ref: "performance-scorer", name: "Scoring", outputKeys: ["scores"] }] },
    { key: "INFLUENCE", name: "Influence", family: "OPERATIONAL", tier: 5, description: "Strategie d'influence", aiPowered: true, requires: [], steps: [{ type: "GLORY", ref: "influence-strategy-builder", name: "Strategie", outputKeys: ["strategy"] }] },
    { key: "COST-SERVICE", name: "Cout Service", family: "OPERATIONAL", tier: 5, description: "Calcul cout service", aiPowered: false, requires: [], steps: [{ type: "CALC", ref: "service-cost-calculator", name: "Calcul", outputKeys: ["cost"] }] },
    { key: "COST-CAMPAIGN", name: "Cout Campagne", family: "OPERATIONAL", tier: 5, description: "Calcul cout campagne", aiPowered: false, requires: [{ type: "SEQUENCE", key: "CAMPAIGN-360" }], steps: [{ type: "CALC", ref: "campaign-cost-calculator", name: "Calcul", outputKeys: ["cost"] }] },
    { key: "PROFITABILITY", name: "Rentabilite", family: "OPERATIONAL", tier: 5, description: "Analyse rentabilite", aiPowered: false, requires: [{ type: "SEQUENCE", key: "COST-SERVICE" }, { type: "SEQUENCE", key: "COST-CAMPAIGN" }], steps: [{ type: "CALC", ref: "profitability-analyzer", name: "Analyse", outputKeys: ["profitability"] }] },
    { key: "RETAINER-REPORT", name: "Rapport Retainer", family: "OPERATIONAL", tier: 5, description: "Livrable recurrent", aiPowered: true, requires: [{ type: "SEQUENCE", key: "CAMPAIGN-360" }], steps: [{ type: "CALC", ref: "kpi-aggregator", name: "Agregation", outputKeys: ["kpis"] }, { type: "GLORY", ref: "performance-report-builder", name: "Narration", outputKeys: ["report"] }] },
  ];
}

const TIER_META: Record<number, { name: string; color: string }> = {
  0: { name: "T0 — FOUNDATION", color: "oklch(0.70 0.18 80)" },
  1: { name: "T1 — IDENTITY", color: "oklch(0.55 0.25 265)" },
  2: { name: "T2 — PRODUCTION", color: "oklch(0.65 0.20 145)" },
  3: { name: "T3 — CAMPAIGN", color: "oklch(0.60 0.20 240)" },
  4: { name: "T4 — STRATEGY", color: "oklch(0.55 0.25 290)" },
  5: { name: "T5 — OPERATIONS", color: "oklch(0.55 0.25 25)" },
};

const FAMILY_BADGES: Record<string, { label: string; bg: string }> = {
  PILLAR: { label: "Pilier", bg: "bg-amber-500/15 text-amber-300" },
  PRODUCTION: { label: "Production", bg: "bg-emerald-500/15 text-emerald-300" },
  STRATEGIC: { label: "Strategique", bg: "bg-blue-500/15 text-blue-300" },
  OPERATIONAL: { label: "Operationnel", bg: "bg-red-500/15 text-red-300" },
};

function formatPrerequisite(req: SequenceInfo["requires"][0]): string {
  if (req.type === "SEQUENCE") return `${req.key}`;
  if (req.type === "SEQUENCE_ANY") return `${req.count}x T${req.tier}`;
  if (req.type === "PILLAR") return `${req.key?.toUpperCase()} ${req.maturity}`;
  return "?";
}

export default function SkillTreePage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [executingKey, setExecutingKey] = useState<string | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);

  const { data: strategies } = trpc.strategy.list.useQuery({});
  const activeStrategies = (strategies ?? []).filter((s) => s.status === "ACTIVE");

  // Vault skill tree — live status for each sequence
  const skillTreeQuery = trpc.sequenceVault.skillTree.useQuery(
    { strategyId: selectedStrategy ?? "" },
    { enabled: !!selectedStrategy, refetchInterval: executingKey ? 5000 : false },
  );
  const vaultStatusArr = (skillTreeQuery.data ?? []).map((s) => [s.key, { status: s.status, version: s.version, qualityScore: s.qualityScore }] as const);
  const vaultStatus = new Map(vaultStatusArr.map(([k, v]) => [k as string, v as { status: string; version?: number; qualityScore?: number }]));

  // Pre-flight check
  const preflightQuery = trpc.sequenceVault.checkPrereqs.useQuery(
    {
      strategyId: selectedStrategy ?? "",
      requires: executingKey
        ? ALL_SEQUENCES.find((s) => s.key === executingKey)?.requires.map((r) => ({
            type: r.type as "SEQUENCE" | "SEQUENCE_ANY" | "PILLAR",
            key: r.key, tier: r.tier, count: r.count, maturity: r.maturity, status: "ACCEPTED" as const,
          })) ?? []
        : [],
    },
    { enabled: false }, // manual trigger
  );

  const executeMutation = trpc.glory.executeSequence.useMutation({
    onSuccess: (data: unknown) => {
      setExecutingKey(null);
      // Redirect to vault after execution
      const execId = (data as { executionId?: string })?.executionId;
      if (execId) {
        window.location.href = "/console/artemis/vault";
      }
    },
    onError: (err) => {
      setExecutingKey(null);
      setPreflightError(err.message);
    },
  });

  const handleLaunch = async (seqKey: string) => {
    if (!selectedStrategy) return;
    setPreflightError(null);
    setExecutingKey(seqKey);

    // Check prerequisites — PILLAR maturity blocks, SEQUENCE prerequisites only warn
    const seq = ALL_SEQUENCES.find((s) => s.key === seqKey);
    if (seq && seq.requires.length > 0) {
      try {
        const check = await preflightQuery.refetch();
        if (check.data?.blocked) {
          const pillarBlockers = (check.data.unmet as Array<{ type: string; key?: string; tier?: number; count?: number; maturity?: string }>)
            .filter(u => u.type === "PILLAR");
          const sequenceWarnings = (check.data.unmet as Array<{ type: string; key?: string; tier?: number; count?: number; maturity?: string }>)
            .filter(u => u.type === "SEQUENCE" || u.type === "SEQUENCE_ANY");

          // Only PILLAR prerequisites truly block — sequences are just warnings
          if (pillarBlockers.length > 0) {
            const blockerList = pillarBlockers.map(u => `pilier ${u.key} (${u.maturity})`).join(", ");
            setPreflightError(`Bloque par maturite pilier: ${blockerList}`);
            setExecutingKey(null);
            return;
          }

          // SEQUENCE prerequisites → warn but proceed
          if (sequenceWarnings.length > 0) {
            const warnList = sequenceWarnings.map(u =>
              u.type === "SEQUENCE" ? u.key : `${u.count}x T${u.tier}`
            ).join(", ");
            setPreflightError(`Sequences recommandees non completees: ${warnList}. Execution en cours quand meme.`);
            // Don't return — proceed with execution
          }
        }
      } catch {
        // Pre-flight check failed — proceed anyway
      }
    }

    // Execute
    executeMutation.mutate({ strategyId: selectedStrategy, sequenceKey: seqKey as never });
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const tiers = [0, 1, 2, 3, 4, 5];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skill Tree"
        description="40 sequences — cliquez pour voir les outils, selectionnez une marque pour lancer"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Artemis", href: "/console/artemis" },
          { label: "Skill Tree" },
        ]}
      />

      {/* Strategy selector */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <Building2 className="h-4 w-4 text-foreground-muted" />
        <select
          value={selectedStrategy ?? ""}
          onChange={(e) => setSelectedStrategy(e.target.value || null)}
          className="flex-1 rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">Vue catalogue (toutes les sequences)</option>
          {activeStrategies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {selectedStrategy && (
          <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-300">
            Mode execution actif
          </span>
        )}
      </div>

      {/* Pre-flight error banner */}
      {preflightError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <strong>Bloque :</strong> {preflightError}
          <button onClick={() => setPreflightError(null)} className="ml-3 text-xs text-red-400 hover:text-red-200">Fermer</button>
        </div>
      )}

      {/* Tier stats */}
      <div className="flex flex-wrap gap-2">
        {tiers.map((t) => {
          const count = ALL_SEQUENCES.filter((s) => s.tier === t).length;
          const tm = TIER_META[t] ?? { name: `T${t}`, color: "gray" };
          return (
            <div key={t} className="flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tm.color }} />
              <span className="text-xs font-medium text-foreground">{tm.name}</span>
              <span className="text-xs text-foreground-muted">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Sequences by tier */}
      <div className="space-y-10">
        {tiers.map((tier) => {
          const sequences = ALL_SEQUENCES.filter((s) => s.tier === tier);
          const meta = TIER_META[tier] ?? { name: `T${tier}`, color: "gray" };

          return (
            <section key={tier}>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-8 w-1 rounded-full" style={{ backgroundColor: meta.color }} />
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: meta.color }}>
                  {meta.name}
                </h2>
                <span className="text-xs text-foreground-muted">{sequences.length} sequences</span>
              </div>

              <div className="space-y-3">
                {sequences.map((seq) => {
                  const isExpanded = expanded.has(seq.key);
                  const badge = FAMILY_BADGES[seq.family] ?? { label: seq.family, bg: "bg-foreground-muted/15 text-foreground-muted" };
                  const vault = vaultStatus.get(seq.key) as { status: string; version?: number; qualityScore?: number } | undefined;
                  const isAccepted = vault?.status === "ACCEPTED";
                  const isPending = vault?.status === "PENDING";
                  const hasRun = isAccepted || isPending;

                  return (
                    <div key={seq.key} className={`rounded-xl border overflow-hidden ${
                      isAccepted ? "border-emerald-500/30 bg-emerald-500/5" :
                      isPending ? "border-amber-500/30 bg-amber-500/5" :
                      "border-border-subtle bg-card"
                    }`}>
                      {/* Header — click to expand */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleExpand(seq.key)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(seq.key); } }}
                        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-card-hover cursor-pointer"
                      >
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 shrink-0 text-foreground-muted" />
                          : <ChevronRight className="h-4 w-4 shrink-0 text-foreground-muted" />
                        }
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground-muted">{seq.key}</span>
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${badge.bg}`}>{badge.label}</span>
                            {seq.aiPowered
                              ? <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-300">AI</span>
                              : <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">CALC</span>
                            }
                            {/* Vault status badges */}
                            {isAccepted && (
                              <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                <CheckCircle className="h-3 w-3" /> v{vault?.version ?? 1}
                              </span>
                            )}
                            {isPending && (
                              <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                                <AlertCircle className="h-3 w-3" /> Review v{vault?.version ?? 1}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-0.5 text-sm font-semibold text-foreground">{seq.name}</h3>
                          <p className="text-xs text-foreground-muted">{seq.description}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="flex items-center gap-1 text-[10px] text-foreground-muted">
                            <Layers className="h-3 w-3" /> {seq.steps.length} steps
                          </span>
                          {/* Vault link */}
                          {hasRun && (
                            <a
                              href="/console/artemis/vault"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 rounded-lg bg-foreground-muted/10 px-2 py-1 text-[10px] text-foreground-muted hover:text-foreground transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" /> Vault
                            </a>
                          )}
                          {/* Launch / Relaunch button */}
                          {selectedStrategy && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLaunch(seq.key);
                              }}
                              disabled={executingKey !== null}
                              className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                                executingKey === seq.key
                                  ? "bg-amber-500/20 text-amber-300 animate-pulse"
                                  : executingKey !== null
                                    ? "bg-foreground-muted/10 text-foreground-muted cursor-not-allowed"
                                    : hasRun
                                      ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                                      : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                              }`}
                            >
                              {executingKey === seq.key ? (
                                <><Clock className="mr-1 inline h-3 w-3 animate-spin" /> Execution...</>
                              ) : hasRun ? (
                                <><RotateCcw className="mr-1 inline h-3 w-3" /> Relancer</>
                              ) : (
                                <><Play className="mr-1 inline h-3 w-3" /> Lancer</>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded: steps + prerequisites */}
                      {isExpanded && (
                        <div className="border-t border-border-subtle bg-background/50 px-4 py-3">
                          {/* Prerequisites */}
                          {seq.requires.length > 0 && (
                            <div className="mb-3">
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Prerequis</p>
                              <div className="flex flex-wrap gap-1">
                                {seq.requires.map((req, i) => (
                                  <span key={i} className="rounded-md bg-background-overlay px-2 py-0.5 text-[10px] text-foreground-muted">
                                    {formatPrerequisite(req)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Steps pipeline */}
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Pipeline ({seq.steps.length} steps)</p>
                          <div className="space-y-1">
                            {seq.steps.map((step, i) => {
                              const cfg = STEP_TYPE_CONFIG[step.type] ?? { label: step.type, color: "text-foreground-muted", bg: "bg-foreground-muted/15", icon: Layers };
                              const Icon = cfg.icon;
                              return (
                                <div key={i} className="flex items-center gap-2 rounded-lg bg-background-overlay/50 px-3 py-2">
                                  <span className="flex items-center gap-1 text-[10px] text-foreground-muted">{i + 1}.</span>
                                  <div className={`flex h-5 w-5 items-center justify-center rounded ${cfg.bg}`}>
                                    <Icon className={`h-3 w-3 ${cfg.color}`} />
                                  </div>
                                  <span className={`text-[10px] font-bold uppercase ${cfg.color}`}>{step.type}</span>
                                  <span className="text-xs text-foreground">{step.name}</span>
                                  <span className="ml-auto font-mono text-[10px] text-foreground-muted">{step.ref}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Output keys */}
                          <div className="mt-2">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Sorties</p>
                            <div className="flex flex-wrap gap-1">
                              {[...new Set(seq.steps.flatMap((s) => s.outputKeys))].filter(Boolean).map((key) => (
                                <span key={key} className="rounded bg-foreground-muted/10 px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted">
                                  {key}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
