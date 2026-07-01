/**
 * Campaign Budget Engine — Allocates and tracks campaign budgets with variance analysis.
 * Integrates with Financial Brain (Thot) for constraint validation.
 */
import { db } from "@/lib/db";
import { validateFinancials, hasBlockingIssues } from "@/server/services/financial-brain";
import type { ValidationContext } from "@/server/services/financial-brain/types";

// ── Types ─────────────────────────────────────────────────────────────────

export interface BudgetBreakdown {
  totalBudget: number;
  currency: string;
  byCategory: Record<string, { planned: number; actual: number; variance: number }>;
  totalPlanned: number;
  totalSpent: number;
  totalVariance: number;
  utilizationRate: number; // 0-1
}

export interface ChannelAllocation {
  channel: string;
  amount: number;
  percent: number;
}

export interface BudgetValidation {
  isValid: boolean;
  blockers: string[];
  warnings: string[];
  suggestions: string[];
}

// ── Budget breakdown by action type ───────────────────────────────────────

export async function calculateCampaignBudget(campaignId: string): Promise<BudgetBreakdown> {
  const campaign = await db.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { budgetLines: true },
  });

  const totalBudget = campaign.budget ?? 0;
  const currency = campaign.budgetCurrency ?? "XAF";
  const byCategory: Record<string, { planned: number; actual: number; variance: number }> = {};

  let totalPlanned = 0;
  let totalSpent = 0;

  for (const line of campaign.budgetLines) {
    const existing = byCategory[line.category];
    if (existing) {
      existing.planned += line.planned;
      existing.actual += line.actual ?? 0;
      existing.variance = existing.planned - existing.actual;
    } else {
      byCategory[line.category] = {
        planned: line.planned,
        actual: line.actual ?? 0,
        variance: line.planned - (line.actual ?? 0),
      };
    }
    totalPlanned += line.planned;
    totalSpent += line.actual ?? 0;
  }

  return {
    totalBudget,
    currency,
    byCategory,
    totalPlanned,
    totalSpent,
    totalVariance: totalBudget - totalSpent,
    utilizationRate: totalBudget > 0 ? totalSpent / totalBudget : 0,
  };
}

// ── Channel allocation ────────────────────────────────────────────────────

const DEFAULT_CHANNEL_WEIGHTS: Record<string, number> = {
  DIGITAL: 0.35,
  OOH: 0.20,
  TV: 0.15,
  RADIO: 0.10,
  PRINT: 0.05,
  EVENT: 0.10,
  PR: 0.05,
};

export function allocateByChannel(
  budget: number,
  channelWeights?: Record<string, number>,
): ChannelAllocation[] {
  const weights = channelWeights ?? DEFAULT_CHANNEL_WEIGHTS;

  // Normalize weights to sum to 1
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  const normalizedWeights: Record<string, number> = {};
  for (const [ch, w] of Object.entries(weights)) {
    normalizedWeights[ch] = totalWeight > 0 ? w / totalWeight : 0;
  }

  return Object.entries(normalizedWeights).map(([channel, pct]) => ({
    channel,
    amount: Math.round(budget * pct),
    percent: Math.round(pct * 100),
  }));
}

// ── Financial validation via Thot (financial-brain) ───────────────────────

export async function validateBudget(campaignId: string): Promise<BudgetValidation> {
  const campaign = await db.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { budgetLines: true, strategy: { select: { businessContext: true } } },
  });

  const bCtx = (campaign.strategy.businessContext as Record<string, unknown>) ?? {};
  const totalBudget = campaign.budget ?? 0;

  // Build validation context for Thot
  const ctx: ValidationContext = {
    actorType: "ADVERTISER",
    sector: bCtx.sector as string | undefined,
    country: bCtx.country as string | undefined,
    businessModel: bCtx.businessModel as string | undefined,
    budgetCom: totalBudget,
    caVise: bCtx.caVise as number | undefined,
  };

  const report = validateFinancials(ctx);
  const blocking = hasBlockingIssues(ctx);

  return {
    isValid: !blocking,
    blockers: report.blockers.map((b) => `${b.ruleId}: ${b.message}`),
    warnings: report.warnings.map((w) => `${w.ruleId}: ${w.message}`),
    suggestions: report.advisories.map((i) => `${i.ruleId}: ${i.suggestion ?? i.message}`),
  };
}

// ── Legacy exports (preserved) ────────────────────────────────────────────

export async function allocateBudget(campaignId: string): Promise<{
  totalBudget: number;
  allocation: Record<string, number>;
  variance: number;
}> {
  const result = await calculateCampaignBudget(campaignId);
  const allocation: Record<string, number> = {};
  for (const [cat, data] of Object.entries(result.byCategory)) {
    allocation[cat] = data.planned;
  }
  return { totalBudget: result.totalBudget, allocation, variance: result.totalVariance };
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
