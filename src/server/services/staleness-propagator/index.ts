/**
 * Staleness Propagator — Cascade recalculation when composites change
 * N1 (atoms) → N2 (composites) → N3 (collections) → N4 (major composites) → N5 (strategy)
 *
 * When a pillar content changes, propagates staleness up the chain
 * and triggers recalculation of affected scores.
 */

import { db } from "@/lib/db";

interface PropagationResult {
  pillarsMarkedStale: string[];
  scoresRecalculated: boolean;
  signalsCreated: number;
  refreshProcessesCreated: number;
  durationMs: number;
}

// Pillar dependency map: which pillars are affected when a given pillar changes
const PILLAR_DEPENDENCIES: Record<string, string[]> = {
  A: ["D", "E", "S"], // Authenticité impacts Distinction (identity→positioning), Engagement (values→rituals), Stratégie
  D: ["V", "E", "S"], // Distinction impacts Valeur (positioning→pricing), Engagement (voice→touchpoints), Stratégie
  V: ["T", "I", "S"], // Valeur impacts Track (unit economics→KPIs), Implementation (offers→campaigns), Stratégie
  E: ["T", "S"],       // Engagement impacts Track (engagement metrics), Stratégie
  R: ["I", "S"],       // Risk impacts Implementation (mitigations), Stratégie
  T: ["I", "S"],       // Track impacts Implementation (KPI-driven roadmap), Stratégie
  I: ["S"],            // Implementation impacts Stratégie
  S: [],               // Stratégie is the top-level composite
};

// Composite-to-collection mapping (N2→N3)
const COMPOSITE_COLLECTIONS: Record<string, string[]> = {
  A: ["values", "hero_journey", "personas", "community_hierarchy"],
  D: ["personas", "positioning", "visual_identity", "linguistic_assets"],
  V: ["products", "pricing_ladder", "unit_economics"],
  E: ["touchpoints", "rituals", "engagement_kpis", "sacred_calendar"],
  R: ["risks", "mitigations"],
  T: ["hypotheses", "market_data", "kpis"],
  I: ["campaigns", "team", "budget", "roadmap"],
  S: ["strategic_axes", "executive_summary"],
};

/**
 * Propagate staleness when a pillar content is updated
 */
export async function propagateFromPillar(
  strategyId: string,
  changedPillarKey: string
): Promise<PropagationResult> {
  const startTime = Date.now();
  const result: PropagationResult = {
    pillarsMarkedStale: [],
    scoresRecalculated: false,
    signalsCreated: 0,
    refreshProcessesCreated: 0,
    durationMs: 0,
  };

  // Check if auto-recalculate is enabled for this strategy
  const config = await db.variableStoreConfig.findUnique({ where: { strategyId } });
  if (config && !config.autoRecalculate) {
    result.durationMs = Date.now() - startTime;
    return result;
  }

  const thresholdDays = config?.stalenessThresholdDays ?? 30;

  // 1. Find dependent pillars
  const dependents = getTransitiveDependencies(changedPillarKey);
  result.pillarsMarkedStale = dependents;

  // 2. For each dependent, check if it needs recalculation
  for (const depKey of dependents) {
    const pillar = await db.pillar.findUnique({
      where: { strategyId_key: { strategyId, key: depKey } },
    });

    if (!pillar) continue;

    const daysSinceUpdate = (Date.now() - pillar.updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate > thresholdDays) {
      const staleDays = Math.round(daysSinceUpdate);

      // Create a staleness signal
      await db.signal.create({
        data: {
          strategyId,
          type: "STALENESS_CASCADE",
          data: {
            sourcePillar: changedPillarKey,
            affectedPillar: depKey,
            daysSinceUpdate: staleDays,
            severity: daysSinceUpdate > thresholdDays * 2 ? "high" : "medium",
            message: `Le pilier ${depKey} est potentiellement obsolète suite à la mise à jour de ${changedPillarKey}`,
          },
        },
      });
      result.signalsCreated++;

      // Mark the pillar record as stale
      await db.pillar.updateMany({
        where: { strategyId, key: depKey.toLowerCase() },
        data: { staleAt: new Date() },
      });

      // Create a refresh Process so the scheduler/pipeline-orchestrator picks it up
      await db.process.create({
        data: {
          type: "TRIGGERED",
          name: `pillar-refresh-${depKey}`,
          description: `Auto-refresh pillar ${depKey} — stale for ${staleDays} days after ${changedPillarKey} update`,
          status: "RUNNING",
          priority: daysSinceUpdate > thresholdDays * 2 ? 9 : 6,
          strategyId,
          playbook: {
            action: "refresh_pillar",
            pillarKey: depKey,
            reason: "stale",
            staleDays,
          },
        },
      });
      result.refreshProcessesCreated++;
    }
  }

  // 3. Trigger score recalculation if S (Stratégie) is affected
  if (dependents.includes("S") || changedPillarKey === "S") {
    // Mark strategy as needing recalculation
    const strategy = await db.strategy.findUnique({ where: { id: strategyId } });
    if (strategy?.advertis_vector) {
      await db.signal.create({
        data: {
          strategyId,
          type: "SCORE_RECALCULATION_NEEDED",
          data: {
            trigger: `Pillar ${changedPillarKey} updated`,
            affectedPillars: [changedPillarKey, ...dependents],
          },
        },
      });
      result.scoresRecalculated = true;
      result.signalsCreated++;
    }
  }

  // 4. Update BrandVariables that reference the changed pillar
  const variables = await db.brandVariable.findMany({
    where: {
      strategyId,
      category: { in: [changedPillarKey, ...COMPOSITE_COLLECTIONS[changedPillarKey] ?? []] },
    },
  });

  for (const variable of variables) {
    // Create history entry for audit
    await db.variableHistory.create({
      data: {
        variableId: variable.id,
        oldValue: variable.value as never,
        newValue: variable.value as never, // Value unchanged, but marked as needing review
        changedBy: "staleness-propagator",
        reason: `Cascade from pillar ${changedPillarKey} update`,
      },
    });
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

/**
 * Get all transitive dependencies of a pillar
 */
function getTransitiveDependencies(pillarKey: string): string[] {
  const visited = new Set<string>();
  const queue = [pillarKey];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const deps = PILLAR_DEPENDENCIES[current] ?? [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        visited.add(dep);
        queue.push(dep);
      }
    }
  }

  return Array.from(visited);
}

/**
 * Run a full staleness audit across all active strategies
 */
export async function auditAllStrategies(): Promise<{
  strategiesChecked: number;
  totalSignals: number;
}> {
  const strategies = await db.strategy.findMany({
    where: { status: "ACTIVE" },
    include: { pillars: true },
  });

  let totalSignals = 0;

  for (const strategy of strategies) {
    const config = await db.variableStoreConfig.findUnique({
      where: { strategyId: strategy.id },
    });
    const threshold = config?.stalenessThresholdDays ?? 30;
    const thresholdDate = new Date(Date.now() - threshold * 24 * 60 * 60 * 1000);

    for (const pillar of strategy.pillars) {
      if (pillar.updatedAt < thresholdDate) {
        // Check if we already have a recent staleness signal
        const existing = await db.signal.findFirst({
          where: {
            strategyId: strategy.id,
            type: "STALENESS_CASCADE",
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        });

        if (!existing) {
          const staleDays = Math.round((Date.now() - pillar.updatedAt.getTime()) / (1000 * 60 * 60 * 24));

          await db.signal.create({
            data: {
              strategyId: strategy.id,
              type: "STALENESS_CASCADE",
              data: {
                affectedPillar: pillar.key,
                daysSinceUpdate: staleDays,
                severity: "medium",
              },
            },
          });

          // Mark the pillar record as stale
          await db.pillar.updateMany({
            where: { strategyId: strategy.id, key: pillar.key.toLowerCase() },
            data: { staleAt: new Date() },
          });

          // Create a refresh Process for the scheduler/pipeline-orchestrator
          await db.process.create({
            data: {
              type: "TRIGGERED",
              name: `pillar-refresh-${pillar.key}`,
              description: `Auto-refresh pillar ${pillar.key} — stale for ${staleDays} days (audit)`,
              status: "RUNNING",
              priority: staleDays > threshold * 2 ? 9 : 6,
              strategyId: strategy.id,
              playbook: {
                action: "refresh_pillar",
                pillarKey: pillar.key,
                reason: "stale",
                staleDays,
              },
            },
          });

          totalSignals++;
        }
      }
    }
  }

  return { strategiesChecked: strategies.length, totalSignals };
}

/**
 * Check whether a pillar is stale relative to its dependencies.
 * A pillar is stale if any pillar it depends on was updated MORE RECENTLY
 * than the pillar itself (meaning the pillar hasn't incorporated the latest changes).
 */
export async function checkStaleness(
  strategyId: string,
  pillarKey: string
): Promise<{ isStale: boolean; staleDays: number; staleSince: Date | null; dependsOn: string[] }> {
  // Build reverse dependency map: for a given pillar, which pillars does it depend ON?
  // PILLAR_DEPENDENCIES maps source → affected. We need affected → sources.
  const reverseDeps: Record<string, string[]> = {};
  for (const [source, affected] of Object.entries(PILLAR_DEPENDENCIES)) {
    for (const dep of affected) {
      if (!reverseDeps[dep]) reverseDeps[dep] = [];
      reverseDeps[dep].push(source);
    }
  }

  const upstream = reverseDeps[pillarKey.toUpperCase()] ?? [];
  if (upstream.length === 0) {
    return { isStale: false, staleDays: 0, staleSince: null, dependsOn: [] };
  }

  // Fetch the target pillar
  const pillar = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId, key: pillarKey.toLowerCase() } },
  });
  if (!pillar) {
    return { isStale: false, staleDays: 0, staleSince: null, dependsOn: [] };
  }

  // Fetch all upstream pillars
  const upstreamPillars = await db.pillar.findMany({
    where: {
      strategyId,
      key: { in: upstream.map((k) => k.toLowerCase()) },
    },
  });

  // A pillar is stale if any upstream dependency was updated after it
  const staleDeps: string[] = [];
  let latestUpstreamUpdate: Date | null = null;

  for (const up of upstreamPillars) {
    if (up.updatedAt > pillar.updatedAt) {
      staleDeps.push(up.key.toUpperCase());
      if (!latestUpstreamUpdate || up.updatedAt > latestUpstreamUpdate) {
        latestUpstreamUpdate = up.updatedAt;
      }
    }
  }

  if (staleDeps.length === 0) {
    return { isStale: false, staleDays: 0, staleSince: null, dependsOn: [] };
  }

  const staleDays = Math.round(
    (Date.now() - pillar.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    isStale: true,
    staleDays,
    staleSince: pillar.updatedAt,
    dependsOn: staleDeps,
  };
}

export { getTransitiveDependencies, PILLAR_DEPENDENCIES, COMPOSITE_COLLECTIONS };
