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
          pillars: { select: { key: true, content: true, confidence: true, validationStatus: true } },
          missions: { where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } }, select: { id: true, status: true } },
          campaigns: { where: { status: { not: "ARCHIVED" } }, select: { id: true, status: true } },
        },
      });
      const vector = strategy.advertis_vector as Record<string, number> | null;

      // Extract RTIS key metrics from pillar content for dashboard visibility
      // Content is loaded server-side only for metric extraction, not sent to client
      const pillarContents: Record<string, Record<string, unknown>> = {};
      for (const p of strategy.pillars) {
        const content = (p as unknown as { content: Record<string, unknown> | null }).content;
        if (content) pillarContents[p.key] = content;
      }
      const rContent = pillarContents.r ?? {};
      const tContent = pillarContents.t ?? {};
      const iContent = pillarContents.i ?? {};
      const sContent = pillarContents.s ?? {};

      return {
        name: strategy.name,
        composite: vector?.composite ?? 0,
        pillars: strategy.pillars.map((p) => ({ key: p.key, confidence: p.confidence, validationStatus: p.validationStatus })),
        activeMissions: strategy.missions.filter((m) => m.status === "IN_PROGRESS").length,
        completedMissions: strategy.missions.filter((m) => m.status === "COMPLETED").length,
        activeCampaigns: strategy.campaigns.length,

        // RTIS visibility — key metrics from each derived pillar
        rtis: {
          riskScore: rContent.riskScore ?? null,
          brandMarketFitScore: tContent.brandMarketFitScore ?? null,
          totalActions: iContent.totalActions ?? null,
          globalBudget: (iContent.globalBudget ?? sContent.globalBudget) ?? null,
          syntheseExecutive: sContent.syntheseExecutive ?? null,
          roadmapPhases: Array.isArray(sContent.roadmap) ? (sContent.roadmap as unknown[]).length : 0,
          sprint90Count: Array.isArray(sContent.sprint90Days) ? (sContent.sprint90Days as unknown[]).length : 0,
        },
      };
    }),
});
