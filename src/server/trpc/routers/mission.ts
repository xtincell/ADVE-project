import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { evaluateCreator } from "@/server/services/tier-evaluator";
import * as feedbackLoop from "@/server/services/feedback-loop";
import * as knowledgeCapture from "@/server/services/knowledge-capture";
import * as matchingEngine from "@/server/services/matching-engine";
import * as auditTrail from "@/server/services/audit-trail";

export const missionRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      strategyId: z.string(),
      campaignId: z.string().optional(),
      driverId: z.string().optional(),
      mode: z.enum(["DISPATCH", "COLLABORATIF"]).optional(),
      advertis_vector: z.record(z.union([z.string(), z.number()])).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { advertis_vector, ...rest } = input;
      const mission = await ctx.db.mission.create({
        data: {
          ...rest,
          advertis_vector: advertis_vector as Prisma.InputJsonValue,
        },
      });

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "CREATE",
        entityType: "Mission",
        entityId: mission.id,
        newValue: { title: input.title, strategyId: input.strategyId, campaignId: input.campaignId },
      }).catch((err) => { console.warn("[audit-trail] mission create log failed:", err instanceof Error ? err.message : err); });

      return mission;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      status: z.string().optional(),
      mode: z.enum(["DISPATCH", "COLLABORATIF"]).optional(),
      driverId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const previous = await ctx.db.mission.findUniqueOrThrow({ where: { id }, include: { strategy: true } });
      const updated = await ctx.db.mission.update({ where: { id }, data });

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "UPDATE",
        entityType: "Mission",
        entityId: id,
        oldValue: { status: previous.status, driverId: previous.driverId },
        newValue: { ...data },
      }).catch((err) => { console.warn("[audit-trail] mission update log failed:", err instanceof Error ? err.message : err); });

      // If mission just completed → trigger side effects
      if (input.status === "COMPLETED" && previous.status !== "COMPLETED") {
        // Auto-trigger tier evaluation for the assigned creator
        if (updated.assigneeId) {
          evaluateCreator(updated.assigneeId).catch((err) => { console.warn("[tier-evaluator] creator evaluation failed:", err instanceof Error ? err.message : err); });
        }

        // Capture knowledge from mission outcome
        knowledgeCapture.captureEvent("MISSION_OUTCOME", {
          data: { missionId: id, status: "COMPLETED", driverId: updated.driverId },
          sourceId: updated.strategyId,
        }).catch((err) => { console.warn("[knowledge-capture] mission outcome capture failed:", err instanceof Error ? err.message : err); });

        // Feed the feedback loop with a signal — processSignal takes a signalId
        // Create a signal first, then process it
        // For now, skip direct feedback loop invocation as it requires a signal record ID
      }

      return updated;
    }),

  /** Get matched/ranked missions for a creator */
  listForCreator: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const talent = await ctx.db.talentProfile.findUnique({ where: { userId } });
      if (!talent) return [];

      // Get available missions
      const missions = await ctx.db.mission.findMany({
        where: { status: "DRAFT", assigneeId: null },
        include: { driver: true, strategy: { select: { name: true, advertis_vector: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      // Score and rank by matching engine
      const ranked = missions.map((m) => {
        const missionVec = m.advertis_vector as Record<string, number> | null;
        const talentVec = talent.advertis_vector as Record<string, number> | null;

        let matchScore = 50; // Base score

        // Tier bonus
        const tierBonus: Record<string, number> = { APPRENTI: 0, COMPAGNON: 10, MAITRE: 20, ASSOCIE: 30 };
        matchScore += tierBonus[talent.tier] ?? 0;

        // Driver specialty match
        const specs = talent.driverSpecialties as string[] | null;
        if (specs && m.driver && specs.includes(m.driver.channel)) matchScore += 20;

        // First pass rate bonus
        matchScore += Math.round(talent.firstPassRate * 10);

        // ADVE alignment
        if (missionVec && talentVec) {
          const keys = ["a", "d", "v", "e", "r", "t", "i", "s"];
          const alignment = keys.reduce((sum, k) => {
            const diff = Math.abs((missionVec[k] ?? 0) - (talentVec[k] ?? 0));
            return sum + (25 - diff);
          }, 0) / (25 * 8);
          matchScore += Math.round(alignment * 20);
        }

        return { ...m, matchScore: Math.min(100, matchScore) };
      });

      return ranked.sort((a, b) => b.matchScore - a.matchScore).slice(0, input.limit);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.mission.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          deliverables: { include: { qualityReviews: true } },
          campaign: true,
          strategy: true,
          driver: true,
          commissions: true,
        },
      });
    }),

  list: protectedProcedure
    .input(z.object({
      strategyId: z.string().optional(),
      campaignId: z.string().optional(),
      status: z.string().optional(),
      driverId: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.mission.findMany({
        where: {
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
          ...(input.campaignId ? { campaignId: input.campaignId } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.driverId ? { driverId: input.driverId } : {}),
        },
        include: { deliverables: true, driver: true },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  submitDeliverable: protectedProcedure
    .input(z.object({
      missionId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      fileUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const deliverable = await ctx.db.missionDeliverable.create({
        data: {
          missionId: input.missionId,
          title: input.title,
          description: input.description,
          fileUrl: input.fileUrl,
          status: "PENDING",
        },
      });

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "CREATE",
        entityType: "MissionDeliverable",
        entityId: deliverable.id,
        newValue: { missionId: input.missionId, title: input.title },
      }).catch((err) => { console.warn("[audit-trail] deliverable create log failed:", err instanceof Error ? err.message : err); });

      return deliverable;
    }),

  acceptDeliverable: protectedProcedure
    .input(z.object({ deliverableId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.missionDeliverable.update({
        where: { id: input.deliverableId },
        data: { status: "ACCEPTED" },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mission.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
    }),

  // SLA: Set deadline
  setDeadline: protectedProcedure
    .input(z.object({ id: z.string(), deadline: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const mission = await ctx.db.mission.findUniqueOrThrow({ where: { id: input.id } });
      const existing = (mission.advertis_vector as Record<string, unknown>) ?? {};
      return ctx.db.mission.update({
        where: { id: input.id },
        data: {
          advertis_vector: {
            ...existing,
            deadline: input.deadline,
          } as Prisma.InputJsonValue,
        },
      });
    }),

  // SLA: Check deadlines
  checkSla: adminProcedure
    .query(async ({ ctx }) => {
      const now = new Date();
      const missions = await ctx.db.mission.findMany({
        where: { status: { in: ["DRAFT", "IN_PROGRESS"] } },
        include: { driver: true, strategy: { select: { name: true } } },
      });

      const alerts = [];
      for (const m of missions) {
        const meta = m.advertis_vector as Record<string, unknown> | null;
        const dl = meta?.deadline as string | undefined;
        if (!dl) continue;
        const deadline = new Date(dl);
        const hours = (deadline.getTime() - now.getTime()) / 3600000;
        if (hours < 48) {
          alerts.push({
            missionId: m.id,
            title: m.title,
            strategyName: m.strategy.name,
            driverChannel: m.driver?.channel,
            deadline: dl,
            hoursRemaining: Math.round(hours * 10) / 10,
            severity: hours < 0 ? "breached" : hours < 24 ? "urgent" : "warning",
          });
        }
      }
      return alerts.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
    }),
});
