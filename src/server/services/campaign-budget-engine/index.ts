/**
 * Campaign Budget Engine — Allocates and tracks campaign budgets with variance analysis.
 * Integrates with Financial Engine for sector benchmarks.
 */
import { db } from "@/lib/db";

export async function allocateBudget(campaignId: string): Promise<{
  totalBudget: number;
  allocation: Record<string, number>;
  variance: number;
}> {
  const campaign = await db.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { budgetLines: true },
  });

  const totalBudget = campaign.budget ?? 0;
  const allocation: Record<string, number> = {};
  let spent = 0;

  for (const line of campaign.budgetLines) {
    allocation[line.category] = line.planned;
    spent += line.actual ?? 0;
  }

  return { totalBudget, allocation, variance: totalBudget - spent };
}

export async function getBurnRate(campaignId: string): Promise<{ dailyBurn: number; daysRemaining: number }> {
  const campaign = await db.campaign.findUniqueOrThrow({ where: { id: campaignId }, include: { budgetLines: true } });
  const totalSpent = campaign.budgetLines.reduce((sum, l) => sum + (l.actual ?? 0), 0);
  const totalBudget = campaign.budget ?? 0;
  const remaining = totalBudget - totalSpent;
  const daysPassed = campaign.startDate ? Math.max(1, (Date.now() - campaign.startDate.getTime()) / 86400000) : 1;
  const dailyBurn = totalSpent / daysPassed;
  return { dailyBurn, daysRemaining: dailyBurn > 0 ? remaining / dailyBurn : Infinity };
}
