import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { calculate as engineCalculate, generatePaymentOrder as engineGeneratePaymentOrder } from "@/server/services/commission-engine";

export const commissionRouter = createTRPCRouter({
  calculate: adminProcedure
    .input(z.object({ missionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await engineCalculate(input.missionId);

        // Persist the commission record
        const commission = await ctx.db.commission.create({
          data: {
            missionId: input.missionId,
            talentId: result.userId,
            grossAmount: result.grossAmount,
            commissionRate: result.commissionRate,
            commissionAmount: result.commissionAmount,
            netAmount: result.netAmount,
            tierAtTime: result.tierAtTime,
            operatorFee: result.operatorFee,
            currency: "XAF",
            status: "PENDING",
          },
        });

        return { commissionId: commission.id, ...result };
      } catch (error) {
        throw new Error(
          `Failed to calculate commission for mission ${input.missionId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50), cursor: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.commission.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });
      let nextCursor: string | undefined;
      if (items.length > input.limit) { nextCursor = items.pop()?.id; }
      return { items, nextCursor };
    }),

  getByMission: protectedProcedure
    .input(z.object({ missionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.commission.findMany({ where: { missionId: input.missionId } });
    }),

  getByCreator: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.commission.findMany({
        where: { talentId: input.userId ?? ctx.session.user.id },
        orderBy: { createdAt: "desc" },
      });
    }),

  markPaid: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.commission.update({
        where: { id: input.id },
        data: { status: "PAID", paidAt: new Date() },
      });
    }),

  generatePaymentOrder: adminProcedure
    .input(z.object({ commissionId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const paymentOrder = await engineGeneratePaymentOrder(input.commissionId);
        return { commissionId: input.commissionId, paymentOrder };
      } catch (error) {
        throw new Error(
          `Failed to generate payment order for commission ${input.commissionId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  getOperatorFees: adminProcedure
    .input(z.object({ operatorId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const commissions = await ctx.db.commission.findMany({
        where: { operatorFee: { not: null } },
      });
      const total = commissions.reduce((sum, c) => sum + (c.operatorFee ?? 0), 0);
      return { total, count: commissions.length };
    }),
});
