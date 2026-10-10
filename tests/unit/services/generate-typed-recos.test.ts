/**
 * buildTypedRecommendations — ADR-0088 function-calling generation (pure rules).
 *
 * The generator emits typed RecommendationPayloads from the structured pillars
 * so the AI/system proposes targeted mutations (applied by id), not text.
 */

import { describe, it, expect } from "vitest";
import { buildTypedRecommendations } from "@/server/services/notoria/generate-typed-recos";
import { parseRecommendationPayload } from "@/lib/types/recommendation-payload";

const RISK_HI = "a0000000-0000-4000-8000-000000000001";
const RISK_COVERED = "a0000000-0000-4000-8000-000000000002";
const INIT_RECO = "b0000000-0000-4000-8000-000000000001";
const INIT_SELECTED = "b0000000-0000-4000-8000-000000000002";

describe("buildTypedRecommendations (ADR-0088)", () => {
  it("one explicit identity across three collections yields one reviewable proposal without changing source", () => {
    const action = { id: INIT_RECO, action: "Une action", format: "Texte", objectif: "Un choix", status: "RECOMMENDED", timeframe: "SPRINT_90" };
    const pillars = { i: { catalogueParCanal: { DIGITAL: [action] }, actionsByDevotionLevel: { ENGAGE: [{ ...action }] }, actionsByOvertonPhase: [{ phase: "POPULAR", actions: [{ ...action }] }] } };
    const before = structuredClone(pillars);
    const out = buildTypedRecommendations(pillars);
    expect(out).toHaveLength(1);
    expect(parseRecommendationPayload(out[0]!.payload)).toMatchObject({ initiativeId: INIT_RECO, timeframe: "SPRINT_90" });
    expect(pillars).toEqual(before);
  });

  it("a declared canonical choice is not reproposed from an older secondary representation", () => {
    const action = { id: INIT_RECO, action: "Déjà retenue", format: "Texte", objectif: "Préserver", status: "SELECTED_FOR_ROADMAP" };
    expect(buildTypedRecommendations({ i: { catalogueParCanal: { DIGITAL: [action] }, actionsByDevotionLevel: { ENGAGE: [{ ...action, status: "RECOMMENDED" }] } } })).toEqual([]);
  });

  it("does not repropose a roadmap choice explicitly withdrawn by a human", () => {
    expect(buildTypedRecommendations({ i: { catalogueParCanal: { DIGITAL: [{ id: INIT_RECO, action: "Retirée par l’humain", status: "RECOMMENDED" }] },
      _fieldProvenance: { [`initiatives.${INIT_RECO}.status`]: "HUMAN" } } })).toEqual([]);
  });

  it("does not emit a typed choice for a read-only identity that the executor cannot address", () => {
    const out = buildTypedRecommendations({ i: { catalogueParCanal: { DIGITAL: [{ id: "init-read-projection", action: "À réconcilier", status: "RECOMMENDED" }] } } });
    expect(out).toEqual([]);
  });

  it("keeps the default phase a proposal and leaves the absent source deadline untouched", () => {
    const initiative = { id: INIT_RECO, action: "Sans échéance", status: "RECOMMENDED" };
    const out = buildTypedRecommendations({ i: { catalogueParCanal: { DIGITAL: [initiative] } } });
    expect(out[0]!.payload).toMatchObject({ timeframe: "PHASE_1" });
    expect(out[0]!.explain).toContain("échéance proposée");
    expect(out[0]!.explain).not.toContain("PHASE_1");
    expect(initiative).not.toHaveProperty("timeframe");
  });

  it("preserves risk links from the raw secondary collections while deduplicating choices", () => {
    const action = { id: INIT_SELECTED, action: "Couvrir", status: "SELECTED_FOR_ROADMAP" };
    const out = buildTypedRecommendations({ i: { catalogueParCanal: { DIGITAL: [action] }, actionsByDevotionLevel: { ENGAGE: [{ ...action, status: "RECOMMENDED", mitigatesRiskIds: [RISK_COVERED] }] } }, r: { probabilityImpactMatrix: [{ id: RISK_COVERED, status: "UNMITIGATED" }] } });
    expect(out).toHaveLength(1);
    expect(out[0]!.payload).toMatchObject({ kind: "SET_RISK_STATUS", riskId: RISK_COVERED });
  });

  it("does not treat an old selected copy as the current canonical risk decision", () => {
    const action = { id: INIT_RECO, action: "À décider", status: "RECOMMENDED" };
    const out = buildTypedRecommendations({ i: { catalogueParCanal: { DIGITAL: [action] }, actionsByDevotionLevel: { ENGAGE: [{ ...action, status: "SELECTED_FOR_ROADMAP", mitigatesRiskIds: [RISK_COVERED] }] } },
      r: { probabilityImpactMatrix: [{ id: RISK_COVERED, status: "UNMITIGATED", severity: 100 }] } });
    expect(out.map(candidate => candidate.payload.kind)).toEqual(["SELECT_INITIATIVE"]);
  });

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
