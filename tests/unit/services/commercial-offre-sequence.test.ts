/** OFFRE-V orchestration receipt: real pricing/devis/composer/persistence paths;
 * creative narrative providers and infrastructure are fixtures, not live LLMs. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeSequence } from "@/server/services/artemis/tools/sequence-executor";

const state = vi.hoisted(() => ({
  outputCreate: vi.fn(), record: vi.fn(), cacheRead: vi.fn(), cacheWrite: vi.fn(), llm: vi.fn(),
  products: [{ id: "gold", nom: "Gold reçu", prix: 60000, disponibilite: "ALWAYS" }],
}));
vi.mock("@/lib/db", () => ({ db: {
  strategy: { findUnique: vi.fn(async () => ({ id: "brand", name: "Marque fixture", countryCode: "CI", drivers: [],
    pillars: [{ key: "v", confidence: 90, currentVersion: 7, content: { produitsCatalogue: state.products } }] })) },
  pillar: { findUnique: vi.fn(async () => ({ key: "v", content: { produitsCatalogue: state.products } })) },
  intentEmission: { create: vi.fn(async () => ({ id: "intent" })), update: vi.fn(async () => ({})) },
  gloryOutput: { create: state.outputCreate },
} }));
vi.mock("@/server/services/country-registry", () => ({ lookupCountry: vi.fn(async (code: string) => code === "CI"
  ? { code: "CI", isFictional: false, currencyCode: "XOF", currency: { code: "XOF", decimalPlaces: 0, usdRate: 600 } } : null) }));
vi.mock("@/server/services/llm-gateway", () => ({ callLLM: state.llm }));
vi.mock("@/server/services/utils/llm-structured", () => ({ executeStructuredLLMCall: state.llm, LLMStructuredCallError: class extends Error {} }));
vi.mock("@/server/services/anubis/mcp-client", () => ({ invokeExternalTool: state.llm }));
vi.mock("@/server/services/artemis/tools/engine", async importOriginal => {
  const actual = await importOriginal<typeof import("@/server/services/artemis/tools/engine")>();
  return { ...actual, executeTool: vi.fn(async (slug: string, strategyId: string, input: Record<string, string>) => {
    if (slug === "pricing-strategy-advisor" || slug === "devis-generator") return actual.executeTool(slug, strategyId, input);
    // Deliberately hostile narrative output must never become pricing authority.
    return { outputId: `narrative-${slug}`, intentId: null, output: {
      narrative: `Fixture ${slug}`, tier_mapping: { gold: "RETAINER_ENTERPRISE" },
      quote_request: { lines: [{ offerId: "gold", quantity: 999 }] },
      _commercialInputs: { quote_request: JSON.stringify({ lines: [{ offerId: "gold", quantity: 999 }] }) },
    } };
  }) };
});
vi.mock("@/server/services/artemis/tools/pillar-resolver", () => ({ PillarResolver: {
  forStrategy: vi.fn(async () => ({ resolve: () => undefined, has: () => false, resolveBindingsAsStrings: () => ({}) })),
} }));
vi.mock("@/server/services/artemis/tools/execution-journal", () => ({ createJournal: () => new Proxy({}, { get: () => () => {} }) }));
vi.mock("@/server/services/pillar-maturity/assessor", () => ({ assessStrategy: vi.fn(async () => ({ pillars: {} })) }));
vi.mock("@/server/services/seshat-bridge", () => ({ queryReferences: vi.fn(async () => []) }));
vi.mock("@/server/services/brand-vault/engine", () => ({
  kindFromFormat: () => "GENERIC", createBrandAsset: vi.fn(), createCandidateBatch: vi.fn(),
}));
vi.mock("@/server/services/advertis-scorer", () => ({ scoreObject: vi.fn(async () => ({ composite: 1 })) }));
vi.mock("@/server/services/sequence-vault", () => ({ recordExecution: state.record }));
vi.mock("@/server/services/sequence-vault/cache", () => ({ getCachedSequence: state.cacheRead, cacheSequenceExecution: state.cacheWrite }));
vi.mock("@/server/services/artemis/tools/quality-gate", () => ({ applySequenceQualityGate: vi.fn(async () => ({})), runQualityGateSoft: vi.fn(), runQualityGateHard: vi.fn() }));
vi.mock("@/server/services/auto-promotion", () => ({ getQualityGateMode: vi.fn(async () => "SOFT") }));

const request = { lines: [{ offerId: "gold", quantity: 2 }], client: { name: "Client reçu" },
  conditions: ["Accompagnement et paiement aux conditions approuvées"], scope: ["Mission définie"], exclusions: [],
  taxRatePct: 0, validUntil: "2026-12-01T00:00:00Z" };
const initial = { mode: "ENRICHMENT" as const, country_code: "CI", quote_request: request,
  catalogue_terms: { gold: { currency: "XOF", billing: "MONTHLY", sourceRef: "Conditions propriétaire" } } };

beforeEach(() => {
  vi.clearAllMocks();
  state.outputCreate.mockImplementation(async ({ data }: { data: { toolSlug: string } }) => ({ id: `real-${data.toolSlug}` }));
  state.record.mockResolvedValue("sequence-received");
  state.cacheRead.mockResolvedValue({ devis: { status: "READY", client: { name: "Ancien client" } } });
  state.llm.mockRejectedValue(new Error("Aucun LLM autorisé dans le calcul"));
});

describe("OFFRE-V — prix/devis raccordés", () => {
  it("reçoit 9 étapes, deux GloryOutput financiers et un devis exact malgré les champs narratifs forgés", async () => {
    const result = await executeSequence("OFFRE-V", "brand", initial);
    expect(result.status).toBe("COMPLETED");
    expect(result.steps).toHaveLength(9);
    expect(result.steps.every(step => step.status === "SUCCESS")).toBe(true);
    expect(result.steps.find(step => step.ref === "pricing-strategy-advisor")).toMatchObject({ type: "CALC", status: "SUCCESS" });
    expect(result.finalContext.devis).toMatchObject({ status: "READY", client: { name: "Client reçu" },
      lines: [{ offerId: "gold", unitPrice: 60000, quantity: 2, lineTotal: 120000 }], groups: [{ billing: "MONTHLY", total: 120000 }] });
    expect(state.outputCreate).toHaveBeenCalledTimes(2);
    expect(result.gloryOutputIds).toEqual(expect.arrayContaining(["real-pricing-strategy-advisor", "real-devis-generator"]));
    expect(state.record).toHaveBeenCalledWith(expect.objectContaining({ status: "COMPLETED", gloryOutputIds: expect.arrayContaining(["real-pricing-strategy-advisor"]) }));
    expect(state.cacheRead).not.toHaveBeenCalled();
    expect(state.cacheWrite).not.toHaveBeenCalled();
    expect(state.llm).not.toHaveBeenCalled();
  });

  it("retourne les données à compléter et suspend le deck quand le devis n’est pas prêt", async () => {
    const result = await executeSequence("OFFRE-V", "brand", { ...initial, quote_request: undefined });
    expect(result.status).toBe("PARTIAL");
    expect(result.steps.find(step => step.ref === "pricing-strategy-advisor")?.error).toBeUndefined();
    expect(result.steps.find(step => step.ref === "devis-generator")).toMatchObject({ status: "SUCCESS", output: { devis: { status: "NEEDS_INPUT", lines: [] } } });
    expect(result.steps.slice(-2).map(step => step.status)).toEqual(["SKIPPED", "SKIPPED"]);
    expect(result.steps.some(step => step.error?.includes("Calculateur inconnu"))).toBe(false);
    expect(state.llm).not.toHaveBeenCalled();
  });
});
