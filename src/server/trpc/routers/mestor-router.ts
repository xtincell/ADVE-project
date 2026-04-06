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
});
