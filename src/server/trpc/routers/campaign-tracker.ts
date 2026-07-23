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
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import { assertRawStrategyScope } from "../middleware/strategy-scope";
import { auditedProcedure } from "@/server/governance/governed-procedure";
import { checkPaidTier } from "@/server/services/glory-tools/tier-gate";
import {
  CALIBRATION_THRESHOLDS,
  ATTRIBUTION_FEATURE_KEYS,
} from "@/server/services/campaign-tracker";

/* lafusee:governed-active — toutes les procédures délèguent aux handlers du service via auditedProcedure (hash-chained intent log automatique). Aucune mutation directe DB hors des handlers exposés par campaign-tracker. */
import {
  // Vague 1
  snapshotTrajectoryPreLive,
  checkFuelBurnRate,
  pauseFlameOut,
  checkBigIdeaCoherence,
  evaluateMythArcCohesion,
  recomputeCulturalDebt,
  // Vague 2
  recomputeSuperfanAttribution,
  measureDevotionStickinessCohort,
  captureSuperfansFromCampaign,
  // Phase 23 Epic 4 — superfan-attribution calibration lineage view (ADR-0081)
  getAttributionLineage,
  evaluateOvertonReadiness,
  measureOvertonShift,
  ingestMcpContextToCampaign,
  // Vague 3 — Cluster E
  reconcileCampaignToOracle,
  enrichVariableBibleFromCampaign,
  evaluateCrewPerformance,
  proposeSequencePromotionFromCampaign,
  // Vague 3 — Cluster F
  recomputeAgencyActivityMargins,
  evaluateResourceSaturation,
  // Vague 3 — Cluster G
  checkCampaignFieldOpCompliance,
  snapshotCredentialsChain,
  // Vague 3 — Cluster H
  auditCampaignNegativeSpace,
  // Errors
  StageSequencingViolationError,
  ManipulationDriftError,
  MissingSnapshotError,
  DeferredAwaitingDepsError,
  // Registry
  CLUSTER_CAPABILITIES,
} from "@/server/services/campaign-tracker";
// DeferredAwaitingDepsError imported from index for future use when sub-clusters
// declare STUB state and emit DEFERRED_AWAITING_DEPS via this router.
void DeferredAwaitingDepsError;

const auditedProtected = auditedProcedure(protectedProcedure, "campaign-tracker").use(async ({ ctx, getRawInput, next }) => {
  // ADR-0166 — garde d'ownership à la base : toutes les procédures de cette
  // lane prennent un strategyId ; un id étranger est refusé avant le handler.
  await assertRawStrategyScope(ctx.session.user.id, await getRawInput(), { optional: true });
  return next();
});
// Cluster F (Économie agence) — restricted Operator role (ADMIN ou Operator-linked).
// Pattern aligné avec adminProcedure / operatorProcedure de init.ts. Cf. ADR-0052-F §6.
const auditedOperator = auditedProcedure(operatorProcedure, "campaign-tracker");

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

  // ────────────────────────────────────────────────────────────────────
  // Cluster C — Superfan economy (Vague 2)
  // ────────────────────────────────────────────────────────────────────

  /**
   * Cluster C — Modèle paramétrique d'attribution d'évangélistes par CampaignAction
   * (horizon 24 mois). Read-only. PARTIAL/MVP heuristic.
   */
  recomputeSuperfanAttribution: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await recomputeSuperfanAttribution({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
      });
      return { ok: true as const, ...result };
    }),

  /**
   * Cluster C — Cohort longitudinal J+30/J+90/J+180 stickiness des évangélistes
   * produits. Read-only. STUB Vague 2 — retourne `DEFERRED_AWAITING_DEPS` jusqu'à
   * câblage Anubis CRM cohort retention API (Vague 3).
   */
  measureDevotionStickinessCohort: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignId: z.string(),
        asOf: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await measureDevotionStickinessCohort({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
        asOf: input.asOf,
      });
      return { ok: true as const, ...result };
    }),

  /**
   * Cluster C — À POST_CAMPAIGN → ARCHIVED, capture les superfans en segment CRM.
   * MVP : génère segment name canonique. PARTIAL — Anubis CRM provider câblage
   * complète Vague 3 (DEFERRED_AWAITING_CREDENTIALS si pas configuré).
   */
  captureSuperfansFromCampaign: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await captureSuperfansFromCampaign({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
      });
      return { ok: true as const, ...result };
    }),

  /**
   * Cluster C — Phase 23 Epic 4 Story 4.6. Operator view of the Phase 23
   * **calibration** attribution result + evangelist lineage (ADR-0081 ;
   * distinct from the Phase 19 heuristic `recomputeSuperfanAttribution`
   * above). Read-only, tenant-scoped via the service `getAttributionLineage`
   * (campaign must belong to `strategyId` → otherwise `TENANT_MISMATCH`).
   *
   * Returns the discriminated `AttributionLineageView` :
   *   - `OK` — score + evangelistCount + lineage + snapshotRef (operator can
   *     defend the number by pointing at the dated transitions).
   *   - `INSUFFICIENT_DATA` — minSamplesRequired / samplesAvailable for the
   *     honest "N of 30 observed" empty state (UX-DR10).
   *   - `TENANT_MISMATCH` — campaign not in this strategy.
   */
  getAttributionLineage: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return getAttributionLineage({
        strategyId: input.strategyId,
        campaignId: input.campaignId,
      });
    }),

  /**
   * Cluster C — Phase 23 Epic 4 Story 4.7. Founder (Cockpit) view of the same
   * calibration lineage, behind a `requiresPaidTier` gate (FR32 — COCKPIT_MONTHLY
   * / RETAINER_*). Read-only ; tenant-scoped identically. When the founder has
   * no active paid subscription the query returns a `TIER_GATE_DENIED` arm so
   * the Cockpit renders an upgrade CTA instead of the lineage.
   */
  getFounderAttributionLineage: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // F5 — entitlement scopé à la marque de la lignée (input.strategyId) :
      // le founder doit payer POUR cette marque (ou détenir un sub legacy null
      // operator-wide, backward-compat). Cockpit path = per-brand.
      const gate = await checkPaidTier(ctx.session.user.id, undefined, input.strategyId);
      if (!gate.allowed) {
        return {
          state: "TIER_GATE_DENIED" as const,
          campaignId: input.campaignId,
          reason: gate.reason ?? "Abonnement payant requis.",
          configureUrl: gate.configureUrl ?? "/pricing",
        };
      }
      return getAttributionLineage({
        strategyId: input.strategyId,
        campaignId: input.campaignId,
      });
    }),

  // ────────────────────────────────────────────────────────────────────
  // Cluster D — Signaux faibles & culture (Vague 2)
  // ────────────────────────────────────────────────────────────────────

  /**
   * Cluster D — Pré-LIVE evaluator : axe culturel sectoriel ciblé est-il prêt ?
   * Output : READY | TOO_EARLY | TOO_LATE + reasoning. Read-only.
   * Non-bloquant par défaut (Strategy.strictModeGates contrôle).
   */
  evaluateOvertonReadiness: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await evaluateOvertonReadiness({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
      });
      return { ok: true as const, ...result };
    }),

  /**
   * Cluster D — Post-LIVE measurer : déplacement axe culturel mesuré vs hypothèse.
   * Read-only. MVP : Jaccard delta + sentiment delta. Output overtonShiftScore.
   */
  measureOvertonShift: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await measureOvertonShift({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
      });
      return { ok: true as const, ...result };
    }),

  /**
   * Phase 23 Epic 3 Story 3.7 (ADR-0078 + ADR-0060) — Manual Overton delta tag.
   *
   * Operator-entry mutation for `CampaignAction.overtonDeltaManual` as the
   * manual-first peer (FR26) to the algorithmic embeddings path (FR13). Goes
   * through `mestor.emitIntent` for hash-chained governance ; the IntentEmission
   * row carries `source: "MANUAL_OPERATOR"` for audit. Downstream
   * `measureOvertonShift` (Story 3.2) consumes the manual value when non-null.
   */
  tagOvertonDeltaManual: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignActionId: z.string(),
        overtonDeltaManual: z.number().min(-1).max(1),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const { emitIntent } = await import("@/server/services/mestor/intents");
      const result = await emitIntent(
        {
          kind: "OPERATOR_TAG_OVERTON_DELTA",
          strategyId: input.strategyId,
          operatorId,
          campaignActionId: input.campaignActionId,
          overtonDeltaManual: input.overtonDeltaManual,
          reason: input.reason,
          source: "MANUAL_OPERATOR",
        },
        { caller: "campaign-tracker:tagOvertonDeltaManual" },
      );
      if (result.status !== "OK") {
        throw new Error(
          `[tagOvertonDeltaManual] ${result.status}: ${result.reason ?? result.summary}`,
        );
      }
      return result;
    }),

  /**
   * Cluster D — Ingest contexte founder MCP entrant (Slack/Notion/Drive/GitHub)
   * scopé période campagne. Filtre PII pré-stockage (MVP regex baseline).
   * Idempotent via @@unique [campaignId, source, sourceId].
   */
  ingestMcpContextToCampaign: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await ingestMcpContextToCampaign({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
        source: input.source,
        sourceId: input.sourceId,
        content: input.content,
      });
      return { ok: true as const, ...result };
    }),

  // ────────────────────────────────────────────────────────────────────
  // Cluster E — Boucles d'apprentissage (Vague 3)
  // ────────────────────────────────────────────────────────────────────

  reconcileCampaignToOracle: auditedProtected
    .input(z.object({ strategyId: z.string(), campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await reconcileCampaignToOracle({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
      });
      return { ok: true as const, ...result };
    }),

  enrichVariableBibleFromCampaign: auditedProtected
    .input(z.object({ strategyId: z.string(), campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await enrichVariableBibleFromCampaign({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
      });
      return { ok: true as const, ...result };
    }),

  evaluateCrewPerformance: auditedProtected
    .input(z.object({ strategyId: z.string(), campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await evaluateCrewPerformance({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
      });
      return { ok: true as const, ...result };
    }),

  proposeSequencePromotionFromCampaign: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignId: z.string(),
        sequenceKey: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await proposeSequencePromotionFromCampaign({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
        sequenceKey: input.sequenceKey,
      });
      return { ok: true as const, ...result };
    }),

  // ────────────────────────────────────────────────────────────────────
  // Cluster F — Économie agence (Vague 3, Console UPgraders only)
  // ────────────────────────────────────────────────────────────────────

  recomputeAgencyActivityMargins: auditedOperator
    .input(
      z.object({
        strategyId: z.string(),
        periodStart: z.date(),
        periodEnd: z.date(),
        market: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await recomputeAgencyActivityMargins({
        strategyId: input.strategyId,
        operatorId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        market: input.market,
      });
      return { ok: true as const, ...result };
    }),

  evaluateResourceSaturation: auditedOperator
    .input(
      z.object({
        strategyId: z.string(),
        weeksAhead: z.number().int().min(1).max(52).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await evaluateResourceSaturation({
        strategyId: input.strategyId,
        operatorId,
        weeksAhead: input.weeksAhead,
      });
      return { ok: true as const, ...result };
    }),

  // ────────────────────────────────────────────────────────────────────
  // Cluster G — Souveraineté opérationnelle (Vague 3)
  // ────────────────────────────────────────────────────────────────────

  checkCampaignFieldOpCompliance: auditedProtected
    .input(z.object({ strategyId: z.string(), campaignFieldOpId: z.string() }))
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await checkCampaignFieldOpCompliance({
        strategyId: input.strategyId,
        operatorId,
        campaignFieldOpId: input.campaignFieldOpId,
      });
      return { ok: true as const, ...result };
    }),

  snapshotCredentialsChain: auditedProtected
    .input(z.object({ strategyId: z.string(), campaignId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await snapshotCredentialsChain({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
      });
      return { ok: true as const, ...result };
    }),

  // ────────────────────────────────────────────────────────────────────
  // Cluster H — Negative space audit (Vague 3)
  // ────────────────────────────────────────────────────────────────────

  auditNegativeSpace: auditedProtected
    .input(z.object({ strategyId: z.string(), campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const result = await auditCampaignNegativeSpace({
        strategyId: input.strategyId,
        operatorId,
        campaignId: input.campaignId,
      });
      return { ok: true as const, ...result };
    }),

  // ────────────────────────────────────────────────────────────────────
  // Phase 23 Epic 6 — Calibration review + governed lifecycle promotion
  // (ADR-0080 + ADR-0081). Consumed by the Console CalibrationReviewPanel
  // (Story 6.4) + campaign-tracker view switcher (Story 6.5). Reads are
  // tenant-scoped to the strategy ; mutations traverse `mestor.emitIntent`
  // (hash-chained, governed — mirrors `tagOvertonDeltaManual`).
  // ────────────────────────────────────────────────────────────────────

  /**
   * Read the calibration snapshots for a strategy. Each is a
   * `RUN_ATTRIBUTION_CALIBRATION` `IntentEmission` payload (P22-6 — no calibration
   * table). Also returns the declared acceptance thresholds (ADR-0081 §4) + the
   * regression feature keys, so the panel renders values-vs-thresholds and the
   * manual-coefficient form without importing server-only code.
   */
  listCalibrationSnapshots: auditedProtected
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      const rows = await db.intentEmission.findMany({
        where: { intentKind: "RUN_ATTRIBUTION_CALIBRATION", strategyId: input.strategyId },
        orderBy: { emittedAt: "desc" },
        take: 20,
        select: { id: true, emittedAt: true, result: true },
      });
      const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
      const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
      const snapshots = rows.map((r) => {
        const result = r.result as { output?: Record<string, unknown> } | null;
        const output = result?.output ?? {};
        const snap = (output.snapshot as Record<string, unknown> | undefined) ?? null;
        return {
          emissionId: r.id,
          emittedAt: r.emittedAt.toISOString(),
          state: str(output.state) ?? "UNKNOWN",
          rocAuc: snap ? num(snap.rocAuc) : null,
          rmse: snap ? num(snap.rmse) : null,
          sampleSize: snap ? num(snap.sampleSize) : num(output.samplesAvailable),
          mode: snap ? str(snap.mode) : str(output.mode),
          modelVersion: snap ? str(snap.modelVersion) : str(output.modelVersion),
          coefficients:
            snap && snap.coefficients && typeof snap.coefficients === "object"
              ? (snap.coefficients as Record<string, number>)
              : null,
        };
      });
      return {
        thresholds: CALIBRATION_THRESHOLDS,
        featureKeys: ATTRIBUTION_FEATURE_KEYS,
        snapshots,
      };
    }),

  /**
   * Run a calibration via `mestor.emitIntent`. AUTO fits the logistic regression ;
   * MANUAL_COEFFICIENTS skips the fit and evaluates operator-supplied coefficients
   * (manual-first peer, FR25). Returns the resulting `IntentResult` + the emission
   * id (`snapshotRef`) the operator promotes against (P22-6) — `emitIntent` doesn't
   * surface the id, so the just-created OK emission is looked up.
   */
  runAttributionCalibration: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        campaignIds: z.array(z.string()).optional(),
        mode: z.enum(["AUTO", "MANUAL_COEFFICIENTS"]),
        operatorCoefficients: z.record(z.string(), z.number()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const { emitIntent } = await import("@/server/services/mestor/intents");
      const result = await emitIntent(
        {
          kind: "RUN_ATTRIBUTION_CALIBRATION",
          strategyId: input.strategyId,
          operatorId,
          campaignIds: input.campaignIds,
          mode: input.mode,
          operatorCoefficients: input.operatorCoefficients,
        },
        { caller: "campaign-tracker:runAttributionCalibration" },
      );
      let snapshotRef: string | null = null;
      const okOutput = result.output as { state?: string } | undefined;
      if (result.status === "OK" && okOutput?.state === "OK") {
        const latest = await db.intentEmission.findFirst({
          where: { intentKind: "RUN_ATTRIBUTION_CALIBRATION", strategyId: input.strategyId },
          orderBy: { emittedAt: "desc" },
          select: { id: true },
        });
        snapshotRef = latest?.id ?? null;
      }
      return {
        status: result.status,
        summary: result.summary,
        output: result.output ?? null,
        reason: result.reason ?? null,
        snapshotRef,
      };
    }),

  /**
   * Promote a pivot sub-cluster one rung along STUB → PARTIAL → MVP → PRODUCTION
   * (PROMOTE_PIVOT_SUBCLUSTER, ADR-0080) via `mestor.emitIntent`. PRODUCTION requires
   * a `calibrationSnapshotRef` — refused at the handler entry AND the Mestor
   * pre-flight gate (Story 6.3, defense-in-depth). The VETOED reason is surfaced to
   * the operator, not thrown.
   */
  promotePivotSubcluster: auditedProtected
    .input(
      z.object({
        strategyId: z.string(),
        subClusterSlug: z.enum([
          "superfan.attribution",
          "superfan.stickiness",
          "superfan.crmCapture",
          "culture.overtonShift",
          "culture.overtonReadiness",
          "culture.tarsisBridge",
          "culture.mcpIngest",
        ]),
        fromState: z.enum(["STUB", "PARTIAL", "MVP"]),
        toState: z.enum(["PARTIAL", "MVP", "PRODUCTION"]),
        calibrationSnapshotRef: z.string().optional(),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const operatorId = ctx.session.user.id;
      const { emitIntent } = await import("@/server/services/mestor/intents");
      const result = await emitIntent(
        {
          kind: "PROMOTE_PIVOT_SUBCLUSTER",
          strategyId: input.strategyId,
          operatorId,
          subClusterSlug: input.subClusterSlug,
          fromState: input.fromState,
          toState: input.toState,
          calibrationSnapshotRef: input.calibrationSnapshotRef,
          reason: input.reason,
        },
        { caller: "campaign-tracker:promotePivotSubcluster" },
      );
      return {
        status: result.status,
        summary: result.summary,
        output: result.output ?? null,
        reason: result.reason ?? null,
      };
    }),

  reportFieldProgress: operatorProcedure
    .input(z.object({
      fieldOpId: z.string(),
      reporterName: z.string(),
      data: z.record(z.string(), z.unknown()),
      photos: z.array(z.string()).optional(),
      metrics: z.object({
        acquisitionCount: z.number().optional(),
        activationCount: z.number().optional(),
        retentionCount: z.number().optional(),
        revenueCount: z.number().optional(),
        referralCount: z.number().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const fieldOp = await ctx.db.campaignFieldOp.findUniqueOrThrow({
        where: { id: input.fieldOpId },
      });

       const report = await ctx.db.campaignFieldReport.create({
        data: {
          fieldOpId: input.fieldOpId,
          campaignId: fieldOp.campaignId,
          reporterName: input.reporterName,
          data: input.data as Prisma.InputJsonValue,
          photos: input.photos ? input.photos : undefined,
          status: "SUBMITTED",
          acquisitionCount: input.metrics?.acquisitionCount ?? null,
          activationCount: input.metrics?.activationCount ?? null,
          retentionCount: input.metrics?.retentionCount ?? null,
          revenueCount: input.metrics?.revenueCount ?? null,
          referralCount: input.metrics?.referralCount ?? null,
        },
      });

      await ctx.db.campaignFieldOp.update({
        where: { id: input.fieldOpId },
        data: { status: "IN_PROGRESS" },
      });

      return report;
    }),

  getOperationalSummary: operatorProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaigns = await ctx.db.campaign.findMany({
        where: { strategyId: input.strategyId, state: { not: "ARCHIVED" } },
        include: {
          fieldOps: { include: { reports: true } },
          missions: true,
          executions: true,
        },
      });

      let totalCampaigns = campaigns.length;
      let liveCampaigns = campaigns.filter(c => c.state === "LIVE").length;
      let totalMissions = 0;
      let activeMissions = 0;
      let totalFieldOps = 0;
      let completedFieldOps = 0;

      const aarrrTotals = {
        acquisition: 0,
        activation: 0,
        retention: 0,
        revenue: 0,
        referral: 0,
      };

      let devisTotalAmount = 0;

      for (const c of campaigns) {
        totalMissions += c.missions.length;
        activeMissions += c.missions.filter(m => m.status === "IN_PROGRESS" || m.status === "REVIEW").length;
        totalFieldOps += c.fieldOps.length;
        completedFieldOps += c.fieldOps.filter(f => f.status === "COMPLETED").length;

        for (const exec of c.executions) {
          devisTotalAmount += exec.devisAmount ?? 0;
        }

        for (const op of c.fieldOps) {
          for (const rep of op.reports) {
            aarrrTotals.acquisition += rep.acquisitionCount ?? 0;
            aarrrTotals.activation += rep.activationCount ?? 0;
            aarrrTotals.retention += rep.retentionCount ?? 0;
            aarrrTotals.revenue += rep.revenueCount ?? 0;
            aarrrTotals.referral += rep.referralCount ?? 0;
          }
        }
      }

      return {
        campaigns: { total: totalCampaigns, live: liveCampaigns },
        missions: { total: totalMissions, active: activeMissions },
        fieldOps: { total: totalFieldOps, completed: completedFieldOps },
        aarrrTotals,
        devisTotalAmount,
      };
    }),

  getFieldKpiProgress: operatorProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const fieldOps = await ctx.db.campaignFieldOp.findMany({
        where: { campaignId: input.campaignId },
        include: { reports: true },
      });

      return fieldOps.map((op) => {
        const config = op.aarrConfig as Record<string, unknown> | null;
        const targets = {
          acquisition: typeof config?.acquisitionTarget === "number" ? config.acquisitionTarget : 100,
          activation: typeof config?.activationTarget === "number" ? config.activationTarget : 50,
          retention: typeof config?.retentionTarget === "number" ? config.retentionTarget : 20,
          revenue: typeof config?.revenueTarget === "number" ? config.revenueTarget : 10,
          referral: typeof config?.referralTarget === "number" ? config.referralTarget : 5,
        };

        const progress = {
          acquisition: 0,
          activation: 0,
          retention: 0,
          revenue: 0,
          referral: 0,
        };

        for (const rep of op.reports) {
          progress.acquisition += rep.acquisitionCount ?? 0;
          progress.activation += rep.activationCount ?? 0;
          progress.retention += rep.retentionCount ?? 0;
          progress.revenue += rep.revenueCount ?? 0;
          progress.referral += rep.referralCount ?? 0;
        }

        return {
          id: op.id,
          name: op.name,
          location: op.location,
          status: op.status,
          targets,
          progress,
        };
      });
    }),
});
