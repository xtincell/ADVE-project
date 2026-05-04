/**
 * Phase 13 — Oracle 35-section Glory sequences (B3, ADR-0014)
 *
 * 14 séquences pour produire les sections Oracle étendues :
 * - 7 Big4 baseline (MCK-7S, BCG-PORTFOLIO, BAIN-NPS, DELOITTE-GREENHOUSE,
 *   MCK-3H, BCG-PALETTE, DELOITTE-BUDGET)
 * - 5 Distinctifs (CULT-INDEX, MANIP-MATRIX, DEVOTION-LADDER, OVERTON-DISTINCTIVE,
 *   TARSIS-WEAK)
 * - 2 Neteru actifs Ground (IMHOTEP-CREW, ANUBIS-COMMS — sequences stubs writeback-only ;
 *   l'output réel vit côté Cockpit via `imhotep.draftCrewProgram` / `anubis.draftCommsPlan`,
 *   ADR-0019 + ADR-0020 + ADR-0045 cleanup)
 *
 * APOGEE compliance :
 * - Sous-système : Propulsion (Mission #1) — manœuvres orchestrées
 * - Loi 1 (altitude) : SequenceExecution capture lineage hash-chain f9cd9de
 * - Loi 2 (séquencement) : `requires` enforced (e.g., MANIP-MATRIX requires
 *   MANIFESTE-A + PLAYBOOK-E)
 * - Loi 3 (carburant) : Thot CHECK_CAPACITY pre-flight via governedProcedure
 * - Pilier 1 (Identity) : invocation via mestor.emitIntent({kind: 'EXECUTE_GLORY_SEQUENCE'})
 *
 * **Ptah à la demande (contrainte sprint)** :
 * - Pendant `enrichAllSectionsNeteru()` (B4), `_oracleEnrichmentMode: true`
 *   est passé via SequenceContext → `chainGloryToPtah` court-circuité dans
 *   sequence-executor.ts → les forges Ptah des tools avec forgeOutput
 *   (creative-evaluation-matrix, bcg-portfolio-plotter, mckinsey-3-horizons-mapper)
 *   ne se déclenchent PAS automatiquement
 * - Hors enrichissement Oracle : flag false ou absent → cascade complète
 *
 * Tier mapping (skill tree) :
 * - 0 = foundation, 1 = identity, 2 = production, 3 = campaign, 4 = strategy, 5 = operations
 * - Phase 13 — Big4 baseline = tier 3-4 (stratégie consulting), Distinctifs = tier 2-4,
 *   Imhotep/Anubis writeback-only = tier 0 (sequence stub, output réel hors-sequence)
 */

import type { GlorySequenceDef, SequenceStep } from "./sequences";
import { getGloryTool } from "./registry";

// ─── Helpers (dupliqués légers — éviter import circular sequences.ts) ──────

const glory = (ref: string, outputs: string[] = []): SequenceStep => ({
  type: "GLORY",
  ref,
  name: getGloryTool(ref)?.name ?? ref,
  outputKeys: outputs,
  status: "ACTIVE",
});

const planned = (ref: string, name: string, outputs: string[] = []): SequenceStep => ({
  type: "GLORY",
  ref,
  name,
  outputKeys: outputs,
  status: "PLANNED",
});

// ═════════════════════════════════════════════════════════════════════════════
// BIG4 BASELINE SEQUENCES (7) — frameworks consulting one-shot
// ═════════════════════════════════════════════════════════════════════════════

export const ORACLE_BIG4_SEQUENCES: GlorySequenceDef[] = [
  {
    key: "MCK-7S",
    family: "ORACLE_BIG4",
    name: "McKinsey 7S Diagnostic",
    description: "Diagnostic structuré 7S (Strategy/Structure/Systems/Shared values/Style/Staff/Skills)",
    steps: [
      glory("mckinsey-7s-analyzer", ["seven_s_map", "alignment_scores"]),
      glory("strategic-diagnostic", ["augmented_swot"]), // template "mckinsey-7s"
    ],
    aiPowered: true,
    refined: false,
    tier: 3,
    requires: [{ type: "SEQUENCE", key: "AUDIT-R", status: "ACCEPTED" }],
  },
  {
    key: "BCG-PORTFOLIO",
    family: "ORACLE_BIG4",
    name: "BCG Growth-Share Matrix",
    description: "Portefeuille business (Stars/Cash Cows/Question Marks/Dogs)",
    steps: [
      glory("competitive-map-builder", ["competitive_landscape"]),
      glory("bcg-portfolio-plotter", ["bcg_quadrants", "portfolio_health_score", "prompt"]),
      // Note : forgeOutput design/Figma sur bcg-portfolio-plotter — court-circuité
      // pendant enrichOracle (B4 oracleEnrichmentMode=true), déclenché manuellement B8.
    ],
    aiPowered: true,
    refined: false,
    tier: 3,
    requires: [
      { type: "SEQUENCE", key: "AUDIT-R", status: "ACCEPTED" },
      { type: "SEQUENCE", key: "ETUDE-T", status: "ACCEPTED" },
    ],
  },
  {
    key: "BAIN-NPS",
    family: "ORACLE_BIG4",
    name: "Bain Net Promoter System",
    description: "NPS calculation + segmentation Promoters/Passives/Detractors + cohort drift",
    steps: [
      planned("feedback-loop", "Feedback Loop SESHAT (planned)", ["customer_feedback"]),
      glory("bain-nps-calculator", ["nps_score", "promoters_pct", "drivers"]),
    ],
    aiPowered: false,
    refined: false,
    tier: 2,
    requires: [{ type: "SEQUENCE", key: "PLAYBOOK-E", status: "ACCEPTED" }],
  },
  {
    key: "DELOITTE-GREENHOUSE",
    family: "ORACLE_BIG4",
    name: "Deloitte Greenhouse Talent Program",
    description: "Programme talent + benchmark équipe (extends fw-25-berkus-team)",
    steps: [
      glory("competitive-map-builder", ["talent_benchmark"]),
      glory("brand-guardian", ["brand_culture_audit"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 3,
    requires: [{ type: "PILLAR", key: "I", maturity: "ENRICHED" }],
  },
  {
    key: "MCK-3H",
    family: "ORACLE_BIG4",
    name: "McKinsey Three Horizons of Growth",
    description: "Mapping H1 core / H2 emerging / H3 transformational",
    steps: [
      glory("mckinsey-3-horizons-mapper", ["h1", "h2", "h3", "allocation_percentages", "prompt"]),
      // forgeOutput design/Figma — court-circuité pendant enrichOracle, manuel B8
    ],
    aiPowered: true,
    refined: false,
    tier: 4,
    requires: [{ type: "SEQUENCE", key: "ROADMAP-S", status: "ACCEPTED" }],
  },
  {
    key: "BCG-PALETTE",
    family: "ORACLE_BIG4",
    name: "BCG Strategy Palette (5 environments)",
    description: "5 environnements stratégiques (Classical/Adaptive/Visionary/Shaping/Renewal)",
    steps: [
      glory("strategic-diagnostic", ["augmented_swot"]),
      glory("creative-evaluation-matrix", ["evaluations", "matrix_summary"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 3,
    requires: [{ type: "SEQUENCE", key: "ETUDE-T", status: "ACCEPTED" }],
  },
  {
    key: "DELOITTE-BUDGET",
    family: "ORACLE_BIG4",
    name: "Deloitte Budget Framework (FinOps bridge)",
    description: "Budget consolidation + allocation par livrable + alternatives économiques",
    steps: [
      glory("production-budget-optimizer", ["budget_optimization"]),
      glory("vendor-brief-generator", ["vendor_brief"]),
    ],
    aiPowered: false,
    refined: false,
    tier: 5,
    requires: [{ type: "SEQUENCE", key: "ROADMAP-S", status: "ACCEPTED" }],
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// DISTINCTIVE SEQUENCES (5) — valeur ajoutée La Fusée vs Big4
// ═════════════════════════════════════════════════════════════════════════════

export const ORACLE_DISTINCTIVE_SEQUENCES: GlorySequenceDef[] = [
  {
    key: "CULT-INDEX",
    family: "ORACLE_DISTINCTIVE",
    name: "Cult Index — Score de masse culturelle",
    description: "Calcul Cult Index + tier ZOMBIE→ICONE + recommandations progression",
    steps: [
      glory("cult-index-scorer", ["cult_index_score", "tier", "components"]),
      // Note : cult-index-scorer invoque cult-index-engine SESHAT existant via
      // mestor.emitIntent({kind: "RANK_PEERS"}) — anti-doublon NEFER §3
    ],
    aiPowered: false,
    refined: false,
    tier: 2,
    requires: [{ type: "SEQUENCE", key: "PLAYBOOK-E", status: "ACCEPTED" }],
  },
  {
    key: "MANIP-MATRIX",
    family: "ORACLE_DISTINCTIVE",
    name: "Manipulation Matrix — 4 modes d'engagement audience",
    description: "Matrice 4 modes (peddler/dealer/facilitator/entertainer) + visualisation forge",
    steps: [
      glory("creative-evaluation-matrix", ["evaluations", "matrix_summary", "prompt"]),
      // forgeOutput image/Banana sur creative-evaluation-matrix (extension B2) —
      // court-circuité pendant enrichOracle (oracleEnrichmentMode=true), déclenché manuellement B8
    ],
    aiPowered: true,
    refined: false,
    tier: 2,
    requires: [
      { type: "SEQUENCE", key: "MANIFESTE-A", status: "ACCEPTED" },
      { type: "SEQUENCE", key: "PLAYBOOK-E", status: "ACCEPTED" },
    ],
  },
  {
    key: "DEVOTION-LADDER",
    family: "ORACLE_DISTINCTIVE",
    name: "Devotion Ladder — Hiérarchie superfans",
    description: "Échelle visiteur→suiveur→fan→superfan→ambassadeur (extends PLAYBOOK-E + fw-09 ; tools R4 ACTIVE)",
    steps: [
      // Phase 13 R4 — tools désormais ACTIVE (closure résidu B5)
      glory("superfan-journey-mapper", ["devotion_levels", "current_distribution"]),
      glory("engagement-rituals-designer", ["rituals_by_level", "manifesto_extract"]),
    ],
    aiPowered: true,
    refined: false,
    tier: 2,
    requires: [{ type: "SEQUENCE", key: "PLAYBOOK-E", status: "ACCEPTED" }],
  },
  {
    key: "OVERTON-DISTINCTIVE",
    family: "ORACLE_DISTINCTIVE",
    name: "Overton Distinctive — Position fenêtre culturelle sectorielle",
    description: "Mapping Overton + position actuelle + cible APOGEE + manœuvres déplacement",
    steps: [
      glory("overton-window-mapper", ["axes", "maneuvers"]),
      glory("strategic-diagnostic", ["augmented_swot"]), // template "overton"
    ],
    aiPowered: true,
    refined: false,
    tier: 4,
    requires: [{ type: "SEQUENCE", key: "ROADMAP-S", status: "ACCEPTED" }],
  },
  {
    key: "TARSIS-WEAK",
    family: "ORACLE_DISTINCTIVE",
    name: "Tarsis — Signaux faibles sectoriels",
    description: "Détection signaux faibles + scoring impact + horizon J+30/90/180/365+",
    steps: [
      glory("tarsis-signal-detector", ["signals", "summary", "top_3_priority"]),
      glory("insight-synthesizer", ["insights"]), // étendu B2 avec tarsis_signals input
      // Note : tarsis-signal-detector + insight-synthesizer invoquent seshat/tarsis
      // via JEHUTY_FEED_REFRESH — anti-doublon NEFER §3
    ],
    aiPowered: true,
    refined: false,
    tier: 1,
    requires: [{ type: "SEQUENCE", key: "ETUDE-T", status: "ACCEPTED" }],
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// NETERU GROUND SEQUENCES (2) — Imhotep + Anubis writeback-only stubs
// (Phase 14/15 actifs ADR-0019 + ADR-0020 ; ex-DORMANT promu CORE par ADR-0045)
//
// Ces sequences restent des stubs : leur output réel est produit côté Cockpit
// via appels directs `imhotep.draftCrewProgram()` / `anubis.draftCommsPlan()`.
// L'enrich-oracle les invoque en mode `_skipSequenceExecution: true` — seul le
// writeback statique tourne, la sequence n'est pas exécutée. Wire-up complet
// sequence → handler : Sprint C (post-cleanup).
// ═════════════════════════════════════════════════════════════════════════════

export const ORACLE_NETERU_GROUND_SEQUENCES: GlorySequenceDef[] = [
  {
    key: "IMHOTEP-CREW",
    family: "ORACLE_NETERU_GROUND",
    name: "Imhotep Crew Program",
    description:
      "Section CORE Oracle 34 pour le sous-système Crew Programs (Imhotep, Phase 14, ADR-0019). Sequence stub — output réel via `imhotep.draftCrewProgram()` côté Cockpit.",
    steps: [
      planned("imhotep-crew-placeholder", "Imhotep Crew Placeholder", ["placeholder"]),
    ],
    aiPowered: false,
    refined: false,
    tier: 0,
    requires: [],
  },
  {
    key: "ANUBIS-COMMS",
    family: "ORACLE_NETERU_GROUND",
    name: "Anubis Plan Comms",
    description:
      "Section CORE Oracle 35 pour le sous-système Comms (Anubis, Phase 15, ADR-0020). Sequence stub — output réel via `anubis.draftCommsPlan()` côté Cockpit.",
    steps: [
      planned("anubis-comms-placeholder", "Anubis Comms Placeholder", ["placeholder"]),
    ],
    aiPowered: false,
    refined: false,
    tier: 0,
    requires: [],
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// Aggregate Phase 13 sequences (consumed by sequences.ts ALL_SEQUENCES)
// ═════════════════════════════════════════════════════════════════════════════

export const PHASE13_ORACLE_SEQUENCES: GlorySequenceDef[] = [
  ...ORACLE_BIG4_SEQUENCES,
  ...ORACLE_DISTINCTIVE_SEQUENCES,
  ...ORACLE_NETERU_GROUND_SEQUENCES,
];
