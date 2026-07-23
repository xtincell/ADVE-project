import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { evaluateCreator } from "@/server/services/tier-evaluator";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { assertTalentProfileAccess } from "./_talent-access-guard";
/* lafusee:governed-active */

export const guildTierRouter = createTRPCRouter({
  getProfile: protectedProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      // IDOR round-10 : historique COMPLET d'adhésions + `payoutPhone` (PII) →
      // self-or-operator + omit du téléphone (la surface publique = guilde.getProfile).
      await assertTalentProfileAccess(ctx.session.user.id, input.talentProfileId);
      return ctx.db.talentProfile.findUniqueOrThrow({
        where: { id: input.talentProfileId },
        omit: { payoutPhone: true },
        include: { portfolioItems: true, memberships: true },
      });
    }),

  checkPromotion: protectedProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      // IDOR round-10 : reco PROMOTE/DEMOTE + métriques de carrière privées.
      await assertTalentProfileAccess(ctx.session.user.id, input.talentProfileId);
      return evaluateCreator(input.talentProfileId);
    }),

  // Promotion/rétrogradation de palier = décision de gouvernance STAFF (elle
  // change le taux de commission du talent). requireOperator (audit round-4) :
  // un créateur ne peut plus s'auto-promouvoir ASSOCIE. Le self-service passe
  // par `guilde.requestTierUpgrade` (critères + ownership vérifiés).
  promote: governedProcedure({


    kind: "LEGACY_GUILD_TIER_PROMOTE",
    requireOperator: true,


    inputSchema: z.object({ talentProfileId: z.string(), newTier: z.enum(["COMPAGNON", "MAITRE", "ASSOCIE"]) }),


    caller: "guild-tier:promote",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.talentProfile.update({
        where: { id: input.talentProfileId },
        data: { tier: input.newTier },
      });
    }),

  demote: governedProcedure({


    kind: "LEGACY_GUILD_TIER_DEMOTE",
    requireOperator: true,


    inputSchema: z.object({ talentProfileId: z.string(), newTier: z.enum(["APPRENTI", "COMPAGNON", "MAITRE"]) }),


    caller: "guild-tier:demote",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.talentProfile.update({
        where: { id: input.talentProfileId },
        data: { tier: input.newTier },
      });
    }),

  listByTier: protectedProcedure
    .input(z.object({ tier: z.enum(["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"]) }))
    .query(async ({ ctx, input }) => {
      // Round-10 (en passant) : browse par palier = surface publique (tier +
      // score), mais `payoutPhone` (PII mobile-money) ne doit jamais fuiter en liste.
      return ctx.db.talentProfile.findMany({
        where: { tier: input.tier },
        omit: { payoutPhone: true },
        orderBy: { avgScore: "desc" },
      });
    }),

  getProgressPath: protectedProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      // IDOR round-10 : chemin de progression = métriques de carrière privées.
      await assertTalentProfileAccess(ctx.session.user.id, input.talentProfileId);
      return evaluateCreator(input.talentProfileId);
    }),
});
