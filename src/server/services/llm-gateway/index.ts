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

/**
 * The *purpose* of an LLM call — drives the exact model + provider chosen.
 *
 * The mental model is "fixed model per scenario", not abstract quality tiers:
 * each entry below corresponds to a concrete production scenario and resolves
 * to a specific Anthropic model name (and optionally an Ollama substitute
 * when the local server is configured).
 *
 *   - "final-report"
 *       Final written deliverable handed to the founder/client. Always Opus,
 *       never substituted. This is what the operator has paid for.
 *
 *   - "agent" / "intermediate"
 *       Background reasoning — recommendation generation, narrative section
 *       drafting, brand-level evaluation, batch tooling. Sonnet by default,
 *       but Ollama replaces it when `OLLAMA_BASE_URL` is set, to preserve
 *       Anthropic budget for the final report.
 *
 *   - "intake-followup"
 *       Adaptive question generation during the public intake funnel. Haiku
 *       by default (cheap), with Ollama substitution when configured.
 *
 *   - "extraction"
 *       Structured-data extraction from user free-form (parsing intake
 *       responses into pillar fields, classifying signals, etc.). Sonnet by
 *       default with Ollama substitution. Counts as `intermediate`.
 *
 * Embedding calls are NOT routed through this gateway — they live in
 * `seshat/embeddings` and use a dedicated embedding model.
 */
export type GatewayPurpose =
  | "final-report"
  | "agent"
  | "intermediate"
  | "intake-followup"
  | "extraction";

export interface GatewayCallOptions {
  /** System prompt */
  system: string;
  /** User prompt */
  prompt: string;
  /** Who is calling — used for cost tracking context (e.g. "artemis:fw-01", "mestor:insights") */
  caller: string;
  /** Strategy ID for cost tracking. If omitted, cost is not tracked. */
  strategyId?: string;
  /** Model override. Default: derived from `purpose` (or DEFAULT_MODEL if no purpose). */
  model?: string;
  /**
   * Ollama model override — bypasses the policy's `ollamaModel` for THIS call
   * only. Routes a specific flow to a faster/smaller local model (e.g. the
   * I-pillar catalogue uses `hermes3:8b` at 4K ctx instead of the slow
   * 64K-context `hermes3-ctx` that spills to CPU on an 8 GB GPU). Ignored
   * when the served provider isn't Ollama.
   */
  ollamaModel?: string;
  /**
   * Concrete scenario this call serves — see GatewayPurpose doc. Drives
   * BOTH the default model AND whether Ollama can substitute. When omitted
   * the call is treated as `agent` to preserve the pre-purpose behaviour.
   */
  purpose?: GatewayPurpose;
  /** Max tokens. Default: 6000 */
  maxOutputTokens?: number;
  /** Optional tags for analytics grouping */
  tags?: string[];
  /**
   * Forces a JSON-only response when the underlying provider supports it
   * natively (OpenAI / Ollama via OpenAI-compatible API). Anthropic has no
   * native json_mode through the `ai` SDK — for Anthropic we rely on the
   * caller building a strict system prompt (see `executeStructuredLLMCall`
   * in `utils/llm-structured.ts`). Default: "text".
   *
   * Cf. ADR-0067 — F-A3 LLM Gateway responseFormat extension.
   */
  responseFormat?: "text" | "json_object";
  /** Control the creativity and determinism of the output. 0.0 = deterministic/coercive, 1.0 = creative. */
  temperature?: number;
  /**
   * Optional abort signal forwarded to the underlying `generateText` call.
   * Lets a caller bound a slow/hung provider with a real timeout (e.g. the
   * public intake extraction, which must return well within the serverless
   * budget). When it fires the provider attempt rejects and the gateway stops
   * the provider fallback instead of wandering across vendors.
   */
  signal?: AbortSignal;
}

export interface GatewayResult {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_MAX_TOKENS = 6000;

/**
 * Hard-coded fallback policy used ONLY when the governed `ModelPolicy`
 * registry cannot be reached (DB down at boot, fresh checkout pre-seed,
 * unit tests with no DB). Production policy lives in the `ModelPolicy`
 * Prisma table and is mutated through the `UPDATE_MODEL_POLICY` Intent.
 *
 * Keeping this fallback in code is deliberate: an LLM Gateway that crashes
 * because the policy table is unreachable is worse than one that uses a
 * known-safe default for the duration of the outage.
 */
const FALLBACK_POLICY: Record<GatewayPurpose, {
  anthropicModel: string;
  ollamaModel: string | null;
  allowOllamaSubstitution: boolean;
}> = {
  "final-report":     { anthropicModel: "claude-opus-4-20250514",   ollamaModel: null,                allowOllamaSubstitution: false },
  "agent":            { anthropicModel: "claude-sonnet-5",          ollamaModel: "llama3.1:70b",      allowOllamaSubstitution: true  },
  "intermediate":     { anthropicModel: "claude-sonnet-5",          ollamaModel: "llama3.1:70b",      allowOllamaSubstitution: true  },
  "intake-followup":  { anthropicModel: "claude-haiku-4-5-20251001", ollamaModel: "llama3.1:8b",      allowOllamaSubstitution: true  },
  "extraction":       { anthropicModel: "claude-sonnet-5",          ollamaModel: "llama3.1:70b",      allowOllamaSubstitution: true  },
};

// Pricing per 1M tokens (Sonnet 5 — sticker $3/$15, inchangé vs Sonnet 4.x)
const INPUT_PRICE_PER_M = 3;
const OUTPUT_PRICE_PER_M = 15;

// v4 — Model priority for budget downgrade (cheaper = higher index)
const MODEL_PRIORITY = ["claude-opus-4-6", "claude-opus-4-20250514", "claude-sonnet-5", "claude-haiku-4-5", "claude-haiku-4-5-20251001"];

// ── v4 — Multi-vendor LLM provider abstraction ────────────────────────────

type LLMProvider = "anthropic" | "openai" | "ollama" | "openrouter";

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
  // OpenRouter — last-resort cloud fallback (OpenAI-API-compatible) so the OS
  // keeps reasoning when Anthropic AND OpenAI are both down/unkeyed.
  openrouter: {
    available: !!process.env.OPENROUTER_API_KEY,
    priority: 4,
    failureCount: 0,
    circuitOpenUntil: 0,
  },
};

function selectProvider(): LLMProvider | null {
  const now = Date.now();
  const candidates = (Object.entries(providerStates) as [LLMProvider, ProviderState][])
    // OpenAI/GPT exclu de la génération de texte — réservé aux embeddings
    // (directive opérateur). Le texte reste Anthropic → Ollama → OpenRouter.
    .filter(([p]) => p !== "openai")
    .filter(([, s]) => s.available && (s.circuitOpenUntil === 0 || s.circuitOpenUntil < now))
    .sort((a, b) => a[1].priority - b[1].priority);

  return candidates[0]?.[0] ?? null;
}

/**
 * Returns true iff the provider is currently available (key present + circuit closed).
 */
function isProviderHealthy(p: LLMProvider): boolean {
  const s = providerStates[p];
  const now = Date.now();
  return s.available && (s.circuitOpenUntil === 0 || s.circuitOpenUntil < now);
}

/**
 * Signal canonique « le step LLM vaut-il la peine d'être tenté ? ».
 *
 * Renvoie `true` ssi AU MOINS un provider de **texte** est sain (clé présente +
 * circuit fermé). OpenAI est exclu (réservé aux embeddings, cf. selectProvider).
 *
 * C'est le seul point où le reste de La Fusée décide de **sauter** l'étage LLM
 * proprement, sans partir à l'aveugle et se prendre une exception. Toute
 * mécanique « DB d'abord, LLM ensuite (découplé, skippable) » — notamment le
 * Knowledge Gateway de Seshat — s'appuie là-dessus.
 */
export function isTextLLMAvailable(): boolean {
  return (["anthropic", "ollama", "openrouter"] as const).some((p) => isProviderHealthy(p));
}

function recordProviderFailure(provider: LLMProvider, forceTrip = false): void {
  const state = providerStates[provider];
  state.failureCount++;
  if (state.failureCount >= CIRCUIT_BREAKER_THRESHOLD || forceTrip) {
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
    anthropic:  { available: !!process.env.ANTHROPIC_API_KEY,  priority: 1, failureCount: 0, circuitOpenUntil: 0 },
    openai:     { available: !!process.env.OPENAI_API_KEY,     priority: 2, failureCount: 0, circuitOpenUntil: 0 },
    ollama:     { available: !!process.env.OLLAMA_BASE_URL,    priority: 3, failureCount: 0, circuitOpenUntil: 0 },
    openrouter: { available: !!process.env.OPENROUTER_API_KEY, priority: 4, failureCount: 0, circuitOpenUntil: 0 },
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

// Model name mapping for OpenAI fallback.
// CORRECTION résilience : les anciennes valeurs `gpt-5.5` / `gpt-5.5-mini`
// cassaient le fallback — `gpt-5.5-mini` n'existe pas (404 "model does not
// exist") et `gpt-5.5` rejette `max_tokens` (400, exige `max_completion_tokens`
// que le SDK n'envoie pas via maxOutputTokens). Résultat : quand Anthropic
// tombait (ex. crédits épuisés), TOUTE requête LLM échouait au lieu de basculer.
// gpt-4o / gpt-4o-mini sont confirmés 200 avec le chemin d'appel courant.
const OPENAI_MODEL_MAP: Record<string, string> = {
  "claude-sonnet-5": "gpt-4o",
  "claude-opus-4-6": "gpt-4o",
  "claude-opus-4-7": "gpt-4o",
  "claude-opus-4-8": "gpt-4o",
  "claude-opus-4-20250514": "gpt-4o",
  "claude-haiku-4-5": "gpt-4o-mini",
  "claude-haiku-4-5-20251001": "gpt-4o-mini",
};

// Chaîne de repli — modèles 100 % GRATUITS OpenRouter, testés live disponibles
// (2026-06-30, real-output check). Parcourus dans l'ordre quand le modèle courant
// n'a "aucun endpoint" / renvoie 404 / 429. Reste sur OpenRouter et GRATUIT
// (doctrine « La Fusée ne dépend d'aucun crédit LLM payant »). Surchargeable via
// OPENROUTER_FALLBACK_MODELS (CSV) — ex. pour pinner un modèle plus puissant.
export const OPENROUTER_FALLBACK_MODELS: string[] = process.env.OPENROUTER_FALLBACK_MODELS
  ? process.env.OPENROUTER_FALLBACK_MODELS.split(",").map((s) => s.trim()).filter(Boolean)
  : [
      "nvidia/nemotron-3-super-120b-a12b:free", // 120B MoE, ctx 1M, ~1.5s
      "openai/gpt-oss-120b:free", // 120B, fort suivi d'instructions, ctx 131K
      "google/gemma-4-26b-a4b-it:free", // Gemma 4, ctx 262K, rapide
      "nvidia/nemotron-3-nano-30b-a3b:free", // 30B MoE, dernier recours rapide
    ];

// ── DÉFAUT OPENROUTER CENTRALISÉ — pinnable via `OPENROUTER_MODEL` ──────────
// Architecture opérateur 2026-07-16 : le provider texte PRIMAIRE est Ollama
// Cloud (OLLAMA_BASE_URL + OLLAMA_API_KEY + OLLAMA_MODEL) ; OpenRouter n'est
// plus qu'un REPLI. L'ancien défaut `openrouter/owl-alpha` (preview) n'est
// PLUS SERVI par OpenRouter → un défaut mort forçait chaque appel à brûler un
// aller-retour 404 avant la chaîne de repli. Défaut sain : la tête de la
// chaîne gratuite ci-dessus.
export const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? OPENROUTER_FALLBACK_MODELS[0]!;

function resolveOpenRouterModel(_policyModel: string): string {
  // Un seul modèle OpenRouter pour TOUT le texte — le modèle de police
  // (anthropicModel) n'est consulté que sur le chemin premium (Anthropic réel).
  return DEFAULT_OPENROUTER_MODEL;
}

/**
 * Premium mode toggle (`LLM_PREMIUM_MODE`).
 *
 * La Fusée's DEFAULT text model is owl-alpha (free, served via OpenRouter) — the
 * OS is non-dependent on paid LLM credits. When the operator loads Anthropic /
 * OpenAI credits, flip `LLM_PREMIUM_MODE` ON to promote the paid Anthropic
 * models (Opus / Sonnet) to the front of the provider order. OFF (default) →
 * owl-alpha first. An explicit `LLM_PRIMARY_PROVIDER` always wins over both.
 *
 * Env-driven so it can be toggled per-deploy without a migration; reading it per
 * call is free (env lookup). A future runtime (no-redeploy) toggle would live in
 * the governed `ModelPolicy` table.
 */
export function isPremiumMode(): boolean {
  return ["1", "true", "yes", "on"].includes((process.env.LLM_PREMIUM_MODE ?? "").trim().toLowerCase());
}

/**
 * Resolve the text-provider try-order (pure). Encodes l'architecture opérateur
 * 2026-07-16 « Ollama Cloud primaire, OpenRouter repli » :
 *   1. explicit `LLM_PRIMARY_PROVIDER` (when in candidates) → head (operator wins).
 *   2. premium ON → candidates unchanged (Anthropic-first, historical order).
 *   3. premium OFF (default) → Ollama (Cloud ou local, gratuit/forfaitaire) en
 *      tête quand configuré ; sinon OpenRouter. Anthropic reste le dernier repli
 *      — le chemin nominal ne touche aucun crédit payant.
 */
function resolveTextProviderOrder(
  candidates: LLMProvider[],
  opts: { premium: boolean; explicitPrimary?: LLMProvider },
): LLMProvider[] {
  const explicit =
    opts.explicitPrimary && candidates.includes(opts.explicitPrimary) ? opts.explicitPrimary : undefined;
  const fallbackPrimary: LLMProvider | undefined = opts.premium
    ? undefined
    : candidates.includes("ollama")
      ? "ollama"
      : "openrouter";
  const primary =
    explicit ?? (fallbackPrimary && candidates.includes(fallbackPrimary) ? fallbackPrimary : undefined);
  return primary ? [primary, ...candidates.filter((p) => p !== primary)] : candidates;
}

/** Test-only string-typed wrapper around `resolveTextProviderOrder`. */
export function _resolveTextProviderOrderForTest(
  candidates: string[],
  opts: { premium: boolean; explicitPrimary?: string },
): string[] {
  return resolveTextProviderOrder(candidates as LLMProvider[], {
    premium: opts.premium,
    explicitPrimary: opts.explicitPrimary as LLMProvider | undefined,
  });
}

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
      const errStr = String(err instanceof Error ? err.message : err).toLowerCase();
      // An aborted call (caller's bounded timeout fired) fails fast — no backoff,
      // no point retrying an already-cancelled signal.
      const isHardFailure =
        errStr.includes("credit balance") || errStr.includes("insufficient_quota") ||
        errStr.includes("429") || errStr.includes("abort");
      if (isHardFailure) throw err; // Hard fail immediately, skip backoff

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
  usage: { inputTokens: number; outputTokens: number },
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
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cost:
          (usage.inputTokens / 1_000_000) * INPUT_PRICE_PER_M +
          (usage.outputTokens / 1_000_000) * OUTPUT_PRICE_PER_M,
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

  // ── Resolve policy from the governed registry ────────────────────────
  // The mapping `purpose → (anthropic model, ollama model, substitution)`
  // lives in the `ModelPolicy` Prisma table and is mutated through the
  // `UPDATE_MODEL_POLICY` Intent. Reading it on every call is fine — the
  // service caches results in-memory (60s LRU) so the DB sees one query
  // per minute per purpose. If the lookup throws (DB outage, fresh
  // checkout pre-seed), we fall back to the in-code FALLBACK_POLICY so
  // the OS keeps reasoning instead of hard-failing the request.
  const purpose: GatewayPurpose = options.purpose ?? "agent";
  const { resolvePolicy } = await import("@/server/services/model-policy");
  const policy = await resolvePolicy(purpose).catch(() => FALLBACK_POLICY[purpose]);

  // The caller can still override `model` explicitly — that takes
  // precedence over the policy. Useful for tests and one-off experiments
  // (e.g. trying Opus for an agent call to compare quality).
  let anthropicModel = options.model ?? policy.anthropicModel;
  const ollamaModel = policy.ollamaModel;
  const ollamaPreferred =
    policy.allowOllamaSubstitution && providerStates.ollama.available && !!ollamaModel;

  // v4 — LLM budget governance: check budget before calling.
  // Budget downgrades only apply to the Anthropic model name; Ollama
  // substitution is free so it's never affected.
  if (options.strategyId) {
    const { checkBudget } = await import("@/server/services/ai-cost-tracker");
    const budget = await checkBudget(options.strategyId);
    if (!budget.allowed) {
      throw new Error(`LLM budget exceeded for strategy ${options.strategyId}. Spent: ${(budget.utilization * 100).toFixed(0)}% of monthly cap.`);
    }
    if (budget.alertLevel !== "none" && MODEL_PRIORITY.indexOf(budget.suggestedModel) > MODEL_PRIORITY.indexOf(anthropicModel)) {
      console.warn(`[llm-gateway] Budget ${budget.alertLevel}: downgrading ${anthropicModel} → ${budget.suggestedModel} for strategy ${options.strategyId}`);
      anthropicModel = budget.suggestedModel;
    }
  }
  let lastError: unknown;

  // Build the provider try-order from the policy.
  //   - When Ollama is both available AND the policy allows substitution,
  //     it's first (free local compute).
  //   - Anthropic is the canonical text-generation provider (Opus pour les
  //     grosses opérations, Sonnet pour le reste — cf. FALLBACK_POLICY).
  //   - OpenAI/GPT est VOLONTAIREMENT EXCLU de la génération de texte
  //     (directive opérateur 2026-06-24) : GPT est réservé aux EMBEDDINGS
  //     (cf. `embed()` / `selectEmbedProvider`). On ne convertit/génère jamais
  //     de texte avec ChatGPT — le texte reste Anthropic, avec Ollama (local)
  //     et OpenRouter (qui sert du Claude) comme seuls replis.
  const providersToTry: LLMProvider[] = [];
  if (ollamaPreferred && isProviderHealthy("ollama")) providersToTry.push("ollama");
  if (isProviderHealthy("anthropic")) providersToTry.push("anthropic");
  // OpenRouter — appended after Anthropic so it's only reached once Anthropic
  // (and Ollama if preferred) are unavailable. OpenRouter route vers Claude
  // (resolveOpenRouterModel → anthropic/claude-*), donc reste cohérent avec la
  // directive « texte = Anthropic ». Jamais OpenAI ici.
  if (isProviderHealthy("openrouter")) providersToTry.push("openrouter");
  // Ollama non-préféré reste un repli local valable avant le dernier recours.
  if (!ollamaPreferred && isProviderHealthy("ollama")) providersToTry.push("ollama");
  // Ensure at least anthropic is tried as the last-resort fallback.
  if (providersToTry.length === 0) providersToTry.push("anthropic");

  // ── Ordre des providers texte — Ollama Cloud primaire, premium opt-in ─────
  // Architecture opérateur 2026-07-16 : Ollama Cloud (OLLAMA_MODEL) est LE
  // provider texte ; OpenRouter est le repli. Ordre résolu par
  // resolveTextProviderOrder : `LLM_PRIMARY_PROVIDER` explicite > premium ON
  // `LLM_PREMIUM_MODE` (Anthropic d'abord, une fois les crédits chargés) >
  // défaut premium OFF (Ollama si configuré, sinon OpenRouter ; Anthropic en
  // dernier repli sans coût).
  const orderedProviders = resolveTextProviderOrder(providersToTry, {
    premium: isPremiumMode(),
    explicitPrimary: process.env.LLM_PRIMARY_PROVIDER as LLMProvider | undefined,
  });

  const { acquireSlot, releaseSlot } = await import("./rate-policy");

  for (const provider of orderedProviders) {
    try {
      const result = await withRetry(async () => {
        let aiModel;
        let orFallback: ((m: string) => unknown) | null = null;
        // Modèle effectivement servi — clé de la police de débit par modèle.
        let servedModel = anthropicModel;
        if (provider === "anthropic") {
          const { anthropic, createAnthropic } = await import("@ai-sdk/anthropic");
          if (process.env.HEADROOM_PROXY_URL) {
            const customAnthropic = createAnthropic({ baseURL: process.env.HEADROOM_PROXY_URL });
            aiModel = customAnthropic(anthropicModel);
          } else {
            aiModel = anthropic(anthropicModel);
          }
        } else if (provider === "openai") {
          const { openai, createOpenAI } = await import("@ai-sdk/openai");
          const openaiModel = OPENAI_MODEL_MAP[anthropicModel] ?? "gpt-4o";
          servedModel = openaiModel;
          if (process.env.HEADROOM_PROXY_URL) {
            const customOpenAI = createOpenAI({ baseURL: process.env.HEADROOM_PROXY_URL });
            aiModel = customOpenAI(openaiModel);
          } else {
            aiModel = openai(openaiModel);
          }
        } else if (provider === "openrouter") {
          // OpenRouter via its OpenAI-compatible endpoint. Model slug is
          // operator-pinnable via OPENROUTER_MODEL (slugs evolve). Optional
          // ranking headers are best-effort.
          const { createOpenAI } = await import("@ai-sdk/openai");
          const openrouter = createOpenAI({
            baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
            headers: {
              "HTTP-Referer": process.env.NEXTAUTH_URL ?? "https://lafusee.app",
              "X-Title": "La Fusee",
            },
          });
          servedModel = resolveOpenRouterModel(anthropicModel);
          aiModel = openrouter(servedModel);
          orFallback = (m: string) => openrouter(m); // repli intra-OpenRouter si owl-alpha sans endpoint
        } else {
          // Ollama — local OU Ollama Cloud (https://ollama.com/v1 + clé API).
          // createOpenAI accepte une apiKey (requise pour le cloud ; le local
          // accepte n'importe quelle valeur). Modèle : OLLAMA_MODEL (pin global
          // opérateur, ex. deepseek-v4-flash) > override par appel > police >
          // nom Claude. Le pin global GAGNE sur les overrides par-appel : ces
          // derniers épinglent des alias LOCAUX (hermes3-fast, hermes3:8b…)
          // taillés pour un GPU 8 GB — inexistants sur Ollama Cloud, ils
          // 404eraient chaque appel du chemin primaire.
          const { createOpenAI } = await import("@ai-sdk/openai");
          const ollama = createOpenAI({
            baseURL: process.env.OLLAMA_BASE_URL,
            apiKey: process.env.OLLAMA_API_KEY ?? "ollama",
          });
          servedModel = process.env.OLLAMA_MODEL ?? options.ollamaModel ?? ollamaModel ?? anthropicModel;
          aiModel = ollama(servedModel);
        }

        // ── F-A3 (ADR-0067) — responseFormat propagation ────────────────
        // OpenAI + Ollama (via OpenAI-compatible API) support `response_format`
        // natively. Anthropic via `@ai-sdk/anthropic` has no json_mode flag —
        // upstream callers MUST inject a strict JSON contract in `system` (cf.
        // executeStructuredLLMCall in utils/llm-structured.ts). We log a warn
        // here so any drift is surfaced.
        // Migration Sonnet 5 (RESIDUAL-DEBT ADR-0143 suite) — parité de
        // comportement : Sonnet 5 pense par défaut quand `thinking` est omis
        // (troncature possible sur maxOutputTokens court) et rejette une
        // `temperature` non-défaut en 400. On préserve le comportement 4.x.
        const anthropicSonnet5 = provider === "anthropic" && anthropicModel.startsWith("claude-sonnet-5");
        const baseProviderOptions =
          options.responseFormat === "json_object" && (provider === "openai" || provider === "ollama" || provider === "openrouter")
            ? { openai: { responseFormat: { type: "json_object" as const } } }
            : undefined;
        const providerOptions = anthropicSonnet5
          ? { ...(baseProviderOptions ?? {}), anthropic: { thinking: { type: "disabled" as const } } }
          : baseProviderOptions;
        if (options.responseFormat === "json_object" && provider === "anthropic") {
          // best-effort: rely on caller's system prompt; not a hard error.
          // Silent in tests, warn once otherwise.
          if (process.env.NODE_ENV !== "test") {
            console.warn(
              `[llm-gateway] responseFormat='json_object' requested but provider=anthropic has no native json_mode — caller=${options.caller}. Relying on system prompt.`,
            );
          }
        }

        // ── Headroom in-process (Vague 8) — compression de contexte locale,
        // déterministe et réversible, AVANT l'appel provider. Pass-through
        // intégral si gain nul / échec / désactivé (HEADROOM_DISABLED=1).
        const { applyHeadroom } = await import("./headroom");
        const hr = await applyHeadroom(options.system, options.prompt, anthropicModel);
        if (hr.applied) {
          console.log(
            `[llm-gateway/headroom] ${options.caller}: ${hr.tokensSaved} tokens économisés (ratio ${(hr.compressionRatio * 100).toFixed(0)}%)`,
          );
        }

        // ── Police de débit PAR MODÈLE — n'improvise jamais le RPS/RPM ──────
        // Acquiert un créneau pour le modèle effectivement servi (ex. owl-alpha
        // sur OpenRouter) ; attend si la limite RPM/concurrence/RPS est atteinte
        // plutôt que de partir et de se prendre un 429. Local au process.
        const callParams = {
          system: hr.system,
          prompt: hr.prompt,
          maxOutputTokens: options.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
          temperature: anthropicSonnet5 ? undefined : options.temperature,
          ...(options.signal ? { abortSignal: options.signal } : {}),
          ...(providerOptions ? { providerOptions } : {}),
        };
        const slotKey = await acquireSlot(servedModel);
        let text!: string;
        let usage!: Awaited<ReturnType<typeof generateText>>["usage"];
        let slotReleased = false;
        try {
          ({ text, usage } = await generateText({
            model: aiModel as Parameters<typeof generateText>[0]["model"],
            ...callParams,
          }));
        } catch (genErr) {
          // Repli intra-OpenRouter : owl-alpha (ou un modèle gratuit) renvoie
          // souvent "No endpoints found" / 404 / 429 sous charge → on parcourt la
          // chaîne de modèles GRATUITS jusqu'à ce qu'un réponde, au lieu de tout
          // faire échouer. Tout reste sur OpenRouter et gratuit.
          const unavailable = (m: string) =>
            /no endpoints found|not found|404|429|rate.?limit|provider returned error|overloaded|503|502/i.test(m);
          releaseSlot(slotKey);
          slotReleased = true;
          let lastErr: unknown = genErr;
          if (provider !== "openrouter" || orFallback == null || !unavailable(String((genErr as Error)?.message ?? genErr))) {
            throw genErr;
          }
          let recovered = false;
          for (const fb of OPENROUTER_FALLBACK_MODELS) {
            if (fb === servedModel) continue;
            console.warn(`[llm-gateway] ${servedModel} KO → repli gratuit ${fb}`);
            const fbSlot = await acquireSlot(fb);
            try {
              ({ text, usage } = await generateText({
                model: orFallback!(fb) as Parameters<typeof generateText>[0]["model"],
                ...callParams,
              }));
              servedModel = fb;
              recovered = true;
            } catch (e) {
              lastErr = e;
              // Erreur réelle du modèle (pas une indispo) → échec franc.
              if (!unavailable(String((e as Error)?.message ?? e))) throw e;
            } finally {
              releaseSlot(fbSlot);
            }
            if (recovered) break;
          }
          if (!recovered) throw lastErr;
        } finally {
          if (!slotReleased) releaseSlot(slotKey);
        }

        const gatewayUsage = {
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
        };

        // Non-blocking cost tracking. Use the actually-served model name
        // (anthropic name when on Anthropic/OpenAI, ollama name when free).
        const billedModel = provider === "ollama" ? servedModel : anthropicModel;
        trackCost(options, gatewayUsage, billedModel);

        // PostgreSQL jsonb refuse le null byte U+0000 ("unsupported Unicode escape
        // sequence") — un modèle peut en émettre un (brut, ou un littéral qui le devient
        // au JSON.parse aval) qui fait planter la persistance GloryOutput
        // (DriverAdapterError, trouvé par le scan fonctionnel : brand-audit-scanner).
        // On l'élimine à la source pour TOUS les consommateurs LLM.
        const cleanText = text.split(String.fromCharCode(0)).join("").replace(/\\u0000/g, "");
        return { text: cleanText, usage: gatewayUsage };
      });

      recordProviderSuccess(provider);
      return result;
    } catch (err) {
      lastError = err;
      const errStr = String(err instanceof Error ? err.message : err).toLowerCase();
      const isHardFailure = errStr.includes("credit balance") || errStr.includes("insufficient_quota") || errStr.includes("429");
      recordProviderFailure(provider, isHardFailure);
      console.warn(`[llm-gateway] Provider ${provider} failed, trying next...`, err instanceof Error ? err.message : err);
      // Caller-initiated abort (bounded timeout) — stop the fallback entirely;
      // the caller asked us to give up, not to try another vendor.
      if (errStr.includes("abort")) break;
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

// ── embed — Vector embeddings (multi-provider) ──────────────────────────────
//
// Provider priority (data-sovereignty first):
//   1. Ollama  (OLLAMA_BASE_URL set)  → nomic-embed-text default (768 dims)
//   2. OpenAI  (OPENAI_API_KEY set)   → text-embedding-3-small  (1536 dims)
//   3. None                            → no-op (empty arrays, graceful)
//
// The selected provider is reported in EmbedResult.provider/model so callers
// (and the BrandContextNode schema) can avoid mixing different-dim vectors
// in a similarity search.
//
// Override via options.provider or options.model. The default chain is the
// safest for a SaaS that values data residency: local-first, fall back if
// Ollama unreachable, no-op if neither available.

export type EmbedProvider = "ollama" | "openai" | "openrouter" | "none";

// Embeddings : quand OpenAI « tombe à sec » (quota/429/auth), on bascule sur
// OpenRouter pendant 24h pour continuer avec un modèle d'embedding gratuit
// (directive opérateur 2026-06-24). Circuit horodaté, réessaie OpenAI après.
const OPENAI_EMBED_DRY_MS = 24 * 60 * 60 * 1000;
let openaiEmbedDryUntil = 0;

/** OpenAI embeddings est-il en fenêtre « à sec » (basculé sur OpenRouter) ? */
function isOpenAiEmbedDry(): boolean {
  return openaiEmbedDryUntil > Date.now();
}
function markOpenAiEmbedDry(): void {
  openaiEmbedDryUntil = Date.now() + OPENAI_EMBED_DRY_MS;
}
/** Test-only reset. */
export function _resetOpenAiEmbedCircuitForTest(): void {
  openaiEmbedDryUntil = 0;
}

// OpenRouter embeddings : même logique « à sec ». OpenRouter sert des embeddings
// gratuits (directive opérateur), mais un crédit OpenRouter épuisé (402 /
// insufficient / 429) ne doit PAS faire échouer l'indexation. On coupe alors
// proprement les embeddings (no-op, vecteurs vides) et le RAG dégrade en mode
// lexical. Doctrine ADR-0108 : l'étage embeddings est skippable, jamais sur le
// chemin critique. Réessaie OpenRouter après la fenêtre.
const OPENROUTER_EMBED_DRY_MS = 24 * 60 * 60 * 1000;
let openrouterEmbedDryUntil = 0;
function isOpenRouterEmbedDry(): boolean {
  return openrouterEmbedDryUntil > Date.now();
}
function markOpenRouterEmbedDry(): void {
  openrouterEmbedDryUntil = Date.now() + OPENROUTER_EMBED_DRY_MS;
}
/** Test-only reset. */
export function _resetOpenRouterEmbedCircuitForTest(): void {
  openrouterEmbedDryUntil = 0;
}

/** Épuisement de crédit / quota (402 / insufficient / 429) — pas un transient réseau. */
function isCreditExhaustionError(err: unknown): boolean {
  const s = String(err instanceof Error ? err.message : err).toLowerCase();
  return (
    s.includes("402") || s.includes("payment required") || s.includes("insufficient") ||
    s.includes("credit") || s.includes("quota") || s.includes("429") || s.includes("rate limit")
  );
}

/** Résultat embeddings no-op (vecteurs vides) — dégradation propre, jamais un throw. */
function emptyEmbeddings(inputs: string[], model: string): EmbedResult {
  return { embeddings: inputs.map(() => [] as number[]), dim: 0, model, provider: "none", inputTokens: 0 };
}

/**
 * OpenRouter embeddings avec dégradation gracieuse : si OpenRouter est « à sec »
 * (crédit épuisé) on renvoie des vecteurs vides (no-op) au lieu de lever ; un
 * échec transitoire (réseau) est re-levé pour laisser l'appelant décider.
 */
async function embedViaOpenRouterGraceful(inputs: string[], model: string, caller: string): Promise<EmbedResult> {
  if (isOpenRouterEmbedDry()) {
    console.warn(`[llm-gateway.embed] OpenRouter embeddings désactivés (crédit épuisé) — vecteurs vides pour caller=${caller}`);
    return emptyEmbeddings(inputs, model);
  }
  try {
    return await embedViaOpenRouter(inputs, model);
  } catch (err) {
    if (isCreditExhaustionError(err)) {
      markOpenRouterEmbedDry();
      console.warn(`[llm-gateway.embed] OpenRouter embeddings à sec (${err instanceof Error ? err.message : err}) — désactivés 24h, vecteurs vides pour caller=${caller}`);
      return emptyEmbeddings(inputs, model);
    }
    throw err;
  }
}

export interface EmbedOptions {
  /** One or many texts to embed in a single batch */
  input: string | string[];
  /** Caller tag for cost tracking */
  caller: string;
  /** Provider override. Default: auto-select Ollama → OpenAI → none. */
  provider?: EmbedProvider;
  /**
   * Model override. If omitted: uses EMBED_MODEL_NAME env (Ollama path,
   * default "nomic-embed-text") or "text-embedding-3-small" (OpenAI path).
   */
  model?: string;
}

export interface EmbedResult {
  /** Array of vectors aligned with the input order */
  embeddings: number[][];
  /** Dimensionality of each vector */
  dim: number;
  /** Model that produced the embeddings */
  model: string;
  /** Provider that fulfilled the request */
  provider: EmbedProvider;
  /** Token count (OpenAI only — Ollama doesn't report) */
  inputTokens: number;
}

const OLLAMA_DIM_BY_MODEL: Record<string, number> = {
  "nomic-embed-text": 768,

  "nomic-embed-text:v1.5": 768,
  // v2-moe : modèle d'embedding LOCAL (ollama pull) — PAS servi sur ollama.com
  // (vérifié 2026-07-01 : /v1/embeddings "path not found" ; /api/embed
  // "unauthorized" même pour un modèle chat servi → endpoint embeddings gaté
  // côté cloud). Prêt si l'opérateur lance Ollama en local.
  "nomic-embed-text-v2-moe": 768,
  "mxbai-embed-large": 1024,
  "bge-m3": 1024,
  "all-minilm": 384,
};

const OPENAI_DIM_BY_MODEL: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "text-embedding-ada-002": 1536,
};

function selectEmbedProvider(override?: EmbedProvider): EmbedProvider {
  if (override) return override;
  // Pin explicite via env (ex. `EMBED_PROVIDER=openai`). Utile car Ollama Cloud
  // n'héberge AUCUN modèle d'embedding (chat/code seulement, vérifié 2026-06-30) :
  // sans ce pin, chaque embed tenterait Ollama (échec) avant de basculer OpenAI.
  const envPref = process.env.EMBED_PROVIDER as EmbedProvider | undefined;
  if (envPref && (["ollama", "openai", "openrouter", "none"] as const).includes(envPref)) {
    return envPref;
  }
  if (process.env.EMBED_SERVICE_URL) return "ollama";
  // OpenAI = chemin embeddings principal, SAUF s'il est en fenêtre « à sec » 24h
  // (auquel cas on passe à OpenRouter pour des embeddings gratuits).
  if (process.env.OPENAI_API_KEY && !isOpenAiEmbedDry()) return "openai";
  if (process.env.OPENROUTER_API_KEY && !isOpenRouterEmbedDry()) return "openrouter";
  // OpenAI configuré mais « à sec » et pas d'OpenRouter : on tente quand même
  // OpenAI (la fenêtre finira par expirer) plutôt que de ne rien renvoyer.
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

/**
 * Embeddings via OpenRouter (endpoint OpenAI-compatible /embeddings). Repli
 * gratuit quand OpenAI est à sec. Modèle épinglable via OPENROUTER_EMBED_MODEL
 * (slugs évoluent) ; défaut sur un modèle d'embedding gratuit.
 */
async function embedViaOpenRouter(
  inputs: string[],
  model: string,
): Promise<EmbedResult> {
  const baseUrl = (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const embeddings: number[][] = [];
  let totalTokens = 0;
  const BATCH = 100;

  for (let i = 0; i < inputs.length; i += BATCH) {
    const slice = inputs.slice(i, i + BATCH);
    const res = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXTAUTH_URL ?? "https://lafusee.app",
        "X-Title": "La Fusee",
      },
      body: JSON.stringify({ model, input: slice }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`OpenRouter embeddings ${res.status}: ${errText}`);
    }
    const json = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
      usage?: { prompt_tokens?: number };
    };
    json.data.sort((a, b) => a.index - b.index);
    for (const item of json.data) embeddings.push(item.embedding);
    totalTokens += json.usage?.prompt_tokens ?? 0;
  }

  const dim = embeddings[0]?.length ?? 0;
  return { embeddings, dim, model, provider: "openrouter", inputTokens: totalTokens };
}

async function embedViaOllama(
  inputs: string[],
  model: string,
  caller: string,
): Promise<EmbedResult> {
  // Endpoint embeddings DÉDIÉ, découplé du chat (`EMBED_SERVICE_URL`). Le
  // chat Ollama peut viser le cloud (ollama.com/v1 + clé) tandis que les
  // embeddings visent un Ollama LOCAL (localhost:11434, sans auth) — le cloud
  // n'héberge aucun modèle d'embedding (vérifié). Endpoint embed dédié, sans repli sur le chat.
  const embedBase = process.env.EMBED_SERVICE_URL;
  const baseRaw = embedBase;
  if (!baseRaw) {
    throw new Error("embedViaOllama: EMBED_SERVICE_URL non défini");
  }
  const rawBase = baseRaw.replace(/\/$/, "");
  // Clé : uniquement EMBED_API_KEY si l'endpoint embed est authentifié.
  // Un Ollama local n'a pas d'auth → clé absente → chemin natif /api/embed.
  // Jamais la clé du chat cloud (endpoints découplés).
  const apiKey = process.env.EMBED_API_KEY;
  const dim = OLLAMA_DIM_BY_MODEL[model] ?? 768;
  const isV1 = /\/v1$/.test(rawBase);

  // ── Ollama Cloud / endpoint OpenAI-compatible (/v1/embeddings + Bearer) ──
  // NB (vérifié 2026-06-30) : ollama.com n'héberge QUE des modèles chat/code
  // (35 modèles, aucun modèle d'embedding) → ce chemin échoue côté cloud
  // ("path not found") et la chaîne bascule sur OpenAI. Il reste correct pour
  // un Ollama self-host exposé en /v1 OU si le cloud ajoute un modèle d'embedding.
  if (apiKey || isV1) {
    const base = isV1 ? rawBase : `${rawBase}/v1`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const embeddings: number[][] = [];
    const BATCH = 50;
    for (let i = 0; i < inputs.length; i += BATCH) {
      const res = await fetch(`${base}/embeddings`, {
        method: "POST",
        headers,
        body: JSON.stringify({ model, input: inputs.slice(i, i + BATCH) }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`Ollama embeddings ${res.status}: ${errText}`);
      }
      const json = (await res.json()) as { data?: Array<{ embedding: number[]; index: number }> };
      const data = (json.data ?? []).slice().sort((a, b) => a.index - b.index);
      for (const item of data) embeddings.push(item.embedding);
    }
    if (embeddings.length === 0) {
      throw new Error(`Ollama returned no embeddings for caller=${caller}`);
    }
    return { embeddings, dim, model, provider: "ollama", inputTokens: 0 };
  }

  // ── Ollama natif local (/api/embeddings, un prompt à la fois) ──
  const embeddings: number[][] = [];
  for (const text of inputs) {
    const res = await fetch(`${rawBase}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Ollama embeddings ${res.status}: ${errText}`);
    }
    const json = (await res.json()) as { embedding?: number[] };
    if (!json.embedding || json.embedding.length === 0) {
      throw new Error(`Ollama returned empty embedding for caller=${caller}`);
    }
    embeddings.push(json.embedding);
  }

  return { embeddings, dim, model, provider: "ollama", inputTokens: 0 };
}

async function embedViaOpenAI(
  inputs: string[],
  model: string,
): Promise<EmbedResult> {
  const dim = OPENAI_DIM_BY_MODEL[model] ?? 1536;
  // Batch up to 100 inputs per request (OpenAI accepts more, stay conservative).
  const BATCH = 100;
  const embeddings: number[][] = [];
  let totalTokens = 0;

  for (let i = 0; i < inputs.length; i += BATCH) {
    const slice = inputs.slice(i, i + BATCH);
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model, input: slice }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`OpenAI embeddings ${res.status}: ${errText}`);
    }
    const json = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
      usage?: { prompt_tokens?: number };
    };
    json.data.sort((a, b) => a.index - b.index);
    for (const item of json.data) embeddings.push(item.embedding);
    totalTokens += json.usage?.prompt_tokens ?? 0;
  }

  return { embeddings, dim, model, provider: "openai", inputTokens: totalTokens };
}

/**
 * Generate embeddings via the configured provider chain.
 * - Tries Ollama first (data sovereignty), falls back to OpenAI on error.
 * - When neither provider is configured, returns empty vectors (no-op).
 * - When Ollama is configured but unreachable AND OpenAI is configured,
 *   automatically falls back to OpenAI (logs the failure).
 */
export async function embed(options: EmbedOptions): Promise<EmbedResult> {
  const inputs = Array.isArray(options.input) ? options.input : [options.input];
  const provider = selectEmbedProvider(options.provider);

  if (provider === "none") {
    console.warn(
      `[llm-gateway.embed] No embedding provider configured (set EMBED_SERVICE_URL or OPENAI_API_KEY) — returning empty embeddings for caller=${options.caller}`,
    );
    const fallbackModel = options.model ?? "none";
    return {
      embeddings: inputs.map(() => [] as number[]),
      dim: 0,
      model: fallbackModel,
      provider: "none",
      inputTokens: 0,
    };
  }

  const orModel = process.env.OPENROUTER_EMBED_MODEL ?? "text-embedding-3-small";

  // Tente OpenAI ; si « à sec » (échec) bascule sur OpenRouter 24h (embeddings gratuits).
  const tryOpenAiThenOpenRouter = async (): Promise<EmbedResult> => {
    const openaiModel = options.model ?? "text-embedding-3-small";
    try {
      return await embedViaOpenAI(inputs, openaiModel);
    } catch (err) {
      if (process.env.OPENROUTER_API_KEY) {
        markOpenAiEmbedDry();
        console.warn(
          `[llm-gateway.embed] OpenAI embeddings à sec (${err instanceof Error ? err.message : err}) — bascule OpenRouter 24h pour caller=${options.caller}`,
        );
        return embedViaOpenRouterGraceful(inputs, orModel, options.caller);
      }
      throw err;
    }
  };

  if (provider === "ollama") {
    const model = options.model ?? process.env.EMBED_MODEL_NAME ?? "nomic-embed-text:v1.5";
    try {
      return await embedViaOllama(inputs, model, options.caller);
    } catch (err) {
      // Repli Ollama → OpenAI (puis OpenRouter 24h si OpenAI à sec).
      if (process.env.OPENAI_API_KEY && !isOpenAiEmbedDry()) {
        console.warn(
          `[llm-gateway.embed] Ollama failed (${err instanceof Error ? err.message : err}), falling back to OpenAI for caller=${options.caller}`,
        );
        return tryOpenAiThenOpenRouter();
      }
      if (process.env.OPENROUTER_API_KEY) {
        console.warn(
          `[llm-gateway.embed] Ollama failed (${err instanceof Error ? err.message : err}), falling back to OpenRouter for caller=${options.caller}`,
        );
        return embedViaOpenRouterGraceful(inputs, orModel, options.caller);
      }
      throw err;
    }
  }

  if (provider === "openrouter") {
    return embedViaOpenRouterGraceful(inputs, options.model ?? orModel, options.caller);
  }

  // provider === "openai" (avec bascule OpenRouter 24h si à sec)
  return tryOpenAiThenOpenRouter();
}

// Legacy stubs preserved for compat in case any older code referenced them
// directly (none does as of this commit, but prevents breakage on old branches).
async function _legacyOpenAIEmbedFallback(
  inputs: string[],
  model: string,
): Promise<{ embeddings: number[][]; inputTokens: number }> {
  const r = await embedViaOpenAI(inputs, model);
  return { embeddings: r.embeddings, inputTokens: r.inputTokens };
}
// Force-keep the symbol so unused-export linters don't strip it
void _legacyOpenAIEmbedFallback;
