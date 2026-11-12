/**
 * Plan 4.11.b — le calculateur CODB ne fabrique plus de seuil de rentabilité.
 *
 * L'ancienne sortie `breakeven` valait `codbAnnual / (revenueTarget / codbAnnual)`,
 * soit codbAnnual² / CA cible : elle variait avec l'objectif de revenu et ne
 * reposait sur aucune marge de contribution déclarée. Le seuil est désormais
 * délégué au calculateur canonique (`calculateBreakeven`) : charges fixes de la
 * période / (prix unitaire − coût variable unitaire). Sans ces entrées, il reste
 * non calculable — aucun zéro ni chiffre supposé.
 */
import { describe, expect, it } from "vitest";
import { calculators } from "@/server/services/glory-tools/calculators";
import { calculateBreakeven } from "@/domain/financial-document";

const codb = (ctx: Record<string, unknown>) => calculators["codb-calculator"]!(ctx) as Record<string, unknown>;
const COSTS = { fixed_costs: 350_000, variable_costs: 120_000, headcount: 3, billable_ratio: 70 };

describe("codb-calculator — seuil de rentabilité", () => {
  it("ne dépend pas de l'objectif de chiffre d'affaires", () => {
    const low = codb({ ...COSTS, revenue_target: 1_000_000 });
    const high = codb({ ...COSTS, revenue_target: 50_000_000 });
    expect(low.breakeven).toEqual(high.breakeven);
    expect(low.breakeven_units).toEqual(high.breakeven_units);
  });

  it("reste non calculable sans prix ni coût variable unitaires", () => {
    const out = codb({ ...COSTS, revenue_target: 10_000_000 });
    expect(out.breakeven).toBeNull();
    expect(out.breakeven_units).toBeNull();
    expect(out.breakeven_status).toBe("INSUFFICIENT_DATA");
    expect(String(out.summary)).toContain("Seuil non calculable");
  });

  it("délègue au calcul canonique avec les charges fixes mensuelles", () => {
    const out = codb({ ...COSTS, revenue_target: 10_000_000, price_per_unit: 60_000, variable_cost_per_unit: 18_000 });
    const canonical = calculateBreakeven({
      fixedCosts: 350_000, variableCostPerUnit: 18_000, pricePerUnit: 60_000, costPeriod: "MONTH",
    });
    expect(out.breakeven_status).toBe("COMPUTED");
    expect(out.breakeven_units).toBe(9);
    expect(out.breakeven_units).toBe(canonical.breakEvenUnits);
    expect(out.breakeven).toBe(canonical.breakEvenRevenue);
    expect(out.breakeven_period).toBe("MONTH");
    expect(String(out.summary)).toContain("9 unités/mois");
  });

  it("refuse un seuil fini quand la contribution unitaire est nulle", () => {
    const out = codb({ ...COSTS, price_per_unit: 18_000, variable_cost_per_unit: 18_000 });
    expect(out.breakeven).toBeNull();
    expect(out.breakeven_status).toBe("NO_FINITE_BREAK_EVEN");
  });

  it("ne suppose pas de charges fixes nulles lorsqu'elles sont absentes", () => {
    const out = codb({ variable_costs: 120_000, price_per_unit: 60_000, variable_cost_per_unit: 18_000 });
    expect(out.breakeven).toBeNull();
    expect(out.breakeven_status).toBe("INSUFFICIENT_DATA");
  });

  it("conserve le coût de fonctionnement mensuel et annuel", () => {
    const out = codb({ ...COSTS, revenue_target: 10_000_000 });
    expect(out.codbMonthly).toBe(470_000);
    expect(out.codbAnnual).toBe(5_640_000);
  });
});
