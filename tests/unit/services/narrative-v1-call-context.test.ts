import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }));
vi.mock("@/server/services/llm-gateway", () => ({
  callLLM: vi.fn(async (options: Record<string, unknown>) => {
    state.calls.push(options);
    return { text: JSON.stringify(String(options.caller).endsWith(":adve")
      ? { executiveSummary: "Rapport reçu", adve: [{}, {}, {}, {}] }
      : { framing: "À qualifier", pillars: [{}, {}, {}, {}] }) };
  }),
  extractJSON: (text: string) => JSON.parse(text),
}));

import { generateNarrativeReport } from "@/server/services/quick-intake/narrative-report";

beforeEach(() => { state.calls = []; });
const input = { strategyId: "brand-receipt", companyName: "Marque de recette", sector: null,
  country: null, classification: "À qualifier", vector: {}, responses: null };

describe("Active V1 report carries the existing manager's brand context", () => {
  it("attributes its two existing stages to the supplied brand", async () => {
    await generateNarrativeReport(input);
    expect(state.calls.map(call => call.strategyId)).toEqual([input.strategyId, input.strategyId]);
  });

  it("retains the two existing purposes, budgets and model override", async () => {
    await generateNarrativeReport(input);
    expect(state.calls.map(call => [call.caller, call.purpose, call.maxOutputTokens])).toEqual([
      ["quick-intake:narrative-report:adve", "final-report", 2048],
      ["quick-intake:narrative-report:rtis", "final-report", 2048],
    ]);
    expect(state.calls[0]!.model).toBe("claude-sonnet-4-20250514");
    expect(state.calls[1]!.model).toBeUndefined();
  });

  it("does not invent a brand identifier for an unbranded benchmark", async () => {
    const { strategyId: _strategyId, ...unbranded } = input;
    await generateNarrativeReport(unbranded);
    expect(state.calls).toHaveLength(2);
    expect(state.calls.every(call => call.strategyId === undefined)).toBe(true);
  });
});
