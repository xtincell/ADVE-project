/**
 * ADR-0179 — streamChatText : comportement du fallback pré-premier-octet.
 *
 * Le point dur du streaming multi-provider : on ne peut changer de provider
 * qu'AVANT d'avoir servi le premier delta. Ces tests vérifient, providers
 * mockés, que :
 *   1. un provider qui échoue avant le premier octet est remplacé par le suivant ;
 *   2. un flux qui se TERMINE sans texte (échec lazy post-200) est traité en
 *      échec — pas en réponse vide silencieuse ;
 *   3. le résultat expose le provider réellement servi + le texte complet.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// streamText est consommé dynamiquement par streaming.ts — le mock du module
// "ai" intercepte aussi les imports dynamiques.
const streamTextMock = vi.fn();
const costCreate = vi.hoisted(() => vi.fn(async (_args: unknown) => ({ id: "receipt" })));
vi.mock("@/lib/db", () => ({ db: {
  aICostLog: { create: costCreate }, modelPolicy: { findUnique: vi.fn(async () => null) },
} }));
vi.mock("@/server/services/ai-cost-tracker", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/server/services/ai-cost-tracker")>(),
  checkBudget: vi.fn(async () => ({ allowed: true, remaining: 100, utilization: 0, alertLevel: "none" })),
}));
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, streamText: (...args: unknown[]) => streamTextMock(...args) };
});

import { _resetProvidersForTest, _getProviderStateForTest, callLLM, withRetry } from "@/server/services/llm-gateway";
import { streamChatText } from "@/server/services/llm-gateway/streaming";
import * as ratePolicy from "@/server/services/llm-gateway/rate-policy";

function textStreamOf(chunks: string[]): ReadableStream<string> {
  let i = 0;
  return new ReadableStream<string>({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(chunks[i++]!);
      else controller.close();
    },
  });
}

function erroringStream(message: string): ReadableStream<string> {
  return new ReadableStream<string>({
    pull() {
      throw new Error(message);
    },
  });
}

function mockStreamResult(stream: ReadableStream<string>, fullText: string) {
  return {
    textStream: stream,
    text: Promise.resolve(fullText),
    usage: Promise.resolve({ inputTokens: 10, outputTokens: 5 }),
  };
}

async function drain(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out;
    out += value;
  }
}

describe("streamChatText — fallback pré-premier-octet", () => {
  it("does not turn a caller cancellation into a provider failure or circuit opening", async () => {
    vi.stubEnv("OPENAI_TEXT_RELAY_URL", "http://127.0.0.1:8646/v1");
    vi.stubEnv("OPENAI_TEXT_RELAY_TOKEN", "local-test-access");
    vi.stubEnv("LLM_PRIMARY_PROVIDER", "openai");
    _resetProvidersForTest({ openai: { available: true, failureCount: 2 },
      anthropic: { available: false }, ollama: { available: false }, openrouter: { available: false } });
    const controller = new AbortController();
    const acquire = vi.spyOn(ratePolicy, "acquireSlot").mockImplementation(async () => {
      controller.abort(new DOMException("Caller aborted", "AbortError"));
      throw controller.signal.reason;
    });
    await expect(callLLM({ system: "s", prompt: "Avis ?", caller: "fixture", signal: controller.signal }))
      .rejects.toMatchObject({ name: "AbortError" });
    expect(acquire).toHaveBeenCalledOnce();
    expect(_getProviderStateForTest("openai")).toMatchObject({ failureCount: 2, circuitOpenUntil: 0 });
    expect(costCreate).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    streamTextMock.mockReset();
    costCreate.mockClear();
    // openrouter en tête (premium OFF, pas d'ollama) puis anthropic en repli.
    _resetProvidersForTest({
      anthropic: { available: true },
      openai: { available: false },
      ollama: { available: false },
      openrouter: { available: true },
    });
    delete process.env.LLM_PRIMARY_PROVIDER;
    delete process.env.LLM_PREMIUM_MODE;
    delete process.env.OLLAMA_MODEL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    _resetProvidersForTest();
    delete process.env.OLLAMA_MODEL;
  });

  it("local queue expiry does not start, bill or mark an OAuth provider as failed", async () => {
    vi.stubEnv("OPENAI_TEXT_RELAY_URL", "http://localhost:8646/v1");
    vi.stubEnv("OPENAI_TEXT_RELAY_TOKEN", "fixture-only");
    vi.stubEnv("LLM_PRIMARY_PROVIDER", "openai"); vi.stubEnv("HEADROOM_DISABLED", "1");
    _resetProvidersForTest({ anthropic: { available: false }, openai: { available: true },
      ollama: { available: false }, openrouter: { available: false } });
    const acquire = vi.spyOn(ratePolicy, "acquireSlot")
      .mockRejectedValue(new ratePolicy.LlmRateWaitExceededError("gpt-5.6-luna"));
    const signal = new AbortController().signal;
    const listener = vi.spyOn(signal, "addEventListener");
    const removeListener = vi.spyOn(signal, "removeEventListener");
    await expect(streamChatText({ system: "s", messages: [{ role: "user", content: "Quiz ?" }],
      caller: "mestor:council:coordinator", strategyId: "brand-a", signal,
    })).rejects.toBeInstanceOf(ratePolicy.LlmRateWaitExceededError);
    expect(acquire).toHaveBeenCalledOnce(); expect(streamTextMock).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledOnce(); expect(removeListener).toHaveBeenCalledOnce();
    expect(removeListener.mock.calls[0]?.[1]).toBe(listener.mock.calls[0]?.[1]);
    expect(costCreate).not.toHaveBeenCalled();
    expect(_getProviderStateForTest("openai").failureCount).toBe(0);
    acquire.mockClear();
    await expect(callLLM({ system: "s", prompt: "Quiz ?", caller: "fixture" }))
      .rejects.toBeInstanceOf(ratePolicy.LlmRateWaitExceededError);
    expect(acquire).toHaveBeenCalledOnce();
    expect(_getProviderStateForTest("openai").failureCount).toBe(0);
    expect(costCreate).not.toHaveBeenCalled();
  });

  it("retry never restarts an expired local queue", async () => {
    const work = vi.fn(async () => { throw new ratePolicy.LlmRateWaitExceededError("guarded"); });
    await expect(withRetry(work, { baseDelayMs: 1 }))
      .rejects.toBeInstanceOf(ratePolicy.LlmRateWaitExceededError);
    expect(work).toHaveBeenCalledOnce();
  });

  it("the provider chosen by streaming also owns the cost receipt", async () => {
    _resetProvidersForTest({ anthropic: { available: false }, openai: { available: false },
      ollama: { available: true }, openrouter: { available: false } });
    process.env.OLLAMA_MODEL = "gemma4:31b";
    streamTextMock.mockReturnValueOnce(mockStreamResult(textStreamOf(["Avis" ]), "Avis"));
    const result = await streamChatText({ system: "s", messages: [{ role: "user", content: "Quiz ?" }],
      caller: "mestor:council:coordinator", strategyId: "brand-a" });
    await drain(result.textStream); await result.finished;
    await vi.waitFor(() => expect(costCreate).toHaveBeenCalledOnce());
    expect(costCreate.mock.calls[0]![0]).toMatchObject({ data: {
      provider: "ollama", model: "gemma4:31b", context: "mestor:council:coordinator:estimated-cost",
    } });
  });

  it("routes the explicit OAuth Luna through streaming and journals its actual identity", async () => {
    vi.stubEnv("OPENAI_TEXT_RELAY_URL", "http://127.0.0.1:8646/v1");
    vi.stubEnv("OPENAI_TEXT_RELAY_TOKEN", "local-test-access");
    vi.stubEnv("LLM_PRIMARY_PROVIDER", "openai");
    _resetProvidersForTest({ openai: { available: true }, anthropic: { available: true },
      ollama: { available: true }, openrouter: { available: true } });
    streamTextMock.mockReturnValueOnce(mockStreamResult(textStreamOf(["Avis Luna"]), "Avis Luna"));
    const result = await streamChatText({ system: "s", messages: [{ role: "user", content: "Quiz ?" }],
      caller: "mestor:council:coordinator", strategyId: "brand-a" });
    expect(await drain(result.textStream)).toBe("Avis Luna");
    expect(await result.finished).toMatchObject({ provider: "openai", model: "gpt-5.6-luna" });
    await vi.waitFor(() => expect(costCreate).toHaveBeenCalledOnce());
    expect(costCreate.mock.calls[0]![0]).toMatchObject({ data: { provider: "openai-codex-oauth",
      model: "gpt-5.6-luna", context: "mestor:council:coordinator:subscription-quota:api-equivalent-estimate" } });
    vi.unstubAllEnvs();
  });

  it("does not change model or provider when the explicit OAuth relay fails", async () => {
    vi.stubEnv("OPENAI_TEXT_RELAY_URL", "http://127.0.0.1:8646/v1");
    vi.stubEnv("OPENAI_TEXT_RELAY_TOKEN", "local-test-access");
    vi.stubEnv("LLM_PRIMARY_PROVIDER", "openai");
    _resetProvidersForTest({ openai: { available: true }, anthropic: { available: true },
      ollama: { available: true }, openrouter: { available: true } });
    streamTextMock.mockReturnValue(mockStreamResult(erroringStream("OAuth quota exhausted"), ""));
    await expect(streamChatText({ system: "s", messages: [{ role: "user", content: "Quiz ?" }],
      caller: "receipt" })).rejects.toThrow();
    expect(streamTextMock).toHaveBeenCalledOnce();
    expect(costCreate).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("provider 1 échoue au premier read → provider 2 sert le flux entier", async () => {
    streamTextMock
      // 1ʳᵉ tentative (openrouter) : erreur NON transitoire → pas de chaîne
      // intra-OpenRouter, passage direct au provider suivant.
      .mockReturnValueOnce(mockStreamResult(erroringStream("boom fatal provider down"), ""))
      // 2ᵉ tentative (anthropic) : flux sain.
      .mockReturnValueOnce(mockStreamResult(textStreamOf(["Bonjour ", "le monde"]), "Bonjour le monde"));

    const result = await streamChatText({
      system: "s",
      messages: [{ role: "user", content: "salut" }],
      caller: "test:streaming",
    });

    expect(result.provider).toBe("anthropic");
    await expect(drain(result.textStream)).resolves.toBe("Bonjour le monde");
    const finished = await result.finished;
    expect(finished.text).toBe("Bonjour le monde");
    expect(finished.provider).toBe("anthropic");
    expect(streamTextMock).toHaveBeenCalledTimes(2);
  });

  it("flux terminé SANS texte (échec lazy post-200) = échec transitoire → la chaîne gratuite intra-OpenRouter récupère", async () => {
    streamTextMock
      .mockReturnValueOnce(mockStreamResult(textStreamOf([]), ""))
      .mockReturnValueOnce(mockStreamResult(textStreamOf(["ok"]), "ok"));

    const result = await streamChatText({
      system: "s",
      messages: [{ role: "user", content: "salut" }],
      caller: "test:streaming",
    });

    // Flux vide ≠ réponse vide silencieuse : la tentative est requalifiée en
    // échec TRANSITOIRE → le repli reste sur OpenRouter (modèle gratuit
    // suivant), même contrat que callLLM.
    expect(result.provider).toBe("openrouter");
    expect(streamTextMock).toHaveBeenCalledTimes(2);
    await expect(drain(result.textStream)).resolves.toBe("ok");
  });

  it("tous les providers KO avant premier octet → throw (pas de flux vide silencieux)", async () => {
    streamTextMock.mockImplementation(() => mockStreamResult(erroringStream("boom fatal"), ""));

    await expect(
      streamChatText({
        system: "s",
        messages: [{ role: "user", content: "salut" }],
        caller: "test:streaming",
      }),
    ).rejects.toThrow();
  });
});
