import { beforeEach, describe, expect, it, vi } from "vitest";
import { chainGloryToPtah } from "@/server/services/artemis/tools/sequence-executor";
import { getGloryTool } from "@/server/services/artemis/tools/registry";
import { devisGeneratorCalculator, formatCommercialQuoteBrief } from "@/server/services/artemis/tools/commercial-offer";

const mocks = vi.hoisted(() => ({ emit: vi.fn(), strategy: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { strategy: { findUnique: mocks.strategy } } }));
vi.mock("@/server/services/mestor/intents", () => ({ emitIntent: mocks.emit }));

function quote() {
  const source = { kind: "CATALOGUE", reference: "current-catalogue", contentHash: "c".repeat(64), version: 3 };
  const item = { offerId: "starter", offerName: "Starter", status: "PRICED", unitPrice: 59000, currency: "XOF", billing: "MONTHLY",
    conditions: ["Accompagnement mensuel approuvé. Aucun achat média inclus."], availability: "ALWAYS", sources: [source], gaps: [] };
  return devisGeneratorCalculator({
    pricing_strategy: { schemaVersion: 1, status: "READY", countryCode: "CI", items: [item], gaps: [], note: "Prix documenté." },
    quote_request: { lines: [{ offerId: "starter", quantity: 2 }], client: { name: "Entreprise de recette" },
      scope: ["Deux marques accompagnées"], exclusions: ["Achat média"], conditions: ["Conditions approuvées et paiement mensuel"],
      validUntil: "2030-01-01T00:00:00Z", taxTreatment: "INCLUDED_IN_PRICE" },
  });
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.strategy.mockResolvedValue({ operatorId: "owner" });
  mocks.emit.mockResolvedValue({ output: { taskId: "existing-forge-task" } });
});

describe("Existing devis → document forge handoff", () => {
  it("passes professional Markdown with exact amounts, period and conditions to the existing intent", async () => {
    const output = quote();
    const task = await chainGloryToPtah({ tool: getGloryTool("devis-generator")!, toolOutput: output,
      strategyId: "brand", sourceIntentId: "glory-intent", context: {} });
    expect(task).toBe("existing-forge-task");
    const payload = mocks.emit.mock.calls[0]![0];
    expect(payload).toMatchObject({ kind: "PTAH_MATERIALIZE_BRIEF", strategyId: "brand", operatorId: "owner", sourceIntentId: "glory-intent" });
    const brief = payload.brief.briefText;
    expect(typeof brief).toBe("string"); expect(brief).toContain("# Proposition commerciale");
    expect(brief).toMatch(/118.?000 XOF/); expect(brief).toContain("par mois");
    expect(brief).toContain("| Montant de ligne |\n| --- |");
    expect(brief).toContain("Conditions approuvées et paiement mensuel"); expect(brief).toContain("Achat média");
    expect(brief).toContain("Taxes incluses dans le prix final, sans ventilation");
    expect(brief).not.toContain('"devis":'); expect(brief).not.toContain("[object Object]"); expect(brief).not.toContain("c".repeat(64));
  });

  it("never materializes an incomplete or malformed quotation as ready", async () => {
    const output = quote();
    (output.devis as { status: string; gaps: string[] }).status = "NEEDS_INPUT";
    (output.devis as { gaps: string[] }).gaps.push("Périmètre à compléter");
    expect(formatCommercialQuoteBrief(output.devis)).toBeNull();
    await expect(chainGloryToPtah({ tool: getGloryTool("devis-generator")!, toolOutput: output,
      strategyId: "brand", sourceIntentId: "glory-intent", context: {} })).rejects.toThrow("Complétez le devis");
    expect(mocks.emit).not.toHaveBeenCalled(); expect(mocks.strategy).not.toHaveBeenCalled();
    expect(formatCommercialQuoteBrief({ status: "READY" })).toBeNull();
  });

  it("preserves legacy text quotations and the other tools' text paths", async () => {
    const legacy = "Devis historique reçu, conditions inchangées.";
    await chainGloryToPtah({ tool: getGloryTool("devis-generator")!, toolOutput: { devis: legacy },
      strategyId: "brand", sourceIntentId: "legacy-intent", context: {} });
    expect(mocks.emit.mock.calls[0]![0].brief.briefText).toBe(legacy);
    const tool = { ...getGloryTool("devis-generator")!, slug: "existing-other-tool",
      forgeOutput: { ...getGloryTool("devis-generator")!.forgeOutput!, briefTextPath: "prompts[0].prompt" } };
    await chainGloryToPtah({ tool, toolOutput: { prompts: [{ prompt: "Brief créatif existant" }] },
      strategyId: "brand", sourceIntentId: "other-intent", context: {} });
    expect(mocks.emit.mock.calls[1]![0].brief.briefText).toBe("Brief créatif existant");
  });
});
