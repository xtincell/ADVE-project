/**
 * CRM Router — Deals, funnel tracking, intake conversion
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import * as crm from "@/server/services/crm-engine";

export const crmRouter = createTRPCRouter({
  createDealFromIntake: protectedProcedure
    .input(z.object({ intakeId: z.string() }))
    .mutation(({ input }) => crm.createDealFromIntake(input.intakeId)),

  advanceDeal: protectedProcedure
    .input(z.object({ dealId: z.string(), notes: z.string().optional() }))
    .mutation(({ input }) => crm.advanceDeal(input.dealId, input.notes)),

  loseDeal: protectedProcedure
    .input(z.object({ dealId: z.string(), reason: z.string() }))
    .mutation(({ input }) => crm.loseDeal(input.dealId, input.reason)),

  convertToStrategy: adminProcedure
    .input(z.object({ dealId: z.string(), userId: z.string(), operatorId: z.string().optional() }))
    .mutation(({ input }) => crm.convertDealToStrategy(input.dealId, input.userId, input.operatorId)),

  getPipeline: protectedProcedure.query(() => crm.getPipelineOverview()),

  getDeal: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.deal.findUniqueOrThrow({
        where: { id: input.id },
        include: { strategy: true, user: { select: { id: true, name: true, email: true } } },
      });
    }),

  listDeals: protectedProcedure
    .input(z.object({ stage: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.deal.findMany({
        where: input.stage ? { stage: input.stage as never } : {},
        orderBy: { createdAt: "desc" },
      });
    }),
});
