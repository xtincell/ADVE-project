import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { generateInsights } from "@/server/services/mestor/insights";
import * as mestor from "@/server/services/mestor";

export const mestorRouter = createTRPCRouter({
  /** Get proactive AI insights for a strategy (Artemis) */
  getInsights: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return generateInsights(input.strategyId);
    }),

  /** Chat with Mestor AI coach */
  chat: protectedProcedure
    .input(z.object({
      message: z.string().min(1),
      context: z.enum(["cockpit", "creator", "console", "intake"]),
      strategyId: z.string().optional(),
      creatorTier: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = mestor.getSystemPrompt(input.context, null);
      return { systemPrompt, context: input.context };
    }),

  /** Get context label for Mestor */
  getContextLabel: protectedProcedure
    .input(z.object({ context: z.enum(["cockpit", "creator", "console", "intake"]) }))
    .query(({ input }) => mestor.getContextLabel(input.context)),

  // ── Plan Persistence (Phase 5 NETERU) ──────────────────────────────

  /** Build an orchestration plan for a strategy */
  buildPlan: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ input }) => {
      const { buildPlan, persistPlan } = await import("@/server/services/neteru-shared/hyperviseur");
      const plan = await buildPlan(input.strategyId);
      const planId = await persistPlan(plan);
      return { planId, plan };
    }),

  /** Load an existing plan */
  loadPlan: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      const { loadPlan } = await import("@/server/services/neteru-shared/hyperviseur");
      return loadPlan(input.strategyId);
    }),

  /** Resume a persisted plan (execute pending steps) */
  resumePlan: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ input }) => {
      const { resumePlan } = await import("@/server/services/neteru-shared/hyperviseur");
      return resumePlan(input.strategyId);
    }),

  /** Resolve a WAIT_HUMAN step and continue execution */
  resolveStep: protectedProcedure
    .input(z.object({ strategyId: z.string(), stepId: z.string() }))
    .mutation(async ({ input }) => {
      const { loadPlan, resolveHumanStep, executePlan, persistPlan } =
        await import("@/server/services/neteru-shared/hyperviseur");
      const plan = await loadPlan(input.strategyId);
      if (!plan) throw new Error("Plan not found");
      resolveHumanStep(plan, input.stepId);
      const executed = await executePlan(plan);
      await persistPlan(executed);
      return executed;
    }),
});
