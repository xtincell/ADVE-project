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

export const operationsOverviewRouter = createTRPCRouter({
  overview: operatorProcedure.query(async () => {
    const [missionsByStatus, openApplications, devisExecutions, budgetAgg, pendingCommissions] =
      await Promise.all([
        db.mission.groupBy({ by: ["status"], _count: true }),
        db.missionApplication.count({ where: { status: "PENDING" } }),
        db.campaignExecution.findMany({
          where: { productionState: "DEVIS" },
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
          by: ["category"],
          _sum: { planned: true, actual: true },
        }),
        db.commission.aggregate({
          where: { status: "PENDING" },
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
});
