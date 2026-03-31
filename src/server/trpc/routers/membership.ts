import { z } from "zod";
import { MembershipStatus, GuildTier } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

export const membershipRouter = createTRPCRouter({
  create: adminProcedure
    .input(z.object({
      talentProfileId: z.string(),
      tier: z.nativeEnum(GuildTier).default(GuildTier.APPRENTI),
      amount: z.number().default(0),
      currency: z.string().default("XAF"),
    }))
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

  renew: adminProcedure
    .input(z.object({
      membershipId: z.string(),
      duration: z.number().optional(),
    }))
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

  cancel: adminProcedure
    .input(z.object({
      membershipId: z.string(),
      reason: z.string().optional(),
    }))
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
        include: { talentProfile: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  getByCreator: protectedProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
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
