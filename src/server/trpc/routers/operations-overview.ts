/**
 * Operations Overview Router — traque opérationnelle unifiée (Vague 7).
 *
 * « Traque opérationnelle : missions en cours, devis, budgets. » Lecture
 * composée 100 % déterministe sur les modèles existants : Mission,
 * CampaignExecution (productionState=DEVIS…), BudgetLine, Commission.
 */

import { z } from "zod";
import { createTRPCRouter, operatorProcedure } from "../init";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const operationsOverviewRouter = createTRPCRouter({
  overview: operatorProcedure
    .input(z.object({ strategyId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const [missionsByStatus, openApplications, devisExecutions, budgetAgg, pendingCommissions] =
        await Promise.all([
          db.mission.groupBy({
            where: input?.strategyId ? { strategyId: input.strategyId } : undefined,
            by: ["status"],
            _count: true,
          }),
          db.missionApplication.count({
            where: {
              status: "PENDING",
              ...(input?.strategyId ? { mission: { strategyId: input.strategyId } } : {}),
            },
          }),
          db.campaignExecution.findMany({
            where: {
              productionState: "DEVIS",
              ...(input?.strategyId ? { campaign: { strategyId: input.strategyId } } : {}),
            },
            select: {
              id: true,
              devisAmount: true,
              vendor: true,
              dueDate: true,
              campaign: { select: { id: true, name: true } },
              action: { select: { name: true, category: true } },
            },
            orderBy: { dueDate: "asc" },
            take: 50,
          }),
          db.budgetLine.groupBy({
            where: input?.strategyId ? { campaign: { strategyId: input.strategyId } } : undefined,
            by: ["category"],
            _sum: { planned: true, actual: true },
          }),
          db.commission.aggregate({
            where: {
              status: "PENDING",
              ...(input?.strategyId ? { mission: { strategyId: input.strategyId } } : {}),
            },
            _count: true,
            _sum: { netAmount: true },
          }),
        ]);

      return {
        missions: Object.fromEntries(missionsByStatus.map((m) => [m.status, m._count])),
        openApplications,
        devis: devisExecutions.map((e) => ({
          id: e.id,
          campaign: e.campaign?.name ?? null,
          action: e.action?.name ?? null,
          category: e.action?.category ?? null,
          amount: e.devisAmount,
          vendor: e.vendor,
          dueDate: e.dueDate,
        })),
        budgets: budgetAgg.map((b) => ({
          category: b.category,
          planned: b._sum.planned ?? 0,
          actual: b._sum.actual ?? 0,
        })),
        commissions: {
          pendingCount: pendingCommissions._count,
          pendingNetTotal: pendingCommissions._sum.netAmount ?? 0,
        },
      };
    }),

  /** Missions en cours détaillées (table console). */
  activeMissions: operatorProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(({ input }) =>
      db.mission.findMany({
        where: { status: { in: ["DRAFT", "IN_PROGRESS", "REVIEW"] } },
        select: {
          id: true,
          title: true,
          status: true,
          budget: true,
          slaDeadline: true,
          assigneeId: true,
          strategy: { select: { name: true } },
          _count: { select: { applications: true, deliverables: true } },
        },
        orderBy: [{ status: "asc" }, { slaDeadline: "asc" }],
        take: input?.limit ?? 50,
      }),
    ),

  /** Unified actions of the day ordonnées par priorité et SLA. */
  todayActions: operatorProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [operatorActions, missions] = await Promise.all([
        db.operatorAction.findMany({
          where: {
            campaign: { strategyId: input.strategyId },
            done: false,
          },
          include: {
            campaign: { select: { id: true, name: true, state: true } },
            assignee: { select: { id: true, name: true, image: true } },
          },
          orderBy: { dueDate: "asc" },
        }),
        db.mission.findMany({
          where: {
            strategyId: input.strategyId,
            status: { in: ["DRAFT", "IN_PROGRESS", "REVIEW"] },
          },
          include: {
            campaign: { select: { id: true, name: true } },
          },
          orderBy: { slaDeadline: "asc" },
        }),
      ]);

      const assigneeIds = missions.map((m) => m.assigneeId).filter(Boolean) as string[];
      const assignees = assigneeIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: assigneeIds } },
            select: { id: true, name: true, image: true },
          })
        : [];
      const assigneeMap = new Map(assignees.map((u) => [u.id, u]));

      const unifiedActions = [
        ...operatorActions.map((oa) => ({
          id: oa.id,
          type: "OPERATOR_ACTION" as const,
          title: oa.label,
          priority: oa.priority,
          category: oa.category,
          campaign: oa.campaign ? { id: oa.campaign.id, name: oa.campaign.name } : null,
          assignee: oa.assignee ? { id: oa.assignee.id, name: oa.assignee.name, image: oa.assignee.image } : null,
          dueDate: oa.dueDate,
          status: oa.done ? "DONE" : "PENDING",
          budget: 0,
        })),
        ...missions.map((m) => ({
          id: m.id,
          type: "MISSION" as const,
          title: m.title,
          priority: m.priority === 1 ? "CRITIQUE" as const : m.priority <= 3 ? "HAUTE" as const : m.priority <= 7 ? "MOYENNE" as const : "BASSE" as const,
          category: m.mode ?? "DISPATCH",
          campaign: m.campaign ? { id: m.campaign.id, name: m.campaign.name } : null,
          assignee: m.assigneeId ? assigneeMap.get(m.assigneeId) ?? null : null,
          dueDate: m.slaDeadline,
          status: m.status,
          budget: m.budget ?? 0,
        })),
      ];

      const priorityWeight = { CRITIQUE: 4, HAUTE: 3, MOYENNE: 2, BASSE: 1 };
      return unifiedActions.sort((a, b) => {
        const pwA = priorityWeight[a.priority as keyof typeof priorityWeight] ?? 2;
        const pwB = priorityWeight[b.priority as keyof typeof priorityWeight] ?? 2;
        if (pwB !== pwA) return pwB - pwA;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
    }),

  /** Team workload summary par membre. */
  teamWorkload: operatorProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const teamMembers = await db.campaignTeamMember.findMany({
        where: { campaign: { strategyId: input.strategyId } },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          campaign: { select: { id: true, name: true } },
        },
      });

      const missions = await db.mission.findMany({
        where: {
          strategyId: input.strategyId,
          status: { in: ["DRAFT", "IN_PROGRESS", "REVIEW"] },
        },
        select: { id: true, title: true, status: true, assigneeId: true, budget: true },
      });

      const userWorkloadMap = new Map<
        string,
        {
          user: { id: string; name: string | null; email: string; image: string | null };
          campaignCount: number;
          activeMissionsCount: number;
          totalBudget: number;
          campaigns: { id: string; name: string }[];
        }
      >();

      for (const tm of teamMembers) {
        if (!userWorkloadMap.has(tm.userId)) {
          userWorkloadMap.set(tm.userId, {
            user: tm.user,
            campaignCount: 0,
            activeMissionsCount: 0,
            totalBudget: 0,
            campaigns: [],
          });
        }
        const entry = userWorkloadMap.get(tm.userId)!;
        entry.campaignCount++;
        if (!entry.campaigns.some((c) => c.id === tm.campaign.id)) {
          entry.campaigns.push({ id: tm.campaign.id, name: tm.campaign.name });
        }
      }

      const missingUserIds = new Set<string>();
      for (const m of missions) {
        if (m.assigneeId && !userWorkloadMap.has(m.assigneeId)) {
          missingUserIds.add(m.assigneeId);
        }
      }

      if (missingUserIds.size > 0) {
        const missingUsers = await db.user.findMany({
          where: { id: { in: Array.from(missingUserIds) } },
          select: { id: true, name: true, email: true, image: true },
        });
        for (const u of missingUsers) {
          userWorkloadMap.set(u.id, {
            user: u,
            campaignCount: 0,
            activeMissionsCount: 0,
            totalBudget: 0,
            campaigns: [],
          });
        }
      }

      for (const m of missions) {
        if (m.assigneeId) {
          const entry = userWorkloadMap.get(m.assigneeId);
          if (entry) {
            entry.activeMissionsCount++;
            entry.totalBudget += m.budget ?? 0;
          }
        }
      }

      return Array.from(userWorkloadMap.values()).map((item) => {
        const score = item.activeMissionsCount * 1.5 + item.campaignCount * 2;
        let workloadLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
        if (score > 10) workloadLevel = "HIGH";
        else if (score > 4) workloadLevel = "MEDIUM";

        return {
          ...item,
          workloadLevel,
        };
      });
    }),

  /** Consolidation budgétaire par campagne (prévu vs réel vs restant). */
  budgetConsolidation: operatorProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaigns = await db.campaign.findMany({
        where: { strategyId: input.strategyId, state: { not: "ARCHIVED" } },
        select: {
          id: true,
          name: true,
          budget: true,
          budgetLines: { select: { planned: true, actual: true, category: true } },
          executions: { select: { devisAmount: true, productionState: true } },
          missions: {
            select: {
              id: true,
              budget: true,
              commissions: { select: { netAmount: true, status: true } },
            },
          },
        },
      });

      return campaigns.map((c) => {
        const budgetPlanned = c.budget ?? 0;

        let budgetLinePlannedTotal = 0;
        let budgetLineActualTotal = 0;
        for (const line of c.budgetLines) {
          budgetLinePlannedTotal += line.planned;
          budgetLineActualTotal += line.actual;
        }

        let devisTotal = 0;
        for (const exec of c.executions) {
          if (exec.productionState !== "ANNULE") {
            devisTotal += exec.devisAmount ?? 0;
          }
        }

        let commissionsTotal = 0;
        let missionBudgetsTotal = 0;
        for (const m of c.missions) {
          missionBudgetsTotal += m.budget ?? 0;
          for (const comm of m.commissions) {
            commissionsTotal += comm.netAmount;
          }
        }

        const realSpent = Math.max(budgetLineActualTotal, devisTotal + commissionsTotal);
        const remaining = budgetPlanned - realSpent;

        return {
          id: c.id,
          name: c.name,
          planned: budgetPlanned,
          spent: realSpent,
          remaining,
          variance: budgetPlanned > 0 ? ((realSpent - budgetPlanned) / budgetPlanned) * 100 : 0,
          devisTotal,
          commissionsTotal,
          budgetLinesPlanned: budgetLinePlannedTotal,
          budgetLinesActual: budgetLineActualTotal,
        };
      });
    }),

  /** Suivi de la progression terrain vs KPIs. */
  fieldOpProgress: operatorProcedure
    .input(z.object({ strategyId: z.string(), campaignId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const fieldOps = await db.campaignFieldOp.findMany({
        where: {
          campaign: {
            strategyId: input.strategyId,
            ...(input.campaignId ? { id: input.campaignId } : {}),
          },
        },
        include: {
          campaign: { select: { id: true, name: true } },
          reports: true,
        },
        orderBy: { date: "desc" },
      });

      return fieldOps.map((op) => {
        const metrics = {
          acquisition: 0,
          activation: 0,
          retention: 0,
          revenue: 0,
          referral: 0,
        };

        for (const rep of op.reports) {
          if (rep.status === "VALIDATED") {
            metrics.acquisition += rep.acquisitionCount ?? 0;
            metrics.activation += rep.activationCount ?? 0;
            metrics.retention += rep.retentionCount ?? 0;
            metrics.revenue += rep.revenueCount ?? 0;
            metrics.referral += rep.referralCount ?? 0;
          }
        }

        return {
          id: op.id,
          name: op.name,
          location: op.location,
          date: op.date,
          status: op.status,
          budget: op.budget ?? 0,
          campaign: op.campaign,
          reportsCount: op.reports.length,
          metrics,
          aarrConfig: op.aarrConfig,
        };
      });
    }),
});

