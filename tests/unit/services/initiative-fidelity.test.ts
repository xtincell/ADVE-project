import { describe, expect, it } from "vitest";
import { collectNormalizedInitiatives, normalizeInitiative, PillarSSchema } from "@/lib/types/pillar-schemas";
import { aggregateInitiativeSet, computeRoadmapRoutes } from "@/lib/strategy/roadmap-routes";
import { computePillarS } from "@/server/services/rtis-protocols/strategy";
import { mapCatalogueActions } from "@/server/services/strategy-presentation/section-mappers";

const items = [
  { id: "11111111-1111-4111-8111-111111111111", action: "Unknown", status: "SELECTED_FOR_ROADMAP" },
  { id: "22222222-2222-4222-8222-222222222222", action: "Zero", status: "SELECTED_FOR_ROADMAP", budget: 0 },
  { id: "33333333-3333-4333-8333-333333333333", action: "Estimate", status: "SELECTED_FOR_ROADMAP", budgetEstime: "LOW" },
];
const content = { catalogueParCanal: { DIGITAL: items } };

describe("initiative facts survive their existing consumers", () => {
  it("keeps an absent amount and horizon absent", () => {
    expect(normalizeInitiative(items[0])).toMatchObject({ budgetBasis: "UNKNOWN" });
    expect(normalizeInitiative(items[0]).budget).toBeUndefined();
    expect(normalizeInitiative(items[0]).timeframe).toBeUndefined();
  });
  it("keeps declared zero even when a qualitative estimate is also present", () => {
    expect(normalizeInitiative({ ...items[1], budgetEstime: "HIGH" })).toMatchObject({ budget: 0, budgetBasis: "DECLARED" });
  });
  it("retains the method's qualitative anchor with its origin", () => {
    expect(normalizeInitiative(items[2])).toMatchObject({ budget: 500_000, budgetBasis: "QUALITATIVE_ESTIMATE" });
  });
  it.each([-1, Infinity, NaN])("does not treat invalid numeric amount %s as a budget", (budget) => {
    expect(normalizeInitiative({ action: "Invalid amount", budget }).budget).toBeUndefined();
  });
  it("does not materialize blank or nonexistent actions", () => {
    expect(collectNormalizedInitiatives({ catalogueParCanal: { DIGITAL: [null, {}, "  ", ...items] } })).toHaveLength(3);
  });
  it("does not assign missing horizons to long-term phases", () => {
    const normalized = collectNormalizedInitiatives(content);
    const agg = aggregateInitiativeSet(normalized as unknown as Array<Record<string, unknown>>, []);
    expect(agg.budgetByPhase).toEqual({});
    expect(agg.totalBudget).toBeUndefined();
    expect(agg.budgetSummary).toEqual({ knownSubtotal: 500_000, declaredSubtotal: 0, estimatedSubtotal: 500_000,
      declaredCount: 1, estimatedCount: 1, unknownCount: 1, unassignedTimeframeCount: 3 });
  });
  it("does not present a partially costed plan as a complete total", () => {
    const c = computePillarS({ i: content, r: null, t: null });
    expect(c.totalBudget).toBeUndefined();
    expect(c.selectedInitiativeCount).toBe(3);
    expect(c.budgetSummary).toMatchObject({ unknownCount: 1, estimatedCount: 1, declaredCount: 1 });
    const parsed = PillarSSchema.shape.computed.safeParse(c);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data?.budgetSummary).toEqual(c.budgetSummary);
  });
  it("keeps the projection policy but exposes assumed baselines", () => {
    const routes = computeRoadmapRoutes({ selectedInitiativeCount: 0 });
    expect(routes.map(r => r.projectedGrowthPct)).toEqual([13, 37, 81]);
    expect(routes[0]?.projectionAssumptions).toEqual({ riskCoverage: 30, baseCultIndex: 60 });
    const sourced = computeRoadmapRoutes({ selectedInitiativeCount: 12, riskCoverage: 60, baseCultIndex: 80 });
    expect(sourced[0]?.projectionAssumptions).toEqual({});
  });
  it("Oracle retains declared zero and labels a qualitative anchor as an estimate", () => {
    const result = mapCatalogueActions({ pillars: [{ key: "i", content }] });
    const actions = result.parCanal.DIGITAL!;
    expect(actions.find(a => a.action === "Unknown")?.cout).toBeNull();
    expect(actions.find(a => a.action === "Zero")?.cout).toBe("0 FCFA");
    expect(actions.find(a => a.action === "Estimate")?.cout).toBe("Estimation faible · 500 k FCFA");
  });
});
