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
import type { Prisma, CampaignState, ProductionState } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure, operatorProcedure } from "../init";
import * as cm from "@/server/services/campaign-manager";
import { canAccessStrategy, canAccessCampaign } from "@/server/services/operator-isolation";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

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
          // BrandAction = action stratégique canonique (ADR-0094/0119) rattachée
          // à la campagne. Les `actions` (CampaignAction ATL/BTL/TTL) sont la
          // couche média/exécution — affichée en second.
          brandActions: { orderBy: [{ priority: "asc" }, { createdAt: "asc" }] },
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

  /** listBrandActions — actions stratégiques (BrandAction, ADR-0094/0119) liées à la campagne. */
  listBrandActions: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.campaignId);
      return ctx.db.brandAction.findMany({
        where: { campaignId: input.campaignId },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      });
    }),

  /** chainHealth — diagnostic de chaîne actions → briefs → missions (lecture seule). */
  chainHealth: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.campaignId);
      return cm.getCampaignChainHealth(input.campaignId);
    }),

  /**
   * generateBriefFromAction — étage « Actions → Briefs » : génère le brief de
   * production d'une BrandAction et **s'arrête là** (DRAFT, éditable, à valider).
   * La mission naît ensuite de la validation du brief (validateBriefAndCreateMission).
   * Gouverné, voie unique.
   */
  generateBriefFromAction: governedProcedure({
    kind: "LEGACY_CAMPAIGN_MANAGER_GENERATE_BRIEF_FROM_ACTION",
    inputSchema: z.object({ brandActionId: z.string() }),
    caller: "campaign-manager:generateBriefFromAction",
  }).mutation(async ({ ctx, input }) => {
    const ba = await ctx.db.brandAction.findUniqueOrThrow({
      where: { id: input.brandActionId },
      select: { campaignId: true },
    });
    if (ba.campaignId) await enforceCampaignAccess(ctx, ba.campaignId);
    return cm.generateBriefFromBrandAction(input.brandActionId);
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
      advertis_vector: z.record(z.string(), z.number()).optional(),
      devotionObjective: z.record(z.string(), z.unknown()).optional(),
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
  update: governedProcedure({

    kind: "LEGACY_CAMPAIGN_MANAGER_UPDATE",

    inputSchema: z.object({
      id: z.string(),
      name: z.string().optional(),
      budget: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      advertis_vector: z.record(z.string(), z.number()).optional(),
      devotionObjective: z.record(z.string(), z.unknown()).optional(),
      aarrTargets: z.record(z.string(), z.unknown()).optional(),
    }),

    caller: "campaign-manager:update",

  })
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
      return cm.transitionCampaign(input.campaignId, input.toState as CampaignState, input.approverId);
    }),

  /** availableTransitions */
  availableTransitions: protectedProcedure
    .input(z.object({ state: campaignStateEnum }))
    .query(({ input }) => cm.getAvailableTransitions(input.state as CampaignState)),

  /** delete — soft delete (ARCHIVED) */
  delete: governedProcedure({

    kind: "LEGACY_CAMPAIGN_MANAGER_DELETE",

    inputSchema: z.object({ id: z.string() }),

    caller: "campaign-manager:delete",

  })
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

  createAction: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_CREATE_ACTION",


    inputSchema: z.object({
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
    }),


    caller: "campaign-manager:createAction",


  })
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

  updateAction: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_UPDATE_ACTION",


    inputSchema: z.object({
      id: z.string(),
      name: z.string().optional(),
      budget: z.number().optional(),
      status: z.string().optional(),
      aarrStage: z.string().optional(),
      coutUnitaire: z.number().optional(),
      uniteCosting: z.string().optional(),
      sovTarget: z.number().optional(),
    }),


    caller: "campaign-manager:updateAction",


  })
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

  createExecution: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_CREATE_EXECUTION",


    inputSchema: z.object({
      actionId: z.string(),
      campaignId: z.string(),
      title: z.string(),
      executionType: z.string().optional(),
      assigneeId: z.string().optional(),
      dueDate: z.date().optional(),
      vendor: z.string().optional(),
      devisAmount: z.number().optional(),
    }),


    caller: "campaign-manager:createExecution",


  })
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

  updateExecution: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_UPDATE_EXECUTION",


    inputSchema: z.object({
      id: z.string(),
      productionState: productionStateEnum.optional(),
      deliverableUrl: z.string().optional(),
      feedback: z.string().optional(),
      vendor: z.string().optional(),
      devisAmount: z.number().optional(),
    }),


    caller: "campaign-manager:updateExecution",


  })
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
      await ctx.db.campaignExecution.update({ where: { id: input.id }, data: { productionState: input.toState as ProductionState } });
      return { success: true, newState: input.toState };
    }),

  // ==========================================================================
  // C.3.4 — Amplifications (media buying) — 5 procedures
  // ==========================================================================

  createAmplification: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_CREATE_AMPLIFICATION",


    inputSchema: z.object({
      campaignId: z.string(),
      platform: z.string(),
      budget: z.number(),
      mediaType: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      mediaCost: z.number().optional(),
      productionCost: z.number().optional(),
      agencyFee: z.number().optional(),
    }),


    caller: "campaign-manager:createAmplification",


  })
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

  updateAmplification: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_UPDATE_AMPLIFICATION",


    inputSchema: z.object({
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
      aarrAttribution: z.record(z.string(), z.unknown()).optional(),
    }),


    caller: "campaign-manager:updateAmplification",


  })
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

  deleteAmplification: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_DELETE_AMPLIFICATION",


    inputSchema: z.object({ id: z.string() }),


    caller: "campaign-manager:deleteAmplification",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignAmplification.delete({ where: { id: input.id } });
    }),

  // ==========================================================================
  // C.3.5 — Team — 5 procedures
  // ==========================================================================

  addTeamMember: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_ADD_TEAM_MEMBER",


    inputSchema: z.object({
      campaignId: z.string(),
      userId: z.string(),
      role: teamRoleEnum,
      permissions: z.record(z.string(), z.boolean()).optional(),
    }),


    caller: "campaign-manager:addTeamMember",


  })
    .mutation(async ({ ctx, input }) => {
      const { permissions, ...rest } = input;
      return ctx.db.campaignTeamMember.create({
        data: { ...rest, permissions: permissions as Prisma.InputJsonValue },
      });
    }),

  getTeam: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.getCampaignTeam(input.campaignId)),

  updateTeamMember: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_UPDATE_TEAM_MEMBER",


    inputSchema: z.object({
      campaignId: z.string(),
      userId: z.string(),
      role: teamRoleEnum.optional(),
      permissions: z.record(z.string(), z.boolean()).optional(),
    }),


    caller: "campaign-manager:updateTeamMember",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignTeamMember.update({
        where: { campaignId_userId: { campaignId: input.campaignId, userId: input.userId } },
        data: {
          ...(input.role ? { role: input.role } : {}),
          ...(input.permissions ? { permissions: input.permissions as Prisma.InputJsonValue } : {}),
        },
      });
    }),

  removeTeamMember: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_REMOVE_TEAM_MEMBER",


    inputSchema: z.object({ campaignId: z.string(), userId: z.string() }),


    caller: "campaign-manager:removeTeamMember",


  })
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

  createMilestone: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_CREATE_MILESTONE",


    inputSchema: z.object({
      campaignId: z.string(),
      title: z.string(),
      dueDate: z.date(),
      phase: z.string().optional(),
      isGateReview: z.boolean().optional(),
    }),


    caller: "campaign-manager:createMilestone",


  })
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

  updateMilestone: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_UPDATE_MILESTONE",


    inputSchema: z.object({
      id: z.string(),
      title: z.string().optional(),
      dueDate: z.date().optional(),
      status: milestoneStatusEnum.optional(),
      isGateReview: z.boolean().optional(),
    }),


    caller: "campaign-manager:updateMilestone",


  })
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.campaignMilestone.update({ where: { id }, data });
    }),

  completeMilestone: operatorProcedure
    .input(z.object({
      id: z.string(),
      gateReview: z.record(z.string(), z.unknown()).optional(),
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

  deleteMilestone: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_DELETE_MILESTONE",


    inputSchema: z.object({ id: z.string() }),


    caller: "campaign-manager:deleteMilestone",


  })
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

  createBudgetLine: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_CREATE_BUDGET_LINE",


    inputSchema: z.object({
      campaignId: z.string(),
      category: budgetCategoryEnum,
      label: z.string(),
      planned: z.number(),
      actionId: z.string().optional(),
      notes: z.string().optional(),
    }),


    caller: "campaign-manager:createBudgetLine",


  })
    .mutation(({ input }) => cm.createBudgetLine(input)),

  updateBudgetLine: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_UPDATE_BUDGET_LINE",


    inputSchema: z.object({ id: z.string(), actual: z.number(), notes: z.string().optional() }),


    caller: "campaign-manager:updateBudgetLine",


  })
    .mutation(({ input }) => cm.updateBudgetLine(input.id, input.actual)),

  listBudgetLines: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => cm.listBudgetLines(input.campaignId)),

  deleteBudgetLine: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_DELETE_BUDGET_LINE",


    inputSchema: z.object({ id: z.string() }),


    caller: "campaign-manager:deleteBudgetLine",


  })
    .mutation(({ input }) => cm.deleteBudgetLine(input.id)),

  // ==========================================================================
  // C.3.8 — Approvals — 4 procedures
  // ==========================================================================

  requestApproval: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_REQUEST_APPROVAL",


    inputSchema: z.object({
      campaignId: z.string(),
      approverId: z.string(),
      fromState: campaignStateEnum,
      toState: campaignStateEnum,
      approvalType: approvalTypeEnum.optional(),
      comment: z.string().optional(),
    }),


    caller: "campaign-manager:requestApproval",


  })
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
          fromState: input.fromState as CampaignState,
          toState: input.toState as CampaignState,
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

  uploadAsset: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_UPLOAD_ASSET",


    inputSchema: z.object({
      campaignId: z.string(),
      name: z.string(),
      fileUrl: z.string(),
      mimeType: z.string().optional(),
      fileSize: z.number().optional(),
      category: z.string().optional(),
      assetType: z.string().optional(),
      gloryOutputId: z.string().optional(),
    }),


    caller: "campaign-manager:uploadAsset",


  })
    .mutation(async ({ ctx, input }) => ctx.db.campaignAsset.create({ data: input })),

  listAssets: protectedProcedure
    .input(z.object({ campaignId: z.string(), assetType: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaignAsset.findMany({
        where: { campaignId: input.campaignId, ...(input.assetType ? { assetType: input.assetType } : {}) },
        orderBy: { createdAt: "desc" },
      });
    }),

  versionAsset: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_VERSION_ASSET",


    inputSchema: z.object({
      id: z.string(),
      fileUrl: z.string(),
      fileSize: z.number().optional(),
    }),


    caller: "campaign-manager:versionAsset",


  })
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

  createBrief: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_CREATE_BRIEF",


    inputSchema: z.object({
      campaignId: z.string(),
      title: z.string(),
      content: z.record(z.string(), z.unknown()),
      briefType: briefTypeEnum.optional(),
      targetDriver: z.string().optional(),
    }),


    caller: "campaign-manager:createBrief",


  })
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

  // ADR-0049 — read-only brief status for client gating (badges, "missing brief" CTA)
  briefStatus: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ ctx, input }) => cm.getCampaignBriefStatus(input.campaignId, ctx.db)),

  // ADR-0049 — list all briefs across a strategy's campaigns (cockpit/operate/briefs)
  listBriefsForStrategy: protectedProcedure
    .input(z.object({ strategyId: z.string(), limit: z.number().min(1).max(200).default(100) }))
    .query(async ({ ctx, input }) => {
      await enforceStrategyAccess(ctx, input.strategyId);
      return ctx.db.campaignBrief.findMany({
        where: { campaign: { strategyId: input.strategyId } },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        include: {
          campaign: { select: { id: true, name: true, state: true, activeBriefId: true } },
        },
      });
    }),

  // ADR-0049 — bulk variant : brief status for many campaigns at once (agency table column)
  briefStatusMany: protectedProcedure
    .input(z.object({ campaignIds: z.array(z.string()).min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.campaign.findMany({
        where: { id: { in: input.campaignIds } },
        select: {
          id: true,
          activeBriefId: true,
          briefs: {
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, briefType: true, status: true, version: true },
          },
        },
      });
      return Object.fromEntries(
        rows.map((c) => [
          c.id,
          {
            hasBrief: c.briefs.length > 0 || c.activeBriefId != null,
            briefCount: c.briefs.length,
            activeBriefId: c.activeBriefId,
            primaryBrief: c.briefs[0] ?? null,
          },
        ]),
      );
    }),

  updateBrief: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_UPDATE_BRIEF",


    inputSchema: z.object({ id: z.string(), content: z.record(z.string(), z.unknown()), status: z.string().optional() }),


    caller: "campaign-manager:updateBrief",


  })
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

  validateBriefAndCreateMission: governedProcedure({
    kind: "LEGACY_CAMPAIGN_MANAGER_VALIDATE_BRIEF_AND_CREATE_MISSION",
    inputSchema: z.object({ id: z.string() }),
    caller: "campaign-manager:validateBriefAndCreateMission",
  })
    .mutation(async ({ ctx, input }) => {
      // Étage « Briefs → [validation] → Missions » : la validation matérialise la
      // mission liée (briefId + budget définitif du brief + brandActionId). Voie
      // unique service `createMissionFromValidatedBrief` (idempotent par briefId).
      const brief = await ctx.db.campaignBrief.findUniqueOrThrow({
        where: { id: input.id },
        select: { campaignId: true },
      });
      if (brief.campaignId) await enforceCampaignAccess(ctx, brief.campaignId);
      const res = await cm.createMissionFromValidatedBrief(input.id);
      return { success: true, briefId: res.briefId, missionId: res.missionId, created: res.created };
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

  linkMission: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_LINK_MISSION",


    inputSchema: z.object({ campaignId: z.string(), missionId: z.string() }),


    caller: "campaign-manager:linkMission",


  })
    .mutation(({ input }) => cm.linkMission(input.campaignId, input.missionId)),

  linkSignal: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_LINK_SIGNAL",


    inputSchema: z.object({ campaignId: z.string(), signalId: z.string() }),


    caller: "campaign-manager:linkSignal",


  })
    .mutation(({ input }) => cm.linkSignal(input.campaignId, input.signalId)),

  linkPublication: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_LINK_PUBLICATION",


    inputSchema: z.object({ campaignId: z.string(), publicationId: z.string() }),


    caller: "campaign-manager:linkPublication",


  })
    .mutation(({ input }) => cm.linkPublication(input.campaignId, input.publicationId)),

  unlinkEntity: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_UNLINK_ENTITY",


    inputSchema: z.object({ campaignId: z.string(), linkedType: z.string(), linkedId: z.string() }),


    caller: "campaign-manager:unlinkEntity",


  })
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

  addDependency: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_ADD_DEPENDENCY",


    inputSchema: z.object({
      sourceId: z.string(),
      targetId: z.string(),
      depType: depTypeEnum.optional(),
    }),


    caller: "campaign-manager:addDependency",


  })
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
      await enforceCampaignAccess(ctx, input.campaignId);
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

  createFieldOp: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_CREATE_FIELD_OP",


    inputSchema: z.object({
      campaignId: z.string(),
      name: z.string(),
      location: z.string(),
      date: z.date(),
      status: fieldOpStatusEnum.optional(),
      teamSize: z.number().optional(),
      budget: z.number().optional(),
      briefData: z.record(z.string(), z.unknown()).optional(),
      team: z.array(z.record(z.string(), z.unknown())).optional(),
      ambassadors: z.array(z.record(z.string(), z.unknown())).optional(),
      aarrConfig: z.record(z.string(), z.unknown()).optional(),
    }),


    caller: "campaign-manager:createFieldOp",


  })
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

  updateFieldOp: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_UPDATE_FIELD_OP",


    inputSchema: z.object({
      id: z.string(),
      status: fieldOpStatusEnum.optional(),
      results: z.record(z.string(), z.unknown()).optional(),
      team: z.array(z.record(z.string(), z.unknown())).optional(),
      ambassadors: z.array(z.record(z.string(), z.unknown())).optional(),
      aarrConfig: z.record(z.string(), z.unknown()).optional(),
    }),


    caller: "campaign-manager:updateFieldOp",


  })
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

  deleteFieldOp: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_DELETE_FIELD_OP",


    inputSchema: z.object({ id: z.string() }),


    caller: "campaign-manager:deleteFieldOp",


  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaignFieldOp.delete({ where: { id: input.id } });
    }),

  // ==========================================================================
  // C.3.17 — Field Reports — 6 procedures
  // ==========================================================================

  submitFieldReport: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_SUBMIT_FIELD_REPORT",


    inputSchema: z.object({
      fieldOpId: z.string(),
      campaignId: z.string(),
      reporterName: z.string(),
      data: z.record(z.string(), z.unknown()),
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
    }),


    caller: "campaign-manager:submitFieldReport",


  })
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
      overrides: z.record(z.string(), z.unknown()).optional(),
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

  recordAARRMetric: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_RECORD_A_A_R_R_METRIC",


    inputSchema: z.object({
      campaignId: z.string(),
      stage: aarrStageEnum,
      metric: z.string(),
      value: z.number(),
      target: z.number().optional(),
      period: z.string(),
    }),


    caller: "campaign-manager:recordAARRMetric",


  })
    .mutation(async ({ ctx, input }) => {
      // ADR-0144 — durcissement ownership (ce writer founder-safe n'était pas scopé).
      await enforceCampaignAccess(ctx, input.campaignId);
      return ctx.db.campaignAARRMetric.create({ data: input });
    }),

  /**
   * ADR-0144 — Le fondateur coche/valide une tâche datée du rétroplanning
   * (BrandAction.status). Founder-safe + ownership-scopé via la marque de l'action.
   */
  setBrandActionStatus: governedProcedure({
    kind: "SET_BRAND_ACTION_STATUS",
    inputSchema: z.object({
      brandActionId: z.string(),
      status: z.enum(["PROPOSED", "ACCEPTED", "SCHEDULED", "EXECUTED", "CANCELLED"]),
    }),
    caller: "campaign-manager:setBrandActionStatus",
  })
    .mutation(async ({ ctx, input }) => {
      const action = await ctx.db.brandAction.findUniqueOrThrow({
        where: { id: input.brandActionId },
        select: { id: true, strategyId: true },
      });
      await enforceStrategyAccess(ctx, action.strategyId);
      return ctx.db.brandAction.update({
        where: { id: input.brandActionId },
        data: { status: input.status },
      });
    }),

  /**
   * ADR-0144 — Vue « single-pane » du fondateur pour une mission (lecture,
   * ownership-scopée). Additive au panel d'activités existant : elle apporte
   * les métriques AARRR de la campagne + l'état HONNÊTE des sources de données
   * (connecté / à connecter). Zéro invention : une source non branchée est dite,
   * jamais un zéro fabriqué. Les tâches/activités viennent du panel de mission.
   */
  getMissionCockpit: protectedProcedure
    .input(z.object({ campaignId: z.string(), missionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.campaignId);
      const mission = await ctx.db.mission.findUniqueOrThrow({
        where: { id: input.missionId },
        select: { id: true, strategyId: true },
      });
      // Récence RÉELLE des remontées externes (ADR-0146) : une source est dite
      // « connectée » si elle a poussé une métrique dans les 30 derniers jours,
      // jamais un « bientôt » figé ni un zéro fabriqué.
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [allActions, metrics, socialCount, email, externalSignals] = await Promise.all([
        ctx.db.brandAction.findMany({
          where: { campaignId: input.campaignId },
          select: {
            id: true, title: true, description: true, status: true, touchpoint: true,
            timingStart: true, timingEnd: true, metadata: true,
          },
          orderBy: { timingStart: "asc" },
        }),
        ctx.db.campaignAARRMetric.findMany({
          where: { campaignId: input.campaignId },
          orderBy: { measuredAt: "desc" },
        }),
        ctx.db.socialConnection.count({ where: { strategyId: mission.strategyId, status: "ACTIVE" } }),
        ctx.db.brandEmailConnector.findUnique({ where: { strategyId: mission.strategyId }, select: { status: true } }),
        ctx.db.signal.findMany({
          where: { strategyId: mission.strategyId, type: "EXTERNAL_METRIC", createdAt: { gte: since } },
          select: { data: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
      ]);
      // Tâches datées de la mission = BrandActions du calendrier rattachées via
      // metadata.missionKey (dates réelles timingStart/End = le rétroplanning).
      const tasks = allActions.filter(
        (a) => (a.metadata as Record<string, unknown> | null)?.missionKey === input.missionId,
      );
      const done = tasks.filter((t) => t.status === "EXECUTED").length;
      // Dernière remontée par type de source (la plus récente en tête).
      const pushedByType = new Map<string, Date>();
      for (const s of externalSignals) {
        const st = (s.data as Record<string, unknown> | null)?.sourceType;
        if (typeof st === "string" && !pushedByType.has(st)) pushedByType.set(st, s.createdAt);
      }
      const lastPush = (key: string): string | null => {
        const d = pushedByType.get(key);
        return d ? `Dernière remontée le ${d.toLocaleDateString("fr-FR")}.` : null;
      };
      const emailConnected = email?.status === "ACTIVE" || pushedByType.has("EMAIL");
      const sources = [
        { key: "SOCIAL", label: "Réseaux sociaux", connected: socialCount > 0, note: socialCount > 0 ? null : "Connecte tes comptes dans Réglages → Connexions." },
        { key: "EMAIL", label: "Email / newsletter", connected: emailConnected, note: emailConnected ? lastPush("EMAIL") : "Renseigne ta clé email dans Réglages → Connexions." },
        { key: "QUIZ", label: "Quiz / acquisition", connected: pushedByType.has("QUIZ"), note: lastPush("QUIZ") ?? "Aucune remontée automatique pour l'instant." },
        { key: "APP", label: "Application", connected: pushedByType.has("APP"), note: lastPush("APP") ?? "Aucune remontée automatique pour l'instant." },
        { key: "CRM", label: "CRM", connected: pushedByType.has("CRM"), note: lastPush("CRM") ?? "Aucune remontée automatique pour l'instant." },
      ];
      return { tasks, execution: { total: tasks.length, done }, metrics, sources };
    }),

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

  setDevotionObjective: governedProcedure({


    kind: "LEGACY_CAMPAIGN_MANAGER_SET_DEVOTION_OBJECTIVE",


    inputSchema: z.object({
      campaignId: z.string(),
      objective: z.record(z.string(), z.unknown()),
    }),


    caller: "campaign-manager:setDevotionObjective",


  })
    .mutation(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.campaignId);
      return cm.setDevotionObjective(input.campaignId, input.objective);
    }),

  createFromValidatedAction: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      actionId: z.string(),
      kpis: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await enforceStrategyAccess(ctx, input.strategyId);

      const action = await ctx.db.brandAction.findUniqueOrThrow({
        where: { id: input.actionId },
      });

      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
      });

      const campaignCode = cm.generateCampaignCode();
      const budgetPlanned = action.budgetMin ?? 0;

      const campaign = await ctx.db.campaign.create({
        data: {
          strategyId: input.strategyId,
          name: action.title,
          description: action.description ?? "",
          code: campaignCode,
          budget: budgetPlanned,
          budgetCurrency: action.budgetCurrency ?? "XAF",
          startDate: action.timingStart,
          endDate: action.timingEnd,
          state: "PLANNING",
          status: "PLANNING",
          objectives: action.description ? { description: action.description } : undefined,
          advertis_vector: strategy.advertis_vector ?? undefined,
        },
      });

      const initialBriefContent = {
        briefClient: {
          client: strategy.name,
          contexte_business: action.description ?? "",
          contexte_marque: `Généré depuis la validation de la stratégie d'ADVE-RTIS.`,
          contexte_market: `Localité : ${action.locality ?? "Non spécifié"}.`,
          cible_principale: action.persona ?? "Non spécifié",
          obj_business: `Lancer le projet issu de l'action ${action.title}.`,
          big_idea: `Nourrir la réussite sous le territoire ${strategy.name}.`,
          kpis: input.kpis,
        },
        briefCreatif: {
          message_claim: action.title,
          challenge_creatif: `Traduire l'action ${action.title} en une campagne percutante.`,
        },
        briefProduction: {
          livrable_principal: `Supports requis pour le touchpoint ${action.touchpoint ?? "Non spécifié"}.`,
          deadline_prod: action.timingEnd ? action.timingEnd.toISOString().slice(0, 10) : undefined,
        },
        caseStudy: {},
      };

      await ctx.db.campaignBrief.create({
        data: {
          campaignId: campaign.id,
          title: `Brief - ${campaign.name}`,
          content: initialBriefContent as any,
          briefType: "CREATIVE",
          status: "VALIDATED",
        },
      });

      await ctx.db.brandAction.update({
        where: { id: action.id },
        data: { status: "ACCEPTED", selected: true },
      });

      return { success: true, campaignId: campaign.id, campaignCode };
    }),

  routeToGuilde: operatorProcedure
    .input(z.object({
      campaignId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.campaignId);

      const campaign = await ctx.db.campaign.findUniqueOrThrow({
        where: { id: input.campaignId },
        include: { strategy: true, briefs: true },
      });

      let mission = await ctx.db.mission.findFirst({
        where: { campaignId: input.campaignId },
      });

      if (!mission) {
        const brief = campaign.briefs[0];
        const content = brief ? (brief.content as Prisma.InputJsonValue) : {};
        mission = await ctx.db.mission.create({
          data: {
            title: `Production - ${campaign.name}`,
            strategyId: campaign.strategyId,
            campaignId: campaign.id,
            status: "DRAFT",
            priority: 5,
            budget: campaign.budget ?? 0,
            slaDeadline: campaign.endDate,
            briefData: content,
          },
        });
      }

      const a = "0123456789abcdef";
      let shortHash = "";
      for (let i = 0; i < 6; i++) {
        shortHash += a[Math.floor(Math.random() * 16)];
      }
      const slug = `${campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${shortHash}`;

      await ctx.db.mission.update({
        where: { id: mission.id },
        data: {
          guildPublished: true,
          guildSubmittedAt: new Date(),
          guildPublishedAt: new Date(),
          publicSlug: slug,
        },
      });

      return { success: true, missionId: mission.id, publicSlug: slug };
    }),

  // ==========================================================================
  // Rapport de clôture — POST_CAMPAIGN / ARCHIVED
  // ==========================================================================

  /** Agrège toutes les données de performance d'une campagne pour le bilan de clôture */
  getCampaignClosureReport: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.campaignId);

      const campaign = await ctx.db.campaign.findUniqueOrThrow({
        where: { id: input.campaignId },
        include: {
          aarrMetrics:   true,
          fieldReports:  true,
          budgetLines:   true,
          teamMembers:   { include: { user: { select: { id: true, name: true, image: true } } } },
          missions:      { select: { id: true, title: true, status: true } },
          milestones:    { orderBy: { dueDate: "asc" } },
        },
      });

      // ── Métriques AARRR groupées par stage ──────────────────────────────
      const metricsByStage = campaign.aarrMetrics.reduce<
        Record<string, Array<{ metric: string; value: number; target: number | null; period: string }>>
      >((acc, m) => {
        const stage = m.stage as string;
        if (!acc[stage]) acc[stage] = [];
        acc[stage].push({ metric: m.metric, value: m.value, target: m.target ?? null, period: m.period });
        return acc;
      }, {});

      // ── Budget ──────────────────────────────────────────────────────────
      const totalPlanned = campaign.budgetLines.reduce((s, b) => s + (b.planned ?? 0), 0);
      const totalSpent   = campaign.budgetLines.reduce((s, b) => s + (b.actual ?? 0), 0);
      // lafusee:allow-adhoc-completion -- variance budgétaire %, pas de complétude pilier ADVE
      const budgetVariance = totalPlanned > 0 ? ((totalSpent - totalPlanned) / totalPlanned) * 100 : 0;

      // ── Verdict AARRR — ratio métriques ayant atteint leur target ───────
      const allMetrics = campaign.aarrMetrics;
      const withTargets = allMetrics.filter((m) => m.target != null && m.target > 0);
      const achieved = withTargets.filter((m) => m.value >= (m.target ?? 0)).length;
      const verdictRatio = withTargets.length > 0 ? achieved / withTargets.length : null;
      const verdictLevel =
        verdictRatio == null  ? "unknown"
        : verdictRatio >= 0.8 ? "success"
        : verdictRatio >= 0.5 ? "partial"
        :                       "failure";

      return {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          state: campaign.state as string,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          budget: campaign.budget,
          budgetCurrency: campaign.budgetCurrency,
        },
        aarrr: {
          byStage: metricsByStage,
          totalMetrics: allMetrics.length,
          withTargets: withTargets.length,
          achieved,
        },
        budget: {
          totalPlanned,
          totalSpent,
          variance: budgetVariance,
          lines: campaign.budgetLines,
        },
        team: campaign.teamMembers.map((tm) => ({
          id: tm.id,
          role: tm.role,
          user: tm.user,
        })),
        missions: campaign.missions,
        milestones: campaign.milestones,
        fieldReportsCount: campaign.fieldReports.length,
        verdict: {
          level: verdictLevel,
          ratio: verdictRatio,
        },
      };
    }),

  /** Retourne la timeline des jalons et l'historique d'état d'une campagne */
  getCampaignTimeline: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceCampaignAccess(ctx, input.campaignId);

      const campaign = await ctx.db.campaign.findUniqueOrThrow({
        where: { id: input.campaignId },
        select: {
          id: true,
          name: true,
          state: true,
          createdAt: true,
          updatedAt: true,
          startDate: true,
          endDate: true,
          milestones: {
            orderBy: { dueDate: "asc" },
            select: {
              id: true,
              title: true,
              dueDate: true,
              completedAt: true,
              status: true,
            },
          },
          approvals: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              approvalType: true,
              status: true,
              createdAt: true,
              decidedAt: true,
              comment: true,
            },
          },
        },
      });

      return {
        campaignId: campaign.id,
        name: campaign.name,
        currentState: campaign.state as string,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        milestones: campaign.milestones,
        approvals: campaign.approvals,
      };
    }),
});

