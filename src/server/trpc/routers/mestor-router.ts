import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { generateInsights } from "@/server/services/mestor/insights";

export const mestorRouter = createTRPCRouter({
  /** Get proactive AI insights for a strategy */
  getInsights: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return generateInsights(input.strategyId);
    }),
});
