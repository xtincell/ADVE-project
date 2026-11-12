import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADVE_STORAGE_KEYS } from "@/domain";
const state = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[], writes: [] as Record<string, unknown>[] }));
vi.mock("@/lib/db", () => ({ db: { pillar: { findMany: vi.fn(async () => ADVE_STORAGE_KEYS.map(key => ({ key,
  content: { missionStatement: "Réparer localement", vision: "Devenir leader", _fieldProvenance: { missionStatement: "SOURCE", vision: "INFERRED" } },
}))) } } }));
vi.mock("@/server/services/utils/llm-structured", () => ({ executeStructuredLLMCall: vi.fn(async (options: Record<string, unknown>) => {
  state.calls.push(options); return { data: { preview: "Lecture de la fondation", full: "Synthèse qualifiée reçue" } };
}) }));
vi.mock("@/server/services/pillar-gateway", () => ({ writePillarAndScore: vi.fn(async (options: Record<string, unknown>) => {
  state.writes.push(options); return { success: true };
}) }));
import { narrateAdvePillars } from "@/server/services/quick-intake/narrate-adve";
beforeEach(() => { state.calls = []; state.writes = []; });
describe("ADVE narration preserves the distinction between evidence and proposals", () => {
  it("uses qualified fields for each existing stage and never asks to quote generated values as founder speech", async () => {
    await narrateAdvePillars({ strategyId: "owned-brand", companyName: "Recette" });
    expect(state.calls).toHaveLength(4);
    for (const call of state.calls) {
      expect(call.strategyId).toBe("owned-brand");
      expect(call.prompt).toContain("Donnée reçue ou observée");
      expect(call.prompt).toContain("Proposition à valider");
      expect(call.prompt).not.toContain("VALEURS VERBATIM RENSEIGNÉES PAR LE FOUNDER");
      expect(call.system).toContain("jamais un fait ou des paroles du prospect");
    }
    expect(state.writes).toHaveLength(4);
    for (const write of state.writes) {
      const operation = write.operation as { type: string; patch: Record<string, unknown> };
      expect(operation.type).toBe("MERGE_DEEP");
      expect(Object.keys(operation.patch).sort()).toEqual(["narrativeFull", "narrativePreview"]);
    }
  });
});
