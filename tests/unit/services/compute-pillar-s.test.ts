/**
 * computePillarS — ADR-0088 pure-aggregation dashboard test.
 *
 * Locks the "Pillar S = computed, not typed" contract: totals, FK-based risk
 * coverage, and overton derivation are computed from the relational backbone
 * (selected initiatives + risk matrix + T.overtonPosition), never from text.
 */

import { describe, it, expect } from "vitest";
import { computePillarS } from "@/server/services/rtis-protocols/strategy";

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
});
