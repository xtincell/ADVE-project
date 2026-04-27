/**
 * AI Cost Tracker — Tracks Claude API usage and costs
 */

import { db } from "@/lib/db";

interface CostEntry {
  model: string;
  inputTokens: number;
  outputTokens: number;
  context?: string;
  userId?: string;
  strategyId?: string;
}

// Pricing per 1M tokens (USD)
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
  "claude-haiku-4-5": { input: 0.80, output: 4.0 },
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model] ?? PRICING["claude-sonnet-4-6"]!;
  return (inputTokens / 1_000_000) * price!.input + (outputTokens / 1_000_000) * price!.output;
}

export async function track(entry: CostEntry): Promise<string> {
  const cost = calculateCost(entry.model, entry.inputTokens, entry.outputTokens);

  const log = await db.aICostLog.create({
    data: {
      model: entry.model,
      provider: "anthropic",
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      cost,
      context: entry.context,
      userId: entry.userId,
      strategyId: entry.strategyId,
    },
  });

  return log.id;
}

export async function getDailyCost(date?: Date) {
  const day = date ?? new Date();
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(start.getTime() + 86400000);

  const logs = await db.aICostLog.findMany({
    where: { createdAt: { gte: start, lt: end } },
  });

  return {
    totalCost: logs.reduce((sum, l) => sum + l.cost, 0),
    totalInputTokens: logs.reduce((sum, l) => sum + l.inputTokens, 0),
    totalOutputTokens: logs.reduce((sum, l) => sum + l.outputTokens, 0),
    count: logs.length,
    byContext: groupBy(logs, "context"),
  };
}

export async function getMonthlyCost(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const logs = await db.aICostLog.findMany({
    where: { createdAt: { gte: start, lt: end } },
  });

  return {
    totalCost: logs.reduce((sum, l) => sum + l.cost, 0),
    totalInputTokens: logs.reduce((sum, l) => sum + l.inputTokens, 0),
    totalOutputTokens: logs.reduce((sum, l) => sum + l.outputTokens, 0),
    count: logs.length,
  };
}

function groupBy(items: Array<{ cost: number; context: string | null }>, key: string) {
  const groups: Record<string, number> = {};
  for (const item of items) {
    const k = (item as Record<string, unknown>)[key] as string ?? "unknown";
    groups[k] = (groups[k] ?? 0) + item.cost;
  }
  return groups;
}

// ── v4 — LLM Budget Governance ─────────────────────────────────────────

export interface BudgetCheck {
  allowed: boolean;
  remaining: number;
  utilization: number; // 0-1
  suggestedModel: string;
  alertLevel: "none" | "warning" | "critical" | "exceeded";
}

const MODEL_DOWNGRADE_CHAIN = [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
];

/**
 * Check if a strategy's LLM budget allows another call.
 * Returns budget status and suggested model (downgraded if near limit).
 */
export async function checkBudget(strategyId: string): Promise<BudgetCheck> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { llmBudget: true, llmBudgetAlerts: true },
  });

  // No budget cap → unlimited
  if (!strategy?.llmBudget) {
    return {
      allowed: true,
      remaining: Infinity,
      utilization: 0,
      suggestedModel: "claude-sonnet-4-6",
      alertLevel: "none",
    };
  }

  // Sum current month's costs for this strategy
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const logs = await db.aICostLog.findMany({
    where: {
      strategyId,
      createdAt: { gte: monthStart },
    },
    select: { cost: true },
  });
  const spent = logs.reduce((sum, l) => sum + l.cost, 0);
  const budget = strategy.llmBudget;
  const remaining = budget - spent;
  const utilization = spent / budget;

  // Determine alert level and suggested model
  let alertLevel: BudgetCheck["alertLevel"] = "none";
  let suggestedModel = "claude-sonnet-4-6";
  let allowed = true;

  if (utilization >= 1.0) {
    alertLevel = "exceeded";
    suggestedModel = "claude-haiku-4-5"; // Grace: 1 Haiku call allowed
    allowed = remaining > -0.01; // Allow 1 final call with tiny overshoot
  } else if (utilization >= 0.9) {
    alertLevel = "critical";
    suggestedModel = "claude-haiku-4-5";
  } else if (utilization >= 0.75) {
    alertLevel = "warning";
    suggestedModel = "claude-sonnet-4-6"; // Downgrade from Opus
  }

  // Fire threshold alerts (deduplicated via llmBudgetAlerts JSON)
  const alerts = (strategy.llmBudgetAlerts as Record<string, boolean>) ?? { "75": false, "90": false, "100": false };
  const thresholdsToFire: string[] = [];
  if (utilization >= 0.75 && !alerts["75"]) thresholdsToFire.push("75");
  if (utilization >= 0.9 && !alerts["90"]) thresholdsToFire.push("90");
  if (utilization >= 1.0 && !alerts["100"]) thresholdsToFire.push("100");

  if (thresholdsToFire.length > 0) {
    const updatedAlerts = { ...alerts };
    for (const t of thresholdsToFire) updatedAlerts[t] = true;
    await db.strategy.update({
      where: { id: strategyId },
      data: { llmBudgetAlerts: updatedAlerts },
    });
  }

  return { allowed, remaining, utilization, suggestedModel, alertLevel };
}
