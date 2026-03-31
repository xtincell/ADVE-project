import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

export const guildeRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      tier: z.enum(["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"]).optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.talentProfile.findMany({
        where: input.tier ? { tier: input.tier } : undefined,
        orderBy: { totalMissions: "desc" },
        take: input.limit,
      });
    }),

  getProfile: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.talentProfile.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          portfolioItems: true,
          memberships: { where: { status: "ACTIVE" } },
          guildOrganization: true,
        },
      });
    }),

  getMyProfile: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.talentProfile.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          portfolioItems: true,
          memberships: { where: { status: "ACTIVE" } },
          guildOrganization: true,
        },
      });
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().optional(),
      bio: z.string().optional(),
      skills: z.array(z.string()).optional(),
      driverSpecialties: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.talentProfile.update({
        where: { userId: ctx.session.user.id },
        data: {
          ...(input.displayName ? { displayName: input.displayName } : {}),
          ...(input.bio ? { bio: input.bio } : {}),
          ...(input.skills ? { skills: input.skills } : {}),
          ...(input.driverSpecialties ? { driverSpecialties: input.driverSpecialties } : {}),
        },
      });
    }),

  getStats: adminProcedure
    .query(async ({ ctx }) => {
      const [total, byTier] = await Promise.all([
        ctx.db.talentProfile.count(),
        ctx.db.talentProfile.groupBy({
          by: ["tier"],
          _count: true,
        }),
      ]);
      return { total, byTier };
    }),

  addPortfolioItem: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      deliverableId: z.string().optional(),
      pillarTags: z.record(z.number()).optional(),
      fileUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.talentProfile.findUniqueOrThrow({
        where: { userId: ctx.session.user.id },
      });
      const { pillarTags, ...rest } = input;
      return ctx.db.portfolioItem.create({
        data: {
          ...rest,
          talentProfileId: profile.id,
          pillarTags: pillarTags as Prisma.InputJsonValue,
        },
      });
    }),

  removePortfolioItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.portfolioItem.delete({ where: { id: input.id } });
    }),

  getPortfolio: protectedProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.portfolioItem.findMany({
        where: { talentProfileId: input.talentProfileId },
        orderBy: { createdAt: "desc" },
      });
    }),
});
