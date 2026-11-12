import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADVE_STORAGE_KEYS } from "@/domain";
const state = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }));
vi.mock("@/lib/db", () => ({ db: { pillar: { findMany: vi.fn(async (options: { where: { key: { in: string[] } } }) =>
  options.where.key.in.includes("a") ? ADVE_STORAGE_KEYS.map(key => ({ key, content: {
    missionStatement: "Réparer localement", vision: "Devenir leader", _fieldProvenance: { missionStatement: "SOURCE", vision: "INFERRED" },
    narrativePreview: "Lecture préservée", narrativeFull: "NARRATION_ENREGISTREE_CONSERVEE",
  } })) : []) } } }));
vi.mock("@/server/services/seshat/context-store", () => ({ getOracleBrandContextByQuery: vi.fn(async () => ({ text: "Observation avec référence" })) }));
vi.mock("@/server/services/llm-gateway", () => ({
  callLLM: vi.fn(async (options: Record<string, unknown>) => {
    state.calls.push(options);
    return { text: JSON.stringify(String(options.caller).endsWith(":tension") ? { tension: "Une tension à confirmer dans ce dossier de recette" } : {
      executiveSummary: "Lecture qualifiée", centralTension: "Tension", rtis: { framing: "Pistes", pillars: [{}, {}, {}, {}] },
      recommendation: { strategicMove: "Confirmer la piste", foundedOnTension: "Une tension à confirmer dans ce dossier de recette", prioritizedActions: Array.from({ length: 3 }, () => ({
        title: "Action de recette", examples: ["Un exemple concret assez long pour la validation de forme", "Un autre exemple concret assez long pour la validation de forme"],
      })) },
    }) };
  }), extractJSON: (text: string) => JSON.parse(text),
}));
import { generateNarrativeReportV3 } from "@/server/services/quick-intake/narrative-report-v3";
beforeEach(() => { state.calls = []; });
describe("V3 consumes qualified origins without recasting cached narration as testimony", () => {
  it("qualifies evidence in both synthesis stages and preserves the saved narrative", async () => {
    const report = await generateNarrativeReportV3({ strategyId: "owned-brand", companyName: "Recette", sector: null, country: null, classification: "FRAGILE", vector: {} });
    expect(state.calls).toHaveLength(2);
    for (const call of state.calls) {
      expect(call.prompt).toContain("Donnée reçue ou observée");
      expect(call.prompt).toContain("Proposition à valider");
      expect(call.prompt).toContain("jamais un fait ou des paroles du prospect");
      expect(call.prompt).not.toContain("Valeurs verbatim founder");
    }
    expect(report.adve.map(p => p.full)).toEqual(ADVE_STORAGE_KEYS.map(() => "NARRATION_ENREGISTREE_CONSERVEE"));
  });
});
