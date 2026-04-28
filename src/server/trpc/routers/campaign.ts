import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import * as auditTrail from "@/server/services/audit-trail";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "campaign");
const _auditedAdmin = auditedProcedure(adminProcedure, "campaign");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

export const campaignRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      strategyId: z.string(),
      description: z.string().optional(),
      advertis_vector: z.record(z.number()).optional(),
      devotionObjective: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { advertis_vector, devotionObjective, description, ...rest } = input;
      const campaign = await ctx.db.campaign.create({
        data: {
          ...rest,
          advertis_vector: advertis_vector as Prisma.InputJsonValue,
          devotionObjective: devotionObjective as Prisma.InputJsonValue,
          objectives: description ? { description } as Prisma.InputJsonValue : undefined,
        },
      });

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "CREATE",
        entityType: "Campaign",
        entityId: campaign.id,
        newValue: { name: input.name, strategyId: input.strategyId },
      }).catch((err) => { console.warn("[audit-trail] campaign create log failed:", err instanceof Error ? err.message : err); });

      return campaign;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      status: z.string().optional(),
      advertis_vector: z.record(z.number()).optional(),
      devotionObjective: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, advertis_vector, devotionObjective, ...data } = input;
      const previous = await ctx.db.campaign.findUniqueOrThrow({ where: { id } });
      const updated = await ctx.db.campaign.update({
        where: { id },
        data: {
          ...data,
          ...(advertis_vector ? { advertis_vector: advertis_vector as Prisma.InputJsonValue } : {}),
          ...(devotionObjective ? { devotionObjective: devotionObjective as Prisma.InputJsonValue } : {}),
        },
      });

      // Audit trail for state transitions (non-blocking)
      if (input.status && input.status !== previous.status) {
        auditTrail.log({
          userId: ctx.session.user.id,
          action: "UPDATE",
          entityType: "Campaign",
          entityId: id,
          oldValue: { status: previous.status },
          newValue: { status: input.status },
        }).catch((err) => { console.warn("[audit-trail] campaign update log failed:", err instanceof Error ? err.message : err); });
      }

      return updated;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaign.findUniqueOrThrow({
        where: { id: input.id },
        include: { missions: true, strategy: true },
      });
    }),

  list: protectedProcedure
    .input(z.object({ strategyId: z.string().optional(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaign.findMany({
        where: {
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          missions: {
            select: { id: true, title: true, status: true, priority: true, slaDeadline: true, mode: true, budget: true, description: true },
            orderBy: { priority: "asc" as const },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaign.update({
        where: { id: input.id },
        data: { status: "ARCHIVED" },
      });
    }),
});
