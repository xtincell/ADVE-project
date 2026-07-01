/**
 * buildTypedRecommendations — ADR-0088 function-calling generation (pure rules).
 *
 * The generator emits typed RecommendationPayloads from the structured pillars
 * so the AI/system proposes targeted mutations (applied by id), not text.
 */

import { describe, it, expect } from "vitest";
import { buildTypedRecommendations } from "@/server/services/notoria/generate-typed-recos";

const RISK_HI = "a0000000-0000-4000-8000-000000000001";
const RISK_COVERED = "a0000000-0000-4000-8000-000000000002";
const INIT_RECO = "b0000000-0000-4000-8000-000000000001";
const INIT_SELECTED = "b0000000-0000-4000-8000-000000000002";

describe("buildTypedRecommendations (ADR-0088)", () => {
  it("Rule 1 — RECOMMENDED initiative → SELECT_INITIATIVE", () => {
    const out = buildTypedRecommendations({
      i: { catalogueParCanal: { DIGITAL: [{ id: INIT_RECO, action: "x", format: "f", objectif: "o", status: "RECOMMENDED", timeframe: "PHASE_2" }] } },
      r: {},
    });
    const sel = out.find((c) => c.payload.kind === "SELECT_INITIATIVE");
    expect(sel).toBeDefined();
    expect(sel!.payload).toMatchObject({ kind: "SELECT_INITIATIVE", initiativeId: INIT_RECO, timeframe: "PHASE_2" });
  });

  it("Rule 2 — UNMITIGATED risk covered by a SELECTED initiative → SET_RISK_STATUS MITIGATED", () => {
    const out = buildTypedRecommendations({
      i: { catalogueParCanal: { PROD: [{ id: INIT_SELECTED, action: "x", format: "f", objectif: "o", status: "SELECTED_FOR_ROADMAP", mitigatesRiskIds: [RISK_COVERED] }] } },
      r: { probabilityImpactMatrix: [{ id: RISK_COVERED, risk: "r", probability: "HIGH", impact: "HIGH", severity: 100, status: "UNMITIGATED", mitigation: "m" }] },
    });
    const set = out.find((c) => c.payload.kind === "SET_RISK_STATUS");
    expect(set!.payload).toMatchObject({ kind: "SET_RISK_STATUS", riskId: RISK_COVERED, status: "MITIGATED" });
  });

  it("Rule 3 — high-severity uncovered risk → ADD_INITIATIVE carrying the FK", () => {
    const out = buildTypedRecommendations({
      i: {},
      r: { probabilityImpactMatrix: [{ id: RISK_HI, risk: "gros risque", probability: "HIGH", impact: "HIGH", severity: 100, status: "UNMITIGATED", mitigation: "faire X" }] },
    });
    const add = out.find((c) => c.payload.kind === "ADD_INITIATIVE");
    expect(add).toBeDefined();
    const p = add!.payload as Extract<NonNullable<typeof add>["payload"], { kind: "ADD_INITIATIVE" }>;
    expect(p.initiative.mitigatesRiskIds).toEqual([RISK_HI]);
    expect(p.initiative.status).toBe("RECOMMENDED");
    expect(typeof p.initiative.id).toBe("string");
  });

  it("no recommendation for an already-MITIGATED risk or a low-severity uncovered one", () => {
    const out = buildTypedRecommendations({
      i: {},
      r: { probabilityImpactMatrix: [
        { id: "x1", risk: "ok", probability: "LOW", impact: "LOW", severity: 11, status: "MITIGATED", mitigation: "m" },
        { id: "x2", risk: "petit", probability: "LOW", impact: "LOW", severity: 11, status: "UNMITIGATED", mitigation: "m" },
      ] },
    });
    expect(out).toHaveLength(0);
  });
});
