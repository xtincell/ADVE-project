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
  const { anthropic } = await import("@ai-sdk/anthropic");
  const { generateText } = await import("ai");

  const model = options.model ?? DEFAULT_MODEL;

  const result = await withRetry(async () => {
    const { text, usage } = await generateText({
      model: anthropic(model),
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

  return result;
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
