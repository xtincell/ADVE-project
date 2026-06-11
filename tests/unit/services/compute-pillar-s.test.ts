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

// ── ADR-0089 — 3 jeux de stratégie + sélection d'ambition ─────────────

const I_SHORT = "11111111-1111-4111-8111-111111111111"; // SELECTED court-terme
const I_LONG = "22222222-2222-4222-8222-222222222222";  // SELECTED long-terme
const I_RECO = "33333333-3333-4333-8333-333333333333";  // RECOMMENDED (candidate IA)

function backbonePillars(): Record<string, Record<string, unknown> | null> {
  return {
    i: {
      catalogueParCanal: {
        DIGITAL: [
          { id: I_SHORT, action: "court", format: "f", objectif: "o", status: "SELECTED_FOR_ROADMAP", budget: 1000, timeframe: "SPRINT_90", mitigatesRiskIds: [RISK_A] },
          { id: I_LONG, action: "long", format: "f", objectif: "o", status: "SELECTED_FOR_ROADMAP", budget: 2000, timeframe: "LONG_TERM" },
          { id: I_RECO, action: "reco", format: "f", objectif: "o", status: "RECOMMENDED", budget: 4000, timeframe: "PHASE_2", mitigatesRiskIds: [RISK_B] },
          { action: "brouillon", format: "f", objectif: "o", status: "DRAFT", budget: 9999 },
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
}

describe("3 jeux de stratégie par route (ADR-0089 — pure, no LLM)", () => {
  it("chaque route porte son jeu déterministe : CONSERVATIVE ⊂ TARGET ⊂ AMBITIOUS", () => {
    const c = computePillarS(backbonePillars()) as { roadmapRoutes: Array<Record<string, unknown>> };
    const byKey = Object.fromEntries(c.roadmapRoutes.map((r) => [r.key as string, r]));
    // CONSERVATIVE : sélection court-terme uniquement (SPRINT_90/PHASE_1)
    expect(byKey.CONSERVATIVE.initiativeIds).toEqual([I_SHORT]);
    expect(byKey.CONSERVATIVE.totalBudget).toBe(1000);
    // TARGET : toutes les SELECTED_FOR_ROADMAP
    expect(byKey.TARGET.initiativeIds).toEqual([I_SHORT, I_LONG]);
    expect(byKey.TARGET.totalBudget).toBe(3000);
    // AMBITIOUS : SELECTED + RECOMMENDED (DRAFT exclu)
    expect(byKey.AMBITIOUS.initiativeIds).toEqual([I_SHORT, I_LONG, I_RECO]);
    expect(byKey.AMBITIOUS.totalBudget).toBe(7000);
    // Couverture risques par jeu : 1/2 pour CONSERVATIVE+TARGET, 2/2 pour AMBITIOUS
    expect(byKey.CONSERVATIVE.riskCoverage).toBe(50);
    expect(byKey.TARGET.riskCoverage).toBe(50);
    expect(byKey.AMBITIOUS.riskCoverage).toBe(100);
  });

  it("default : ambition TARGET — dashboard identique au comportement pré-ADR-0089", () => {
    const c = computePillarS(backbonePillars()) as Record<string, unknown>;
    expect(c.selectedRouteKey).toBe("TARGET");
    expect(c.totalBudget).toBe(3000);
    expect(c.selectedInitiativeCount).toBe(2);
    const routes = c.roadmapRoutes as Array<Record<string, unknown>>;
    expect(routes.find((r) => r.key === "TARGET")?.selected).toBe(true);
    expect(routes.filter((r) => r.selected === true)).toHaveLength(1);
  });

  it("ambition AMBITIOUS sélectionnée → le dashboard agrège le jeu étendu", () => {
    const c = computePillarS(backbonePillars(), { selectedRouteKey: "AMBITIOUS" }) as Record<string, unknown>;
    expect(c.selectedRouteKey).toBe("AMBITIOUS");
    expect(c.totalBudget).toBe(7000);
    expect(c.selectedInitiativeCount).toBe(3);
    expect(c.riskCoverage).toBe(100);
    expect((c.mitigatedRiskIds as string[]).sort()).toEqual([RISK_A, RISK_B].sort());
  });

  it("la sélection persistée dans le S précédent survit au recompute", () => {
    const pillars = backbonePillars();
    pillars.s = { computed: { selectedRouteKey: "CONSERVATIVE" } };
    const c = computePillarS(pillars) as Record<string, unknown>;
    expect(c.selectedRouteKey).toBe("CONSERVATIVE");
    expect(c.totalBudget).toBe(1000); // jeu court-terme uniquement
    const routes = c.roadmapRoutes as Array<Record<string, unknown>>;
    expect(routes.find((r) => r.key === "CONSERVATIVE")?.selected).toBe(true);
  });

  it("les projections (momentum) restent invariantes au choix d'ambition", () => {
    const target = computePillarS(backbonePillars(), { selectedRouteKey: "TARGET" }) as { roadmapRoutes: Array<Record<string, unknown>> };
    const ambitious = computePillarS(backbonePillars(), { selectedRouteKey: "AMBITIOUS" }) as { roadmapRoutes: Array<Record<string, unknown>> };
    expect(target.roadmapRoutes.map((r) => r.projectedGrowthPct)).toEqual(
      ambitious.roadmapRoutes.map((r) => r.projectedGrowthPct),
    );
  });

  it("une clé persistée invalide retombe sur TARGET (jamais de crash)", () => {
    const pillars = backbonePillars();
    pillars.s = { computed: { selectedRouteKey: "TURBO" } };
    const c = computePillarS(pillars) as Record<string, unknown>;
    expect(c.selectedRouteKey).toBe("TARGET");
  });
});
