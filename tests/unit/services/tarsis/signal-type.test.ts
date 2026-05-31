/**
 * Story refactor-t-pillar-vault-seshat-pipeline — Task 4.2
 *
 * AC4 — collectMarketSignals writes Signal.type = "EXTERNAL_SAAS" (not MARKET_SIGNAL).
 * This connects the pipeline: collectMarketSignals → EXTERNAL_SAAS →
 * loadSeshatKnowledge (executeProtocoleTrack reads type: "EXTERNAL_SAAS").
 */

import { afterEach, describe, expect, it, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const callLLMMock = vi.fn();
const dbSignalCreateMock = vi.fn();

vi.mock("@/server/services/llm-gateway", () => ({
  callLLM: (...a: unknown[]) => callLLMMock(...a),
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
      text: JSON.stringify([
        {
          title: "Signal test",
          content: "Contenu du signal test pour le secteur food",
          sourceType: "NEWS",
          relevance: 0.8,
          collectedAt: "2026-05-31T00:00:00.000Z",
        },
      ]),
    });
    dbSignalCreateMock.mockResolvedValue({ id: "sig-1" });

    await collectMarketSignals(BASE_CONFIG);

    expect(dbSignalCreateMock).toHaveBeenCalledOnce();
    const createArg = dbSignalCreateMock.mock.calls[0]![0];
    expect(createArg.data.type).toBe("EXTERNAL_SAAS");
    expect(createArg.data.type).not.toBe("MARKET_SIGNAL");
  });

  it("writes EXTERNAL_SAAS for every signal in the LLM response", async () => {
    callLLMMock.mockResolvedValue({
      text: JSON.stringify([
        { title: "Signal 1", content: "Content 1", sourceType: "NEWS", relevance: 0.7, collectedAt: "2026-05-31T00:00:00.000Z" },
        { title: "Signal 2", content: "Content 2", sourceType: "REPORT", relevance: 0.9, collectedAt: "2026-05-31T00:00:00.000Z" },
      ]),
    });
    dbSignalCreateMock.mockResolvedValue({ id: "sig-x" });

    await collectMarketSignals(BASE_CONFIG);

    expect(dbSignalCreateMock).toHaveBeenCalledTimes(2);
    for (const call of dbSignalCreateMock.mock.calls) {
      expect((call[0] as { data: { type: string } }).data.type).toBe("EXTERNAL_SAAS");
    }
  });

  it("returns empty array (no create) when LLM response is not JSON array", async () => {
    callLLMMock.mockResolvedValue({ text: "Not a JSON array." });

    const result = await collectMarketSignals(BASE_CONFIG);

    expect(result).toEqual([]);
    expect(dbSignalCreateMock).not.toHaveBeenCalled();
  });
});
