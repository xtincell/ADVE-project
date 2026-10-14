import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADVE_STORAGE_KEYS, RTIS_STORAGE_KEYS } from "@/domain";

const state = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }));
vi.mock("@/server/services/llm-gateway", () => ({
  callLLM: vi.fn(async (options: Record<string, unknown>) => {
    state.calls.push(options);
    return { text: JSON.stringify(state.calls.length === 1
      ? { perPillar: {}, overallTension: "À qualifier" }
      : { executiveSummary: "Rapport reçu", adve: [{}, {}, {}, {}],
        rtis: { pillars: [{}, {}, {}, {}] } }) };
  }),
  extractJSON: (text: string) => JSON.parse(text),
}));
vi.mock("@/server/services/seshat/context-store", async () => {
  const real = await vi.importActual<typeof import("@/server/services/seshat/context-store/oracle-augment")>(
    "@/server/services/seshat/context-store/oracle-augment");
  return {
    formatPreciseFields: (...args: unknown[]) => (real as unknown as {
      formatPreciseFields: (...args: unknown[]) => string;
    }).formatPreciseFields(...args),
    indexBrandContext: vi.fn(async () => undefined),
    getOracleBrandContext: vi.fn(async (_id: string, key: string) => ({
      narrativeBlock: "Résumé abrégé pour orientation uniquement",
      text: "Contexte final conservé avec sa référence documentaire",
      preciseFields: [{ source: key, field: "inscrits", value: 0,
        sourceId: "pillar-" + key, sourceVersion: 0, provenance: "UNKNOWN",
        lastWrittenAt: new Date("2026-07-24T09:00:00Z") },
      { source: key, field: "hypothese", value: "5 questions = 5 axes",
        sourceId: "pillar-" + key, sourceVersion: 3, provenance: "INFERRED" }],
    })),
  };
});
vi.mock("@/lib/db", () => ({ db: {} }));

import { generateNarrativeReportV2 } from "@/server/services/quick-intake/narrative-report-v2";

beforeEach(() => { state.calls = []; });
const input = { strategyId: "brand-receipt", companyName: "Marque de recette", sector: null,
  country: null, classification: "À qualifier", vector: {} };

describe("V2 report uses the existing call manager contract", () => {
  it("attributes both existing stages to the input brand", async () => {
    await generateNarrativeReportV2(input);
    expect(state.calls.map(call => call.strategyId)).toEqual([input.strategyId, input.strategyId]);
  });

  it("passes exact values and edition origins to the first stage", async () => {
    await generateNarrativeReportV2(input);
    const prompt = state.calls[0]!.prompt as string;
    for (const key of ADVE_STORAGE_KEYS) {
      expect(prompt).toContain(`${key}.inscrits`);
      expect(prompt).toContain(`référence: pillar-${key} ; version d’édition: 0 ; origine: UNKNOWN`);
      expect(prompt).toContain("= 0");
      expect(prompt).toContain("5 questions = 5 axes");
      expect(prompt).toContain("origine: INFERRED");
    }
    expect(prompt).toContain("pas une date de mesure");
  });

  it("retains the two existing purposes and does not add a model stage", async () => {
    await generateNarrativeReportV2(input);
    expect(state.calls.map(call => [call.caller, call.purpose])).toEqual([
      ["quick-intake:narrative-v2:brief", "extraction"],
      ["quick-intake:narrative-v2:final", "final-report"],
    ]);
    expect(state.calls.map(call => call.maxOutputTokens)).toEqual([2048, 4096]);
    const finalPrompt = state.calls[1]!.prompt as string;
    for (const key of [...ADVE_STORAGE_KEYS, ...RTIS_STORAGE_KEYS]) expect(finalPrompt).toContain(key);
    expect(finalPrompt).toContain("Contexte final conservé avec sa référence documentaire");
  });
});
