import { describe, expect, it } from "vitest";
import { PillarVSchema, validatePillarPartial } from "@/lib/types/pillar-schemas";
import { financialModelFixture } from "../../fixtures/financial-model";
import { projectFinancialWorkingModel, resolveUnitEconomics } from "@/domain/unit-economics";



describe("Prémisses financières ADVE et résultats calculables", () => {
  it("admet un ROI de 1100 %, sans le confondre avec une part plafonnée à 100 %", () => {
    const result = PillarVSchema.pick({ unitEconomics: true }).safeParse({ unitEconomics: {
      cac: 7000, ltv: 84000, ltvCacRatio: 12, margeNette: 0.14,
      roiEstime: 1100, paybackPeriod: 1, budgetCom: 2760000, caVise: 11700000,
    } });
    expect(result.success).toBe(true);
  });

  it("calcule seuil, valeur de cohorte et revenu annuel depuis les prémisses, sans annualiser le dernier mois", () => {
    const result = projectFinancialWorkingModel(financialModelFixture());
    expect(result.status).toBe("COMPUTED");
    if (result.status !== "COMPUTED") throw new Error("Modèle de recette non calculé");
    expect(result.analysis.breakEvenUnits).toBe(45);
    expect(result.values).toMatchObject({ cac: 7000, ltv: 84000, ltvCacRatio: 12,
      roiEstime: 1100, paybackPeriod: 1, caVise: 11700000, budgetCom: 2760000 });
    expect(result.values.margeNette).toBeCloseTo(0.14358974358974358);
    expect(result.firstProfitableMonth).toBe(5);
    expect(result.note).toContain("plafond proposé");
    expect(result.currency).toBe("USD");
  });

  it("calcule une trésorerie conditionnelle selon les délais ADVE, distincte du résultat économique", () => {
    const model = financialModelFixture();
    const input = { ...model, projection: { ...model.projection, cashFlow: {
      openingCash: { value: 10000, qualification: "ASSUMPTION", note: "Solde initial proposé", sources: [] },
      revenueDelayMonths: 1, costDelayMonths: 0, note: "Encaissements décalés d’un mois ; aucune banque observée.",
    } } };
    const result = projectFinancialWorkingModel(input);
    if (result.status !== "COMPUTED") throw new Error("Modèle de recette non calculé");
    expect((result as unknown as { cashBalances: number[] }).cashBalances?.[0]).toBe(-385000);
    expect((result as unknown as { cashBalances: number[] }).cashBalances?.[11]).toBe(-110000);
  });

  it("ne recompte pas la communication une deuxième fois dans la marge", () => {
    const result = projectFinancialWorkingModel(financialModelFixture());
    if (result.status !== "COMPUTED") throw new Error("Modèle de recette non calculé");
    expect(result.values.caVise * result.values.margeNette!).toBeCloseTo(1680000);
  });

  it("refuse les prémisses manquantes et les références de coût invalides, sans les remplacer par zéro", () => {
    const missing = financialModelFixture();
    missing.breakEven.fixedCosts[0]!.value = null;
    expect(projectFinancialWorkingModel(missing).status).toBe("INCOMPLETE_MODEL");
    const duplicate = financialModelFixture(); duplicate.projection.marketingFixedCostIndexes = [1, 1];
    expect(projectFinancialWorkingModel(duplicate).status).toBe("INCOMPLETE_MODEL");
    const foreignIndex = financialModelFixture(); foreignIndex.projection.marketingVariableCostIndexes = [5];
    expect(projectFinancialWorkingModel(foreignIndex).status).toBe("INCOMPLETE_MODEL");
  });

  it("distingue un modèle déficitaire connu d’un manque de données", () => {
    const model = financialModelFixture(); model.breakEven.variableCosts[1]!.value = 15000;
    const result = projectFinancialWorkingModel(model);
    if (result.status !== "COMPUTED") throw new Error("Modèle de recette non calculé");
    expect(result.analysis.status).toBe("NO_FINITE_BREAK_EVEN");
    expect(result.values.pointMort).toContain("Aucun seuil fini");
    expect(result.outcomes.roiEstime).toContain("Non applicable");
    expect(result.values.ltv).toBeLessThan(0);
  });

  it("projette le modèle courant sans modifier les données conservées ni recycler un ancien ratio", () => {
    const content = { financialModel: financialModelFixture(), unitEconomics: { cac: 2, ltv: 3, ltvCacRatio: 23, commentaire: "Ancien repère conservé" } };
    const before = structuredClone(content);
    expect(resolveUnitEconomics(content)).toMatchObject({ cac: 7000, ltv: 84000, ltvCacRatio: 12 });
    expect(content).toEqual(before);
    expect(resolveUnitEconomics({ unitEconomics: before.unitEconomics })).toEqual(before.unitEconomics);
  });

  it("valide les prémisses actuelles sans traiter les anciennes métriques comme une deuxième source", () => {
    const unitEconomics = { cac: null, ltv: null, commentaire: "Ancien repère conservé" };
    const result = validatePillarPartial("V", { financialModel: financialModelFixture(), unitEconomics });
    expect(result.success).toBe(true);
    expect((result.data as Record<string, unknown>).unitEconomics).toEqual(unitEconomics);
    expect(validatePillarPartial("V", { unitEconomics }).success).toBe(false);
    const invalid = financialModelFixture(); invalid.breakEven.price.value = null;
    expect(validatePillarPartial("V", { financialModel: invalid, unitEconomics }).success).toBe(false);
  });
});
