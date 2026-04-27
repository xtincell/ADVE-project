/**
 * LLM Gateway — Central nervous system for all LLM interactions
 *
 * NETERU Architecture:
 *   Every LLM call in the system passes through this gateway.
 *   Commandant (Mestor) remains the strategic decision-maker,
 *   but the gateway is the TECHNICAL pathway — retry, cost tracking,
 *   model selection, caller tagging.
 *
 * Exports:
 *   callLLM()          — raw text response (for callers that parse themselves)
 *   callLLMAndParse()  — text → JSON extraction (most common)
 *   extractJSON()      — standalone JSON parser (3-step robust)
 *   withRetry()        — exponential backoff wrapper
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface GatewayCallOptions {
  /** System prompt */
  system: string;
  /** User prompt */
  prompt: string;
  /** Who is calling — used for cost tracking context (e.g. "artemis:fw-01", "mestor:insights") */
  caller: string;
  /** Strategy ID for cost tracking. If omitted, cost is not tracked. */
  strategyId?: string;
  /** Model override. Default: claude-sonnet-4-20250514 */
  model?: string;
  /** Max tokens. Default: 6000 */
  maxTokens?: number;
  /** Optional tags for analytics grouping */
  tags?: string[];
}

export interface GatewayResult {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 6000;

// Pricing per 1M tokens (Sonnet 4)
const INPUT_PRICE_PER_M = 3;
const OUTPUT_PRICE_PER_M = 15;

// v4 — Model priority for budget downgrade (cheaper = higher index)
const MODEL_PRIORITY = ["claude-opus-4-6", "claude-opus-4-20250514", "claude-sonnet-4-6", "claude-sonnet-4-20250514", "claude-haiku-4-5", "claude-haiku-4-5-20251001"];

// ── v4 — Multi-vendor LLM provider abstraction ────────────────────────────

type LLMProvider = "anthropic" | "openai" | "ollama";

interface ProviderState {
  available: boolean;
  priority: number;
  failureCount: number;
  circuitOpenUntil: number; // Unix ms, 0 = closed
}

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_MS = 30_000;

const providerStates: Record<LLMProvider, ProviderState> = {
  anthropic: {
    available: !!process.env.ANTHROPIC_API_KEY,
    priority: 1,
    failureCount: 0,
    circuitOpenUntil: 0,
  },
  openai: {
    available: !!process.env.OPENAI_API_KEY,
    priority: 2,
    failureCount: 0,
    circuitOpenUntil: 0,
  },
  ollama: {
    available: !!process.env.OLLAMA_BASE_URL,
    priority: 3,
    failureCount: 0,
    circuitOpenUntil: 0,
  },
};

function selectProvider(): LLMProvider | null {
  const now = Date.now();
  const candidates = (Object.entries(providerStates) as [LLMProvider, ProviderState][])
    .filter(([, s]) => s.available && (s.circuitOpenUntil === 0 || s.circuitOpenUntil < now))
    .sort((a, b) => a[1].priority - b[1].priority);

  return candidates[0]?.[0] ?? null;
}

function recordProviderFailure(provider: LLMProvider): void {
  const state = providerStates[provider];
  state.failureCount++;
  if (state.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    state.circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
    console.warn(`[llm-gateway] Circuit breaker OPEN for ${provider} — will retry after ${CIRCUIT_BREAKER_RESET_MS / 1000}s`);
  }
}

function recordProviderSuccess(provider: LLMProvider): void {
  providerStates[provider].failureCount = 0;
  providerStates[provider].circuitOpenUntil = 0;
}

// ── Test-only hooks (named with underscore prefix to signal intent) ──
// These are exported solely for unit tests. Production callers use callLLM()
// which encapsulates the provider selection + circuit breaker logic.

export function _resetProvidersForTest(overrides?: Partial<Record<LLMProvider, Partial<ProviderState>>>): void {
  const defaults: Record<LLMProvider, ProviderState> = {
    anthropic: { available: !!process.env.ANTHROPIC_API_KEY, priority: 1, failureCount: 0, circuitOpenUntil: 0 },
    openai:    { available: !!process.env.OPENAI_API_KEY,    priority: 2, failureCount: 0, circuitOpenUntil: 0 },
    ollama:    { available: !!process.env.OLLAMA_BASE_URL,   priority: 3, failureCount: 0, circuitOpenUntil: 0 },
  };
  for (const key of Object.keys(defaults) as LLMProvider[]) {
    providerStates[key] = { ...defaults[key], ...(overrides?.[key] ?? {}) };
  }
}

export function _getProviderStateForTest(provider: LLMProvider): ProviderState {
  return { ...providerStates[provider] };
}

export const _selectProviderForTest: () => LLMProvider | null = selectProvider;
export const _recordProviderFailureForTest: (provider: LLMProvider) => void = recordProviderFailure;
export const _recordProviderSuccessForTest: (provider: LLMProvider) => void = recordProviderSuccess;
export const _CIRCUIT_BREAKER_THRESHOLD_FOR_TEST = CIRCUIT_BREAKER_THRESHOLD;
export const _CIRCUIT_BREAKER_RESET_MS_FOR_TEST = CIRCUIT_BREAKER_RESET_MS;

// Model name mapping for OpenAI fallback
const OPENAI_MODEL_MAP: Record<string, string> = {
  "claude-sonnet-4-20250514": "gpt-4o",
  "claude-sonnet-4-6": "gpt-4o",
  "claude-opus-4-6": "gpt-4o",
  "claude-opus-4-20250514": "gpt-4o",
  "claude-haiku-4-5": "gpt-4o-mini",
  "claude-haiku-4-5-20251001": "gpt-4o-mini",
};

// ── withRetry — Exponential backoff ─────────────────────────────────────────

/**
 * Call an async function with exponential backoff retry.
 * Default: 2 retries, 1s base delay, 10s max delay.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 1000, maxDelayMs = 10000 } = options;

  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ── extractJSON — Robust 3-step parser ──────────────────────────────────────

/**
 * Extract JSON from an LLM response. Handles 3 cases:
 *   1. Pure JSON (no markdown)
 *   2. JSON inside ```json ... ``` markdown block
 *   3. JSON embedded in text (balanced braces)
 *
 * Throws if no valid JSON found.
 */
export function extractJSON(text: string): Record<string, unknown> | unknown[] {
  const trimmed = text.trim();

  // Step 1: Try direct parse (LLM returned pure JSON)
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null) return parsed;
  } catch {
    // Not pure JSON — continue
  }

  // Step 2: Try markdown code block extraction
  const mdMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch?.[1]) {
    try {
      const parsed = JSON.parse(mdMatch[1].trim());
      if (typeof parsed === "object" && parsed !== null) return parsed;
    } catch {
      // Invalid JSON in markdown block — continue
    }
  }

  // Step 3: Find first balanced { ... } or [ ... ] in the text
  const balanced = findBalancedJSON(trimmed);
  if (balanced) {
    try {
      const parsed = JSON.parse(balanced);
      if (typeof parsed === "object" && parsed !== null) return parsed;
    } catch {
      // Balanced braces but invalid JSON — continue
    }
  }

  throw new Error(
    `extractJSON: impossible de parser la réponse LLM (${trimmed.length} chars). ` +
    `Début: "${trimmed.slice(0, 100)}..."`
  );
}

function findBalancedJSON(text: string): string | null {
  const startObj = text.indexOf("{");
  const startArr = text.indexOf("[");

  let start: number;
  let openChar: string;
  let closeChar: string;

  if (startObj >= 0 && (startArr < 0 || startObj < startArr)) {
    start = startObj;
    openChar = "{";
    closeChar = "}";
  } else if (startArr >= 0) {
    start = startArr;
    openChar = "[";
    closeChar = "]";
  } else {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i]!;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === openChar) depth++;
    if (char === closeChar) depth--;

    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }

  return null; // Unbalanced
}

// ── Cost tracking helper ────────────────────────────────────────────────────

async function trackCost(
  options: GatewayCallOptions,
  usage: { promptTokens: number; completionTokens: number },
  model: string,
): Promise<void> {
  if (!options.strategyId) return;

  try {
    const { db } = await import("@/lib/db");
    await db.aICostLog.create({
      data: {
        strategyId: options.strategyId,
        provider: "anthropic",
        model,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        cost:
          (usage.promptTokens / 1_000_000) * INPUT_PRICE_PER_M +
          (usage.completionTokens / 1_000_000) * OUTPUT_PRICE_PER_M,
        context: options.caller,
      },
    });
  } catch {
    // Non-blocking — cost tracking should never break the flow
  }
}

// ── callLLM — Raw text response ─────────────────────────────────────────────

/**
 * Call Claude and return the raw text + usage.
 * Use this when you need to parse the response yourself.
 */
export async function callLLM(options: GatewayCallOptions): Promise<GatewayResult> {
  const { generateText } = await import("ai");

  let model = options.model ?? DEFAULT_MODEL;

  // v4 — LLM budget governance: check budget before calling
  if (options.strategyId) {
    const { checkBudget } = await import("@/server/services/ai-cost-tracker");
    const budget = await checkBudget(options.strategyId);
    if (!budget.allowed) {
      throw new Error(`LLM budget exceeded for strategy ${options.strategyId}. Spent: ${(budget.utilization * 100).toFixed(0)}% of monthly cap.`);
    }
    // Auto-downgrade model if approaching budget limit
    if (budget.alertLevel !== "none" && MODEL_PRIORITY.indexOf(budget.suggestedModel) > MODEL_PRIORITY.indexOf(model)) {
      console.warn(`[llm-gateway] Budget ${budget.alertLevel}: downgrading ${model} → ${budget.suggestedModel} for strategy ${options.strategyId}`);
      model = budget.suggestedModel;
    }
  }
  let lastError: unknown;

  // Try providers in priority order
  const providersToTry: LLMProvider[] = [];
  let p = selectProvider();
  while (p) {
    providersToTry.push(p);
    // Mark temporarily unavailable to get next
    const prevOpen = providerStates[p].circuitOpenUntil;
    providerStates[p].circuitOpenUntil = Date.now() + 999999;
    p = selectProvider();
    providerStates[providersToTry[providersToTry.length - 1]!].circuitOpenUntil = prevOpen;
    if (providersToTry.length >= 3) break;
  }

  // Ensure at least anthropic is tried
  if (providersToTry.length === 0) providersToTry.push("anthropic");

  for (const provider of providersToTry) {
    try {
      const result = await withRetry(async () => {
        let aiModel;
        if (provider === "anthropic") {
          const { anthropic } = await import("@ai-sdk/anthropic");
          aiModel = anthropic(model);
        } else if (provider === "openai") {
          const { openai } = await import("@ai-sdk/openai");
          const openaiModel = OPENAI_MODEL_MAP[model] ?? "gpt-4o";
          aiModel = openai(openaiModel);
        } else {
          // Ollama via OpenAI-compatible API
          const { createOpenAI } = await import("@ai-sdk/openai");
          const ollama = createOpenAI({ baseURL: process.env.OLLAMA_BASE_URL });
          aiModel = ollama(model);
        }

        const { text, usage } = await generateText({
          model: aiModel as Parameters<typeof generateText>[0]["model"],
          system: options.system,
          prompt: options.prompt,
          maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        });

        const gatewayUsage = {
          promptTokens: usage?.promptTokens ?? 0,
          completionTokens: usage?.completionTokens ?? 0,
        };

        // Non-blocking cost tracking
        trackCost(options, gatewayUsage, model);

        return { text, usage: gatewayUsage };
      });

      recordProviderSuccess(provider);
      return result;
    } catch (err) {
      lastError = err;
      recordProviderFailure(provider);
      console.warn(`[llm-gateway] Provider ${provider} failed, trying next...`, err instanceof Error ? err.message : err);
    }
  }

  throw lastError ?? new Error("All LLM providers failed");
}

// ── callLLMAndParse — Text → JSON ───────────────────────────────────────────

/**
 * Call Claude with retry + cost tracking + extractJSON.
 * Returns parsed JSON from the LLM response.
 * This is the most common pattern in the codebase.
 */
export async function callLLMAndParse(
  options: GatewayCallOptions,
): Promise<Record<string, unknown>> {
  const { text } = await callLLM(options);
  return extractJSON(text) as Record<string, unknown>;
}
