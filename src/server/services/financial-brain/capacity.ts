/**
 * THOT — Financial Capacity & Execution Validation
 *
 * Captures the REAL financial power of the brand and validates every
 * orchestrated execution against it. The other Neteru consult Thot
 * before deciding (Mestor) and before executing (Artemis).
 *
 * Two contracts:
 *   - assessCapacity(strategyId) → FinancialCapacity (used by Mestor)
 *   - validateExecution(intent, plannedCost) → OK | DOWNGRADE | VETO (used by Artemis)
 *
 * Phase 0 (stubs):
 *   - assessCapacity returns null realBudget + zero indirectEstimate
 *   - validateExecution always returns { ok: true }
 *
 * Phase 1 (Thot real):
 *   - assessCapacity reads QuickIntake.financialResponses + Strategy.businessContext
 *     and computes indirect estimate from Seshat MarketBenchmark
 *   - validateExecution checks plannedCost vs reconciled budget
 */

import type { Intent } from "@/server/services/mestor/intents";

// ── Types ─────────────────────────────────────────────────────────────

export type Currency = "XAF" | "EUR" | "USD";

export interface FinancialCapacity {
  /** Direct anchor — null if the brand declined to share */
  realBudget: number | null;
  /** Indirect estimate from market benchmarks */
  indirectEstimate: { p10: number; p50: number; p90: number };
  /** Weighted reconciliation of direct + indirect */
  reconciled: number;
  currency: Currency;
  /** 0..1 — how much we trust the figure */
  confidence: number;
  /** Audit trail of what fed the calculation */
  sources: string[];
  computedAt: string;
}

export type ValidationResult =
  | { ok: true }
  | {
      ok: false;
      reason: "EXCEEDS_BUDGET" | "INSUFFICIENT_RUNWAY" | "MISSING_CAPACITY";
      downgrade?: Intent;
    };

// ── Range mappings (intake biz answers → numeric estimates, FCFA) ────

/**
 * Mid-point estimate (in FCFA) for each range option used in the
 * biz_marketing_budget_last / biz_marketing_budget_intent questions.
 * Conservative midpoints — bias toward p50 of the range.
 */
const BUDGET_RANGE_FCFA: Record<string, number> = {
  ZERO: 0,
  LT_1M_FCFA: 500_000,
  "1M_10M_FCFA": 5_000_000,
  "10M_50M_FCFA": 25_000_000,
  "50M_250M_FCFA": 125_000_000,
  GT_250M_FCFA: 500_000_000,
  TBD: 0,
  PREFER_NOT_SAY: 0,
};

const REVENUE_RANGE_FCFA: Record<string, number> = {
  PRE_REVENUE: 0,
  LT_50M_FCFA: 25_000_000,
  "50M_500M_FCFA": 250_000_000,
  "500M_5G_FCFA": 2_500_000_000,
  GT_5G_FCFA: 10_000_000_000,
  PREFER_NOT_SAY: 0,
};

/**
 * Default sectoral marketing-budget-as-pct-of-revenue heuristic when no
 * Seshat MarketBenchmark exists. P50 figures, conservative.
 */
const DEFAULT_MARKETING_PCT_OF_REVENUE: Record<string, { p10: number; p50: number; p90: number }> = {
  FMCG: { p10: 0.04, p50: 0.08, p90: 0.15 },
  BANQUE: { p10: 0.02, p50: 0.04, p90: 0.07 },
  STARTUP: { p10: 0.05, p50: 0.15, p90: 0.30 },
  TECH: { p10: 0.05, p50: 0.10, p90: 0.20 },
  RETAIL: { p10: 0.03, p50: 0.06, p90: 0.10 },
  HOSPITALITY: { p10: 0.04, p50: 0.07, p90: 0.12 },
  EDUCATION: { p10: 0.03, p50: 0.06, p90: 0.10 },
  DEFAULT: { p10: 0.03, p50: 0.07, p90: 0.12 },
};

function extractKeyFromOption(value: unknown): string {
  if (typeof value !== "string") return "";
  const parts = value.split("::");
  return parts[0] ?? value;
}

// ── assessCapacity — real (Phase 1) ──────────────────────────────────

/**
 * Compute the financial capacity for a strategy.
 *   1. Read direct anchors from QuickIntake.financialResponses or responses.biz
 *   2. Compute indirect estimate from sector revenue × Seshat market pct
 *   3. Reconcile direct (weight 0.7) and indirect (weight 0.3)
 *
 * Falls back gracefully when data missing — the result always has
 * `confidence` proportional to how much we know.
 */
export async function assessCapacity(
  strategyId: string,
): Promise<FinancialCapacity> {
  const { db } = await import("@/lib/db");

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { id: true, businessContext: true },
  });

  // Find the originating QuickIntake (if any) by convertedToId
  const intake = await db.quickIntake.findFirst({
    where: { convertedToId: strategyId },
    orderBy: { completedAt: "desc" },
  });

  const sources: string[] = [];
  const bizContext = (strategy?.businessContext as Record<string, unknown> | null) ?? {};
  const sector = (bizContext.sector as string | undefined) ?? intake?.sector ?? null;
  const businessModel = (bizContext.businessModel as string | undefined) ?? intake?.businessModel ?? null;
  const country = intake?.country ?? null;

  // ── A. Direct anchors ──
  const responses = (intake?.responses as Record<string, Record<string, unknown>> | null) ?? null;
  const biz = responses?.biz ?? {};
  const finResponses = (intake?.financialResponses as Record<string, unknown> | null) ?? null;

  const revenueKey = extractKeyFromOption(
    (finResponses?.biz_revenue_range as string) ?? (biz.biz_revenue_range as string) ?? "",
  );
  const budgetLastKey = extractKeyFromOption(
    (finResponses?.biz_marketing_budget_last as string) ?? (biz.biz_marketing_budget_last as string) ?? "",
  );
  const budgetIntentKey = extractKeyFromOption(
    (finResponses?.biz_marketing_budget_intent as string) ?? (biz.biz_marketing_budget_intent as string) ?? "",
  );

  const revenueAnchor =
    revenueKey && revenueKey !== "PREFER_NOT_SAY" ? REVENUE_RANGE_FCFA[revenueKey] ?? null : null;
  const budgetLast = budgetLastKey ? BUDGET_RANGE_FCFA[budgetLastKey] ?? null : null;
  const budgetIntent = budgetIntentKey ? BUDGET_RANGE_FCFA[budgetIntentKey] ?? null : null;

  // Real budget = priority to intent > last year, else null
  const realBudget =
    budgetIntent != null && budgetIntent > 0
      ? budgetIntent
      : budgetLast != null && budgetLast > 0
        ? budgetLast
        : null;

  if (realBudget != null) sources.push(`direct:${budgetIntent != null && budgetIntent > 0 ? "intent" : "last"}`);
  if (revenueAnchor != null) sources.push("direct:revenue_range");

  // ── B. Indirect estimate (via Seshat MarketBenchmark or fallback heuristic) ──
  let indirectEstimate = { p10: 0, p50: 0, p90: 0 };

  // Try Seshat first (Phase 1 data may be sparse — fallback to heuristic)
  let pctP10 = 0,
    pctP50 = 0,
    pctP90 = 0;

  if (sector && country) {
    try {
      const { queryBenchmarkWithFallback } = await import(
        "@/server/services/seshat/context-store"
      );
      const benchmark = await queryBenchmarkWithFallback({
        country,
        sector,
        businessModel: businessModel ?? undefined,
        metric: "MARKETING_PCT_REVENUE",
      });
      if (benchmark) {
        pctP10 = benchmark.p10;
        pctP50 = benchmark.p50;
        pctP90 = benchmark.p90;
        sources.push(`seshat:benchmark:${benchmark.matchSpecificity}`);
      }
    } catch {
      /* Seshat not seeded yet — use heuristic */
    }
  }

  if (pctP50 === 0) {
    const heuristic =
      DEFAULT_MARKETING_PCT_OF_REVENUE[sector ?? "DEFAULT"] ??
      DEFAULT_MARKETING_PCT_OF_REVENUE.DEFAULT!;
    pctP10 = heuristic.p10;
    pctP50 = heuristic.p50;
    pctP90 = heuristic.p90;
    sources.push("heuristic:default-sector-pct");
  }

  if (revenueAnchor != null && revenueAnchor > 0) {
    indirectEstimate = {
      p10: Math.round(revenueAnchor * pctP10),
      p50: Math.round(revenueAnchor * pctP50),
      p90: Math.round(revenueAnchor * pctP90),
    };
  }

  // ── C. Reconciliation ──
  let reconciled = 0;
  let confidence = 0;

  if (realBudget != null && indirectEstimate.p50 > 0) {
    // Both available — weighted average (direct dominant)
    reconciled = Math.round(realBudget * 0.7 + indirectEstimate.p50 * 0.3);
    confidence = 0.85;
  } else if (realBudget != null) {
    reconciled = realBudget;
    confidence = 0.7;
  } else if (indirectEstimate.p50 > 0) {
    reconciled = indirectEstimate.p50;
    confidence = 0.4;
  } else {
    confidence = 0.0;
  }

  return {
    realBudget,
    indirectEstimate,
    reconciled,
    currency: "XAF",
    confidence,
    sources,
    computedAt: new Date().toISOString(),
  };
}

// ── validateExecution — Phase 0 stub ──────────────────────────────────

/**
 * Validate a planned execution against the strategy's financial capacity.
 * Phase 0: always allows (passthrough).
 * Phase 1 will implement real budget gating + downgrade suggestions.
 */
export async function validateExecution(
  intent: Intent,
  plannedCost: number,
): Promise<ValidationResult> {
  return { ok: true };
}

// ── reconcileActual — Phase 1 ─────────────────────────────────────────

/**
 * Record actual cost after execution. Updates AICostLog or campaign budget.
 * Phase 0: no-op.
 */
export async function reconcileActual(
  intent: Intent,
  actualCost: number,
): Promise<void> {
  /* no-op until Phase 1 */
}

// ── computeDealValue — replaces estimateDealValue() in quick-intake ──

/**
 * Compute the CRM deal value for a strategy.
 *
 * Priority:
 *   1. If Strategy.financialCapacity is populated → use reconciled budget
 *      multiplied by typical agency-take % (heuristic: 25% of marketing budget)
 *   2. Otherwise fall back to the old sector × business-model multiplier
 *      table (kept for backward compatibility while data is sparse)
 *
 * This decouples the CRM lead value from a fictional multiplier and grounds
 * it in the brand's stated or estimated financial capacity.
 */
export async function computeDealValue(args: {
  strategyId?: string;
  sector?: string | null;
  businessModel?: string | null;
}): Promise<number> {
  // Try to read financialCapacity from the strategy
  if (args.strategyId) {
    try {
      const { db } = await import("@/lib/db");
      const strategy = await db.strategy.findUnique({
        where: { id: args.strategyId },
        select: { financialCapacity: true },
      });
      const cap = strategy?.financialCapacity as FinancialCapacity | null;
      if (cap && cap.reconciled > 0 && cap.confidence > 0.3) {
        // Agency take ~25% of total marketing budget over engagement
        return Math.round(cap.reconciled * 0.25);
      }
    } catch {
      /* fall through to heuristic */
    }
  }

  // Heuristic fallback (preserves prior behavior)
  const baseValues: Record<string, number> = {
    FMCG: 5_000_000,
    BANQUE: 15_000_000,
    STARTUP: 2_000_000,
    TECH: 8_000_000,
    RETAIL: 4_000_000,
    HOSPITALITY: 6_000_000,
    EDUCATION: 3_000_000,
  };
  const modelMultiplier: Record<string, number> = {
    B2C: 1.0,
    B2B: 1.5,
    B2B2C: 1.3,
    D2C: 0.8,
    MARKETPLACE: 1.2,
  };
  const base = baseValues[args.sector ?? ""] ?? 5_000_000;
  const mult = modelMultiplier[args.businessModel ?? ""] ?? 1.0;
  return Math.round(base * mult);
}
