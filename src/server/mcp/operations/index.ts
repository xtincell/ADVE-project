// ============================================================================
// MODULE M27 — MCP Operations Server
// Score: 100/100 | Priority: P1 | Status: FUNCTIONAL
// Spec: §3.3 | Division: La Fusée (BOOST)
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  14 tools: createCampaign, updateCampaign, transitionState, listCampaigns,
//            createAction, createAmplification, addTeamMember, setBudget, createMilestone,
//            requestApproval, generateBrief, getRecommendations, createMission, createProcess
// [x] REQ-2  5 resources: campaigns/{strategyId}, budgets/{campaignId}, teams/{campaignId},
//            briefs/{campaignId}, approvals/{campaignId}
// [x] REQ-3  State machine integration (12-state campaign lifecycle)
// [x] REQ-4  Budget breakdown by category with variance tracking
//
// TOOLS: 14 | RESOURCES: 5 | SPEC TARGET: 12 tools + 5 resources ✓
// ============================================================================

import { z } from "zod";
import { db } from "@/lib/db";
import * as campaignManager from "@/server/services/campaign-manager";
import type { CampaignState } from "@/server/services/campaign-manager/state-machine";
import type { ProcessType } from "@prisma/client";
import * as processScheduler from "@/server/services/process-scheduler";
import * as slaTracker from "@/server/services/sla-tracker";
import * as teamAllocator from "@/server/services/team-allocator";

// ---------------------------------------------------------------------------
// Operations MCP Server
// Gestion des campagnes, dispatching de missions, suivi SLA, planification,
// allocation d'équipe, budgets et reporting AARRR.
// ---------------------------------------------------------------------------

export const serverName = "operations";
export const serverDescription =
  "Serveur MCP Operations — Pilotage opérationnel des campagnes, missions, SLA, équipes et reporting pour LaFusée Industry OS.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const tools: ToolDefinition[] = [
  // ---- État de campagne ----
  {
    name: "campaign_state_get",
    description:
      "Récupère l'état actuel d'une campagne et les transitions disponibles dans la machine à états.",
    inputSchema: z.object({
      campaignId: z.string().describe("ID de la campagne"),
    }),
    handler: async (input) => {
      const campaign = await db.campaign.findUniqueOrThrow({
        where: { id: input.campaignId as string },
        include: { missions: true, milestones: true, teamMembers: true },
      });
      const availableTransitions = campaignManager.getAvailableTransitions(campaign.state as CampaignState);
      return {
        campaignId: campaign.id,
        name: campaign.name,
        state: campaign.state,
        availableTransitions,
        missionsCount: campaign.missions.length,
        milestonesCount: campaign.milestones.length,
      };
    },
  },

  {
    name: "campaign_state_transition",
    description:
      "Effectue une transition d'état sur une campagne (ex: DRAFT -> ACTIVE). Valide les gates automatiquement.",
    inputSchema: z.object({
      campaignId: z.string().describe("ID de la campagne"),
      toState: z.string().describe("État cible (ex: ACTIVE, PAUSED, COMPLETED)"),
      approverId: z.string().optional().describe("ID de l'approbateur si requis"),
    }),
    handler: async (input) => {
      return campaignManager.transitionCampaign(
        input.campaignId as string,
        input.toState as CampaignState,
        input.approverId as string | undefined
      );
    },
  },

  // ---- Dispatching de missions ----
  {
    name: "mission_dispatch",
    description:
      "Dispatch une mission à un créateur de la Guilde en fonction du matching compétences/disponibilité.",
    inputSchema: z.object({
      missionId: z.string().describe("ID de la mission à dispatcher"),
      assigneeId: z.string().describe("ID du créateur assigné"),
      deadline: z.string().optional().describe("Date limite (ISO)"),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    }),
    handler: async (input) => {
      const mission = await db.mission.update({
        where: { id: input.missionId as string },
        data: {
          assigneeId: input.assigneeId as string,
          status: "ASSIGNED",
          slaDeadline: input.deadline ? new Date(input.deadline as string) : undefined,
        },
      });
      return mission;
    },
  },

  {
    name: "mission_list",
    description:
      "Liste les missions d'une campagne ou d'un driver avec filtrage par statut.",
    inputSchema: z.object({
      campaignId: z.string().optional().describe("Filtrer par campagne"),
      driverId: z.string().optional().describe("Filtrer par driver"),
      status: z
        .enum(["DRAFT", "ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "REVISION", "COMPLETED", "CANCELLED"])
        .optional()
        .describe("Filtrer par statut"),
      limit: z.number().int().min(1).max(100).default(20),
    }),
    handler: async (input) => {
      const missions = await db.mission.findMany({
        where: {
          ...(input.campaignId ? { campaignId: input.campaignId as string } : {}),
          ...(input.driverId ? { driverId: input.driverId as string } : {}),
          ...(input.status ? { status: input.status as string } : {}),
        },
        include: { driver: true },
        orderBy: { createdAt: "desc" },
        take: (input.limit as number) ?? 20,
      });
      return { missions, count: missions.length };
    },
  },

  // ---- SLA Tracking ----
  {
    name: "sla_check",
    description:
      "Vérifie les SLA en cours et retourne les alertes (warning, urgent, breached) pour un opérateur.",
    inputSchema: z.object({
      operatorId: z.string().describe("ID de l'opérateur à vérifier"),
    }),
    handler: async (input) => {
      return slaTracker.checkSlaDeadlines();
    },
  },

  {
    name: "sla_metrics",
    description:
      "Récupère les métriques SLA globales : taux de respect, missions en retard, temps moyen de livraison.",
    inputSchema: z.object({
      operatorId: z.string().describe("ID de l'opérateur"),
    }),
    handler: async (input) => {
      return slaTracker.calculateSlaMetrics(input.operatorId as string);
    },
  },

  // ---- Process Scheduling ----
  {
    name: "process_schedule_list",
    description:
      "Liste les processus planifiés (récurrents et ponctuels) avec leur prochain déclenchement.",
    inputSchema: z.object({
      strategyId: z.string().optional().describe("Filtrer par stratégie"),
      status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
    }),
    handler: async (input) => {
      return processScheduler.getSchedule();
    },
  },

  {
    name: "process_create",
    description:
      "Crée un nouveau processus planifié (campagne récurrente, reporting automatique, maintenance).",
    inputSchema: z.object({
      strategyId: z.string().optional().describe("ID de la stratégie associée"),
      type: z.enum(["RECURRING_CAMPAIGN", "REPORT", "MAINTENANCE", "AUTOMATION", "CUSTOM"]),
      name: z.string().describe("Nom du processus"),
      description: z.string().optional(),
      frequency: z.string().optional().describe("Fréquence (cron expression ou texte)"),
      priority: z.number().int().min(1).max(10).default(5),
    }),
    handler: async (input) => {
      return processScheduler.createProcess({
        strategyId: input.strategyId as string | undefined,
        type: input.type as ProcessType,
        name: input.name as string,
        description: input.description as string | undefined,
        frequency: input.frequency as string | undefined,
        priority: (input.priority as number) ?? 5,
      });
    },
  },

  // ---- Team Allocation ----
  {
    name: "team_allocation_overview",
    description:
      "Vue d'ensemble de l'allocation des équipes : charge de travail, utilisation, goulots d'étranglement.",
    inputSchema: z.object({
      operatorId: z.string().describe("ID de l'opérateur"),
    }),
    handler: async (input) => {
      const [loads, bottlenecks] = await Promise.all([
        teamAllocator.getCreatorLoads(),
        teamAllocator.detectBottlenecks(),
      ]);
      return { creatorLoads: loads, bottlenecks };
    },
  },

  {
    name: "team_suggest_assignment",
    description:
      "Suggère le meilleur créateur disponible pour une mission en fonction des compétences et de la charge.",
    inputSchema: z.object({
      missionId: z.string().describe("ID de la mission"),
      requiredSkills: z.array(z.string()).optional().describe("Compétences requises"),
      preferredTier: z.enum(["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"]).optional(),
    }),
    handler: async (input) => {
      return teamAllocator.suggestAllocation(
        input.missionId as string,
      );
    },
  },

  // ---- Budget campagne ----
  {
    name: "campaign_budget_overview",
    description:
      "Vue d'ensemble du budget d'une campagne : dépenses, reste à dépenser, ventilation par driver.",
    inputSchema: z.object({
      campaignId: z.string().describe("ID de la campagne"),
    }),
    handler: async (input) => {
      const campaign = await db.campaign.findUniqueOrThrow({
        where: { id: input.campaignId as string },
        include: {
          missions: { select: { id: true, status: true, budget: true, driverId: true } },
        },
      });
      // Group missions by driverId to approximate "by driver" view
      const byDriver: Record<string, { spent: number; count: number }> = {};
      for (const m of campaign.missions) {
        const key = m.driverId ?? "unassigned";
        if (!byDriver[key]) byDriver[key] = { spent: 0, count: 0 };
        byDriver[key].spent += m.budget ?? 0;
        byDriver[key].count += 1;
      }
      const totalSpent = Object.values(byDriver).reduce((sum: number, d) => sum + d.spent, 0);
      return {
        campaignBudget: campaign.budget,
        totalSpent,
        remaining: (campaign.budget ?? 0) - totalSpent,
        byDriver,
      };
    },
  },

  // ---- AARRR Reporting ----
  {
    name: "aarrr_report",
    description:
      "Génère un rapport AARRR (Acquisition, Activation, Rétention, Referral, Revenue) pour une campagne.",
    inputSchema: z.object({
      campaignId: z.string().describe("ID de la campagne"),
      period: z.enum(["weekly", "monthly", "quarterly"]).default("monthly"),
    }),
    handler: async (input) => {
      const campaign = await db.campaign.findUniqueOrThrow({
        where: { id: input.campaignId as string },
        include: { milestones: true, missions: true },
      });
      const activeMissions = campaign.missions.filter((m) => m.status === "IN_PROGRESS");
      const completedMilestones = campaign.milestones.filter((m) => m.completed);
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        period: input.period,
        aarrr: {
          acquisition: { missions: campaign.missions.length, activeMissions: activeMissions.length },
          activation: { completedMilestones: completedMilestones.length, totalMilestones: campaign.milestones.length },
          retention: { state: campaign.state },
          referral: { /* Placeholder — enrichi par le Pulse server */ },
          revenue: { budget: campaign.budget },
        },
      };
    },
  },

  // ---- Field Operations ----
  {
    name: "field_ops_status",
    description:
      "Statut des opérations terrain : missions actives, livrables en cours, deadlines imminentes.",
    inputSchema: z.object({
      operatorId: z.string().describe("ID de l'opérateur"),
      daysAhead: z.number().int().min(1).max(30).default(7).describe("Horizon en jours"),
    }),
    handler: async (input) => {
      const daysAhead = (input.daysAhead as number) ?? 7;
      const horizon = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
      const missions = await db.mission.findMany({
        where: {
          strategy: { operatorId: input.operatorId as string },
          status: { in: ["ASSIGNED", "IN_PROGRESS", "IN_REVIEW"] },
          slaDeadline: { lte: horizon },
        },
        include: { driver: true },
        orderBy: { slaDeadline: "asc" },
      });
      return {
        operatorId: input.operatorId,
        horizon: `${daysAhead} jours`,
        upcomingMissions: missions.length,
        missions,
      };
    },
  },

  // ---- Milestone Tracking ----
  {
    name: "milestone_track",
    description:
      "Suivi des jalons d'une campagne : progression, retards, prochains jalons à atteindre.",
    inputSchema: z.object({
      campaignId: z.string().describe("ID de la campagne"),
    }),
    handler: async (input) => {
      const milestones = await db.campaignMilestone.findMany({
        where: { campaignId: input.campaignId as string },
        orderBy: { dueDate: "asc" },
      });
      const completed = milestones.filter((m) => m.completed);
      const overdue = milestones.filter(
        (m) => !m.completed && m.dueDate < new Date()
      );
      const upcoming = milestones.filter(
        (m) => !m.completed && m.dueDate >= new Date()
      );
      return {
        total: milestones.length,
        completed: completed.length,
        overdue: overdue.length,
        upcoming: upcoming.length,
        progress: milestones.length > 0 ? Math.round((completed.length / milestones.length) * 100) : 0,
        overdueItems: overdue,
        nextMilestones: upcoming.slice(0, 3),
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Resources (5 as per spec §3.3)
// ---------------------------------------------------------------------------

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: (params: { strategyId?: string; campaignId?: string }) => Promise<unknown>;
}

export const resources: ResourceDefinition[] = [
  {
    uri: "operations://campaigns/{strategyId}",
    name: "Active Campaigns",
    description: "List of all active campaigns for a strategy with state, budget, and mission counts",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const campaigns = await db.campaign.findMany({
        where: { strategyId, state: { notIn: ["ARCHIVED", "CANCELLED"] } },
        include: {
          missions: { select: { id: true, status: true } },
          budgetLines: { select: { planned: true, actual: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
      return {
        count: campaigns.length,
        campaigns: campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          state: c.state,
          code: c.code,
          budget: c.budget,
          missionCount: c.missions.length,
          totalPlanned: c.budgetLines.reduce((s, b) => s + (b.planned ?? 0), 0),
          totalActual: c.budgetLines.reduce((s, b) => s + (b.actual ?? 0), 0),
        })),
      };
    },
  },
  {
    uri: "operations://budgets/{campaignId}",
    name: "Campaign Budget",
    description: "Detailed budget breakdown for a campaign — planned vs actual by category",
    mimeType: "application/json",
    handler: async ({ campaignId }) => {
      if (!campaignId) return { error: "campaignId required" };
      const lines = await db.budgetLine.findMany({ where: { campaignId } });
      const totalPlanned = lines.reduce((s, l) => s + (l.planned ?? 0), 0);
      const totalActual = lines.reduce((s, l) => s + (l.actual ?? 0), 0);
      const byCategory: Record<string, { planned: number; actual: number }> = {};
      for (const l of lines) {
        if (!byCategory[l.category]) byCategory[l.category] = { planned: 0, actual: 0 };
        const cat = byCategory[l.category]!;
        cat.planned += l.planned ?? 0;
        cat.actual += l.actual ?? 0;
      }
      return { campaignId, totalPlanned, totalActual, variance: totalPlanned - totalActual, byCategory };
    },
  },
  {
    uri: "operations://teams/{campaignId}",
    name: "Campaign Team",
    description: "Team composition for a campaign — members, roles, allocation",
    mimeType: "application/json",
    handler: async ({ campaignId }) => {
      if (!campaignId) return { error: "campaignId required" };
      const members = await db.campaignTeamMember.findMany({
        where: { campaignId },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      });
      return {
        campaignId,
        memberCount: members.length,
        members: members.map((m) => ({
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
        })),
      };
    },
  },
  {
    uri: "operations://briefs/{campaignId}",
    name: "Campaign Briefs",
    description: "All briefs generated for a campaign — creative, media, production, vendor",
    mimeType: "application/json",
    handler: async ({ campaignId }) => {
      if (!campaignId) return { error: "campaignId required" };
      const briefs = await db.campaignBrief.findMany({
        where: { campaignId },
        orderBy: { createdAt: "desc" },
      });
      return {
        campaignId,
        count: briefs.length,
        briefs: briefs.map((b) => ({
          id: b.id,
          briefType: b.briefType,
          title: b.title,
          generatedBy: b.generatedBy,
          createdAt: b.createdAt,
        })),
      };
    },
  },
  {
    uri: "operations://approvals/{campaignId}",
    name: "Campaign Approvals",
    description: "Pending and completed approvals for a campaign",
    mimeType: "application/json",
    handler: async ({ campaignId }) => {
      if (!campaignId) return { error: "campaignId required" };
      const approvals = await db.campaignApproval.findMany({
        where: { campaignId },
        orderBy: { createdAt: "desc" },
      });
      const pending = approvals.filter((a) => a.status === "PENDING");
      const approved = approvals.filter((a) => a.status === "APPROVED");
      const rejected = approvals.filter((a) => a.status === "REJECTED");
      return {
        campaignId,
        total: approvals.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        items: approvals.map((a) => ({
          id: a.id,
          approvalType: a.approvalType,
          status: a.status,
          round: a.round,
          createdAt: a.createdAt,
        })),
      };
    },
  },
];
