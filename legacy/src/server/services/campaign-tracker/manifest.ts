/**
 * Manifest — campaign-tracker (Phase 19, ADR-0052).
 *
 * APOGEE classification : orchestrateur cross-Neteru gouverné par MESTOR
 * (pattern dispatcher comme `deliverable-orchestrator` ADR-0050).
 * missionContribution = CHAIN_VIA:multi — chaque capability instrumente
 * un mécanisme pivot (superfans / Overton / cult coherence).
 *
 * Vague 1 (Cluster A + B) : 6 capabilities. Vague 2/3 ajouteront leurs
 * capabilities via extension non-breaking de ce manifest.
 *
 * Cap APOGEE 7/7 préservé — campaign-tracker n'est PAS un Neter, c'est un
 * service orchestrateur sous gouvernance Mestor.
 */

import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const SnapshotPreLiveInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
});

const FuelBurnRateInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
  /** Override pour cron scheduler. Default = now(). */
  asOf: z.date().optional(),
});

const PauseFlameOutInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
  reason: z.string().min(1).max(500),
});

const BigIdeaCoherenceInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignActionId: z.string(),
  /** Override mode pour test (default lit Strategy.evaluatorMode). */
  forceMethod: z.enum(["lexical", "llm"]).optional(),
});

const MythArcCohesionInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  /** Window optionnelle ; default = toutes campaigns Strategy ordered by startDate. */
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
});

const CulturalDebtInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
});

// ── Vague 2 input schemas ──
const SuperfanAttributionInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
});

const StickinessInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
  asOf: z.date().optional(),
});

const CrmCaptureInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
});

const OvertonReadinessInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
});

const OvertonShiftInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
});

const McpIngestInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
  source: z.enum(["slack", "notion", "drive", "github", "manual"]),
  sourceId: z.string(),
  content: z.object({
    title: z.string().optional(),
    body: z.string(),
    author: z.string().optional(),
    timestamp: z.string().optional(),
    originalUrl: z.string().optional(),
  }),
});

// ── Vague 3 input schemas ──
const ReconcileToOracleInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
});

const EnrichVbInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
});

const EvaluateCrewInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
});

const ProposeSequencePromotionInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
  sequenceKey: z.string(),
});

const ActivityMarginsInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  periodStart: z.date(),
  periodEnd: z.date(),
  market: z.string().optional(),
});

const ResourceSaturationInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  weeksAhead: z.number().int().min(1).max(52).optional(),
});

const ComplianceCheckInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignFieldOpId: z.string(),
});

const CredentialsChainInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
});

const NegativeSpaceAuditInput = z.object({
  strategyId: z.string(),
  operatorId: z.string(),
  campaignId: z.string(),
});

export const manifest = defineManifest({
  service: "campaign-tracker",
  governor: "MESTOR",
  version: "0.1.0",
  acceptsIntents: [
    // Vague 1 — Cluster A + B
    "SNAPSHOT_CAMPAIGN_TRAJECTORY_PRE_LIVE",
    "CHECK_CAMPAIGN_FUEL_BURN_RATE",
    "THOT_PAUSE_CAMPAIGN_FLAME_OUT",
    "CHECK_BIG_IDEA_COHERENCE",
    "EVALUATE_MYTH_ARC_COHESION",
    "RECOMPUTE_CULTURAL_DEBT",
    // Vague 2 — Cluster C + D
    "RECOMPUTE_SUPERFAN_ATTRIBUTION",
    "MEASURE_DEVOTION_STICKINESS_COHORT",
    "CRM_SEGMENT_CAPTURE_SUPERFANS_FROM_CAMPAIGN",
    "INGEST_MCP_CONTEXT_TO_CAMPAIGN",
    "MEASURE_OVERTON_SHIFT",
    "EVALUATE_OVERTON_READINESS",
    // Vague 3 — Cluster E + F + G + H
    "RECONCILE_CAMPAIGN_TO_ORACLE",
    "ENRICH_VARIABLE_BIBLE_FROM_CAMPAIGN",
    "EVALUATE_CREW_PERFORMANCE",
    "PROPOSE_SEQUENCE_PROMOTION_FROM_CAMPAIGN",
    "RECOMPUTE_AGENCY_ACTIVITY_MARGINS",
    "EVALUATE_RESOURCE_SATURATION",
    "CHECK_CAMPAIGN_FIELD_OP_COMPLIANCE",
    "SNAPSHOT_CREDENTIALS_CHAIN",
    "AUDIT_CAMPAIGN_NEGATIVE_SPACE",
    // Phase 23 (ADR-0080 + ADR-0081) — Pivot mechanics governance Intents.
    // Handlers placeholder en Epic 1 (commandant.ts throws NOT_YET_IMPLEMENTED) ;
    // real handlers lifecycle.ts + calibration.ts land Epic 6.
    "PROMOTE_PIVOT_SUBCLUSTER",
    "RUN_ATTRIBUTION_CALIBRATION",
    // Phase 23 Epic 3 Story 3.7 (ADR-0078 + ADR-0060) — Manual Overton delta tag.
    // Manual-first peer (FR26) to the algorithmic embeddings path (FR13).
    // Handler `operator-tag-overton-delta.ts`. Sync, no LLM, p95 ≤ 1s.
    "OPERATOR_TAG_OVERTON_DELTA",
  ],
  emits: [
    // THOT_PAUSE émet un compensating intent si déclenché par CHECK_FUEL_BURN_RATE.
    "THOT_PAUSE_CAMPAIGN_FLAME_OUT",
  ],
  capabilities: [
    {
      name: "snapshotTrajectoryPreLive",
      inputSchema: SnapshotPreLiveInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      latencyBudgetMs: 3_000,
      idempotent: true, // Re-run sur Campaign déjà LIVE = no-op (snapshots immutables)
      missionContribution: "CHAIN_VIA:campaign-tracker",
      missionStep: 3,
    },
    {
      name: "checkFuelBurnRate",
      inputSchema: FuelBurnRateInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 1_500,
      idempotent: true,
      missionContribution: "CHAIN_VIA:thot",
      missionStep: 4,
    },
    {
      name: "pauseFlameOut",
      inputSchema: PauseFlameOutInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      qualityTier: "A",
      latencyBudgetMs: 2_000,
      idempotent: true, // Re-run sur Campaign déjà PAUSED = no-op
      missionContribution: "CHAIN_VIA:thot",
      missionStep: 4,
    },
    {
      name: "checkBigIdeaCoherence",
      inputSchema: BigIdeaCoherenceInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      latencyBudgetMs: 8_000,
      // Coût LLM uniquement si forceMethod='llm'. MVP heuristic = 0.
      costEstimateUsd: 0.05,
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 1,
    },
    {
      name: "evaluateMythArcCohesion",
      inputSchema: MythArcCohesionInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 12_000,
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 5,
    },
    {
      name: "recomputeCulturalDebt",
      inputSchema: CulturalDebtInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      latencyBudgetMs: 30_000,
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 5,
    },
    // Vague 2 — Cluster C (Superfan economy)
    {
      name: "recomputeSuperfanAttribution",
      inputSchema: SuperfanAttributionInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 60_000,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
    {
      name: "measureDevotionStickinessCohort",
      inputSchema: StickinessInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 90_000,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 4,
    },
    {
      name: "captureSuperfansFromCampaign",
      inputSchema: CrmCaptureInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "EXTERNAL_API"],
      qualityTier: "B",
      latencyBudgetMs: 8_000,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 4,
    },
    // Vague 2 — Cluster D (Signaux faibles & culture)
    {
      name: "evaluateOvertonReadiness",
      inputSchema: OvertonReadinessInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 8_000,
      missionContribution: "DIRECT_OVERTON",
      missionStep: 1,
    },
    {
      name: "measureOvertonShift",
      inputSchema: OvertonShiftInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 120_000,
      missionContribution: "DIRECT_OVERTON",
      missionStep: 5,
    },
    {
      name: "ingestMcpContextToCampaign",
      inputSchema: McpIngestInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_WRITE"],
      qualityTier: "B",
      latencyBudgetMs: 15_000,
      missionContribution: "CHAIN_VIA:anubis",
      missionStep: 1,
    },
    // Vague 3 — Cluster E (Boucles d'apprentissage)
    {
      name: "reconcileCampaignToOracle",
      inputSchema: ReconcileToOracleInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 180_000,
      missionContribution: "CHAIN_VIA:mestor",
      missionStep: 5,
    },
    {
      name: "enrichVariableBibleFromCampaign",
      inputSchema: EnrichVbInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 30_000,
      missionContribution: "CHAIN_VIA:mestor",
      missionStep: 5,
    },
    {
      name: "evaluateCrewPerformance",
      inputSchema: EvaluateCrewInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 15_000,
      missionContribution: "CHAIN_VIA:imhotep",
      missionStep: 5,
    },
    {
      name: "proposeSequencePromotionFromCampaign",
      inputSchema: ProposeSequencePromotionInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 5_000,
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 5,
    },
    // Vague 3 — Cluster F (Économie agence)
    {
      name: "recomputeAgencyActivityMargins",
      inputSchema: ActivityMarginsInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 240_000,
      missionContribution: "CHAIN_VIA:thot",
      missionStep: 4,
    },
    {
      name: "evaluateResourceSaturation",
      inputSchema: ResourceSaturationInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 8_000,
      missionContribution: "CHAIN_VIA:imhotep",
      missionStep: 4,
    },
    // Vague 3 — Cluster G (Souveraineté opérationnelle)
    {
      name: "checkCampaignFieldOpCompliance",
      inputSchema: ComplianceCheckInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "A",
      latencyBudgetMs: 3_000,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Compliance regulatory check — sans cette gate, des CampaignFieldOp peuvent " +
        "être lancés en violation des règles ARPP/CONAC/ASA locales, exposant l'agence + le founder " +
        "à des sanctions légales. Pas un mécanisme pivot direct (superfans/Overton) mais condition " +
        "nécessaire à toute exécution legal-safe sur les marchés régulés.",
      missionStep: 1,
    },
    {
      name: "snapshotCredentialsChain",
      inputSchema: CredentialsChainInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "A",
      latencyBudgetMs: 2_000,
      idempotent: false, // Re-run = nouveau snapshot timestamp + audit hash distinct.
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Audit chain of custody pour les credentials externes utilisés en campagne. " +
        "Sans cette trace, impossible de prouver la rotation des clés et la non-fuite secrets " +
        "post-archive. Pas un mécanisme pivot direct mais condition de souveraineté opérationnelle.",
      missionStep: 1,
    },
    // Vague 3 — Cluster H (Negative space audit)
    {
      name: "auditCampaignNegativeSpace",
      inputSchema: NegativeSpaceAuditInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 20_000,
      missionContribution: "CHAIN_VIA:mestor",
      missionStep: 5,
    },
  ],
  dependencies: ["mestor", "artemis", "financial-brain", "seshat", "anubis", "imhotep"],
  missionContribution: "CHAIN_VIA:multi",
  missionStep: 3,
  docs: {
    summary:
      "Campaign tracker L2 Instrumental — orchestrateur cross-Neteru qui instrumente les " +
      "mécanismes pivots (superfans, Overton, cult coherence) sans altérer L1 Operational. " +
      "Cf. ADR-0052 §2.5 trois primitives (capability flags 4-états + STUB→MVP→PRODUCTION + double-layer).",
  },
});
