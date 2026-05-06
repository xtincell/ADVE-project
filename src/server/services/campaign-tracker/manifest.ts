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

export const manifest = defineManifest({
  service: "campaign-tracker",
  governor: "MESTOR",
  version: "0.1.0",
  acceptsIntents: [
    "SNAPSHOT_CAMPAIGN_TRAJECTORY_PRE_LIVE",
    "CHECK_CAMPAIGN_FUEL_BURN_RATE",
    "THOT_PAUSE_CAMPAIGN_FLAME_OUT",
    "CHECK_BIG_IDEA_COHERENCE",
    "EVALUATE_MYTH_ARC_COHESION",
    "RECOMPUTE_CULTURAL_DEBT",
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
  ],
  dependencies: ["mestor", "artemis", "thot", "seshat"],
  missionContribution: "CHAIN_VIA:multi",
  missionStep: 3,
  docs: {
    summary:
      "Campaign tracker L2 Instrumental — orchestrateur cross-Neteru qui instrumente les " +
      "mécanismes pivots (superfans, Overton, cult coherence) sans altérer L1 Operational. " +
      "Cf. ADR-0052 §2.5 trois primitives (capability flags 4-états + STUB→MVP→PRODUCTION + double-layer).",
  },
});
