// ============================================================================
// MODULE M17 — Boot Sequence (Onboarding 60-90min)
// Score: 60/100 | Priority: P2 | Status: FUNCTIONAL
// Spec: §4.2 + §8 P4 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  start, advance, complete, getState — basic lifecycle
// [ ] REQ-2  Adaptive decision tree (Mestor-guided, 60-90 min calibration)
// [ ] REQ-3  Calibrate all 8 ADVE pillars with deep questions
// [ ] REQ-4  Produce Brand Diagnostic Report on completion
// [ ] REQ-5  Invoke Mestor for conversational guidance through each step
// [ ] REQ-6  Progress persistence (resume mid-session)
// [ ] REQ-7  Convert to full Strategy on completion (upgrade from Quick Intake)
//
// PROCEDURES: start, advance, complete, getState
// ============================================================================

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
