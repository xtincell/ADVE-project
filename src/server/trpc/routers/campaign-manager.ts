/**
 * Campaign Manager 360 — 19 sub-routers consolidated
 * Handles: state transitions, actions, executions, amplifications, team,
 * milestones, budget, approvals, assets, briefs, reports, dependencies,
 * field ops, field reports, AARRR, and recommendations
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import * as campaignManager from "@/server/services/campaign-manager";

export const campaignManagerRouter = createTRPCRouter({
  // === STATE MACHINE ===
  transition: protectedProcedure
    .input(z.object({ campaignId: z.string(), toState: z.string(), approverId: z.string().optional() }))
    .mutation(async ({ input }) => {
      return campaignManager.transitionCampaign(input.campaignId, input.toState as never, input.approverId);
    }),

  availableTransitions: protectedProcedure
    .input(z.object({ state: z.string() }))
    .query(({ input }) => {
      return campaignManager.getAvailableTransitions(input.state as never);
    }),

  // === ACTIONS (ATL/BTL/TTL) ===
  createAction: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      actionTypeSlug: z.string(),
      name: z.string().optional(),
      budget: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      return campaignManager.createActionFromType(input.campaignId, input.actionTypeSlug, input);
    }),

  listActions: protectedProcedure
    .input(z.object({ campaignId: z.string(), category: z.enum(["ATL", "BTL", "TTL"]).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignAction.findMany({
        where: { campaignId: input.campaignId, ...(input.category ? { category: input.category } : {}) },
        include: { executions: true },
        orderBy: { createdAt: "asc" },
      });
    }),

  updateAction: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), budget: z.number().optional(), status: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.campaignAction.update({ where: { id }, data });
    }),

  // === EXECUTIONS ===
  createExecution: protectedProcedure
    .input(z.object({
      actionId: z.string(),
      campaignId: z.string(),
      title: z.string(),
      assigneeId: z.string().optional(),
      dueDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignExecution.create({ data: input });
    }),

  updateExecution: protectedProcedure
    .input(z.object({ id: z.string(), productionState: z.string().optional(), deliverableUrl: z.string().optional(), feedback: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.campaignExecution.update({ where: { id }, data: data as Prisma.CampaignExecutionUpdateInput });
    }),

  // === AMPLIFICATIONS ===
  createAmplification: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      platform: z.string(),
      budget: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignAmplification.create({ data: input });
    }),

  updateAmplificationMetrics: protectedProcedure
    .input(z.object({
      id: z.string(),
      impressions: z.number().optional(),
      clicks: z.number().optional(),
      conversions: z.number().optional(),
      cpa: z.number().optional(),
      roas: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.campaignAmplification.update({ where: { id }, data });
    }),

  // === TEAM ===
  addTeamMember: protectedProcedure
    .input(z.object({ campaignId: z.string(), userId: z.string(), role: z.string(), permissions: z.record(z.boolean()).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { role, permissions, ...rest } = input;
      return ctx.db.campaignTeamMember.create({ data: { ...rest, role: role as never, permissions: permissions as Prisma.InputJsonValue } });
    }),

  getTeam: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ input }) => campaignManager.getCampaignTeam(input.campaignId)),

  removeTeamMember: protectedProcedure
    .input(z.object({ campaignId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignTeamMember.deleteMany({ where: { campaignId: input.campaignId, userId: input.userId } });
    }),

  // === MILESTONES ===
  createMilestone: protectedProcedure
    .input(z.object({ campaignId: z.string(), title: z.string(), dueDate: z.date() }))
    .mutation(async ({ ctx, input }) => ctx.db.campaignMilestone.create({ data: input })),

  completeMilestone: protectedProcedure
    .input(z.object({ id: z.string(), gateReview: z.record(z.unknown()).optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignMilestone.update({
        where: { id: input.id },
        data: { completed: true, completedAt: new Date(), gateReview: input.gateReview as Prisma.InputJsonValue },
      });
    }),

  // === BUDGET ===
  getBudgetBreakdown: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => campaignManager.getBudgetBreakdown(input.campaignId)),

  // === APPROVALS ===
  requestApproval: protectedProcedure
    .input(z.object({ campaignId: z.string(), approverId: z.string(), fromState: z.string(), toState: z.string(), comment: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignApproval.create({
        data: {
          campaignId: input.campaignId,
          approverId: input.approverId,
          fromState: input.fromState as never,
          toState: input.toState as never,
          comment: input.comment,
        },
      });
    }),

  decideApproval: protectedProcedure
    .input(z.object({ id: z.string(), status: z.enum(["APPROVED", "REJECTED", "REVISION_REQUESTED"]), comment: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignApproval.update({
        where: { id: input.id },
        data: { status: input.status, comment: input.comment, decidedAt: new Date() },
      });
    }),

  // === ASSETS ===
  uploadAsset: protectedProcedure
    .input(z.object({ campaignId: z.string(), name: z.string(), fileUrl: z.string(), mimeType: z.string().optional(), category: z.string().optional() }))
    .mutation(async ({ ctx, input }) => ctx.db.campaignAsset.create({ data: input })),

  listAssets: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => ctx.db.campaignAsset.findMany({ where: { campaignId: input.campaignId } })),

  // === BRIEFS ===
  createBrief: protectedProcedure
    .input(z.object({ campaignId: z.string(), title: z.string(), content: z.record(z.unknown()), targetDriver: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignBrief.create({ data: { ...input, content: input.content as Prisma.InputJsonValue } });
    }),

  // === REPORTS ===
  generateReport: protectedProcedure
    .input(z.object({ campaignId: z.string(), reportType: z.string(), title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignReport.create({ data: { ...input, data: {} } });
    }),

  // === DEPENDENCIES ===
  addDependency: protectedProcedure
    .input(z.object({ sourceId: z.string(), targetId: z.string(), depType: z.string().optional() }))
    .mutation(async ({ ctx, input }) => ctx.db.campaignDependency.create({ data: input })),

  // === FIELD OPS ===
  createFieldOp: protectedProcedure
    .input(z.object({ campaignId: z.string(), name: z.string(), location: z.string(), date: z.date(), teamSize: z.number().optional(), budget: z.number().optional() }))
    .mutation(async ({ ctx, input }) => ctx.db.campaignFieldOp.create({ data: input })),

  updateFieldOp: protectedProcedure
    .input(z.object({ id: z.string(), status: z.string().optional(), results: z.record(z.unknown()).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.campaignFieldOp.update({ where: { id }, data: data as Prisma.CampaignFieldOpUpdateInput });
    }),

  submitFieldReport: protectedProcedure
    .input(z.object({ fieldOpId: z.string(), campaignId: z.string(), reporterName: z.string(), data: z.record(z.unknown()), photos: z.array(z.string()).optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignFieldReport.create({ data: { ...input, data: input.data as Prisma.InputJsonValue, photos: input.photos as Prisma.InputJsonValue } });
    }),

  // === AARRR REPORTING ===
  recordAARRMetric: protectedProcedure
    .input(z.object({ campaignId: z.string(), stage: z.enum(["ACQUISITION", "ACTIVATION", "RETENTION", "REVENUE", "REFERRAL"]), metric: z.string(), value: z.number(), target: z.number().optional(), period: z.string() }))
    .mutation(async ({ ctx, input }) => ctx.db.campaignAARRMetric.create({ data: input })),

  getAARRReport: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => campaignManager.generateAARRReport(input.campaignId)),

  // === RECOMMENDATIONS ===
  recommendActions: protectedProcedure
    .input(z.object({ objectives: z.array(z.string()), budget: z.number(), preferredDrivers: z.array(z.string()) }))
    .query(({ input }) => campaignManager.recommendActions(input.objectives, input.budget, input.preferredDrivers)),

  // === ACTION TYPE CATALOG ===
  getActionTypes: protectedProcedure
    .input(z.object({ category: z.enum(["ATL", "BTL", "TTL"]).optional(), driver: z.string().optional(), search: z.string().optional() }))
    .query(({ input }) => {
      if (input.search) return campaignManager.searchActions(input.search);
      if (input.category) return campaignManager.getActionsByCategory(input.category);
      if (input.driver) return campaignManager.getActionsByDriver(input.driver);
      return campaignManager.ACTION_TYPES;
    }),
});
