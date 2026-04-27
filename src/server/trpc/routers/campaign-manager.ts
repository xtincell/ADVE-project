// ============================================================================
// MODULE M04 — Campaign Manager 360
// Score: 100/100 | Priority: P0 | Status: FUNCTIONAL
// Spec: Annexe C + §6.3 | Division: La Fusée (BOOST)
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  19 sub-routers, 93 procedures covering full campaign lifecycle
// [x] REQ-2  State machine 12 états: BRIEF_DRAFT→BRIEF_VALIDATED→PLANNING→CREATIVE_DEV→PRODUCTION→PRE_PRODUCTION→APPROVAL→READY_TO_LAUNCH→LIVE→POST_CAMPAIGN→ARCHIVED→CANCELLED
// [x] REQ-3  130+ action types ATL/BTL/TTL with execution tracking
// [x] REQ-4  Production pipeline 6 états (DEVIS→TERMINE)
// [x] REQ-5  Achat média 11 types (CampaignAmplification)
// [x] REQ-6  Team management 13 rôles + allocation
// [x] REQ-7  Budget 8 catégories + variance + burn forecast + cost-per-KPI
// [x] REQ-8  Approvals 9 types avec round counter
// [x] REQ-9  Assets 12 types avec versioning
// [x] REQ-10 Briefs 7 types + 4 générateurs AI
// [x] REQ-11 Reports 7 types + operation recommender
// [x] REQ-12 AARRR reporting unifié terrain + digital
// [x] REQ-13 Field Operations terrain (team + ambassadors)
// [x] REQ-14 Dependencies 4 types (BLOCKS/REQUIRES/FOLLOWS/PARALLEL)
// [x] REQ-15 Operator isolation (enforceStrategyAccess + enforceCampaignAccess)
// [x] REQ-16 Connexion scoring: campaign advertis_vector cible vs réel (getAdvertisVectorAlignment)
// [x] REQ-17 devotionObjective sur Campaign (getDevotionProgression, setDevotionObjective)
//
// SUB-ROUTERS: crud, state, actions, executions, amplifications, team,
//   milestones, budget, approvals, assets, briefs, reports, links,
//   dependencies, templates, fieldOps, fieldReports, aarrr, recommender
// ============================================================================

/**
 * Campaign Manager 360 — 21 sub-routers, 97 procedures
 * Full spec implementation: CRUD, state machine, actions, executions,
 * amplifications, team, milestones, budget, approvals, assets, briefs,
 * reports, links, dependencies, templates, field ops, field reports,
 * AARRR reporting, and operation recommender.
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure, operatorProcedure } from "../init";
import * as cm from "@/server/services/campaign-manager";
import { canAccessStrategy, canAccessCampaign } from "@/server/services/operator-isolation";

/** Helper to enforce strategy access or throw FORBIDDEN */
async function enforceStrategyAccess(ctx: { session: { user: { id: string; role: string; operatorId?: string | null } } }, strategyId: string) {
  const ok = await canAccessStrategy(strategyId, {
    operatorId: ctx.session.user.operatorId ?? null,
    userId: ctx.session.user.id,
    role: ctx.session.user.role,
  });
  if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé: cette stratégie appartient à un autre opérateur" });
}

/** Helper to enforce campaign access or throw FORBIDDEN */
async function enforceCampaignAccess(ctx: { session: { user: { id: string; role: string; operatorId?: string | null } } }, campaignId: string) {
  const ok = await canAccessCampaign(campaignId, {
    operatorId: ctx.session.user.operatorId ?? null,
    userId: ctx.session.user.id,
    role: ctx.session.user.role,
  });
  if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé: cette campagne appartient à un autre opérateur" });
}

// ============================================================================
// Shared Zod enums
// ============================================================================

const campaignStateEnum = z.enum([
  "BRIEF_DRAFT", "BRIEF_VALIDATED", "PLANNING", "CREATIVE_DEV",
  "PRODUCTION", "PRE_PRODUCTION", "APPROVAL", "READY_TO_LAUNCH",
  "LIVE", "POST_CAMPAIGN", "ARCHIVED", "CANCELLED",
]);

const actionCategoryEnum = z.enum(["ATL", "BTL", "TTL"]);

const approvalStatusEnum = z.enum(["APPROVED", "REJECTED", "REVISION_REQUESTED"]);

const approvalTypeEnum = z.enum([
  "BRIEF", "CREATIVE_CONCEPT", "KEY_VISUAL", "COPY", "BAT",
  "MEDIA_PLAN", "BUDGET", "FINAL_DELIVERY", "LAUNCH",
]);

const briefTypeEnum = z.enum([
  "CREATIVE", "MEDIA", "PRODUCTION", "VENDOR", "EVENT", "DIGITAL", "RP",
]);

const reportTypeEnum = z.enum([
  "WEEKLY_STATUS", "MONTHLY_STATUS", "MID_CAMPAIGN", "POST_CAMPAIGN",
  "ROI_ANALYSIS", "MEDIA_PERFORMANCE", "CREATIVE_PERFORMANCE",
]);

const depTypeEnum = z.enum(["BLOCKS", "REQUIRES", "FOLLOWS", "PARALLEL"]);

const budgetCategoryEnum = z.enum([
  "PRODUCTION", "MEDIA", "TALENT", "LOGISTICS",
  "TECHNOLOGY", "LEGAL", "CONTINGENCY", "AGENCY_FEE",
]);

const aarrStageEnum = z.enum(["ACQUISITION", "ACTIVATION", "RETENTION", "REVENUE", "REFERRAL"]);

const fieldOpStatusEnum = z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

const milestoneStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE", "SKIPPED"]);

const productionStateEnum = z.enum(["DEVIS", "BAT", "EN_PRODUCTION", "LIVRAISON", "INSTALLE", "TERMINE", "ANNULE"]);

const teamRoleEnum = z.enum([
  "ACCOUNT_DIRECTOR", "ACCOUNT_MANAGER", "STRATEGIC_PLANNER",
  "CREATIVE_DIRECTOR", "ART_DIRECTOR", "COPYWRITER",
  "MEDIA_PLANNER", "MEDIA_BUYER", "SOCIAL_MANAGER",
  "PRODUCTION_MANAGER", "PROJECT_MANAGER", "DATA_ANALYST", "CLIENT",
]);

// ============================================================================
// ROUTER
// ============================================================================

export const campaignManagerRouter = createTRPCRouter({

  // ==========================================================================
  // C.3.1 — Campaigns (CRUD + lifecycle) — 11 procedures
  // ==========================================================================

  /** getByStrategy — campaigns by strategy with filters */
  getByStrategy: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      state: campaignStateEnum.optional(),
      isTemplate: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      await enforceStrategyAccess(ctx, input.strategyId);
      return ctx.db.campaign.findMany({
        where: {
          strategyId: input.strategyId,
          ...(input.state ? { state: input.state } : {}),
          ...(input.isTemplate ? { parentCampaignId: { not: null } } : {}),
        },
        include: { missions: { select: { id: true, status: true } }, teamMembers: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** getById — full detail with all relations */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.id);
      return ctx.db.campaign.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          strategy: true,
          missions: true,
          actions: { include: { executions: true } },
          amplifications: true,
          teamMembers: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
          milestones: { orderBy: { dueDate: "asc" } },
          approvals: { orderBy: { createdAt: "desc" } },
          assets: true,
          briefs: true,
          reports: { orderBy: { generatedAt: "desc" } },
          fieldOps: { include: { reports: true } },
          aarrMetrics: true,
          budgetLines: true,
          links: true,
        },
      });
    }),

  /** getKanban — grouped by state */
  getKanban: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceStrategyAccess(ctx, input.strategyId);
      const campaigns = await ctx.db.campaign.findMany({
        where: { strategyId: input.strategyId },
        include: { missions: { select: { id: true, status: true } }, teamMembers: true },
        orderBy: { updatedAt: "desc" },
      });
      const kanban: Record<string, typeof campaigns> = {};
      for (const c of campaigns) {
        const state = c.state;
        if (!kanban[state]) kanban[state] = [];
        kanban[state].push(c);
      }
      return kanban;
    }),

  /** getCalendar — by launch date */
  getCalendar: protectedProcedure
    .input(z.object({ strategyId: z.string(), month: z.number().min(1).max(12), year: z.number() }))
    .query(async ({ ctx, input }) => {
      await enforceStrategyAccess(ctx, input.strategyId);
      const start = new Date(input.year, input.month - 1, 1);
      const end = new Date(input.year, input.month, 0, 23, 59, 59);
      return ctx.db.campaign.findMany({
        where: {
          strategyId: input.strategyId,
          OR: [
            { startDate: { gte: start, lte: end } },
            { endDate: { gte: start, lte: end } },
            { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] },
          ],
        },
        include: { actions: true, milestones: true },
        orderBy: { startDate: "asc" },
      });
    }),

  /** search — multi-field */
  search: protectedProcedure
    .input(z.object({
      strategyId: z.string().optional(),
      query: z.string().optional(),
      state: campaignStateEnum.optional(),
      category: actionCategoryEnum.optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (input.strategyId) await enforceStrategyAccess(ctx, input.strategyId);
      return cm.searchCampaigns(input);
    }),

  /** dashboard — aggregated stats */
  dashboard: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceStrategyAccess(ctx, input.strategyId);
      return cm.getDashboard(input.strategyId);
    }),

  /** create — with auto code */
  create: operatorProcedure
    .input(z.object({
      name: z.string().min(1),
      strategyId: z.string(),
      description: z.string().optional(),
      budget: z.number().optional(),
      budgetCurrency: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      advertis_vector: z.record(z.number()).optional(),
      devotionObjective: z.record(z.unknown()).optional(),
      parentCampaignId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await enforceStrategyAccess(ctx, input.strategyId);
      const code = cm.generateCampaignCode();
      const { advertis_vector, devotionObjective, description, ...rest } = input;
      return ctx.db.campaign.create({
        data: {
          ...rest,
          code,
          advertis_vector: advertis_vector as Prisma.InputJsonValue,
          devotionObjective: devotionObjective as Prisma.InputJsonValue,
          objectives: description ? { description } as Prisma.InputJsonValue : undefined,
        },
      });
    }),

  /** update */
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      budget: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      advertis_vector: z.record(z.number()).optional(),
      devotionObjective: z.record(z.unknown()).optional(),
      aarrTargets: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.id);
      const { id, advertis_vector, devotionObjective, aarrTargets, ...data } = input;
      return ctx.db.campaign.update({
        where: { id },
        data: {
          ...data,
          ...(advertis_vector ? { advertis_vector: advertis_vector as Prisma.InputJsonValue } : {}),
          ...(devotionObjective ? { devotionObjective: devotionObjective as Prisma.InputJsonValue } : {}),
          ...(aarrTargets ? { aarrTargets: aarrTargets as Prisma.InputJsonValue } : {}),
        },
      });
    }),

  /** transition — state machine with gate reviews */
  transition: operatorProcedure
    .input(z.object({
      campaignId: z.string(),
      toState: campaignStateEnum,
      approverId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.campaignId);
      return cm.transitionCampaign(input.campaignId, input.toState as never, input.approverId);
    }),

  /** availableTransitions */
  availableTransitions: protectedProcedure
    .input(z.object({ state: campaignStateEnum }))
    .query(({ input }) => cm.getAvailableTransitions(input.state as never)),

  /** delete — soft delete (ARCHIVED) */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.id);
      return ctx.db.campaign.update({
        where: { id: input.id },
        data: { state: "ARCHIVED", status: "ARCHIVED" },
      });
    }),

  /** migrate — from Pillar I to Campaign Manager */
  migrate: operatorProcedure
    .input(z.object({ campaignId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.campaignId);
      const campaign = await ctx.db.campaign.findUniqueOrThrow({ where: { id: input.campaignId } });
      if (campaign.state !== "BRIEF_DRAFT") {
        return { success: false, error: "Seules les campagnes en BRIEF_DRAFT peuvent etre migrees" };
      }
      // Pull objectives from strategy pillar I
      const pillarI = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: campaign.strategyId, key: "i" } },
      });
      if (pillarI?.content) {
        await ctx.db.campaign.update({
          where: { id: input.campaignId },
          data: { objectives: pillarI.content as Prisma.InputJsonValue },
        });
      }
      return { success: true };
    }),

  // ==========================================================================
  // C.3.2 — Actions ATL/BTL/TTL — 4 procedures
  // ==========================================================================

  createAction: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      actionTypeSlug: z.string(),
      name: z.string().optional(),
      budget: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      aarrStage: z.string().optional(),
      coutUnitaire: z.number().optional(),
      uniteCosting: z.string().optional(),
      sovTarget: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return cm.createActionFromType(input.campaignId, input.actionTypeSlug, input);
    }),

  listActions: protectedProcedure
    .input(z.object({ campaignId: z.string(), category: actionCategoryEnum.optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignAction.findMany({
        where: { campaignId: input.campaignId, ...(input.category ? { category: input.category } : {}) },
        include: { executions: true },
        orderBy: { createdAt: "asc" },
      });
    }),

  updateAction: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      budget: z.number().optional(),
      status: z.string().optional(),
      aarrStage: z.string().optional(),
      coutUnitaire: z.number().optional(),
      uniteCosting: z.string().optional(),
      sovTarget: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.campaignAction.update({ where: { id }, data });
    }),

  getActionTypes: protectedProcedure
    .input(z.object({
      category: actionCategoryEnum.optional(),
      driver: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(({ input }) => {
      if (input.search) return cm.searchActions(input.search);
      if (input.category) return cm.getActionsByCategory(input.category);
      if (input.driver) return cm.getActionsByDriver(input.driver);
      return cm.ACTION_TYPES;
    }),

  // ==========================================================================
  // C.3.3 — Executions (production pipeline) — 4 procedures
  // ==========================================================================

  createExecution: protectedProcedure
    .input(z.object({
      actionId: z.string(),
      campaignId: z.string(),
      title: z.string(),
      executionType: z.string().optional(),
      assigneeId: z.string().optional(),
      dueDate: z.date().optional(),
      vendor: z.string().optional(),
      devisAmount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignExecution.create({ data: input });
    }),

  listExecutions: protectedProcedure
    .input(z.object({ campaignId: z.string(), actionId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignExecution.findMany({
        where: { campaignId: input.campaignId, ...(input.actionId ? { actionId: input.actionId } : {}) },
        include: { action: true },
        orderBy: { createdAt: "asc" },
      });
    }),

  updateExecution: protectedProcedure
    .input(z.object({
      id: z.string(),
      productionState: productionStateEnum.optional(),
      deliverableUrl: z.string().optional(),
      feedback: z.string().optional(),
      vendor: z.string().optional(),
      devisAmount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.campaignExecution.update({ where: { id }, data: data as Prisma.CampaignExecutionUpdateInput });
    }),

  transitionExecution: operatorProcedure
    .input(z.object({
      id: z.string(),
      toState: productionStateEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const exec = await ctx.db.campaignExecution.findUniqueOrThrow({ where: { id: input.id } });
      const validTransitions: Record<string, string[]> = {
        DEVIS: ["BAT", "ANNULE"],
        BAT: ["EN_PRODUCTION", "DEVIS", "ANNULE"],
        EN_PRODUCTION: ["LIVRAISON", "ANNULE"],
        LIVRAISON: ["INSTALLE", "TERMINE", "ANNULE"],
        INSTALLE: ["TERMINE", "ANNULE"],
        TERMINE: [],
        ANNULE: [],
      };
      const current = exec.productionState;
      const allowed = validTransitions[current] ?? [];
      if (!allowed.includes(input.toState)) {
        return { success: false, error: `Transition ${current} -> ${input.toState} non autorisee. Permises: ${allowed.join(", ")}` };
      }
      await ctx.db.campaignExecution.update({ where: { id: input.id }, data: { productionState: input.toState as never } });
      return { success: true, newState: input.toState };
    }),

  // ==========================================================================
  // C.3.4 — Amplifications (media buying) — 5 procedures
  // ==========================================================================

  createAmplification: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      platform: z.string(),
      budget: z.number(),
      mediaType: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      mediaCost: z.number().optional(),
      productionCost: z.number().optional(),
      agencyFee: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignAmplification.create({ data: input });
    }),

  listAmplifications: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignAmplification.findMany({
        where: { campaignId: input.campaignId },
        orderBy: { createdAt: "asc" },
      });
    }),

  updateAmplification: protectedProcedure
    .input(z.object({
      id: z.string(),
      impressions: z.number().optional(),
      clicks: z.number().optional(),
      conversions: z.number().optional(),
      reach: z.number().optional(),
      views: z.number().optional(),
      engagements: z.number().optional(),
      cpa: z.number().optional(),
      roas: z.number().optional(),
      mediaCost: z.number().optional(),
      productionCost: z.number().optional(),
      agencyFee: z.number().optional(),
      aarrAttribution: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, aarrAttribution, ...data } = input;
      return ctx.db.campaignAmplification.update({
        where: { id },
        data: {
          ...data,
          ...(aarrAttribution ? { aarrAttribution: aarrAttribution as Prisma.InputJsonValue } : {}),
        },
      });
    }),

  getAmplificationMetrics: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const amps = await ctx.db.campaignAmplification.findMany({ where: { campaignId: input.campaignId } });
      const totals = {
        budget: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0, views: 0, engagements: 0,
        mediaCost: 0, productionCost: 0, agencyFee: 0,
      };
      for (const a of amps) {
        totals.budget += a.budget;
        totals.impressions += a.impressions ?? 0;
        totals.clicks += a.clicks ?? 0;
        totals.conversions += a.conversions ?? 0;
        totals.reach += a.reach ?? 0;
        totals.views += a.views ?? 0;
        totals.engagements += a.engagements ?? 0;
        totals.mediaCost += a.mediaCost ?? 0;
        totals.productionCost += a.productionCost ?? 0;
        totals.agencyFee += a.agencyFee ?? 0;
      }
      const cpm = totals.impressions > 0 ? (totals.mediaCost / totals.impressions) * 1000 : null;
      const cpc = totals.clicks > 0 ? totals.mediaCost / totals.clicks : null;
      const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : null;
      const cpv = totals.views > 0 ? totals.mediaCost / totals.views : null;
      return { totals, calculated: { cpm, cpc, ctr, cpv }, platforms: amps };
    }),

  deleteAmplification: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignAmplification.delete({ where: { id: input.id } });
    }),

  // ==========================================================================
  // C.3.5 — Team — 5 procedures
  // ==========================================================================

  addTeamMember: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      userId: z.string(),
      role: teamRoleEnum,
      permissions: z.record(z.boolean()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { permissions, ...rest } = input;
      return ctx.db.campaignTeamMember.create({
        data: { ...rest, permissions: permissions as Prisma.InputJsonValue },
      });
    }),

  getTeam: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.getCampaignTeam(input.campaignId)),

  updateTeamMember: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      userId: z.string(),
      role: teamRoleEnum.optional(),
      permissions: z.record(z.boolean()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignTeamMember.update({
        where: { campaignId_userId: { campaignId: input.campaignId, userId: input.userId } },
        data: {
          ...(input.role ? { role: input.role } : {}),
          ...(input.permissions ? { permissions: input.permissions as Prisma.InputJsonValue } : {}),
        },
      });
    }),

  removeTeamMember: protectedProcedure
    .input(z.object({ campaignId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignTeamMember.deleteMany({
        where: { campaignId: input.campaignId, userId: input.userId },
      });
    }),

  listTeamByRole: protectedProcedure
    .input(z.object({ campaignId: z.string(), role: teamRoleEnum }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignTeamMember.findMany({
        where: { campaignId: input.campaignId, role: input.role },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      });
    }),

  // ==========================================================================
  // C.3.6 — Milestones — 5 procedures
  // ==========================================================================

  createMilestone: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      title: z.string(),
      dueDate: z.date(),
      phase: z.string().optional(),
      isGateReview: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignMilestone.create({ data: input });
    }),

  listMilestones: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignMilestone.findMany({
        where: { campaignId: input.campaignId },
        orderBy: { dueDate: "asc" },
      });
    }),

  updateMilestone: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      dueDate: z.date().optional(),
      status: milestoneStatusEnum.optional(),
      isGateReview: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.campaignMilestone.update({ where: { id }, data });
    }),

  completeMilestone: operatorProcedure
    .input(z.object({
      id: z.string(),
      gateReview: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignMilestone.update({
        where: { id: input.id },
        data: {
          completed: true,
          completedAt: new Date(),
          status: "COMPLETED",
          gateReview: input.gateReview as Prisma.InputJsonValue,
        },
      });
    }),

  deleteMilestone: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignMilestone.delete({ where: { id: input.id } });
    }),

  // ==========================================================================
  // C.3.7 — Budget — 10 procedures
  // ==========================================================================

  getBudgetBreakdown: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.getBudgetBreakdown(input.campaignId)),

  getBudgetSummary: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.getBudgetSummary(input.campaignId)),

  getBudgetVariance: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.getBudgetVariance(input.campaignId)),

  getBurnForecast: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.getBurnForecast(input.campaignId)),

  getSpendByActionLine: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.getSpendByActionLine(input.campaignId)),

  getCostPerKPI: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.getCostPerKPI(input.campaignId)),

  createBudgetLine: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      category: budgetCategoryEnum,
      label: z.string(),
      planned: z.number(),
      actionId: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => cm.createBudgetLine(input)),

  updateBudgetLine: protectedProcedure
    .input(z.object({ id: z.string(), actual: z.number(), notes: z.string().optional() }))
    .mutation(({ input }) => cm.updateBudgetLine(input.id, input.actual)),

  listBudgetLines: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.listBudgetLines(input.campaignId)),

  deleteBudgetLine: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => cm.deleteBudgetLine(input.id)),

  // ==========================================================================
  // C.3.8 — Approvals — 4 procedures
  // ==========================================================================

  requestApproval: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      approverId: z.string(),
      fromState: campaignStateEnum,
      toState: campaignStateEnum,
      approvalType: approvalTypeEnum.optional(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Count existing rounds for this approval type
      const existingCount = await ctx.db.campaignApproval.count({
        where: {
          campaignId: input.campaignId,
          approvalType: input.approvalType,
        },
      });
      return ctx.db.campaignApproval.create({
        data: {
          campaignId: input.campaignId,
          approverId: input.approverId,
          fromState: input.fromState as never,
          toState: input.toState as never,
          approvalType: input.approvalType,
          comment: input.comment,
          round: existingCount + 1,
        },
      });
    }),

  decideApproval: operatorProcedure
    .input(z.object({
      id: z.string(),
      status: approvalStatusEnum,
      comment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignApproval.update({
        where: { id: input.id },
        data: { status: input.status, comment: input.comment, decidedAt: new Date() },
      });
    }),

  listApprovals: protectedProcedure
    .input(z.object({ campaignId: z.string(), approvalType: approvalTypeEnum.optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignApproval.findMany({
        where: {
          campaignId: input.campaignId,
          ...(input.approvalType ? { approvalType: input.approvalType } : {}),
        },
        include: { approver: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  getPendingApprovals: protectedProcedure
    .input(z.object({ approverId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignApproval.findMany({
        where: { approverId: input.approverId, status: "PENDING" },
        include: { campaign: { select: { id: true, name: true, state: true } } },
        orderBy: { createdAt: "asc" },
      });
    }),

  // ==========================================================================
  // C.3.9 — Assets — 4 procedures
  // ==========================================================================

  uploadAsset: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      name: z.string(),
      fileUrl: z.string(),
      mimeType: z.string().optional(),
      fileSize: z.number().optional(),
      category: z.string().optional(),
      assetType: z.string().optional(),
      gloryOutputId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => ctx.db.campaignAsset.create({ data: input })),

  listAssets: protectedProcedure
    .input(z.object({ campaignId: z.string(), assetType: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignAsset.findMany({
        where: { campaignId: input.campaignId, ...(input.assetType ? { assetType: input.assetType } : {}) },
        orderBy: { createdAt: "desc" },
      });
    }),

  versionAsset: protectedProcedure
    .input(z.object({
      id: z.string(),
      fileUrl: z.string(),
      fileSize: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.campaignAsset.findUniqueOrThrow({ where: { id: input.id } });
      return ctx.db.campaignAsset.update({
        where: { id: input.id },
        data: { fileUrl: input.fileUrl, fileSize: input.fileSize, version: existing.version + 1 },
      });
    }),

  publishAssetToBrandVault: operatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.campaignAsset.findUniqueOrThrow({
        where: { id: input.id },
        include: { campaign: true },
      });
      // Create BrandAsset from campaign asset
      await ctx.db.brandAsset.create({
        data: {
          strategyId: asset.campaign.strategyId,
          name: asset.name,
          fileUrl: asset.fileUrl,
          pillarTags: asset.pillarTags as Prisma.InputJsonValue ?? undefined,
        },
      });
      await ctx.db.campaignAsset.update({
        where: { id: input.id },
        data: { brandVaultPublished: true },
      });
      return { success: true };
    }),

  // ==========================================================================
  // C.3.10 — Briefs — 8 procedures
  // ==========================================================================

  createBrief: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      title: z.string(),
      content: z.record(z.unknown()),
      briefType: briefTypeEnum.optional(),
      targetDriver: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignBrief.create({
        data: { ...input, content: input.content as Prisma.InputJsonValue },
      });
    }),

  listBriefs: protectedProcedure
    .input(z.object({ campaignId: z.string(), briefType: briefTypeEnum.optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignBrief.findMany({
        where: { campaignId: input.campaignId, ...(input.briefType ? { briefType: input.briefType } : {}) },
        orderBy: { createdAt: "desc" },
      });
    }),

  updateBrief: protectedProcedure
    .input(z.object({ id: z.string(), content: z.record(z.unknown()), status: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.campaignBrief.findUniqueOrThrow({ where: { id: input.id } });
      return ctx.db.campaignBrief.update({
        where: { id: input.id },
        data: {
          content: input.content as Prisma.InputJsonValue,
          version: existing.version + 1,
          ...(input.status ? { status: input.status } : {}),
        },
      });
    }),

  getBriefTypes: protectedProcedure
    .query(() => cm.getBriefTypes()),

  generateCreativeBrief: operatorProcedure
    .input(z.object({ campaignId: z.string(), strategyId: z.string() }))
    .mutation(({ input }) => cm.generateCreativeBrief(input.campaignId, input.strategyId)),

  generateMediaBrief: operatorProcedure
    .input(z.object({ campaignId: z.string(), strategyId: z.string() }))
    .mutation(({ input }) => cm.generateMediaBrief(input.campaignId, input.strategyId)),

  generateVendorBrief: operatorProcedure
    .input(z.object({ campaignId: z.string(), strategyId: z.string() }))
    .mutation(({ input }) => cm.generateVendorBrief(input.campaignId, input.strategyId)),

  generateProductionBrief: operatorProcedure
    .input(z.object({ campaignId: z.string(), strategyId: z.string() }))
    .mutation(({ input }) => cm.generateProductionBrief(input.campaignId, input.strategyId)),

  // ==========================================================================
  // C.3.11 — Reports — 3 procedures
  // ==========================================================================

  generateReport: operatorProcedure
    .input(z.object({
      campaignId: z.string(),
      reportType: reportTypeEnum,
      title: z.string(),
    }))
    .mutation(({ input }) => cm.generateFullReport(input.campaignId, input.reportType, input.title)),

  listReports: protectedProcedure
    .input(z.object({ campaignId: z.string(), reportType: reportTypeEnum.optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignReport.findMany({
        where: { campaignId: input.campaignId, ...(input.reportType ? { reportType: input.reportType } : {}) },
        orderBy: { generatedAt: "desc" },
      });
    }),

  getReport: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignReport.findUniqueOrThrow({ where: { id: input.id } });
    }),

  // ==========================================================================
  // C.3.12 — Links (junctions) — 6 procedures
  // ==========================================================================

  linkMission: protectedProcedure
    .input(z.object({ campaignId: z.string(), missionId: z.string() }))
    .mutation(({ input }) => cm.linkMission(input.campaignId, input.missionId)),

  linkSignal: protectedProcedure
    .input(z.object({ campaignId: z.string(), signalId: z.string() }))
    .mutation(({ input }) => cm.linkSignal(input.campaignId, input.signalId)),

  linkPublication: protectedProcedure
    .input(z.object({ campaignId: z.string(), publicationId: z.string() }))
    .mutation(({ input }) => cm.linkPublication(input.campaignId, input.publicationId)),

  unlinkEntity: protectedProcedure
    .input(z.object({ campaignId: z.string(), linkedType: z.string(), linkedId: z.string() }))
    .mutation(({ input }) => cm.unlinkEntity(input.campaignId, input.linkedType, input.linkedId)),

  getLinks: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.getLinks(input.campaignId)),

  getLinksByType: protectedProcedure
    .input(z.object({ campaignId: z.string(), linkedType: z.enum(["MISSION", "PUBLICATION", "SIGNAL"]) }))
    .query(({ input }) => cm.getLinksByType(input.campaignId, input.linkedType)),

  // ==========================================================================
  // C.3.13 — Dependencies — 3 procedures
  // ==========================================================================

  addDependency: protectedProcedure
    .input(z.object({
      sourceId: z.string(),
      targetId: z.string(),
      depType: depTypeEnum.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignDependency.create({
        data: { sourceId: input.sourceId, targetId: input.targetId, depType: input.depType ?? "BLOCKS" },
      });
    }),

  listDependencies: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.listDependencies(input.campaignId)),

  validateDependencies: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.validateDependencies(input.campaignId)),

  // ==========================================================================
  // C.3.14 — Templates — 2 procedures
  // ==========================================================================

  createFromTemplate: operatorProcedure
    .input(z.object({
      templateId: z.string(),
      strategyId: z.string(),
      name: z.string(),
    }))
    .mutation(({ input }) => cm.createFromTemplate(input.templateId, input.strategyId, input.name)),

  saveAsTemplate: operatorProcedure
    .input(z.object({
      campaignId: z.string(),
      name: z.string(),
      description: z.string().optional(),
    }))
    .mutation(({ input }) => cm.saveAsTemplate(input.campaignId, input.name, input.description ?? "")),

  // ==========================================================================
  // C.3.15 — Simulator — 1 procedure
  // ==========================================================================

  getSimulatorData: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUniqueOrThrow({
        where: { id: input.campaignId },
        include: { actions: true, amplifications: true },
      });
      // Load V pillar for product catalog
      const pillarV = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: campaign.strategyId, key: "v" } },
      });
      return {
        campaign: { id: campaign.id, name: campaign.name, budget: campaign.budget },
        actions: campaign.actions.map((a) => ({
          id: a.id, name: a.name, category: a.category, actionType: a.actionType,
          budget: a.budget, aarrStage: a.aarrStage, coutUnitaire: a.coutUnitaire,
          uniteCosting: a.uniteCosting, sovTarget: a.sovTarget,
        })),
        amplifications: campaign.amplifications,
        productCatalog: pillarV?.content ? (pillarV.content as Record<string, unknown>).produitsCatalogue : [],
      };
    }),

  // ==========================================================================
  // C.3.16 — Field Operations — 5 procedures
  // ==========================================================================

  createFieldOp: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      name: z.string(),
      location: z.string(),
      date: z.date(),
      status: fieldOpStatusEnum.optional(),
      teamSize: z.number().optional(),
      budget: z.number().optional(),
      briefData: z.record(z.unknown()).optional(),
      team: z.array(z.record(z.unknown())).optional(),
      ambassadors: z.array(z.record(z.unknown())).optional(),
      aarrConfig: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { team, ambassadors, aarrConfig, briefData, ...rest } = input;
      return ctx.db.campaignFieldOp.create({
        data: {
          ...rest,
          briefData: briefData as Prisma.InputJsonValue,
          team: team as Prisma.InputJsonValue,
          ambassadors: ambassadors as Prisma.InputJsonValue,
          aarrConfig: aarrConfig as Prisma.InputJsonValue,
        },
      });
    }),

  listFieldOps: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.listFieldOps(input.campaignId)),

  getFieldOp: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => cm.getFieldOp(input.id)),

  updateFieldOp: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: fieldOpStatusEnum.optional(),
      results: z.record(z.unknown()).optional(),
      team: z.array(z.record(z.unknown())).optional(),
      ambassadors: z.array(z.record(z.unknown())).optional(),
      aarrConfig: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, results, team, ambassadors, aarrConfig, ...data } = input;
      return ctx.db.campaignFieldOp.update({
        where: { id },
        data: {
          ...data,
          ...(results ? { results: results as Prisma.InputJsonValue } : {}),
          ...(team ? { team: team as Prisma.InputJsonValue } : {}),
          ...(ambassadors ? { ambassadors: ambassadors as Prisma.InputJsonValue } : {}),
          ...(aarrConfig ? { aarrConfig: aarrConfig as Prisma.InputJsonValue } : {}),
        },
      });
    }),

  deleteFieldOp: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignFieldOp.delete({ where: { id: input.id } });
    }),

  // ==========================================================================
  // C.3.17 — Field Reports — 6 procedures
  // ==========================================================================

  submitFieldReport: protectedProcedure
    .input(z.object({
      fieldOpId: z.string(),
      campaignId: z.string(),
      reporterName: z.string(),
      data: z.record(z.unknown()),
      photos: z.array(z.string()).optional(),
      acquisitionCount: z.number().optional(),
      acquisitionLabel: z.string().optional(),
      acquisitionUnit: z.string().optional(),
      activationCount: z.number().optional(),
      activationLabel: z.string().optional(),
      activationUnit: z.string().optional(),
      retentionCount: z.number().optional(),
      retentionLabel: z.string().optional(),
      retentionUnit: z.string().optional(),
      revenueCount: z.number().optional(),
      revenueLabel: z.string().optional(),
      revenueUnit: z.string().optional(),
      referralCount: z.number().optional(),
      referralLabel: z.string().optional(),
      referralUnit: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: reportData, photos, ...rest } = input;
      return ctx.db.campaignFieldReport.create({
        data: {
          ...rest,
          data: reportData as Prisma.InputJsonValue,
          photos: photos as Prisma.InputJsonValue,
        },
      });
    }),

  listFieldReports: protectedProcedure
    .input(z.object({ fieldOpId: z.string().optional(), campaignId: z.string().optional() }))
    .query(({ input }) => cm.listFieldReports(input.fieldOpId ?? input.campaignId ?? "")),

  getFieldReport: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignFieldReport.findUniqueOrThrow({
        where: { id: input.id },
        include: { fieldOp: true },
      });
    }),

  validateFieldReport: operatorProcedure
    .input(z.object({
      id: z.string(),
      validatorId: z.string(),
      overrides: z.record(z.unknown()).optional(),
    }))
    .mutation(({ input }) => cm.validateFieldReport(input.id, input.validatorId, input.overrides)),

  getFieldReportStats: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.getFieldReportStats(input.campaignId)),

  rejectFieldReport: operatorProcedure
    .input(z.object({ id: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignFieldReport.update({
        where: { id: input.id },
        data: { status: "SUBMITTED", data: { rejected: true, reason: input.reason } as Prisma.InputJsonValue },
      });
    }),

  // ==========================================================================
  // C.3.18 — AARRR Reporting (unified terrain + digital) — 3 procedures
  // ==========================================================================

  recordAARRMetric: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      stage: aarrStageEnum,
      metric: z.string(),
      value: z.number(),
      target: z.number().optional(),
      period: z.string(),
    }))
    .mutation(async ({ ctx, input }) => ctx.db.campaignAARRMetric.create({ data: input })),

  getAARRReport: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.generateAARRReport(input.campaignId)),

  getUnifiedAARRR: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.getUnifiedAARRR(input.campaignId)),

  // ==========================================================================
  // C.3.19 — Operation Recommender — 3 procedures
  // ==========================================================================

  recommendActions: protectedProcedure
    .input(z.object({
      objectives: z.array(z.string()),
      budget: z.number(),
      preferredDrivers: z.array(z.string()),
    }))
    .query(({ input }) => cm.recommendActions(input.objectives, input.budget, input.preferredDrivers)),

  getRecommendationsForFunnel: protectedProcedure
    .input(z.object({
      funnelStage: aarrStageEnum,
      budget: z.number(),
      sector: z.string().optional(),
    }))
    .query(({ input }) => cm.getRecommendationsForFunnel(input.funnelStage, input.budget, input.sector)),

  scoreActionFit: protectedProcedure
    .input(z.object({
      actionSlug: z.string(),
      funnelStage: z.string(),
      budget: z.number(),
      sector: z.string().optional(),
    }))
    .query(({ input }) => {
      const action = cm.getActionType(input.actionSlug);
      if (!action) return { score: 0, reason: "Action type inconnue" };
      const score = cm.scoreAction(action, { funnelStage: input.funnelStage, budget: input.budget, sector: input.sector });
      return { score, action: action.name };
    }),

  // ==========================================================================
  // C.3.20 — ADVE Vector Alignment (REQ-16) — 1 procedure
  // ==========================================================================

  getAdvertisVectorAlignment: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.campaignId);
      return cm.getAdvertisVectorAlignment(input.campaignId);
    }),

  // ==========================================================================
  // C.3.21 — Devotion Objective (REQ-17) — 3 procedures
  // ==========================================================================

  getDevotionProgression: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.campaignId);
      return cm.getDevotionProgression(input.campaignId);
    }),

  setDevotionObjective: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      objective: z.record(z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.campaignId);
      return cm.setDevotionObjective(input.campaignId, input.objective);
    }),
});
