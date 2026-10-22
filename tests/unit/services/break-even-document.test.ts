import { describe, expect, it } from "vitest";
import { BreakEvenDocumentModelSchema } from "@/domain/financial-document";
import { composeBreakEvenDocument } from "@/server/services/financial-brain/break-even-document";

const amount = (value: number | null) => ({ value, qualification: "ASSUMPTION", note: "Scénario synthétique, aucun montant réel.", sources: [] });
const model = () => ({ schema: "adve-break-even-model-v1", title: "Exercice synthétique", currency: "XOF", period: "MONTH",
  scope: "Périmètre de recette", payer: "Abonné professionnel", unit: "abonnement mensuel", taxBasis: "HT",
  fixedCosts: [{ label: "Charges fixes", ...amount(315000) }], price: amount(15000),
  variableCosts: [{ label: "Coût variable", ...amount(8000) }], exclusions: [], assumptions: ["Pas une prévision de ventes."],
  growth: { initialUnits: 10, monthlyIncrease: 10, firstMonth: 0 } });

describe("fiche Catalyse reproductible depuis un modèle documentaire", () => {
  it("produit le seuil, la sensibilité et une courbe de coûts, sans confondre mois et unités", () => {
    const result = composeBreakEvenDocument("Marque de recette", BreakEvenDocumentModelSchema.parse(model()));
    expect(result.base.breakEvenUnits).toBe(45);
    expect(result.base.breakEvenRevenue).toBe(675000);
    expect(result.firstProfitableMonth).toBe(4);
    expect(result.scenarios.map(s => s.analysis.breakEvenUnits)).toEqual([45, 79, 32, 39]);
    expect(result.chart.some(p => p.units === 45 && p.revenue === p.cost)).toBe(true);
    expect(result.state).toBe("SCENARIO");
  });
  it("un coût inconnu interdit le calcul : il ne devient jamais zéro", () => {
    const input = model(); input.variableCosts[0]!.value = null;
    const result = composeBreakEvenDocument("Marque de recette", BreakEvenDocumentModelSchema.parse(input));
    expect(result.base.status).toBe("INSUFFICIENT_DATA");
    expect(result.base.breakEvenUnits).toBeNull();
    expect(result.missing).toContain("Coût variable");
    expect(result.chart).toEqual([]);
    expect(result.firstProfitableMonth).toBeNull();
  });
  it("une hypothèse ou donnée historique ne devient pas une rentabilité mesurée", () => {
    const input = model(); input.fixedCosts[0]!.qualification = "HISTORICAL";
    (input.fixedCosts[0]!.sources as unknown[]) = [{ sourceId: "historical-source", contentHash: "a".repeat(64), locator: "Ancien registre" }];
    const result = composeBreakEvenDocument("Marque de recette", BreakEvenDocumentModelSchema.parse(input));
    expect(result.state).toBe("SCENARIO");
    expect(result.model.fixedCosts[0]!.qualification).toBe("HISTORICAL");
    expect(result.firstProfitableMonth).toBe(4);
    delete (input as Partial<typeof input>).growth;
    expect(composeBreakEvenDocument("Marque", BreakEvenDocumentModelSchema.parse(input)).firstProfitableMonth).toBeNull();
  });
  it("exige des références pour une valeur déclarée sourcée et refuse les nombres textuels", () => {
    const input = model(); input.price.qualification = "SOURCED";
    expect(BreakEvenDocumentModelSchema.safeParse(input).success).toBe(false);
    expect(BreakEvenDocumentModelSchema.safeParse({ ...model(), price: { ...amount(10), value: "10" } }).success).toBe(false);
  });
  it("conserve l'absence de délai et le seuil infini si la contribution ne suffit pas", () => {
    const input = model(); input.variableCosts[0]!.value = 15000;
    const result = composeBreakEvenDocument("Marque", BreakEvenDocumentModelSchema.parse(input));
    expect(result.base.status).toBe("NO_FINITE_BREAK_EVEN");
    expect(result.firstProfitableMonth).toBeNull();
  });
});
