/**
 * LLM Gateway — surface STREAMING (ADR-0179).
 *
 * Ferme la ligne RESIDUAL-DEBT « /api/chat — routage LLM Gateway » : le Gateway
 * n'exposait que des surfaces non-streaming (`callLLM` / `executeStructuredLLMCall`),
 * ce qui avait poussé le chat cockpit à appeler `@ai-sdk/anthropic` en direct —
 * sans cascade providers, sans parité Sonnet 5, sans pre-flight, sans coût.
 *
 * Contrat identique à `callLLM` sur tout ce qui n'est pas le transport :
 *   - ordre providers résolu par `resolveTextProviderOrder` (jamais hardcodé) ;
 *   - parité Sonnet 5 partagée (`parity.ts` — thinking disabled + température strippée) ;
 *   - budget Thot (`checkBudget`) + downgrade modèle ;
 *   - police de débit par modèle (`acquireSlot`/`releaseSlot`) ;
 *   - circuit breaker (`recordProviderFailure`/`recordProviderSuccess`) ;
 *   - cost tracking non-bloquant (`trackCost`).
 *
 * Spécificité streaming — le REPLI N'EST POSSIBLE QU'AVANT LE PREMIER OCTET :
 * une fois un delta servi au client, on ne peut plus changer de provider sans
 * rejouer le début de la réponse. D'où le « probe » : on attend le premier
 * delta non-vide sous timeout ; échec/flux-vide → provider suivant (ou modèle
 * gratuit suivant sur OpenRouter) ; succès → le flux est committé à ce provider,
 * une erreur mid-stream laisse le texte partiel au client (honnêteté > magie).
 */

import {
  FALLBACK_POLICY,
  MODEL_PRIORITY,
  OPENROUTER_FALLBACK_MODELS,
  buildProviderModel,
  buildTextProviderCandidates,
  isPremiumMode,
  isProviderHealthy,
  isTransientProviderError,
  recordProviderFailure,
  recordProviderSuccess,
  resolveTextProviderOrder,
  trackCost,
  type GatewayPurpose,
  type LLMProvider,
} from "./index";
import { applySonnet5Parity } from "./parity";

// ── Types ────────────────────────────────────────────────────────────────────

export interface StreamChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamChatOptions {
  /** System prompt (headroom appliqué dessus ; les messages restent verbatim). */
  system: string;
  /** Historique de conversation, dernier message = la question courante. */
  messages: StreamChatMessage[];
  /** Qui appelle — cost tracking (ex. "mestor:council:coordinator"). */
  caller: string;
  /** Strategy ID — budget Thot + cost tracking. Omis = non tracké, non gaté. */
  strategyId?: string;
  /** Défaut "agent" (même sémantique que callLLM). */
  purpose?: GatewayPurpose;
  /** Défaut 2048 (réponse de chat, pas un livrable). */
  maxOutputTokens?: number;
  /** Strippée automatiquement si le provider servi est Anthropic Sonnet 5. */
  temperature?: number;
  /** Abort appelant (fermeture de connexion) — propagé au provider. */
  signal?: AbortSignal;
}

export interface StreamChatResult {
  /** Deltas texte décodés, prêts à piper vers la Response HTTP. */
  textStream: ReadableStream<string>;
  /** Résolu à la fin du flux — texte complet + usage (persistance + coût). */
  finished: Promise<{
    text: string;
    inputTokens: number;
    outputTokens: number;
    provider: string;
    model: string;
  }>;
  /** Provider qui a servi le premier octet. */
  provider: string;
  /** Modèle effectivement servi. */
  model: string;
}

const DEFAULT_STREAM_MAX_TOKENS = 2048;

/** Timeout d'attente du PREMIER delta par tentative — au-delà, provider suivant. */
export const STREAM_FIRST_BYTE_TIMEOUT_MS = Number(
  process.env.STREAM_FIRST_BYTE_TIMEOUT_MS ?? 15_000,
);

// ── Probe du premier delta ───────────────────────────────────────────────────

interface ProbeSuccess {
  ok: true;
  firstDelta: string;
}
interface ProbeFailure {
  ok: false;
  reason: "timeout" | "empty" | "error";
  error?: unknown;
}

/**
 * Lit le flux jusqu'au premier delta NON-VIDE, borné par un timeout. Un flux
 * qui se termine sans texte (échec lazy post-200 typique d'une clé absente)
 * est un ÉCHEC — c'est exactement le symptôme « réponse vide silencieuse »
 * que cette surface élimine.
 */
async function probeFirstDelta(
  reader: ReadableStreamDefaultReader<string>,
  timeoutMs: number,
): Promise<ProbeSuccess | ProbeFailure> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<ProbeFailure>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, reason: "timeout" }), timeoutMs);
  });
  try {
    for (;;) {
      const step = await Promise.race([
        reader.read().then(
          (r) => ({ kind: "read" as const, ...r }),
          (error) => ({ kind: "error" as const, error }),
        ),
        timeout,
      ]);
      if ("ok" in step) return step; // timeout
      if (step.kind === "error") return { ok: false, reason: "error", error: step.error };
      if (step.done) return { ok: false, reason: "empty" };
      if (step.value && step.value.length > 0) return { ok: true, firstDelta: step.value };
      // delta vide → continuer à lire
    }
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ── Tentative sur UN modèle d'UN provider ────────────────────────────────────

interface AttemptContext {
  provider: LLMProvider;
  anthropicModel: string;
  policyOllamaModel: string | null;
  opts: StreamChatOptions;
}

interface AttemptFailure {
  ok: false;
  transient: boolean;
  error?: unknown;
}

async function attemptStream(
  ctx: AttemptContext,
  /** Modèle OpenRouter imposé (chaîne de repli gratuite) — sinon résolution normale. */
  openRouterModelOverride?: string,
): Promise<StreamChatResult | AttemptFailure> {
  const { provider, anthropicModel, opts } = ctx;
  const { streamText } = await import("ai");
  const { acquireSlot, releaseSlot } = await import("./rate-policy");
  const { applyHeadroom } = await import("./headroom");

  const built = await buildProviderModel(provider, anthropicModel, {
    policyOllamaModel: ctx.policyOllamaModel,
  });
  let aiModel = built.aiModel;
  let servedModel = built.servedModel;
  if (openRouterModelOverride && built.orFallback) {
    aiModel = built.orFallback(openRouterModelOverride);
    servedModel = openRouterModelOverride;
  }

  const parity = applySonnet5Parity({
    provider,
    model: anthropicModel,
    temperature: opts.temperature,
  });

  // Headroom sur le system uniquement — les messages multi-tours restent
  // verbatim en v1 (compresser l'historique changerait le sens du fil).
  const hr = await applyHeadroom(opts.system, "", anthropicModel);

  // Abort par tentative : composé avec l'abort appelant. Le probe timeout
  // n'utilise PAS ce signal (il ne doit borner que le premier octet, pas
  // tuer un flux sain à 15 s de génération).
  const attemptAbort = new AbortController();
  const onCallerAbort = () => attemptAbort.abort();
  opts.signal?.addEventListener("abort", onCallerAbort, { once: true });

  const slotKey = await acquireSlot(servedModel);
  let slotReleased = false;
  const releaseOnce = () => {
    if (!slotReleased) {
      slotReleased = true;
      releaseSlot(slotKey);
      opts.signal?.removeEventListener("abort", onCallerAbort);
    }
  };

  try {
    const result = streamText({
      model: aiModel as Parameters<typeof streamText>[0]["model"],
      system: hr.system,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      maxOutputTokens: opts.maxOutputTokens ?? DEFAULT_STREAM_MAX_TOKENS,
      temperature: parity.temperature,
      abortSignal: attemptAbort.signal,
      // Parité callLLM : le helper type providerOptions en Record générique ;
      // contenu byte-identique (thinking disabled / json) — cast de ré-attachement SDK.
      ...(parity.providerOptions
        ? { providerOptions: parity.providerOptions as Parameters<typeof streamText>[0]["providerOptions"] }
        : {}),
    });

    const reader = result.textStream.getReader();
    const probe = await probeFirstDelta(reader, STREAM_FIRST_BYTE_TIMEOUT_MS);

    if (!probe.ok) {
      attemptAbort.abort();
      await reader.cancel().catch(() => {});
      releaseOnce();
      const message = String((probe.error as Error | undefined)?.message ?? probe.reason);
      return {
        ok: false,
        transient: probe.reason !== "error" || isTransientProviderError(message),
        error: probe.error ?? new Error(`stream ${probe.reason} before first byte (${provider}/${servedModel})`),
      };
    }

    // ── Premier octet servi : le flux est committé à ce provider ──────────
    recordProviderSuccess(provider);

    const textStream = new ReadableStream<string>({
      start(controller) {
        controller.enqueue(probe.firstDelta);
      },
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          if (value) controller.enqueue(value);
        } catch (err) {
          // Erreur mid-stream : le client garde le texte partiel déjà servi.
          recordProviderFailure(provider);
          controller.error(err);
        }
      },
      cancel() {
        attemptAbort.abort();
        releaseOnce();
      },
    });

    const finished = (async () => {
      try {
        const [text, usage] = await Promise.all([result.text, result.usage]);
        const gatewayUsage = {
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
        };
        // Même règle de facturation que callLLM : nom Anthropic sur les chemins
        // payants, nom du modèle servi sur les chemins gratuits.
        const billedModel = provider === "ollama" || provider === "openrouter" ? servedModel : anthropicModel;
        void trackCost({ strategyId: opts.strategyId, caller: opts.caller }, gatewayUsage, billedModel);
        // Parité callLLM : PostgreSQL jsonb refuse U+0000 — purge à la source.
        const cleanText = text.split(String.fromCharCode(0)).join("").replace(/\\u0000/g, "");
        return { text: cleanText, ...gatewayUsage, provider, model: servedModel };
      } finally {
        releaseOnce();
      }
    })();
    // Marque la rejection comme observée même si l'appelant n'attend jamais
    // `finished` (ex. route qui a déjà répondu) — sans consommer l'erreur
    // pour ceux qui l'attendent.
    finished.catch(() => {});

    return { textStream, finished, provider, model: servedModel };
  } catch (err) {
    attemptAbort.abort();
    releaseOnce();
    return {
      ok: false,
      transient: isTransientProviderError(String((err as Error)?.message ?? err)),
      error: err,
    };
  }
}

function isAttemptFailure(r: StreamChatResult | AttemptFailure): r is AttemptFailure {
  return "ok" in r && r.ok === false;
}

// ── Surface publique ─────────────────────────────────────────────────────────

/**
 * Stream une réponse de chat à travers la cascade providers du Gateway.
 * Jette si TOUS les providers échouent avant le premier octet (l'appelant a
 * la responsabilité du pre-flight `isTextLLMAvailable()` pour l'UX honnête).
 */
export async function streamChatText(opts: StreamChatOptions): Promise<StreamChatResult> {
  // ── Policy gouvernée (même chemin que callLLM) ────────────────────────
  const purpose: GatewayPurpose = opts.purpose ?? "agent";
  const { resolvePolicy } = await import("@/server/services/model-policy");
  const policy = await resolvePolicy(purpose).catch(() => FALLBACK_POLICY[purpose]);

  let anthropicModel = policy.anthropicModel;
  const policyOllamaModel = policy.ollamaModel;
  const ollamaPreferred =
    policy.allowOllamaSubstitution && isProviderHealthy("ollama") && !!policyOllamaModel;

  // ── Budget Thot (Loi 3) — identique à callLLM ─────────────────────────
  if (opts.strategyId) {
    const { checkBudget } = await import("@/server/services/ai-cost-tracker");
    const budget = await checkBudget(opts.strategyId);
    if (!budget.allowed) {
      throw new Error(
        `LLM budget exceeded for strategy ${opts.strategyId}. Spent: ${(budget.utilization * 100).toFixed(0)}% of monthly cap.`,
      );
    }
    if (
      budget.alertLevel !== "none" &&
      MODEL_PRIORITY.indexOf(budget.suggestedModel) > MODEL_PRIORITY.indexOf(anthropicModel)
    ) {
      console.warn(
        `[llm-gateway/streaming] Budget ${budget.alertLevel}: downgrading ${anthropicModel} → ${budget.suggestedModel} for strategy ${opts.strategyId}`,
      );
      anthropicModel = budget.suggestedModel;
    }
  }

  // ── Ordre providers — JAMAIS hardcodé (architecture opérateur 2026-07-16) ──
  const orderedProviders = resolveTextProviderOrder(buildTextProviderCandidates(ollamaPreferred), {
    premium: isPremiumMode(),
    explicitPrimary: process.env.LLM_PRIMARY_PROVIDER as LLMProvider | undefined,
  });

  let lastError: unknown;
  for (const provider of orderedProviders) {
    if (opts.signal?.aborted) break;
    const ctx: AttemptContext = { provider, anthropicModel, policyOllamaModel, opts };

    const first = await attemptStream(ctx);
    if (!isAttemptFailure(first)) return first;
    lastError = first.error;
    recordProviderFailure(provider);
    console.warn(
      `[llm-gateway/streaming] Provider ${provider} failed before first byte, trying next...`,
      first.error instanceof Error ? first.error.message : first.error,
    );

    // Repli intra-OpenRouter (chaîne de modèles gratuits) — uniquement sur
    // échec transitoire, borné au probe (jamais mid-stream).
    if (provider === "openrouter" && first.transient) {
      let recovered: StreamChatResult | null = null;
      for (const fb of OPENROUTER_FALLBACK_MODELS) {
        const attempt = await attemptStream(ctx, fb);
        if (!isAttemptFailure(attempt)) {
          recovered = attempt;
          break;
        }
        lastError = attempt.error;
        if (!attempt.transient) break;
        console.warn(`[llm-gateway/streaming] OpenRouter ${fb} KO → modèle gratuit suivant`);
      }
      if (recovered) return recovered;
    }

    if (opts.signal?.aborted) break;
  }

  throw lastError ?? new Error("All LLM providers failed before first byte");
}
