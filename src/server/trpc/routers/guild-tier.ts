import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { evaluateCreator } from "@/server/services/tier-evaluator";

export const guildTierRouter = createTRPCRouter({
  getProfile: protectedProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.talentProfile.findUniqueOrThrow({
        where: { id: input.talentProfileId },
        include: { portfolioItems: true, memberships: true },
      });
    }),

  checkPromotion: protectedProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(async ({ input }) => {
      return evaluateCreator(input.talentProfileId);
    }),

  promote: adminProcedure
    .input(z.object({ talentProfileId: z.string(), newTier: z.enum(["COMPAGNON", "MAITRE", "ASSOCIE"]) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.talentProfile.update({
        where: { id: input.talentProfileId },
        data: { tier: input.newTier },
      });
    }),

  demote: adminProcedure
    .input(z.object({ talentProfileId: z.string(), newTier: z.enum(["APPRENTI", "COMPAGNON", "MAITRE"]) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.talentProfile.update({
        where: { id: input.talentProfileId },
        data: { tier: input.newTier },
      });
    }),

  listByTier: protectedProcedure
    .input(z.object({ tier: z.enum(["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"]) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.talentProfile.findMany({
        where: { tier: input.tier },
        orderBy: { avgScore: "desc" },
      });
    }),

  getProgressPath: protectedProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(async ({ input }) => {
      return evaluateCreator(input.talentProfileId);
    }),
});
