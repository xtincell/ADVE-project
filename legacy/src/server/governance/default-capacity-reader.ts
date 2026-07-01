/**
 * src/server/governance/default-capacity-reader.ts — pragmatic CapacityReader
 * for the cost-gate (Pillar 6).
 *
 * Computes remaining propellant from `AICostLog` rolling 30-day spend
 * subtracted from a per-operator monthly budget. Until financial-brain
 * exposes per-operator subscription tiers, the budget is a single env var:
 *
 *   DEFAULT_OPERATOR_BUDGET_USD (default 1000)
 *
 * Plug a richer reader (per-tier budget, prepaid balance, retainer caps)
 * by replacing this module's export at the call site — the cost-gate only
 * depends on the `CapacityReader` interface.
 */

import type { PrismaClient } from "@prisma/client";
import type { CapacityReader } from "./cost-gate";

const DEFAULT_BUDGET_USD = Number(process.env.DEFAULT_OPERATOR_BUDGET_USD ?? "1000");
const ROLLING_WINDOW_DAYS = 30;

export function makeDefaultCapacityReader(db: PrismaClient): CapacityReader {
  return {
    async remainingBudgetUsd(operatorId: string): Promise<number> {
      const spent = await rollingSpendForOperator(db, operatorId, ROLLING_WINDOW_DAYS);
      return Math.max(0, DEFAULT_BUDGET_USD - spent);
    },

    async rollingSpendUsd(operatorId: string, days: number): Promise<number> {
      return rollingSpendForOperator(db, operatorId, days);
    },
  };
}

async function rollingSpendForOperator(
  db: PrismaClient,
  operatorId: string,
  days: number,
): Promise<number> {
  if (operatorId === "ADMIN") return 0;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const userIds = await db.user
    .findMany({ where: { operatorId }, select: { id: true } })
    .then((rows: ReadonlyArray<{ id: string }>) => rows.map((r) => r.id));
  if (userIds.length === 0) return 0;
  const agg = await db.aICostLog.aggregate({
    where: { userId: { in: userIds }, createdAt: { gte: since } },
    _sum: { cost: true },
  });
  return Number(agg._sum.cost ?? 0);
}
