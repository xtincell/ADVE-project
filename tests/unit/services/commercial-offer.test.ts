import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  composeCommercialPricing, composeCommercialQuote, devisGeneratorCalculator,
} from "@/server/services/artemis/tools/commercial-offer";
import { commercialQuoteOutputSchema } from "@/server/services/artemis/tools/commercial-offer-schemas";
import { calculators } from "@/server/services/glory-tools/calculators";
import { getGloryTool } from "@/server/services/artemis/tools/registry";
import { hasGloryComposer } from "@/server/services/artemis/tools/glory-composers";

const mocks = vi.hoisted(() => ({
  strategy: vi.fn(), resolvePrice: vi.fn(), lookupCountry: vi.fn(),
  outputCreate: vi.fn(), intentCreate: vi.fn(), intentUpdate: vi.fn(), llm: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  strategy: { findUnique: mocks.strategy },
  gloryOutput: { create: mocks.outputCreate },
  intentEmission: { create: mocks.intentCreate, update: mocks.intentUpdate },
} }));
vi.mock("@/server/services/monetization/compute-price", () => ({ resolvePrice: mocks.resolvePrice }));
vi.mock("@/server/services/country-registry", () => ({ lookupCountry: mocks.lookupCountry }));
vi.mock("@/server/services/llm-gateway", () => ({ callLLM: mocks.llm }));
vi.mock("@/server/services/utils/llm-structured", () => ({ executeStructuredLLMCall: mocks.llm, LLMStructuredCallError: class extends Error {} }));
vi.mock("@/server/services/anubis/mcp-client", () => ({ invokeExternalTool: mocks.llm }));

const COUNTRY = { code: "CI", currencyCode: "XOF", isFictional: false, purchasingPowerIndex: 10,
  currency: { code: "XOF", decimalPlaces: 0, usdRate: 600 } };
const catalogue = [
  { id: "gold", nom: "Gold documenté", prix: 60_000, conditionsTarifaires: "Un accompagnement par mois.", disponibilite: "ALWAYS" },
  { id: "starter", nom: "Starter", prix: "50 000 – 75 000 FCFA/mois" },
  { id: "pdf", nom: "Diagnostic documenté", prix: "Sur devis" },
];
const terms = { gold: { currency: "XOF", billing: "MONTHLY", sourceRef: "Décision propriétaire du 4 novembre" } };
const request = {
  lines: [{ offerId: "gold", quantity: 2 }], client: { name: "Atelier Test", reference: "prospect-a" },
  scope: ["Accompagnement défini dans les conditions approuvées"], exclusions: ["Achat média"],
  conditions: ["Paiement selon les conditions approuvées"], taxRatePct: 18, validUntil: "2026-12-01T00:00:00Z",
};
const input = (changes: Record<string, unknown> = {}) => Object.fromEntries(Object.entries({
  country_code: "CI", catalogue_terms: terms, quote_request: request, ...changes,
}).map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)]));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.strategy.mockResolvedValue({ id: "brand", countryCode: "CI", pillars: [{ currentVersion: 7, content: { produitsCatalogue: structuredClone(catalogue) } }] });
  mocks.lookupCountry.mockImplementation(async (code: string) => code.toUpperCase() === "CI" ? COUNTRY : null);
  mocks.resolvePrice.mockImplementation(async (tier: string) => ({ tier, tierLabel: tier,
    amount: tier === "INTAKE_PDF" ? 9800 : 59000, currencyCode: "XOF", currencySymbol: "FCFA",
    billing: tier === "INTAKE_PDF" ? "ONE_TIME" : "MONTHLY", display: "prix calculé",
    internal: { marketFactor: 0.3, fxRate: 600, amountSpu: 299, amountStandardCurrency: 89.7 } }));
  mocks.outputCreate.mockResolvedValue({ id: "glory-quote" });
  mocks.intentCreate.mockResolvedValue({ id: "intent-quote" });
  mocks.intentUpdate.mockResolvedValue({});
  mocks.llm.mockRejectedValue(new Error("Aucun LLM ne doit calculer un prix"));
});

describe("Outils commerciaux existants — sources et calculs", () => {
  it("enregistre les deux calculateurs et leurs composers/schémas effectifs", () => {
    for (const slug of ["pricing-strategy-advisor", "devis-generator"]) {
      expect(calculators[slug]).toBeTypeOf("function");
      expect(hasGloryComposer(slug)).toBe(true);
      expect(getGloryTool(slug)?.outputSchema).toBeDefined();
    }
  });

  it("calcule le prix fixe sourcé, sans choisir un prix dans une fourchette", async () => {
    const { pricing_strategy: raw } = await composeCommercialPricing("brand", input());
    const pricing = raw as { items: Array<Record<string, unknown>> };
    expect(pricing.items[0]).toMatchObject({ offerId: "gold", unitPrice: 60000, currency: "XOF", billing: "MONTHLY", status: "PRICED" });
    expect(pricing.items[1]).toMatchObject({ unitPrice: null, status: "NEEDS_INPUT" });
    expect(mocks.resolvePrice).not.toHaveBeenCalled();
  });

  it("résout seulement la correspondance explicitement fournie, conserve le produit et sa source", async () => {
    const result = await composeCommercialQuote("brand", input({
      tier_mapping: { starter: "RETAINER_BASE" }, quote_request: { ...request, lines: [{ offerId: "starter", quantity: 1 }] },
    }));
    const quote = commercialQuoteOutputSchema.parse(result).devis;
    expect(mocks.resolvePrice).toHaveBeenCalledExactlyOnceWith("RETAINER_BASE", "CI");
    expect(quote).toMatchObject({ status: "READY", lines: [{ offerId: "starter", offerName: "Starter", unitPrice: 59000 }] });
    expect(quote.sources).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "CATALOGUE", version: 7 }),
      expect.objectContaining({ kind: "MONETIZATION", reference: "monetization.getPrice:RETAINER_BASE:CI" })]));
    expect(quote.sources.every(source => /^[a-f0-9]{64}$/.test(source.contentHash))).toBe(true);
  });

  it("sépare one-shot et mensuel, sans faux total qui les additionne", async () => {
    const { devis } = commercialQuoteOutputSchema.parse(await composeCommercialQuote("brand", input({
      tier_mapping: { starter: "RETAINER_BASE", pdf: "INTAKE_PDF" },
      quote_request: { ...request, lines: [{ offerId: "starter", quantity: 2 }, { offerId: "pdf", quantity: 3 }] },
    })));
    expect(devis.status).toBe("READY");
    expect(devis.groups).toEqual([
      { currency: "XOF", billing: "MONTHLY", subtotal: 118000, taxTreatment: "EXCLUDED", taxRatePct: 18, tax: 21240, total: 139240 },
      { currency: "XOF", billing: "ONE_TIME", subtotal: 29400, taxTreatment: "EXCLUDED", taxRatePct: 18, tax: 5292, total: 34692 },
    ]);
    expect(devis).not.toHaveProperty("total");
    expect(devis.lines.map(line => line.lineTotal)).toEqual([118000, 29400]);
  });

  it("ne somme pas deux devises et ne convertit pas un tarif fixe sans autorisation", async () => {
    mocks.strategy.mockResolvedValue({ id: "brand", countryCode: "CI", pillars: [{ currentVersion: 7, content: { produitsCatalogue: [
      catalogue[0], { id: "atelier", nom: "Atelier tarifé en EUR", prix: "49 EUR" },
    ] } }] });
    const { devis } = commercialQuoteOutputSchema.parse(await composeCommercialQuote("brand", input({
      catalogue_terms: { ...terms, atelier: { currency: "EUR", billing: "MONTHLY", sourceRef: "Tarif contractuel EUR" } },
      quote_request: { ...request, lines: [{ offerId: "gold", quantity: 1 }, { offerId: "atelier", quantity: 2 }] },
    })));
    expect(devis.groups.map(group => [group.currency, group.subtotal])).toEqual([["XOF", 60000], ["EUR", 98]]);
    expect(devis).not.toHaveProperty("total");
    expect(mocks.resolvePrice).not.toHaveBeenCalled();
  });

  it("ne remplace pas un pays inconnu par le pays standard", async () => {
    // Even if a registry implementation supplies an unrelated fallback, reject it.
    mocks.lookupCountry.mockResolvedValue({ ...COUNTRY, code: "FR" });
    const { devis } = commercialQuoteOutputSchema.parse(await composeCommercialQuote("brand", input({
      country_code: "ZZ", tier_mapping: { starter: "RETAINER_BASE" },
      quote_request: { ...request, lines: [{ offerId: "starter", quantity: 1 }] },
    })));
    expect(mocks.resolvePrice).not.toHaveBeenCalled();
    expect(devis).toMatchObject({ status: "NEEDS_INPUT", lines: [{ unitPrice: null }], groups: [] });
    expect(devis.gaps.join(" ")).toContain("pays reconnu");
  });

  it("garde une taxe absente inconnue et un zéro explicite comme zéro", async () => {
    const { taxRatePct: _tax, ...untaxed } = request;
    const absent = commercialQuoteOutputSchema.parse(await composeCommercialQuote("brand", input({ quote_request: untaxed }))).devis;
    expect(absent).toMatchObject({ status: "NEEDS_INPUT", groups: [{ subtotal: 120000, taxRatePct: null, tax: null, total: null }] });
    const explicit = commercialQuoteOutputSchema.parse(await composeCommercialQuote("brand", input({ quote_request: { ...request, taxRatePct: 0 } }))).devis;
    expect(explicit).toMatchObject({ status: "READY", groups: [{ taxRatePct: 0, tax: 0, total: 120000 }] });
  });

  it("ne devine pas une période, même lorsque le texte contient /mois", async () => {
    mocks.strategy.mockResolvedValue({ id: "brand", countryCode: "CI", pillars: [{ currentVersion: 7, content: { produitsCatalogue: [{ id: "gold", nom: "Gold", prix: "60 000 FCFA/mois" }] } }] });
    const { devis } = commercialQuoteOutputSchema.parse(await composeCommercialQuote("brand", input({ catalogue_terms: {} })));
    expect(devis).toMatchObject({ status: "NEEDS_INPUT", lines: [{ unitPrice: 60000, currency: null, billing: null }], groups: [] });
  });

  it("ne confond pas prix connu et disponibilité confirmée", async () => {
    mocks.strategy.mockResolvedValue({ id: "brand", countryCode: "CI", pillars: [{ currentVersion: 7, content: { produitsCatalogue: [{ ...catalogue[0], disponibilite: "PENDING" }] } }] });
    const { devis } = commercialQuoteOutputSchema.parse(await composeCommercialQuote("brand", input()));
    expect(devis).toMatchObject({ status: "NEEDS_INPUT", lines: [{ unitPrice: 60000, availability: "PENDING" }] });
    expect(devis.gaps.join(" ")).toContain("disponibilité");
  });

  it("une autorisation propriétaire prépare l’offre PENDING sans modifier son état ni inventer une TVA", async () => {
    mocks.strategy.mockResolvedValue({ id: "brand", countryCode: "CI", pillars: [{ currentVersion: 7, content: { produitsCatalogue: [{ ...catalogue[0], disponibilite: "PENDING" }] } }] });
    const { taxRatePct: _tax, ...base } = request;
    const { devis } = commercialQuoteOutputSchema.parse(await composeCommercialQuote("brand", input({
      owner_authorized_offer_ids: ["gold"], quote_request: { ...base, taxTreatment: "INCLUDED_IN_PRICE" },
    })));
    expect(devis).toMatchObject({ status: "READY", lines: [{ availability: "PENDING", unitPrice: 60000 }],
      groups: [{ taxTreatment: "INCLUDED_IN_PRICE", subtotal: 120000, taxRatePct: null, tax: null, total: 120000 }] });
    expect(devis.sources).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "OWNER_INPUT", reference: "owner_authorized_offer_ids" })]));
    expect(devis.note).toContain("aucun taux");
  });

  it("refuse les montants injectés dans une ligne et ne choisit pas les quantités", async () => {
    const injected = commercialQuoteOutputSchema.parse(await composeCommercialQuote("brand", input({
      quote_request: { ...request, lines: [{ offerId: "gold", quantity: 1, unitPrice: 1 }] },
      pricing_strategy: { items: [{ unitPrice: 1 }] },
    }))).devis;
    expect(injected).toMatchObject({ status: "NEEDS_INPUT", lines: [], groups: [] });
    const missing = commercialQuoteOutputSchema.parse(await composeCommercialQuote("brand", input({ quote_request: "" }))).devis;
    expect(missing.lines).toEqual([]);
  });

  it("signale offre inconnue, JSON incorrect et doublons sans fabriquer un catalogue", async () => {
    const { devis } = commercialQuoteOutputSchema.parse(await composeCommercialQuote("brand", input({
      tier_mapping: "not-json", quote_request: { ...request, lines: [{ offerId: "absent", quantity: 1 }] },
    })));
    expect(devis.status).toBe("NEEDS_INPUT");
    expect(devis.lines).toEqual([]);
    expect(devis.gaps.join(" ")).toContain("Offre inconnue");
    expect(devis.gaps.join(" ")).toContain("JSON valide");
    const duplicate = devisGeneratorCalculator({ quote_request: { ...request, lines: [request.lines[0], request.lines[0]] } });
    expect(commercialQuoteOutputSchema.parse(duplicate).devis.lines).toEqual([]);
  });

  it("conserve un prix gratuit explicitement documenté sans substituer zéro aux absences", async () => {
    mocks.strategy.mockResolvedValue({ id: "brand", countryCode: "CI", pillars: [{ currentVersion: 7, content: { produitsCatalogue: [{ id: "gold", nom: "Accès gratuit", prix: 0 }] } }] });
    const { devis } = commercialQuoteOutputSchema.parse(await composeCommercialQuote("brand", input({
      catalogue_terms: { gold: { currency: "XOF", billing: "ONE_TIME", sourceRef: "Politique actuelle" } },
      quote_request: { ...request, taxRatePct: 0 },
    })));
    expect(devis).toMatchObject({ status: "READY", lines: [{ unitPrice: 0, lineTotal: 0 }], groups: [{ total: 0 }] });
  });

  it("un dossier absent produit des données à compléter, jamais une sortie LLM", async () => {
    mocks.strategy.mockResolvedValue(null);
    const { devis } = commercialQuoteOutputSchema.parse(await composeCommercialQuote("absent", input()));
    expect(devis.status).toBe("NEEDS_INPUT");
    expect(devis.gaps.join(" ")).toContain("introuvable");
    expect(mocks.llm).not.toHaveBeenCalled();
  });

  it("le vrai executeTool persiste le devis structuré dans GloryOutput, sans LLM", async () => {
    const { executeTool } = await import("@/server/services/artemis/tools/engine");
    const result = await executeTool("devis-generator", "brand", input());
    expect(result).toMatchObject({ outputId: "glory-quote", output: { devis: { status: "READY" }, _provenance: "DETERMINISTIC_COMPOSE" } });
    expect(mocks.outputCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ strategyId: "brand", toolSlug: "devis-generator", output: expect.objectContaining({ devis: expect.objectContaining({ client: request.client }) }) }) });
    expect(mocks.llm).not.toHaveBeenCalled();
  });
});
