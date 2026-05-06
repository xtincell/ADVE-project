/**
 * Campaign Tracker Router — NETERU-Governed (Phase 19, ADR-0052).
 *
 * Surface tRPC du service `campaign-tracker` (Guidance / MESTOR governor).
 * 6 procédures Vague 1 (Cluster A + B) :
 *
 *   Cluster A — Trajectoire & altitude :
 *     1. `snapshotTrajectoryPreLive` (mutation) — fige snapshots immutables
 *        au passage Campaign.state READY_TO_LAUNCH → LIVE. Idempotent.
 *     2. `checkFuelBurnRate` (query) — Loi 3 burn rate vs revenue pacing.
 *        Read-only. ALLOWED / WARN / DENIED + recommandation.
 *     3. `pauseFlameOut` (mutation) — auto-pause Campaign en flame-out.
 *        Idempotent. Hash-chained intent log.
 *
 *   Cluster B — Cohérence narrative :
 *     4. `checkBigIdeaCoherence` (mutation) — score d'une CampaignAction
 *        vs snapshots BigIdea + Manifesto. Persiste le score.
 *     5. `evaluateMythArcCohesion` (query) — chronologie inter-campagne.
 *     6. `recomputeCulturalDebt` (query) — agrège bigIdeaCoherenceScore.
 *
 * Pattern : `auditedProtected` (cf. deliverable-orchestrator router) — toutes
 * les mutations hash-chainées dans `IntentEmission` via le wrapper. Délégation
 * directe aux handlers exposés par `@/server/services/campaign-tracker` —
 * pas de logique métier dans le router (Identity Pillar FRAMEWORK §1).
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { auditedProcedure } from "@/server/governance/governed-procedure";

/* lafusee:governed-active — toutes les procédures délèguent aux handlers du service via auditedProcedure (hash-chained intent log automatique). Aucune mutation directe DB hors des handlers exposés par campaign-tracker. */
import {
  snapshotTrajectoryPreLive,
  checkFuelBurnRate,
  pauseFlameOut,
  checkBigIdeaCoherence,
  evaluateMythArcCohesion,
  recomputeCulturalDebt,
  StageSequencingViolationError,
  ManipulationDriftError,
  MissingSnapshotError,
  DeferredAwaitingDepsError,
  CLUSTER_CAPABILITIES,
} from "@/server/services/campaign-tracker";
// DeferredAwaitingDepsError imported from index for future use when sub-clusters
// declare STUB state and emit DEFERRED_AWAITING_DEPS via this router.
void DeferredAwaitingDepsError;

const auditedProtected = auditedProcedure(protectedProcedure, "campaign-tracker");

export const campaignTrackerRouter = createTRPCRouter({
  // ────────────────────────────────────────────────────────────────────
  // Helper UI — capability registry public (pas gouverné, pure config)
  // ────────────────────────────────────────────────────────────────────
  /**
   * Retourne le registry des sous-clusters Vague 1 (capability flags 4-états
   * + lifecycle STUB/MVP/PRODUCTION). Utile pour `/console/governance/campaign-tracker`
   * + UI Cockpit qui adapte son rendu selon l'état runtime des sous-clusters.
   */
  listClusterCapabilities: protectedProcedure.query(() => {
    return { capabilities: CLUSTER_CAPABILITIES };
  }),

  // ────────────────────────────────────────────────────────────────────
  // Cluster A — Trajectoire & altitude
  // ────────────────────────────────────────────────────────────────────

  /**
   * Cluster A — fige snapshots immutables Campaign au passage
   * READY_TO_LAUNCH → LIVE. Idempotent.
   *
   * Throws `STAGE_SEQUENCING_VIOLATION` si Campaign.advertis_vector est null
   * (Loi 2 séquencement étages). Errors sérialisées dans la response.
   */
  snapshotTrajectoryPreLive: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      try {
        const result = await snapshotTrajectoryPreLive({
          strategyId: input.strategyId,
          operatorId,
          campaignId: input.campaignId,
        });
        return { ok: true as const, ...result };
      } catch (err) {
        if (err instanceof StageSequencingViolationError) {
          return {
            ok: false as const,
            code: "STAGE_SEQUENCING_VIOLATION" as const,
            message: err.message,
            campaignId: err.campaignId,
            missingStages: err.missingStages,
          };
        }
        throw err;
      }
    }),

  /**
   * Cluster A — Loi 3 fuel burn rate. Read-only.
   *
   * Retourne {state: ALLOWED|WARN_AT_BURN_RATE|DENIED, burnRatio, timeRatio,
   * revenuePacing, recommendation, regretWindowFlag}. Sur DENIED, le caller
   * peut décider de déclencher `pauseFlameOut` séparément (compensating intent).
   */
  checkFuelBurnRate: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignId: z.string(),
        asOf: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await checkFuelBurnRate({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
        asOf: input.asOf,
      });
      return { ok: true as const, ...result };
    }),

  /**
   * Cluster A — auto-pause Campaign en flame-out. Idempotent.
   *
   * Set `Campaign.killTriggeredAt = now` + `status = "PAUSED"`. Hash-chained
   * intent log via auditedProcedure middleware.
   */
  pauseFlameOut: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignId: z.string(),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await pauseFlameOut({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
        reason: input.reason,
      });
      return { ok: true as const, ...result };
    }),

  // ────────────────────────────────────────────────────────────────────
  // Cluster B — Cohérence narrative
  // ────────────────────────────────────────────────────────────────────

  /**
   * Cluster B — score 0..1 de cohérence d'une CampaignAction vs snapshots
   * BigIdea + Manifesto figés sur la Campaign parente. Persiste
   * CampaignAction.bigIdeaCoherenceScore.
   *
   * MVP heuristic = Jaccard tokens ; PRODUCTION (ADR enfant) = LLM eval.
   *
   * Throws `MISSING_SNAPSHOT` si Campaign n'a pas de bigIdeaSnapshotBrandAssetId.
   * Throws `MANIPULATION_DRIFT` si Strategy.strictModeGates contient
   * "MANIPULATION_COHERENCE_PER_ACTION" et que CampaignAction.manipulationModeApplied
   * dévie du mix snapshot.
   */
  checkBigIdeaCoherence: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignActionId: z.string(),
        forceMethod: z.enum(["lexical", "llm"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      try {
        const result = await checkBigIdeaCoherence({
          strategyId: input.strategyId,
          operatorId,
          campaignActionId: input.campaignActionId,
          forceMethod: input.forceMethod,
        });
        return { ok: true as const, ...result };
      } catch (err) {
        if (err instanceof MissingSnapshotError) {
          return {
            ok: false as const,
            code: "MISSING_SNAPSHOT" as const,
            message: err.message,
            campaignId: err.campaignId,
            snapshotKind: err.snapshotKind,
          };
        }
        if (err instanceof ManipulationDriftError) {
          return {
            ok: false as const,
            code: "MANIPULATION_DRIFT" as const,
            message: err.message,
            campaignActionId: err.campaignActionId,
            applied: err.applied,
            allowed: err.allowed,
          };
        }
        throw err;
      }
    }),

  /**
   * Cluster B — évalue cohésion narrative entre campagnes consécutives d'une
   * Strategy. Read-only. Score similarity entre BigIdea snapshots N et N-1.
   */
  evaluateMythArcCohesion: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await evaluateMythArcCohesion({
        strategyId: input.strategyId,
        operatorId,
        fromDate: input.fromDate,
        toDate: input.toDate,
      });
      return { ok: true as const, ...result };
    }),

  /**
   * Cluster B — mesure cultural debt = gap Manifesto.beliefs[] vs
   * CampaignAction claims. Read-only (agrège bigIdeaCoherenceScore existants).
   */
  recomputeCulturalDebt: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await recomputeCulturalDebt({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
      });
      return { ok: true as const, ...result };
    }),
});
