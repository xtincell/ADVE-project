import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const cockpitRouter = createTRPCRouter({
  /** Dashboard summary for the client portal */
  dashboard: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
        include: {
          pillars: { select: { key: true, confidence: true, validationStatus: true } },
          missions: { where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } }, select: { id: true, status: true } },
          campaigns: { where: { status: { not: "ARCHIVED" } }, select: { id: true, status: true } },
        },
      });
      const vector = strategy.advertis_vector as Record<string, number> | null;
      return {
        name: strategy.name,
        composite: vector?.composite ?? 0,
        pillars: strategy.pillars,
        activeMissions: strategy.missions.filter((m) => m.status === "IN_PROGRESS").length,
        completedMissions: strategy.missions.filter((m) => m.status === "COMPLETED").length,
        activeCampaigns: strategy.campaigns.length,
      };
    }),
});
