/**
 * computePillarS — ADR-0088 pure-aggregation dashboard test.
 *
 * Locks the "Pillar S = computed, not typed" contract: totals, FK-based risk
 * coverage, and overton derivation are computed from the relational backbone
 * (selected initiatives + risk matrix + T.overtonPosition), never from text.
 */

import { describe, it, expect } from "vitest";
import { computePillarS, computeRoadmapRoutes } from "@/server/services/rtis-protocols/strategy";

const RISK_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RISK_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("computePillarS (ADR-0088)", () => {
  it("aggregates budget over SELECTED_FOR_ROADMAP initiatives only", () => {
    const pillars = {
      i: {
        catalogueParCanal: {
          DIGITAL: [
            { action: "x", format: "f", objectif: "o", status: "SELECTED_FOR_ROADMAP", budget: 1000, timeframe: "SPRINT_90" },
            { action: "y", format: "f", objectif: "o", status: "DRAFT", budget: 9999 },
          ],
          EVENT: [
            { action: "z", format: "f", objectif: "o", status: "SELECTED_FOR_ROADMAP", budget: 500, timeframe: "PHASE_1" },
          ],
        },
      },
      r: null,
      t: null,
    };
    const c = computePillarS(pillars);
    expect(c.totalBudget).toBe(1500); // DRAFT excluded
    expect(c.selectedInitiativeCount).toBe(2);
    expect(c.budgetByPhase).toEqual({ SPRINT_90: 1000, PHASE_1: 500 });
  });

  it("computes riskCoverage from FK links (mitigatesRiskIds → risk.id)", () => {
    const pillars = {
      i: {
        catalogueParCanal: {
          DIGITAL: [
            { action: "x", format: "f", objectif: "o", status: "SELECTED_FOR_ROADMAP", budget: 0, mitigatesRiskIds: [RISK_A] },
          ],
        },
      },
      r: {
        probabilityImpactMatrix: [
          { id: RISK_A, risk: "a", probability: "HIGH", impact: "HIGH", mitigation: "m" },
          { id: RISK_B, risk: "b", probability: "LOW", impact: "LOW", mitigation: "m" },
        ],
      },
      t: null,
    };
    const c = computePillarS(pillars);
    expect(c.mitigatedRiskIds).toEqual([RISK_A]);
    expect(c.riskCoverage).toBe(50); // 1 of 2 risks covered
  });

  it("derives overtonPosition from T (no free text)", () => {
    const pillars = {
      i: null,
      r: null,
      t: {
        overtonPosition: { currentPerception: "perçue comme banale" },
        perceptionGap: { targetPerception: "référence culturelle", gapScore: 80 },
      },
    };
    const c = computePillarS(pillars) as { overtonPosition?: { current: string; target: string; gapScore?: number } };
    expect(c.overtonPosition?.current).toBe("perçue comme banale");
    expect(c.overtonPosition?.target).toBe("référence culturelle");
    expect(c.overtonPosition?.gapScore).toBe(80);
  });

  it("is resilient to empty pillars", () => {
    const c = computePillarS({ i: null, r: null, t: null });
    expect(c.totalBudget).toBe(0);
    expect(c.selectedInitiativeCount).toBe(0);
    expect(c.riskCoverage).toBeUndefined();
  });

  it("always produces 3 roadmap routes (computed, no LLM)", () => {
    const c = computePillarS({ i: null, r: null, t: null }) as { roadmapRoutes?: unknown[] };
    expect(c.roadmapRoutes).toHaveLength(3);
  });
});

describe("computeRoadmapRoutes (ADR-0088 — pure, no LLM)", () => {
  it("returns 3 monotonic trajectories with TARGET recommended", () => {
    const routes = computeRoadmapRoutes({ riskCoverage: 60, selectedInitiativeCount: 12 }) as Array<Record<string, number | string | boolean>>;
    expect(routes.map((r) => r.key)).toEqual(["CONSERVATIVE", "TARGET", "AMBITIOUS"]);
    expect(routes.map((r) => r.recommended)).toEqual([false, true, false]);
    // momentum = 0.6 → the canonical +22 / +58 / +115 projection
    expect(routes.map((r) => r.projectedGrowthPct)).toEqual([22, 58, 115]);
    // strictly increasing ambition
    expect((routes[0].projectedGrowthPct as number) < (routes[1].projectedGrowthPct as number)).toBe(true);
    expect((routes[1].projectedGrowthPct as number) < (routes[2].projectedGrowthPct as number)).toBe(true);
    expect(routes[1].description).toBe("Activation Engagement + cascade R+T.");
  });

  it("projects revenue from baseRevenue when known, omits it otherwise", () => {
    const withRev = computeRoadmapRoutes({ selectedInitiativeCount: 12, riskCoverage: 60, baseRevenue: 100_000_000 }) as Array<Record<string, unknown>>;
    expect(withRev[1].projectedRevenue).toBe(158_000_000); // 100M × 1.58
    const noRev = computeRoadmapRoutes({ selectedInitiativeCount: 0 }) as Array<Record<string, unknown>>;
    expect(noRev[0].projectedRevenue).toBeUndefined();
  });

  it("targetCultIndex stays within 0-100 and increases with ambition", () => {
    const routes = computeRoadmapRoutes({ riskCoverage: 100, selectedInitiativeCount: 20, baseCultIndex: 80 }) as Array<Record<string, number>>;
    for (const r of routes) {
      expect(r.targetCultIndex).toBeGreaterThanOrEqual(0);
      expect(r.targetCultIndex).toBeLessThanOrEqual(100);
    }
    expect(routes[0].targetCultIndex).toBeLessThanOrEqual(routes[2].targetCultIndex);
  });
});
