import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ precise: [] as Record<string, unknown>[] }));
vi.mock("@/lib/db", () => ({ db: {
  framework: { findUnique: vi.fn(async () => ({ id: "fw-existing" })) },
  frameworkResult: { create: vi.fn(async () => ({ id: "result" })), update: vi.fn() },
  frameworkExecution: { create: vi.fn(async () => ({ id: "execution" })), update: vi.fn() },
} }));
vi.mock("@/server/services/llm-gateway", () => ({ callLLM: vi.fn() }));
vi.mock("@/server/services/utils/llm-structured", () => ({
  executeStructuredLLMCall: vi.fn(async () => ({ data: { analysis: "Reçu", score: 4,
    prescriptions: [], confidence: 0.3 }, attempts: 1 })),
  LLMStructuredCallError: class extends Error {},
}));
vi.mock("@/server/services/seshat/context-store", async () => {
  const real = await vi.importActual<typeof import("@/server/services/seshat/context-store/oracle-augment")>(
    "@/server/services/seshat/context-store/oracle-augment");
  return {
    formatPreciseFields: (...args: unknown[]) => (real as unknown as {
      formatPreciseFields: (...args: unknown[]) => string;
    }).formatPreciseFields(...args),
    loadStrategyContextForFramework: vi.fn(async () => ({ lines: ["Résumé pour orientation"],
      precise: state.precise, augmented: false, narrativeNodeCount: 0 })),
  };
});

import { executeFramework } from "@/server/services/artemis";
import { executeStructuredLLMCall } from "@/server/services/utils/llm-structured";
import { callLLM } from "@/server/services/llm-gateway";

beforeEach(() => {
  vi.clearAllMocks();
  state.precise = [{ source: "e", field: "rituels", value: "5 questions = 5 axes",
    sourceId: "pillar-e", sourceVersion: 3, provenance: "INFERRED",
    lastWrittenAt: new Date("2026-07-24T09:00:00Z") },
  { source: "e", field: "inscrits", value: 0, sourceId: "pillar-e", sourceVersion: 0,
    provenance: "UNKNOWN" },
  { source: "a", field: "horsChamp", value: "HORS_CHAMP_AUTHENTICITE", sourceId: "pillar-a",
    sourceVersion: 9, provenance: "HUMAN" },
  { source: "biz", field: "businessContext", value: { actif: false }, sourceId: "brand-receipt",
    sourceVersion: null, provenance: "UNKNOWN" }];
});

describe("Artemis consumes Seshat precise input through the existing manager", () => {
  it("transmits qualified stored fields beyond the narrative summary", async () => {
    await executeFramework("fw-08-ritual-design", "brand-receipt", {});
    const options = vi.mocked(executeStructuredLLMCall).mock.calls[0]![0];
    expect(options.system).toContain("e.rituels");
    expect(options.system).toContain("référence: pillar-e ; version d’édition: 3 ; origine: INFERRED");
    expect(options.system).toContain("5 questions = 5 axes");
    expect(options.system).toContain("version d’édition: 0 ; origine: UNKNOWN");
    expect(options.system).toContain("= 0");
    expect(options.system).toContain('"actif":false');
    expect(options.system).toContain("pas une date de mesure");
  });

  it("scopes pillar values to the selected framework and preserves its single call", async () => {
    await executeFramework("fw-08-ritual-design", "brand-receipt", {});
    expect(executeStructuredLLMCall).toHaveBeenCalledOnce();
    expect(callLLM).not.toHaveBeenCalled();
    const options = vi.mocked(executeStructuredLLMCall).mock.calls[0]![0];
    expect(options).toMatchObject({ strategyId: "brand-receipt", caller: "artemis:fw-08-ritual-design",
      maxOutputTokens: 4096, validationMode: "strict" });
    expect(options.system).not.toContain("HORS_CHAMP_AUTHENTICITE");
    expect(options.system).toContain("Résumé pour orientation");
  });

  it("keeps missing precise data explicit instead of making the summary its evidence", async () => {
    state.precise = [];
    await executeFramework("fw-08-ritual-design", "brand-receipt", {});
    expect(vi.mocked(executeStructuredLLMCall).mock.calls[0]![0].system)
      .toContain("aucune valeur structurée disponible");
  });
});
