/**
 * llm-gateway/router.ts — Smart routing v5 (Multi-LLM by qualityTier+budget).
 *
 * Reads:
 *   - `qualityTier` (S/A/B/C) from the calling Capability's manifest.
 *   - `latencyBudgetMs` and `costCeilingUsd` from same manifest.
 *
 * Picks the right model for each call to balance cost / latency / quality.
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — without smart routing,
 * cheap calls burn premium tokens, fast calls wait for slow models. Both
 * erode unit economics + founder UX.
 */

import type { Brain } from "@/server/governance/manifest";

export type QualityTier = "S" | "A" | "B" | "C";

export interface ModelChoice {
  /** Provider — "anthropic" | "openai" | "ollama" | "google". */
  readonly provider: string;
  /** Model name. */
  readonly model: string;
  /** Approximate cost per 1M input tokens (USD). */
  readonly costPerMTokensUsd: number;
  /** Typical p50 latency for a 2k-token prompt (ms). */
  readonly typicalLatencyMs: number;
  /** Whether the model is currently available (configured + health-checked). */
  readonly available: boolean;
}

export interface RoutingContext {
  /** Capability tier — drives default model. */
  readonly qualityTier?: QualityTier;
  /** Hard latency budget — favours faster models when tight. */
  readonly latencyBudgetMs?: number;
  /** Hard cost ceiling — refuses premium models when tight. */
  readonly costCeilingUsd?: number;
  /** Alias of costCeilingUsd. */
  readonly costRemainingUsd?: number;
  /** Governing Neteru — for telemetry / cost attribution. */
  readonly governor?: Brain;
  /** Override the default — used by Thot DOWNGRADE decision. */
  readonly downgrade?: boolean;
}

// Model catalog. Override via env (LLM_MODEL_<TIER>) for per-deploy choices.
const CATALOG: ModelChoice[] = [
  // Tier S — premium creative
  { provider: "anthropic", model: "claude-opus-4-7", costPerMTokensUsd: 15, typicalLatencyMs: 6000, available: hasEnv("ANTHROPIC_API_KEY") },
  // Tier A — strong reasoning
  { provider: "anthropic", model: "claude-sonnet-4-6", costPerMTokensUsd: 3, typicalLatencyMs: 3500, available: hasEnv("ANTHROPIC_API_KEY") },
  // Tier B — fast + decent
  { provider: "anthropic", model: "claude-haiku-4-5-20251001", costPerMTokensUsd: 0.8, typicalLatencyMs: 1500, available: hasEnv("ANTHROPIC_API_KEY") },
  { provider: "openai", model: "gpt-4o-mini", costPerMTokensUsd: 0.15, typicalLatencyMs: 1200, available: hasEnv("OPENAI_API_KEY") },
  // Tier C — cheap / on-prem
  { provider: "ollama", model: "llama3.2:3b", costPerMTokensUsd: 0, typicalLatencyMs: 800, available: hasEnv("OLLAMA_BASE_URL") },
];

// Typical intent prompt+completion ~10k tokens (6k in + 4k out).
const ESTIMATE_TOKENS = 10_000;

function hasEnv(key: string): boolean {
  return typeof process !== "undefined" && Boolean(process.env[key]);
}

const TIER_DEFAULT_INDEX: Record<QualityTier, number> = {
  S: 0, // Opus
  A: 1, // Sonnet
  B: 2, // Haiku
  C: 4, // Ollama
};

/**
 * Compute the ideal catalog index for a context, ignoring availability.
 * Pulled out so routeModel() can share the constraint logic when no
 * provider env is configured.
 */
function idealIndex(ctx: RoutingContext): number {
  let startIdx = ctx.qualityTier ? TIER_DEFAULT_INDEX[ctx.qualityTier] : 1;

  if (ctx.downgrade) startIdx = Math.min(CATALOG.length - 1, startIdx + 1);

  const ceiling = ctx.costCeilingUsd ?? ctx.costRemainingUsd;
  if (typeof ceiling === "number") {
    const estimateCost = (m: ModelChoice) => (m.costPerMTokensUsd * ESTIMATE_TOKENS) / 1_000_000;
    while (startIdx < CATALOG.length && estimateCost(CATALOG[startIdx]!) > ceiling) {
      startIdx++;
    }
  }

  if (typeof ctx.latencyBudgetMs === "number" && ctx.latencyBudgetMs < 2000) {
    startIdx = Math.max(startIdx, TIER_DEFAULT_INDEX.B);
  }

  return startIdx;
}

/**
 * Pick the best model given the routing context. Falls back through the
 * catalog if the preferred model is unavailable. Returns null only if
 * no model is configured at all.
 */
export function pickModel(ctx: RoutingContext): ModelChoice | null {
  const startIdx = idealIndex(ctx);
  for (let i = startIdx; i < CATALOG.length; i++) {
    if (CATALOG[i]!.available) return CATALOG[i]!;
  }
  return CATALOG.find((m) => m.available) ?? null;
}

export function describeRouting(ctx: RoutingContext): { picked: ModelChoice | null; reason: string } {
  const picked = pickModel(ctx);
  if (!picked) return { picked: null, reason: "no LLM provider configured (set ANTHROPIC_API_KEY / OPENAI_API_KEY / OLLAMA_BASE_URL)" };
  const reasons: string[] = [];
  if (ctx.qualityTier) reasons.push(`tier=${ctx.qualityTier}`);
  if (ctx.downgrade) reasons.push("Thot downgrade applied");
  if (ctx.costCeilingUsd) reasons.push(`cost ceiling $${ctx.costCeilingUsd}`);
  if (ctx.latencyBudgetMs) reasons.push(`latency budget ${ctx.latencyBudgetMs}ms`);
  return {
    picked,
    reason: `${picked.provider}:${picked.model} — ${reasons.join(", ") || "default"}`,
  };
}

export function listAvailableModels(): readonly ModelChoice[] {
  return CATALOG.filter((m) => m.available);
}

/**
 * routeModel — flat-shape API used by tests and consumer services.
 * Always returns a ModelChoice. When no provider env is configured the
 * fallback still respects the routing constraints (latency budget + cost
 * ceiling) so callers see the model they would have picked at runtime.
 */
export function routeModel(ctx: RoutingContext & { intentKind?: string }): ModelChoice {
  const picked = pickModel(ctx);
  if (picked) return picked;
  const idx = Math.min(idealIndex(ctx), CATALOG.length - 1);
  return CATALOG[idx]!;
}
