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
