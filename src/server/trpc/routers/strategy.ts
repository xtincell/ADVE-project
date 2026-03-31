import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { scoreAllPillarsSemantic } from "@/server/services/advertis-scorer/semantic";
import { propagateFromPillar } from "@/server/services/staleness-propagator";
import * as auditTrail from "@/server/services/audit-trail";

export const strategyRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      operatorId: z.string().optional(),
      sector: z.string().optional(),
      country: z.string().optional(),
      businessContext: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { sector, country, businessContext, ...rest } = input;
      const strategy = await ctx.db.strategy.create({
        data: {
          ...rest,
          userId: ctx.session.user.id,
          operatorId: input.operatorId ?? (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | undefined,
          businessContext: businessContext as Prisma.InputJsonValue,
        },
      });

      // Auto-create 8 empty pillars
      for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
        await ctx.db.pillar.create({
          data: { strategyId: strategy.id, key, content: {}, confidence: 0 },
        });
      }

      // Auto-create VariableStoreConfig
      await ctx.db.variableStoreConfig.create({
        data: { strategyId: strategy.id, stalenessThresholdDays: 30, autoRecalculate: true },
      }).catch((err) => { console.warn("[strategy] variable-store config creation failed:", err instanceof Error ? err.message : err); });

      // Auto-create BrandOSConfig
      await ctx.db.brandOSConfig.create({
        data: { strategyId: strategy.id, config: { currency: "XAF", language: "fr" } },
      }).catch((err) => { console.warn("[strategy] brandOS config creation failed:", err instanceof Error ? err.message : err); });

      // Auto-create Deal in CRM
      await ctx.db.deal.create({
        data: {
          strategyId: strategy.id,
          userId: ctx.session.user.id,
          contactName: ctx.session.user.name ?? "",
          contactEmail: ctx.session.user.email ?? "",
          companyName: input.name,
          stage: "WON",
          source: "COCKPIT_CREATE",
          wonAt: new Date(),
        },
      }).catch((err) => { console.warn("[strategy] CRM deal creation failed:", err instanceof Error ? err.message : err); });

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "CREATE",
        entityType: "Strategy",
        entityId: strategy.id,
        newValue: { name: input.name, sector, country },
      }).catch((err) => { console.warn("[audit-trail] strategy create log failed:", err instanceof Error ? err.message : err); });

      return strategy;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      advertis_vector: z.record(z.number()).optional(),
      recalculateScore: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, advertis_vector, recalculateScore, ...data } = input;

      const previous = await ctx.db.strategy.findUniqueOrThrow({ where: { id } });
      const updated = await ctx.db.strategy.update({
        where: { id },
        data: {
          ...data,
          ...(advertis_vector ? { advertis_vector: advertis_vector as Prisma.InputJsonValue } : {}),
        },
      });

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "UPDATE",
        entityType: "Strategy",
        entityId: id,
        oldValue: { name: previous.name, status: previous.status },
        newValue: { ...data },
      }).catch((err) => { console.warn("[audit-trail] strategy update log failed:", err instanceof Error ? err.message : err); });

      // Auto-recalculate score from pillar content
      if (recalculateScore !== false) {
        const pillars = await ctx.db.pillar.findMany({ where: { strategyId: id } });
        if (pillars.length > 0) {
          const scoreResult = await scoreAllPillarsSemantic(
            pillars.map((p) => ({ key: p.key, content: p.content }))
          );
          const vec: Record<string, number> = { composite: scoreResult.composite };
          for (const ps of scoreResult.pillarScores) {
            vec[ps.pillarKey.toLowerCase()] = ps.score;
          }
          await ctx.db.strategy.update({
            where: { id },
            data: { advertis_vector: vec as Prisma.InputJsonValue },
          });

          // Create score snapshot
          await ctx.db.scoreSnapshot.create({
            data: {
              strategyId: id,
              advertis_vector: vec as Prisma.InputJsonValue,
              classification: scoreResult.classification,
              confidence: 0.7,
              trigger: "strategy_update",
            },
          });
        }
      }

      return updated;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          pillars: true,
          drivers: { where: { deletedAt: null } },
          campaigns: true,
          devotionSnapshots: { orderBy: { measuredAt: "desc" }, take: 1 },
          brandAssets: { take: 10 },
        },
      });
    }),

  list: protectedProcedure
    .input(z.object({
      operatorId: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.strategy.findMany({
        where: {
          ...(input.operatorId ? { operatorId: input.operatorId } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: { pillars: true },
        orderBy: { updatedAt: "desc" },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.strategy.update({
        where: { id: input.id },
        data: { status: "ARCHIVED" },
      });

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "DELETE",
        entityType: "Strategy",
        entityId: input.id,
        newValue: { status: "ARCHIVED" },
      }).catch((err) => { console.warn("[audit-trail] strategy delete log failed:", err instanceof Error ? err.message : err); });

      return result;
    }),

  getWithScore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.id },
        include: { pillars: true },
      });
      const vector = strategy.advertis_vector as Record<string, number> | null;
      const composite = vector
        ? ["a","d","v","e","r","t","i","s"].reduce((sum, k) => sum + (vector[k] ?? 0), 0)
        : 0;
      return { ...strategy, composite, classification: classifyScore(composite) };
    }),
});

function classifyScore(composite: number): string {
  if (composite <= 80) return "ZOMBIE";
  if (composite <= 120) return "ORDINAIRE";
  if (composite <= 160) return "FORTE";
  if (composite <= 180) return "CULTE";
  return "ICONE";
}
