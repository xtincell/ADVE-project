import { z } from "zod";
import { MembershipStatus, GuildTier } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { assertTalentProfileAccess } from "./_talent-access-guard";
/* lafusee:governed-active */

export const membershipRouter = createTRPCRouter({
  // Gestion d'adhésion = acte STAFF (audit round-4) : l'adhésion ACTIVE accorde
  // une remise sur la commission plateforme — `create` (amount 0 par défaut,
  // status ACTIVE) laissait tout créateur s'auto-offrir la remise. La voie
  // payante talent passe par le webhook mobile-money (référence `membership-…`).
  create: governedProcedure({

    kind: "LEGACY_MEMBERSHIP_CREATE",
    requireOperator: true,

    inputSchema: z.object({
      talentProfileId: z.string(),
      tier: z.nativeEnum(GuildTier).default(GuildTier.APPRENTI),
      amount: z.number().default(0),
      currency: z.string().default("XAF"),
    }),

    caller: "membership:create",

  })
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      return ctx.db.membership.create({
        data: {
          talentProfileId: input.talentProfileId,
          tier: input.tier,
          amount: input.amount,
          currency: input.currency,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          status: "ACTIVE",
        },
      });
    }),

  renew: governedProcedure({


    kind: "LEGACY_MEMBERSHIP_RENEW",
    requireOperator: true,


    inputSchema: z.object({
      membershipId: z.string(),
      duration: z.number().optional(),
    }),


    caller: "membership:renew",


  })
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.membership.findUniqueOrThrow({ where: { id: input.membershipId } });
      const durationMs = (input.duration ?? 365) * 24 * 60 * 60 * 1000;
      return ctx.db.membership.update({
        where: { id: input.membershipId },
        data: {
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + durationMs),
        },
      });
    }),

  cancel: governedProcedure({


    kind: "LEGACY_MEMBERSHIP_CANCEL",
    requireOperator: true,


    inputSchema: z.object({
      membershipId: z.string(),
      reason: z.string().optional(),
    }),


    caller: "membership:cancel",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.membership.update({
        where: { id: input.membershipId },
        data: { status: "CANCELLED", currentPeriodEnd: new Date() },
      });
    }),

  list: protectedProcedure
    .input(z.object({
      status: z.nativeEnum(MembershipStatus).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.membership.findMany({
        where: input.status ? { status: input.status } : {},
        // `payoutPhone` (PII payout du talent) exclu de la lecture (audit round-8).
        include: { talentProfile: { omit: { payoutPhone: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  getByCreator: protectedProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      // IDOR round-10 : historique d'adhésions + montants (financier privé).
      await assertTalentProfileAccess(ctx.session.user.id, input.talentProfileId);
      return ctx.db.membership.findMany({
        where: { talentProfileId: input.talentProfileId },
      });
    }),

  checkStatus: protectedProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const active = await ctx.db.membership.findFirst({
        where: { talentProfileId: input.talentProfileId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
      return {
        active: !!active,
        membershipId: active?.id ?? null,
        expiresAt: active?.currentPeriodEnd?.toISOString() ?? null,
      };
    }),
});
