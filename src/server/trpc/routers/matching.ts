import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { suggest } from "@/server/services/matching-engine";

export const matchingRouter = createTRPCRouter({
  suggest: protectedProcedure
    .input(z.object({ missionId: z.string() }))
    .query(async ({ input }) => {
      return suggest(input.missionId);
    }),

  override: adminProcedure
    .input(z.object({ missionId: z.string(), talentProfileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mission.update({
        where: { id: input.missionId },
        data: { status: "ASSIGNED" },
      });
    }),

  getHistory: protectedProcedure
    .input(z.object({ missionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const commissions = await ctx.db.commission.findMany({
        where: { mission: { id: input.missionId } },
        include: {
          talent: { select: { id: true, displayName: true, tier: true, userId: true } },
          mission: { select: { id: true, title: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return commissions.map((c) => ({
        id: c.id,
        missionId: c.missionId,
        talentProfileId: c.talentId,
        talentName: c.talent.displayName,
        talentTier: c.talent.tier,
        missionTitle: c.mission.title,
        missionStatus: c.mission.status,
        assignedAt: c.createdAt,
      }));
    }),

  getBestForBrief: protectedProcedure
    .input(z.object({ missionId: z.string(), count: z.number().default(3) }))
    .query(async ({ input }) => {
      return suggest(input.missionId);
    }),
});
