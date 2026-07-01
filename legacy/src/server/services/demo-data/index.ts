/**
 * Demo Data Service — Manages dummy/demo data visibility and isolation
 *
 * All demo data is anchored to Operators/Strategies/Users with isDummy=true.
 * Child entities (Campaign, Mission, Signal, etc.) inherit demo status
 * through their FK relationship to Strategy or User.
 *
 * Three modes:
 *  - show_all:    Display everything (default, for demos)
 *  - hide_dummy:  Hide demo data (production mode)
 *  - only_dummy:  Show only demo data (debugging)
 */

import type { PrismaClient } from "@prisma/client";

export type DemoMode = "show_all" | "hide_dummy" | "only_dummy";

// ---------------------------------------------------------------------------
// Mode resolution
// ---------------------------------------------------------------------------

let runtimeOverride: DemoMode | null = null;

/** Read mode from runtime override → env → default */
export function getDemoMode(): DemoMode {
  if (runtimeOverride) return runtimeOverride;
  const env = process.env.DEMO_DATA_MODE;
  if (env === "hide_dummy" || env === "only_dummy") return env;
  return "show_all";
}

/** Set runtime override (used by console toggle) */
export function setDemoMode(mode: DemoMode | null): void {
  runtimeOverride = mode;
}

// ---------------------------------------------------------------------------
// Query filters — for anchor entities (Operator, Strategy, User)
// ---------------------------------------------------------------------------

/**
 * Inject isDummy filter into a WHERE clause for anchor entities.
 * Use on Operator, Strategy, or User queries directly.
 */
export function demoFilter<T extends Record<string, unknown>>(
  where: T,
  mode?: DemoMode,
): T {
  const m = mode ?? getDemoMode();
  if (m === "show_all") return where;
  if (m === "hide_dummy") return { ...where, isDummy: false } as T;
  if (m === "only_dummy") return { ...where, isDummy: true } as T;
  return where;
}

// ---------------------------------------------------------------------------
// Query filters — for child entities (via Strategy relation)
// ---------------------------------------------------------------------------

/**
 * Filter child entities (Campaign, Mission, Signal, etc.) by their
 * parent Strategy's isDummy status.
 *
 * Returns a Prisma WHERE fragment: { strategy: { isDummy: false } }
 */
export function demoStrategyFilter(mode?: DemoMode): Record<string, unknown> {
  const m = mode ?? getDemoMode();
  if (m === "show_all") return {};
  if (m === "hide_dummy") return { strategy: { isDummy: false } };
  if (m === "only_dummy") return { strategy: { isDummy: true } };
  return {};
}

/**
 * Filter child entities via User relation.
 */
export function demoUserFilter(mode?: DemoMode): Record<string, unknown> {
  const m = mode ?? getDemoMode();
  if (m === "show_all") return {};
  if (m === "hide_dummy") return { user: { isDummy: false } };
  if (m === "only_dummy") return { user: { isDummy: true } };
  return {};
}

// ---------------------------------------------------------------------------
// Aggregation guard — ALWAYS exclude dummy from real calculations
// ---------------------------------------------------------------------------

/**
 * For batch aggregations (scoring, analytics, financial reconciliation)
 * that must NEVER include demo data, regardless of display mode.
 *
 * Returns { isDummy: false } — use spread into WHERE clause.
 */
export function excludeDummyAlways(): { isDummy: false } {
  return { isDummy: false };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Check if a specific strategy is dummy */
export async function isDummyStrategy(
  strategyId: string,
  db: PrismaClient,
): Promise<boolean> {
  const s = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { isDummy: true },
  });
  return s?.isDummy ?? false;
}

/** Get demo system statistics */
export async function getDemoStats(db: PrismaClient) {
  const [operators, strategies, users] = await Promise.all([
    db.operator.count({ where: { isDummy: true } }),
    db.strategy.count({ where: { isDummy: true } }),
    db.user.count({ where: { isDummy: true } }),
  ]);
  return {
    operators,
    strategies,
    users,
    mode: getDemoMode(),
    runtimeOverride: runtimeOverride !== null,
  };
}
