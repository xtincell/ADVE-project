/**
 * Ollama natif : embeddings par lots, et lot partiel rendu plutôt que jeté.
 *
 * Constaté du 2026-10-21 au 23 en production : le chemin natif envoyait un
 * texte à la fois et levait au premier dépassement du plafond de patience —
 * tout ce que l'appel avait déjà calculé était perdu, puis recalculé au
 * passage suivant sur un CPU que ces passages saturaient.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { embed } from "@/server/services/llm-gateway";

const ENV_KEYS = [
  "EMBED_SERVICE_URL",
  "EMBED_API_KEY",
  "EMBED_PROVIDER",
  "EMBED_MODEL_NAME",
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
] as const;
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function vectorFor(text: string): number[] {
  return [text.length, 1, 2];
}

function timeoutError(): Error {
  const err = new Error("The operation was aborted due to timeout");
  err.name = "TimeoutError";
  return err;
}

describe("embed() — Ollama natif par lots", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    process.env.EMBED_SERVICE_URL = "http://ollama-embed:11434";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function answerWithVectors() {
    fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
      const { input } = JSON.parse(init.body) as { input: string[] };
      return new Response(JSON.stringify({ embeddings: input.map(vectorFor) }), { status: 200 });
    });
  }

  it("envoie des lots de 4 à /api/embed et rend les vecteurs dans l'ordre", async () => {
    answerWithVectors();
    const input = Array.from({ length: 10 }, (_, i) => "x".repeat(i + 1));

    const result = await embed({ input, caller: "test" });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const calls = fetchMock.mock.calls.map(([url, init]) => ({
      url: String(url),
      size: (JSON.parse(init.body) as { input: string[] }).input.length,
    }));
    expect(calls.map((c) => c.url)).toEqual(Array(3).fill("http://ollama-embed:11434/api/embed"));
    expect(calls.map((c) => c.size)).toEqual([4, 4, 2]);
    expect(result.provider).toBe("ollama");
    expect(result.embeddings).toEqual(input.map(vectorFor));
  });

  it("rend les lots déjà reçus quand un lot suivant dépasse le plafond", async () => {
    answerWithVectors();
    fetchMock.mockImplementationOnce(async (_url: string, init: { body: string }) => {
      const { input } = JSON.parse(init.body) as { input: string[] };
      return new Response(JSON.stringify({ embeddings: input.map(vectorFor) }), { status: 200 });
    });
    fetchMock.mockImplementationOnce(async () => {
      throw timeoutError();
    });
    const input = Array.from({ length: 10 }, (_, i) => `t${i}`);

    const result = await embed({ input, caller: "test" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.provider).toBe("ollama");
    expect(result.embeddings).toHaveLength(10);
    expect(result.embeddings.slice(0, 4)).toEqual(input.slice(0, 4).map(vectorFor));
    expect(result.embeddings.slice(4).every((v) => v.length === 0)).toBe(true);
  });

  it("un échec dès le premier lot passe à la cascade (ici : vecteurs vides, ADR-0108)", async () => {
    fetchMock.mockImplementation(async () => {
      throw timeoutError();
    });

    const result = await embed({ input: ["a", "b"], caller: "test" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe("none");
    expect(result.embeddings).toEqual([[], []]);
  });

  it("une réponse incomplète est un défaut, pas une indisponibilité : elle remonte", async () => {
    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify({ embeddings: [[1, 2, 3]] }), { status: 200 }),
    );

    await expect(embed({ input: ["a", "b"], caller: "test" })).rejects.toThrow(/1\/2 usable embeddings/);
  });
});
