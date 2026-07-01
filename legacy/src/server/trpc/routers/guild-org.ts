import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const guildOrgRouter = createTRPCRouter({
  create: governedProcedure({

    kind: "LEGACY_GUILD_ORG_CREATE",

    inputSchema: z.object({ name: z.string(), description: z.string().optional(), logoUrl: z.string().optional(), website: z.string().optional() }),

    caller: "guild-org:create",

  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.guildOrganization.create({ data: input });
    }),

  update: governedProcedure({


    kind: "LEGACY_GUILD_ORG_UPDATE",


    inputSchema: z.object({ id: z.string(), name: z.string().optional(), description: z.string().optional(), logoUrl: z.string().optional(), website: z.string().optional() }),


    caller: "guild-org:update",


  })
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

  addMember: governedProcedure({


    kind: "LEGACY_GUILD_ORG_ADD_MEMBER",


    inputSchema: z.object({ orgId: z.string(), talentProfileId: z.string() }),


    caller: "guild-org:addMember",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.talentProfile.update({ where: { id: input.talentProfileId }, data: { guildOrganizationId: input.orgId } });
    }),

  removeMember: governedProcedure({


    kind: "LEGACY_GUILD_ORG_REMOVE_MEMBER",


    inputSchema: z.object({ talentProfileId: z.string() }),


    caller: "guild-org:removeMember",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.talentProfile.update({ where: { id: input.talentProfileId }, data: { guildOrganizationId: null } });
    }),
});
