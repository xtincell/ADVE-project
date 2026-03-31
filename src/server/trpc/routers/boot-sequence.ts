import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import * as bootService from "@/server/services/boot-sequence";

export const bootSequenceRouter = createTRPCRouter({
  // Start can be called by the client who owns the strategy or by admin
  start: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership or admin
      const strategy = await ctx.db.strategy.findUniqueOrThrow({ where: { id: input.strategyId } });
      if (strategy.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new Error("Acces refuse: vous n'etes pas proprietaire de cette strategie");
      }
      return bootService.start(input.strategyId);
    }),

  advance: protectedProcedure
    .input(z.object({ strategyId: z.string(), step: z.number(), responses: z.record(z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({ where: { id: input.strategyId } });
      if (strategy.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new Error("Acces refuse");
      }
      return bootService.advance(input.strategyId, input.step, input.responses);
    }),

  complete: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({ where: { id: input.strategyId } });
      if (strategy.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new Error("Acces refuse");
      }
      return bootService.complete(input.strategyId);
    }),

  getState: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => { return bootService.start(input.strategyId); }),
});
