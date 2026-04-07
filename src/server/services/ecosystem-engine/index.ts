/**
 * Ecosystem Engine — Cross-operator metrics, platform health, scoring plateforme.
 * Aggregates data across all operators for the Fixer Console ecosystem dashboard.
 */
import { db } from "@/lib/db";

export async function getEcosystemMetrics() {
  const [operators, strategies, creators, missions, deals] = await Promise.all([
    db.operator.count(),
    db.strategy.count({ where: { status: "ACTIVE" } }),
    db.talentProfile.count(),
    db.mission.count({ where: { status: "COMPLETED" } }),
    db.deal.count(),
  ]);

  // Avg composite across all active strategies
  const activeStrategies = await db.strategy.findMany({
    where: { status: "ACTIVE" },
    select: { advertis_vector: true },
  });
  const composites = activeStrategies
    .map((s) => (s.advertis_vector as Record<string, number> | null)?.composite ?? 0)
    .filter((c) => c > 0);
  const avgComposite = composites.length > 0 ? composites.reduce((s, c) => s + c, 0) / composites.length : 0;

  // Classification distribution
  const distribution: Record<string, number> = { ZOMBIE: 0, ORDINAIRE: 0, FORTE: 0, CULTE: 0, ICONE: 0 };
  for (const c of composites) {
    const cls = c <= 80 ? "ZOMBIE" : c <= 120 ? "ORDINAIRE" : c <= 160 ? "FORTE" : c <= 180 ? "CULTE" : "ICONE";
    distribution[cls]!++;
  }

  return { operators, strategies, creators, completedMissions: missions, deals, avgComposite: Math.round(avgComposite), distribution };
}

export async function getOperatorHealth(operatorId: string) {
  const strategies = await db.strategy.findMany({
    where: { operatorId, status: "ACTIVE" },
    select: { id: true, name: true, advertis_vector: true },
  });
  return strategies.map((s) => ({
    id: s.id,
    name: s.name,
    composite: (s.advertis_vector as Record<string, number> | null)?.composite ?? 0,
  }));
}
