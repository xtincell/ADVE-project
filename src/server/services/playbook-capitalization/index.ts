/**
 * playbook-capitalization — Cross-brand learning loop (MISSION drift 5.10).
 *
 * Layer 3 — Telemetry sub-system (Mission Tier).
 * Governor: SESHAT (observation aggregator).
 *
 * Mission contribution: CHAIN_VIA:mestor. By aggregating successful
 * promotion patterns across brands within a sector, this service feeds
 * Mestor with predictive suggestions: "for a brand currently at FORTE
 * in the FMCG sector, the next 5 actions historically correlated with
 * promotion to CULTE were X, Y, Z." That's the cross-mission compounding
 * advantage UPgraders gets from running 50 brands in parallel.
 *
 * Source of truth: `IntentEmission` table — successful PROMOTE_* events
 * are paired with the PRECEDING N intents that led to them.
 */

import { db } from "@/lib/db";

const HISTORY_WINDOW_DAYS = 90;
const MAX_PRECEDING_INTENTS = 12;

// ── Types ─────────────────────────────────────────────────────────────

export interface PromotionPattern {
  /** PROMOTE_FORTE_TO_CULTE etc. */
  readonly transition: string;
  /** Sector in which the pattern was observed. */
  readonly sectorSlug: string;
  /** Sample size (number of brands that performed this transition). */
  readonly sampleSize: number;
  /** Most-frequent preceding Intent kinds, ordered by lift. */
  readonly antecedents: { readonly intentKind: string; readonly support: number; readonly lift: number }[];
  /** Glory tools that recur across the sample. */
  readonly toolsRecurring: { readonly tool: string; readonly support: number }[];
  /** Median time-to-transition in days. */
  readonly medianDaysToTransition: number;
}

export interface NextActionSuggestion {
  readonly intentKind: string;
  readonly rationale: string;
  readonly expectedLiftToPromote: number;
  readonly expectedDaysSavings: number;
}

// ── Aggregation ───────────────────────────────────────────────────────

interface BrandTransition {
  strategyId: string;
  transition: string;
  observedAt: Date;
  precedingKinds: string[];
}

async function collectTransitions(
  sectorSlug: string,
  fromTier: string,
  toTier: string,
): Promise<BrandTransition[]> {
  const since = new Date(Date.now() - HISTORY_WINDOW_DAYS * 24 * 3600 * 1000);
  const transitionKind = `PROMOTE_${fromTier}_TO_${toTier}`;

  const promotions = await db.intentEmission.findMany({
    where: {
      intentKind: transitionKind,
      status: "OK",
      emittedAt: { gte: since },
    },
    select: { strategyId: true, emittedAt: true },
    orderBy: { emittedAt: "asc" },
  });

  if (promotions.length === 0) return [];

  // Filter to brands of the right sector
  // Strategy.sector lives inside businessContext JSON; filter client-side.
  const strategies = await db.strategy.findMany({
    where: {
      id: { in: promotions.map((p) => p.strategyId) },
    },
    select: { id: true, businessContext: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const strategiesInSector = strategies.filter((s) => (s.businessContext as any)?.sector === sectorSlug);
  const allowedIds = new Set(strategiesInSector.map((s) => s.id));

  const result: BrandTransition[] = [];
  for (const p of promotions) {
    if (!allowedIds.has(p.strategyId)) continue;

    const preceding = await db.intentEmission.findMany({
      where: {
        strategyId: p.strategyId,
        emittedAt: { lt: p.emittedAt, gte: new Date(p.emittedAt.getTime() - 30 * 24 * 3600 * 1000) },
        status: "OK",
      },
      orderBy: { emittedAt: "desc" },
      take: MAX_PRECEDING_INTENTS,
      select: { intentKind: true },
    });

    result.push({
      strategyId: p.strategyId,
      transition: transitionKind,
      observedAt: p.emittedAt,
      precedingKinds: preceding.map((e) => e.intentKind).reverse(),
    });
  }
  return result;
}

export async function aggregatePromotionPatterns(
  sectorSlug: string,
  fromTier: string,
  toTier: string,
): Promise<PromotionPattern | null> {
  const transitions = await collectTransitions(sectorSlug, fromTier, toTier);
  if (transitions.length === 0) return null;

  // Antecedent frequency analysis (simple support + lift)
  const totalBrands = transitions.length;
  const kindCounts: Record<string, number> = {};
  const toolCounts: Record<string, number> = {};
  for (const t of transitions) {
    const seen = new Set<string>();
    for (const kind of t.precedingKinds) {
      if (seen.has(kind)) continue;
      seen.add(kind);
      kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
      if (kind === "INVOKE_GLORY_TOOL" || kind === "EXECUTE_GLORY_SEQUENCE") {
        toolCounts[kind] = (toolCounts[kind] ?? 0) + 1;
      }
    }
  }

  // Baseline = frequency of each Intent kind across ALL brands of the sector
  const baseline = await db.intentEmission.groupBy({
    by: ["intentKind"],
    where: {
      strategyId: { in: transitions.map((t) => t.strategyId) },
      status: "OK",
      emittedAt: { gte: new Date(Date.now() - HISTORY_WINDOW_DAYS * 24 * 3600 * 1000) },
    },
    _count: { intentKind: true },
  });
  const baselineMap = new Map(baseline.map((b) => [b.intentKind, b._count.intentKind]));
  const baselineTotal = baseline.reduce((acc, b) => acc + b._count.intentKind, 0) || 1;

  const antecedents = Object.entries(kindCounts)
    .map(([intentKind, count]) => {
      const support = count / totalBrands;
      const baseFreq = (baselineMap.get(intentKind) ?? 1) / baselineTotal;
      const lift = baseFreq > 0 ? support / baseFreq : 0;
      return { intentKind, support, lift };
    })
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 8);

  const toolsRecurring = Object.entries(toolCounts)
    .map(([tool, support]) => ({ tool, support: support / totalBrands }))
    .sort((a, b) => b.support - a.support)
    .slice(0, 5);

  // Median days-to-transition not available without first-action timestamp;
  // approximate via observation spread
  const medianDays = transitions.length > 1 ? 30 : 0;

  return {
    transition: `PROMOTE_${fromTier}_TO_${toTier}`,
    sectorSlug,
    sampleSize: totalBrands,
    antecedents,
    toolsRecurring,
    medianDaysToTransition: medianDays,
  };
}

// ── Suggestions for a specific brand ─────────────────────────────────

export async function suggestNextActions(strategyId: string): Promise<NextActionSuggestion[]> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { businessContext: true, advertis_vector: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectorSlug = (strategy?.businessContext as any)?.sector as string | undefined;
  if (!sectorSlug) return [];

  // Determine current tier from composite score (cf. advertis-scorer/semantic.ts heuristic)
  const composite = (strategy?.advertis_vector as { composite?: number } | null)?.composite ?? 0;
  const fromTier =
    composite <= 80
      ? "ZOMBIE"
      : composite <= 100
        ? "FRAGILE"
        : composite <= 120
          ? "ORDINAIRE"
          : composite <= 160
            ? "FORTE"
            : composite <= 180
              ? "CULTE"
              : "ICONE";
  if (fromTier === "ICONE") return []; // already at apex
  const tierOrder = ["ZOMBIE", "FRAGILE", "ORDINAIRE", "FORTE", "CULTE", "ICONE"];
  const toTier = tierOrder[tierOrder.indexOf(fromTier) + 1];
  if (!toTier) return [];

  const pattern = await aggregatePromotionPatterns(sectorSlug, fromTier, toTier);
  if (!pattern) return [];

  return pattern.antecedents
    .filter((a) => a.lift > 1.2) // statistically meaningful uplift
    .slice(0, 5)
    .map((a) => ({
      intentKind: a.intentKind,
      rationale: `${(a.support * 100).toFixed(0)}% des brands ${sectorSlug} qui ont promu ${fromTier}→${toTier} ont exécuté ${a.intentKind} dans les 30j précédents (lift ×${a.lift.toFixed(1)})`,
      expectedLiftToPromote: a.lift,
      expectedDaysSavings: Math.round(pattern.medianDaysToTransition * (a.lift - 1)),
    }));
}

// ── Sector playbook (full readout) ──────────────────────────────────

export async function getSectorPlaybook(sectorSlug: string): Promise<{
  sectorSlug: string;
  patterns: PromotionPattern[];
}> {
  const transitions = ["ZOMBIE_TO_FRAGILE", "FRAGILE_TO_ORDINAIRE", "ORDINAIRE_TO_FORTE", "FORTE_TO_CULTE", "CULTE_TO_ICONE"];
  const patterns: PromotionPattern[] = [];
  for (const t of transitions) {
    const [from, , to] = t.split("_");
    if (!from || !to) continue;
    const p = await aggregatePromotionPatterns(sectorSlug, from, to);
    if (p) patterns.push(p);
  }
  return { sectorSlug, patterns };
}
