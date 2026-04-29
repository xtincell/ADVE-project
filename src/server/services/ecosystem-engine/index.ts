/**
 * Ecosystem Engine — Cross-operator metrics, platform health, scoring plateforme.
 * Aggregates data across all operators for the Fixer Console ecosystem dashboard.
 */
import { db } from "@/lib/db";
import { PILLAR_KEYS } from "@/domain/pillars";

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

// ============================================================================
// ECOSYSTEM OVERVIEW — All strategies with scores, classification, pillar health
// ============================================================================

export async function getEcosystemOverview(operatorId?: string) {
  const where = operatorId ? { operatorId, status: "ACTIVE" as const } : { status: "ACTIVE" as const };
  const strategies = await db.strategy.findMany({
    where,
    select: { id: true, name: true, operatorId: true, advertis_vector: true, status: true },
  });

  const results = [];
  for (const s of strategies) {
    const vector = s.advertis_vector as Record<string, number> | null;
    const composite = vector?.composite ?? 0;
    const classification = composite <= 80 ? "ZOMBIE" : composite <= 120 ? "ORDINAIRE" : composite <= 160 ? "FORTE" : composite <= 180 ? "CULTE" : "ICONE";

    const pillars = await db.pillar.findMany({
      where: { strategyId: s.id },
      select: { key: true, confidence: true, validationStatus: true },
    });

    const pillarHealth = pillars.reduce((acc, p) => {
      acc[p.key] = { confidence: p.confidence ?? 0, status: p.validationStatus };
      return acc;
    }, {} as Record<string, { confidence: number; status: string }>);

    results.push({
      id: s.id,
      name: s.name,
      operatorId: s.operatorId,
      composite,
      classification,
      pillarHealth,
    });
  }

  return results.sort((a, b) => b.composite - a.composite);
}

// ============================================================================
// COMPARE STRATEGIES — Side-by-side comparison of ADVERTIS vectors
// ============================================================================

export async function compareStrategies(strategyIds: string[]) {
  const strategies = await db.strategy.findMany({
    where: { id: { in: strategyIds } },
    select: { id: true, name: true, advertis_vector: true },
  });

  const pillarKeys = [...PILLAR_KEYS];
  const comparison = strategies.map((s) => {
    const vector = s.advertis_vector as Record<string, number> | null;
    const pillarScores: Record<string, number> = {};
    for (const key of pillarKeys) {
      pillarScores[key] = vector?.[key.toLowerCase()] ?? vector?.[key] ?? 0;
    }
    return {
      id: s.id,
      name: s.name,
      composite: vector?.composite ?? 0,
      pillarScores,
    };
  });

  // Compute deltas between strategies if exactly 2
  const deltas: Record<string, number> | null = comparison.length === 2
    ? pillarKeys.reduce((acc, k) => {
        acc[k] = (comparison[0]!.pillarScores[k] ?? 0) - (comparison[1]!.pillarScores[k] ?? 0);
        return acc;
      }, {} as Record<string, number>)
    : null;

  return { strategies: comparison, deltas };
}

// ============================================================================
// SECTOR INSIGHTS — Aggregate knowledge entries for sector intelligence
// ============================================================================

export async function getSectorInsights(sector: string) {
  const [benchmarks, frameworks, creators, briefs] = await Promise.all([
    db.knowledgeEntry.findMany({
      where: { entryType: "SECTOR_BENCHMARK", sector },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    db.knowledgeEntry.findMany({
      where: { entryType: "DIAGNOSTIC_RESULT", sector },
      take: 20,
    }),
    db.knowledgeEntry.findMany({
      where: { entryType: "CREATOR_PATTERN", sector },
      take: 10,
    }),
    db.knowledgeEntry.findMany({
      where: { entryType: "BRIEF_PATTERN", sector },
      take: 10,
    }),
  ]);

  const avgComposite = benchmarks.length > 0
    ? benchmarks.reduce((sum, b) => sum + ((b.data as Record<string, number>).avgComposite ?? 0), 0) / benchmarks.length
    : 0;

  return {
    sector,
    benchmarkCount: benchmarks.length,
    avgComposite: Math.round(avgComposite),
    topFrameworks: frameworks
      .filter((f) => (f.data as Record<string, unknown>).framework)
      .slice(0, 5)
      .map((f) => (f.data as Record<string, unknown>).framework as string),
    creatorInsights: creators.length,
    briefInsights: briefs.length,
    totalEntries: benchmarks.length + frameworks.length + creators.length + briefs.length,
  };
}

// ============================================================================
// CROSS-BRAND OPPORTUNITIES — Find synergies between brands
// ============================================================================

export async function detectCrossBrandOpportunities(operatorId: string) {
  const strategies = await db.strategy.findMany({
    where: { operatorId, status: "ACTIVE" },
    select: { id: true, name: true, advertis_vector: true },
  });

  if (strategies.length < 2) return { opportunities: [], message: "Minimum 2 strategies required" };

  // Collect sector info for each strategy
  const strategyMeta = await Promise.all(
    strategies.map(async (s) => {
      const intake = await db.quickIntake.findFirst({
        where: { convertedToId: s.id },
        select: { sector: true, country: true },
      });
      const vector = s.advertis_vector as Record<string, number> | null;
      return { id: s.id, name: s.name, sector: intake?.sector ?? null, market: intake?.country ?? null, composite: vector?.composite ?? 0 };
    }),
  );

  const opportunities: { type: string; strategies: string[]; detail: string }[] = [];

  // 1. Shared sectors — potential cross-promotion
  const sectorGroups = new Map<string, typeof strategyMeta>();
  for (const s of strategyMeta) {
    if (!s.sector) continue;
    if (!sectorGroups.has(s.sector)) sectorGroups.set(s.sector, []);
    sectorGroups.get(s.sector)!.push(s);
  }
  for (const [sector, group] of sectorGroups) {
    if (group.length >= 2) {
      opportunities.push({
        type: "SHARED_SECTOR",
        strategies: group.map((g) => g.name),
        detail: `${group.length} marques dans le secteur ${sector} — potentiel cross-promotion`,
      });
    }
  }

  // 2. Complementary positioning — one strong where another is weak
  for (let i = 0; i < strategyMeta.length; i++) {
    for (let j = i + 1; j < strategyMeta.length; j++) {
      const a = strategyMeta[i]!;
      const b = strategyMeta[j]!;
      if (a.composite > 140 && b.composite < 100) {
        opportunities.push({
          type: "MENTORING",
          strategies: [a.name, b.name],
          detail: `${a.name} (${a.composite}) peut inspirer ${b.name} (${b.composite})`,
        });
      }
    }
  }

  return { opportunities, totalStrategies: strategies.length };
}
