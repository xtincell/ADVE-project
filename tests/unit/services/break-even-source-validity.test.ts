import { describe, expect, it } from "vitest";
import { calculateBreakeven } from "@/server/services/financial-brain/break-even";

describe("seuil depuis les données financières déclarées", () => {
  it("sépare le CA théorique du nombre entier d'unités à vendre", () => {
    const result = calculateBreakeven({ fixedCosts: 315000, variableCostPerUnit: 6800, pricePerUnit: 15000 });
    expect(result.breakEvenUnits).toBe(39);
    expect(result.breakEvenRevenue).toBeCloseTo(315000 / (8200 / 15000), 6);
    expect(result.revenueAtWholeUnits).toBe(585000);
  });
  it.each([undefined, null, NaN, Infinity, -1])("refuse une charge fixe absente ou invalide %s", fixedCosts => {
    const result = calculateBreakeven({ fixedCosts, variableCostPerUnit: 8000, pricePerUnit: 15000 } as never);
    expect(result.status).toBe("INSUFFICIENT_DATA");
    expect(result.breakEvenUnits).toBeNull();
  });
  it("refuse une contribution qui ne couvre jamais les coûts", () => {
    const result = calculateBreakeven({ fixedCosts: 315000, variableCostPerUnit: 15000, pricePerUnit: 15000 });
    expect(result.status).toBe("NO_FINITE_BREAK_EVEN");
    expect(result.breakEvenRevenue).toBeNull();
  });
  it("préserve un coût variable explicitement nul", () => {
    expect(calculateBreakeven({ fixedCosts: 100, variableCostPerUnit: 0, pricePerUnit: 30 }).breakEvenUnits).toBe(4);
  });
  it("ne transforme pas un seuil mensuel en délai ou en marge annuelle", () => {
    const result = calculateBreakeven({ fixedCosts: 315000, variableCostPerUnit: 8000, pricePerUnit: 15000, monthlyVolume: 30, costPeriod: "MONTH" });
    expect(result.breakEvenMonths).toBeNull();
    expect(result.marginOfSafety).toBe(-.5); // deficit of 15 units over 30 planned sales
  });
});
