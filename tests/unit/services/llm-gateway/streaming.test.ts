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
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, streamText: (...args: unknown[]) => streamTextMock(...args) };
});

import { _resetProvidersForTest } from "@/server/services/llm-gateway";
import { streamChatText } from "@/server/services/llm-gateway/streaming";

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
  beforeEach(() => {
    streamTextMock.mockReset();
    // openrouter en tête (premium OFF, pas d'ollama) puis anthropic en repli.
    _resetProvidersForTest({
      anthropic: { available: true },
      openai: { available: false },
      ollama: { available: false },
      openrouter: { available: true },
    });
    delete process.env.LLM_PRIMARY_PROVIDER;
    delete process.env.LLM_PREMIUM_MODE;
  });

  afterEach(() => {
    _resetProvidersForTest();
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
