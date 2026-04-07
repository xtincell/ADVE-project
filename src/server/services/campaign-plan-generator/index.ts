/**
 * Campaign Plan Generator — Generates campaign plans from strategy ADVE profile + Drivers.
 * Enriches campaign objectives with ADVE-aligned KPIs and budget allocation.
 */
import { db } from "@/lib/db";

export async function generatePlan(strategyId: string, campaignName: string): Promise<{
  name: string;
  objectives: Record<string, unknown>;
  suggestedDrivers: string[];
  estimatedBudget: number;
}> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: { drivers: { where: { deletedAt: null, status: "ACTIVE" } }, pillars: { where: { key: { in: ["v", "e"] } } } },
  });

  const vector = strategy.advertis_vector as Record<string, number> | null;
  const weakPillars = ["a", "d", "v", "e"].filter((k) => (vector?.[k] ?? 0) < 12);

  return {
    name: campaignName,
    objectives: { targetPillars: weakPillars, composite: vector?.composite ?? 0 },
    suggestedDrivers: strategy.drivers.map((d) => d.id),
    estimatedBudget: strategy.drivers.length * 500000, // Base estimate
  };
}
