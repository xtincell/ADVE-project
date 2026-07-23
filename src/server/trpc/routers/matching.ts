import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { suggest } from "@/server/services/matching-engine";
import { canAccessMission, getOperatorContext } from "@/server/services/operator-isolation";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

/** IDOR round-10 : matching keyé sur `missionId` → propriétaire/opérateur/assigné. */
async function assertMissionAccess(userId: string, missionId: string): Promise<void> {
  const opCtx = await getOperatorContext(userId);
  if (!(await canAccessMission(missionId, opCtx))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette mission" });
  }
}

export const matchingRouter = createTRPCRouter({
  suggest: protectedProcedure
    .input(z.object({ missionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertMissionAccess(ctx.session.user.id, input.missionId);
      return suggest(input.missionId);
    }),

  override: governedProcedure({


    kind: "LEGACY_MATCHING_OVERRIDE",
    requireOperator: true,


    inputSchema: z.object({ missionId: z.string(), talentProfileId: z.string() }),


    caller: "matching:override",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mission.update({
        where: { id: input.missionId },
        data: { status: "ASSIGNED" },
      });
    }),

  getHistory: protectedProcedure
    .input(z.object({ missionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertMissionAccess(ctx.session.user.id, input.missionId);
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
    .query(async ({ ctx, input }) => {
      await assertMissionAccess(ctx.session.user.id, input.missionId);
      return suggest(input.missionId);
    }),
});
