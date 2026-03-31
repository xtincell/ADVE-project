/**
 * Contract & Escrow Router — SOCLE Finance
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

export const contractRouter = createTRPCRouter({
  create: adminProcedure
    .input(z.object({
      strategyId: z.string(),
      title: z.string(),
      contractType: z.string(),
      startDate: z.date(),
      endDate: z.date().optional(),
      value: z.number().optional(),
      terms: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contract.create({ data: { ...input, terms: input.terms as Prisma.InputJsonValue } });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.contract.findUniqueOrThrow({ where: { id: input.id }, include: { escrows: { include: { conditions: true } } } });
    }),

  list: protectedProcedure
    .input(z.object({ strategyId: z.string().optional(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.contract.findMany({
        where: { ...(input.strategyId ? { strategyId: input.strategyId } : {}), ...(input.status ? { status: input.status as never } : {}) },
        orderBy: { createdAt: "desc" },
      });
    }),

  updateStatus: adminProcedure
    .input(z.object({ id: z.string(), status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "TERMINATED", "DISPUTED"]) }))
    .mutation(async ({ ctx, input }) => ctx.db.contract.update({ where: { id: input.id }, data: { status: input.status } })),

  sign: adminProcedure
    .input(z.object({ id: z.string(), documentUrl: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contract.update({ where: { id: input.id }, data: { status: "ACTIVE", signedAt: new Date(), documentUrl: input.documentUrl } });
    }),

  // === ESCROW ===
  createEscrow: adminProcedure
    .input(z.object({ contractId: z.string(), amount: z.number(), conditions: z.array(z.string()).optional() }))
    .mutation(async ({ ctx, input }) => {
      const escrow = await ctx.db.escrow.create({ data: { contractId: input.contractId, amount: input.amount } });
      if (input.conditions) {
        for (const condition of input.conditions) {
          await ctx.db.escrowCondition.create({ data: { escrowId: escrow.id, condition } });
        }
      }
      return escrow;
    }),

  releaseEscrow: adminProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.escrow.update({ where: { id: input.id }, data: { status: "RELEASED", releasedAt: new Date(), reason: input.reason } });
    }),

  meetEscrowCondition: protectedProcedure
    .input(z.object({ conditionId: z.string(), verifiedBy: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.escrowCondition.update({ where: { id: input.conditionId }, data: { met: true, metAt: new Date(), verifiedBy: input.verifiedBy } });
    }),
});
