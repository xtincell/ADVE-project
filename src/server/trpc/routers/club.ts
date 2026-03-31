/**
 * Club Members Router — Join/leave clubs, manage memberships
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const clubRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ clubType: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.clubMember.findMany({
        where: {
          ...(input.clubType ? { clubType: input.clubType } : {}),
          isActive: true,
        },
        orderBy: { joinedAt: "desc" },
      });
    }),

  join: protectedProcedure
    .input(z.object({
      clubType: z.string(),
      tier: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.clubMember.create({
        data: {
          userId,
          clubType: input.clubType,
          tier: input.tier ?? "MEMBER",
        },
      });
    }),

  leave: protectedProcedure
    .input(z.object({ clubType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.clubMember.update({
        where: { userId_clubType: { userId, clubType: input.clubType } },
        data: { isActive: false },
      });
    }),

  getMyMemberships: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.clubMember.findMany({
      where: { userId: ctx.session.user.id, isActive: true },
      orderBy: { joinedAt: "desc" },
    });
  }),
});
