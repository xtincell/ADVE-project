import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

export const guildOrgRouter = createTRPCRouter({
  create: adminProcedure
    .input(z.object({ name: z.string(), description: z.string().optional(), logoUrl: z.string().optional(), website: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.guildOrganization.create({ data: input });
    }),

  update: adminProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), description: z.string().optional(), logoUrl: z.string().optional(), website: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.guildOrganization.update({ where: { id }, data });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.guildOrganization.findMany({ where: { deletedAt: null }, include: { _count: { select: { members: true } } }, orderBy: { name: "asc" } });
  }),

  getMembers: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.talentProfile.findMany({ where: { guildOrganizationId: input.orgId } });
    }),

  getMetrics: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.db.guildOrganization.findUniqueOrThrow({ where: { id: input.orgId }, include: { members: true } });
      return { totalMembers: org.members.length, totalMissions: org.totalMissions, firstPassRate: org.firstPassRate, avgQcScore: org.avgQcScore };
    }),

  addMember: adminProcedure
    .input(z.object({ orgId: z.string(), talentProfileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.talentProfile.update({ where: { id: input.talentProfileId }, data: { guildOrganizationId: input.orgId } });
    }),

  removeMember: adminProcedure
    .input(z.object({ talentProfileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.talentProfile.update({ where: { id: input.talentProfileId }, data: { guildOrganizationId: null } });
    }),
});
