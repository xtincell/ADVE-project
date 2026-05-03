/**
 * NOTORIA tRPC Router — Recommendation engine endpoints.
 *
 * Missions: generateBatch, launchPipeline, advancePipeline
 * Queries:  getRecos, getRecosByPillar, getPendingCounts, getBatches, getDashboard, getPipelineStatus, getKPIs
 * Actions:  acceptRecos, rejectRecos, applyRecos, applyBatch, revertReco, publishToJehuty
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import { generateBatch } from "@/server/services/notoria/engine";
import {
  acceptRecos,
  rejectRecos,
  applyRecos,
  revertReco,
  expireOldRecos,
} from "@/server/services/notoria/lifecycle";
import {
  launchPipeline,
  advancePipeline,
  getPipelineStatus,
} from "@/server/services/notoria/pipeline";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { auditedProcedure, governedProcedure } from "@/server/governance/governed-procedure";
const auditedProtected = auditedProcedure(protectedProcedure, "notoria");
/* lafusee:strangler-active */

const missionTypeEnum = z.enum([
  "ADVE_INTAKE",
  "ADVE_UPDATE",
  "I_GENERATION",
  "S_SYNTHESIS",
  "SESHAT_OBSERVATION",
]);

const recoStatusEnum = z.enum([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "APPLIED",
  "REVERTED",
  "EXPIRED",
]);

import { PillarKeySchema } from "@/domain";

const pillarKeyEnum = PillarKeySchema;

export const notoriaRouter = createTRPCRouter({
  // ══════════════════════════════════════════════════════════════════
  // MISSIONS
  // ══════════════════════════════════════════════════════════════════

  generateBatch: governedProcedure({
    kind: "GENERATE_RECOMMENDATIONS",
    inputSchema: z.object({
      strategyId: z.string(),
      missionType: missionTypeEnum,
      targetPillars: z.array(pillarKeyEnum).optional(),
      seshatObservation: z.string().optional(),
    }),
    preconditions: ["RTIS_CASCADE"],
  }).mutation(async ({ input }) => {
    return generateBatch({
      strategyId: input.strategyId,
      missionType: input.missionType,
      targetPillars: input.targetPillars?.map((k) => k.toLowerCase() as "a" | "d" | "v" | "e" | "r" | "t" | "i" | "s"),
      seshatObservation: input.seshatObservation,
    });
  }),

  launchPipeline: operatorProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(({ input }) => launchPipeline(input.strategyId)),

  advancePipeline: operatorProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(({ input }) => advancePipeline(input.strategyId)),

  /** Actualize R and/or T pillars via RTIS cascade (prerequisite for ADVE_UPDATE).
   *  ADR-0030 Axe 3 — gate RTIS_CASCADE : refuse si ADVE pas ENRICHED. Cohérent
   *  avec generateBatch ci-dessus (preconditions: ["RTIS_CASCADE"]). */
  actualizeRT: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      pillars: z.array(z.enum(["R", "T"])).default(["R", "T"]),
    }))
    .mutation(async ({ input }) => {
      const { assertReadyFor } = await import("@/server/governance/pillar-readiness");
      await assertReadyFor(input.strategyId, "RTIS_CASCADE");

      const { actualizePillar } = await import("@/server/services/mestor/rtis-cascade");
      const results: Record<string, { updated: boolean; error?: string }> = {};
      for (const key of input.pillars) {
        const result = await actualizePillar(input.strategyId, key);
        results[key] = { updated: result.updated, error: result.error };
      }
      return results;
    }),

  // ══════════════════════════════════════════════════════════════════
  // QUERIES
  // ══════════════════════════════════════════════════════════════════

  getRecos: protectedProcedure
    .input(
      z.object({
        strategyId: z.string(),
        status: recoStatusEnum.optional(),
        targetPillarKey: pillarKeyEnum.optional(),
        missionType: missionTypeEnum.optional(),
        batchId: z.string().optional(),
        sectionGroup: z.string().optional(),
        limit: z.number().min(1).max(200).default(100),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const where: Prisma.RecommendationWhereInput = {
        strategyId: input.strategyId,
      };
      if (input.status) where.status = input.status;
      if (input.targetPillarKey)
        where.targetPillarKey = input.targetPillarKey.toLowerCase();
      if (input.missionType) where.missionType = input.missionType;
      if (input.batchId) where.batchId = input.batchId;
      if (input.sectionGroup) where.sectionGroup = input.sectionGroup;

      const items = await db.recommendation.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
      });

      // Sort in-memory by semantic priority (alphabetical sort on enum strings is unreliable)
      const IMPACT_ORDER: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const URGENCY_ORDER: Record<string, number> = { NOW: 3, SOON: 2, LATER: 1 };
      items.sort((a, b) => {
        const impactDiff = (IMPACT_ORDER[b.impact] ?? 0) - (IMPACT_ORDER[a.impact] ?? 0);
        if (impactDiff !== 0) return impactDiff;
        const urgencyDiff = (URGENCY_ORDER[b.urgency] ?? 0) - (URGENCY_ORDER[a.urgency] ?? 0);
        if (urgencyDiff !== 0) return urgencyDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  getRecosByPillar: protectedProcedure
    .input(
      z.object({
        strategyId: z.string(),
        pillarKey: pillarKeyEnum,
        status: recoStatusEnum.optional().default("PENDING"),
      }),
    )
    .query(async ({ input }) => {
      return db.recommendation.findMany({
        where: {
          strategyId: input.strategyId,
          targetPillarKey: input.pillarKey.toLowerCase(),
          status: input.status,
        },
        orderBy: [{ impact: "desc" }, { createdAt: "desc" }],
        take: 50,
      });
    }),

  getPendingCounts: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      const counts = await db.recommendation.groupBy({
        by: ["targetPillarKey"],
        where: { strategyId: input.strategyId, status: { in: ["PENDING", "ACCEPTED"] } },
        _count: true,
      });

      const result: Record<string, number> = {};
      for (const c of counts) {
        result[c.targetPillarKey] = c._count;
      }
      return result;
    }),

  getBatches: protectedProcedure
    .input(
      z.object({
        strategyId: z.string(),
        missionType: missionTypeEnum.optional(),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ input }) => {
      const where: Prisma.RecommendationBatchWhereInput = {
        strategyId: input.strategyId,
      };
      if (input.missionType) where.missionType = input.missionType;

      return db.recommendationBatch.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  getDashboard: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      const [pendingByPillar, statusCounts, completionLevels] =
        await Promise.all([
          db.recommendation.groupBy({
            by: ["targetPillarKey"],
            where: { strategyId: input.strategyId, status: { in: ["PENDING", "ACCEPTED"] } },
            _count: true,
          }),
          db.recommendation.groupBy({
            by: ["status"],
            where: { strategyId: input.strategyId },
            _count: true,
          }),
          db.pillar.findMany({
            where: { strategyId: input.strategyId },
            select: { key: true, completionLevel: true },
          }),
        ]);

      return {
        pendingByPillar: Object.fromEntries(
          pendingByPillar.map((c) => [c.targetPillarKey, c._count]),
        ),
        statusCounts: Object.fromEntries(
          statusCounts.map((c) => [c.status, c._count]),
        ),
        completionLevels: Object.fromEntries(
          completionLevels.map((p) => [p.key, p.completionLevel ?? "INCOMPLET"]),
        ),
      };
    }),

  getPipelineStatus: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(({ input }) => getPipelineStatus(input.strategyId)),

  getKPIs: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      const all = await db.recommendation.findMany({
        where: { strategyId: input.strategyId },
        select: {
          status: true,
          confidence: true,
          urgency: true,
          source: true,
          missionType: true,
          createdAt: true,
          reviewedAt: true,
        },
      });

      const accepted = all.filter((r) => ["ACCEPTED", "APPLIED"].includes(r.status)).length;
      const rejected = all.filter((r) => r.status === "REJECTED").length;
      const applied = all.filter((r) => r.status === "APPLIED").length;
      const reverted = all.filter((r) => r.status === "REVERTED").length;

      const acceptanceRate =
        accepted + rejected > 0 ? accepted / (accepted + rejected) : 0;
      const revertRate = applied > 0 ? reverted / applied : 0;

      // Time to approve (median)
      const approveTimes = all
        .filter((r) => r.reviewedAt && r.createdAt)
        .map(
          (r) =>
            (r.reviewedAt as Date).getTime() -
            (r.createdAt as Date).getTime(),
        )
        .sort((a, b) => a - b);
      const avgTimeToApproveMs =
        approveTimes.length > 0
          ? approveTimes[Math.floor(approveTimes.length / 2)]!
          : 0;

      // Confidence distribution
      const buckets = ["0-0.3", "0.3-0.5", "0.5-0.7", "0.7-1.0"];
      const confidenceDistribution = buckets.map((bucket) => {
        const [low, high] = bucket.split("-").map(Number);
        return {
          bucket,
          count: all.filter(
            (r) => r.confidence >= low! && r.confidence < (high ?? 1.01),
          ).length,
        };
      });

      // Urgency distribution
      const urgencyDistribution: Record<string, number> = { NOW: 0, SOON: 0, LATER: 0 };
      for (const r of all) {
        const u = r.urgency as string;
        if (u in urgencyDistribution) urgencyDistribution[u]!++;
      }

      // By source
      const recosBySource: Record<string, number> = {};
      for (const r of all) {
        recosBySource[r.source] = (recosBySource[r.source] ?? 0) + 1;
      }

      // By mission
      const recosByMission: Record<string, number> = {};
      for (const r of all) {
        recosByMission[r.missionType] =
          (recosByMission[r.missionType] ?? 0) + 1;
      }

      return {
        acceptanceRate,
        revertRate,
        avgTimeToApproveMs,
        confidenceDistribution,
        urgencyDistribution,
        recosBySource,
        recosByMission,
      };
    }),

  // ══════════════════════════════════════════════════════════════════
  // ACTIONS
  // ══════════════════════════════════════════════════════════════════

  acceptRecos: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        recoIds: z.array(z.string()).min(1),
      }),
    )
    .mutation(({ input, ctx }) =>
      acceptRecos(input.strategyId, input.recoIds, ctx.session.user.id),
    ),

  rejectRecos: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        recoIds: z.array(z.string()).min(1),
        reason: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      rejectRecos(
        input.strategyId,
        input.recoIds,
        ctx.session.user.id,
        input.reason,
      ),
    ),

  applyRecos: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        recoIds: z.array(z.string()).min(1),
      }),
    )
    .mutation(({ input }) => applyRecos(input.strategyId, input.recoIds)),

  applyBatch: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        batchId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Accept all PENDING in batch
      const pending = await db.recommendation.findMany({
        where: { batchId: input.batchId, status: "PENDING" },
        select: { id: true },
      });
      if (pending.length > 0) {
        await acceptRecos(
          input.strategyId,
          pending.map((r) => r.id),
          ctx.session.user.id,
        );
      }

      // Apply all ACCEPTED in batch
      const accepted = await db.recommendation.findMany({
        where: { batchId: input.batchId, status: "ACCEPTED" },
        select: { id: true },
      });
      if (accepted.length > 0) {
        return applyRecos(
          input.strategyId,
          accepted.map((r) => r.id),
        );
      }

      return { applied: 0, warnings: ["Aucune recommandation a appliquer dans ce batch."] };
    }),

  revertReco: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        recoId: z.string(),
        reason: z.string(),
      }),
    )
    .mutation(({ input }) =>
      revertReco(input.strategyId, input.recoId, input.reason),
    ),

  // ══════════════════════════════════════════════════════════════════
  // PUBLICATION (Jehuty)
  // ══════════════════════════════════════════════════════════════════

  publishToJehuty: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        recoIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db.recommendation.updateMany({
        where: {
          id: { in: input.recoIds },
          strategyId: input.strategyId,
          publishedAt: null,
        },
        data: { publishedAt: new Date() },
      });
      return { published: result.count };
    }),

  // ══════════════════════════════════════════════════════════════════
  // EXPIRY
  // ══════════════════════════════════════════════════════════════════

  expireOldRecos: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        maxAgeDays: z.number().default(30),
      }),
    )
    .mutation(({ input }) =>
      expireOldRecos(input.strategyId, input.maxAgeDays),
    ),
});
