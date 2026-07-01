/**
 * Story refactor-t-pillar-vault-seshat-pipeline — Task 4.2
 *
 * AC4 — collectMarketSignals writes Signal.type = "EXTERNAL_SAAS" (not MARKET_SIGNAL).
 * This connects the pipeline: collectMarketSignals → EXTERNAL_SAAS →
 * loadSeshatKnowledge (executeProtocoleTrack reads type: "EXTERNAL_SAAS").
 *
 * NB — `collectMarketSignals` éclate désormais la collecte en 3 appels d'axe
 * parallèles (trends / regulatory / competitive) et attend le contrat LLM
 * `{ "signals": [...] }` (validé par `SignalsResponseSchema`), avec `content`
 * ≥ 10 caractères (Zod `.min(10)`). Le mock reflète ce contrat ; les assertions
 * de type EXTERNAL_SAAS portent sur CHAQUE create et restent robustes au nombre
 * d'axes (creates == signaux collectés), sans coupler le test au multiplicateur.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const callLLMMock = vi.fn();
const dbSignalCreateMock = vi.fn();

// Le signal-collector importe AUSSI `extractJSON` du gateway : on doit le fournir
// dans le mock (sinon `extractJSON` est `undefined` → throw → axes vides → 0 create).
vi.mock("@/server/services/llm-gateway", () => ({
  callLLM: (...a: unknown[]) => callLLMMock(...a),
  extractJSON: (text: string): unknown => {
    const cleaned = text.replace(/```(?:json)?/gi, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    signal: {
      create: (...a: unknown[]) => dbSignalCreateMock(...a),
    },
  },
}));

// ── Import under test ─────────────────────────────────────────────────────────

import { collectMarketSignals } from "@/server/services/seshat/tarsis/signal-collector";

// ── Fixture ───────────────────────────────────────────────────────────────────

const BASE_CONFIG = {
  strategyId: "strat-1",
  sector: "food",
  market: "CM",
  countryCode: "CM",
  keywords: ["nutrition", "local"],
  competitors: ["CompA"],
  frequency: "DAILY" as const,
};

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("collectMarketSignals — AC4 signal type EXTERNAL_SAAS", () => {
  it("writes Signal.type = 'EXTERNAL_SAAS' — NOT 'MARKET_SIGNAL'", async () => {
    callLLMMock.mockResolvedValue({
      text: JSON.stringify({
        signals: [
          {
            title: "Signal test",
            content: "Contenu du signal test pour le secteur food",
            sourceType: "NEWS",
            relevance: 0.8,
          },
        ],
      }),
    });
    dbSignalCreateMock.mockResolvedValue({ id: "sig-1" });

    await collectMarketSignals(BASE_CONFIG);

    // 3 axes parallèles → au moins un create ; chaque create porte le bon type.
    expect(dbSignalCreateMock).toHaveBeenCalled();
    for (const call of dbSignalCreateMock.mock.calls) {
      const createArg = call[0] as { data: { type: string } };
      expect(createArg.data.type).toBe("EXTERNAL_SAAS");
      expect(createArg.data.type).not.toBe("MARKET_SIGNAL");
    }
  });

  it("writes EXTERNAL_SAAS for every collected signal (creates == signals)", async () => {
    callLLMMock.mockResolvedValue({
      text: JSON.stringify({
        signals: [
          { title: "Signal 1", content: "Contenu un suffisamment long", sourceType: "NEWS", relevance: 0.7 },
          { title: "Signal 2", content: "Contenu deux suffisamment long", sourceType: "REPORT", relevance: 0.9 },
        ],
      }),
    });
    dbSignalCreateMock.mockResolvedValue({ id: "sig-x" });

    const result = await collectMarketSignals(BASE_CONFIG);

    // Un create par signal collecté — robuste au nombre d'axes, sans hardcoder le multiplicateur.
    expect(dbSignalCreateMock).toHaveBeenCalled();
    expect(dbSignalCreateMock.mock.calls.length).toBe(result.length);
    for (const call of dbSignalCreateMock.mock.calls) {
      expect((call[0] as { data: { type: string } }).data.type).toBe("EXTERNAL_SAAS");
    }
  });

  it("returns empty array (no create) when LLM response is not the expected shape", async () => {
    callLLMMock.mockResolvedValue({ text: "Not a JSON object." });

    const result = await collectMarketSignals(BASE_CONFIG);

    expect(result).toEqual([]);
    expect(dbSignalCreateMock).not.toHaveBeenCalled();
  });
});
