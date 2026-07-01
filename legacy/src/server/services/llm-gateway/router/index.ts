/**
 * llm-gateway/router — Phase 5 smart routing matrix.
 *
 * Picks the model based on (qualityTier, latencyBudgetMs, costCeilingUsd)
 * declared on the manifest capability. Thot can override (DOWNGRADE) when
 * the operator is over-budget.
 *
 * The actual provider invocation lives in llm-gateway/index.ts (v4).
 * Phase 5 adds this thin selector that v4 then consults.
 */

export type QualityTier = "S" | "A" | "B" | "C";
export type CostCeiling = "PREMIUM" | "STANDARD" | "LITE";

export interface RouteContext {
  intentKind: string;
  qualityTier?: QualityTier;
  costCeiling?: CostCeiling;
  latencyBudgetMs?: number;
  costRemainingUsd?: number;
}

export interface RoutedModel {
  provider: "anthropic" | "openai" | "ollama";
  model: string;
  reason: string;
}

const MATRIX: Record<QualityTier, RoutedModel> = {
  S: { provider: "anthropic", model: "claude-opus-4-7", reason: "qualityTier=S → Opus 4.7" },
  A: { provider: "anthropic", model: "claude-sonnet-4-6", reason: "qualityTier=A → Sonnet 4.6" },
  B: { provider: "openai", model: "gpt-4o-mini", reason: "qualityTier=B → GPT-4o-mini" },
  C: { provider: "anthropic", model: "claude-haiku-4-5-20251001", reason: "qualityTier=C → Haiku 4.5" },
};

const FAST_FALLBACK: RoutedModel = {
  provider: "anthropic",
  model: "claude-haiku-4-5-20251001",
  reason: "latencyBudget < 2000ms → Haiku",
};

const OFFLINE_FALLBACK: RoutedModel = {
  provider: "ollama",
  model: "llama3:8b",
  reason: "cost ceiling exhausted → Ollama local",
};

export function routeModel(ctx: RouteContext): RoutedModel {
  // 1. Hard latency budget — Haiku is the only sub-2s model.
  if (typeof ctx.latencyBudgetMs === "number" && ctx.latencyBudgetMs < 2000) {
    return FAST_FALLBACK;
  }

  // 2. Capacity exhausted (Thot signal) — local model.
  if (typeof ctx.costRemainingUsd === "number" && ctx.costRemainingUsd <= 0.01) {
    return OFFLINE_FALLBACK;
  }

  // 3. Quality tier matrix.
  if (ctx.qualityTier) {
    const r = MATRIX[ctx.qualityTier];
    if (r) return r;
  }

  // 4. Default — Sonnet.
  return MATRIX.A!;
}
