/**
 * applyPayloadToPillars — ADR-0088 function-calling executor (pure).
 *
 * Verifies typed recommendation payloads mutate pillar content BY ID
 * (targeted) instead of text-replaces-text, and that unknown targets warn
 * rather than corrupt.
 */

import { describe, it, expect } from "vitest";
import { applyPayloadToPillars } from "@/server/services/notoria/apply-payload";
import { collectInitiatives } from "@/lib/types/pillar-schemas";

const INIT = "11111111-1111-4111-8111-111111111111";
const RISK = "22222222-2222-4222-8222-222222222222";

function pillarsWithInitiative() {
  return {
    i: {
      catalogueParCanal: {
        DIGITAL: [{ id: INIT, action: "x", format: "f", objectif: "o", status: "DRAFT" }],
      },
    },
    r: { probabilityImpactMatrix: [{ id: RISK, risk: "r", probability: "HIGH", impact: "HIGH", mitigation: "m", status: "UNMITIGATED" }] },
  } as Record<string, Record<string, unknown>>;
}

describe("applyPayloadToPillars (ADR-0088)", () => {
  it.each(["SELECT_INITIATIVE", "REJECT_INITIATIVE", "LINK_RISK"] as const)("%s reaches every source representation while preserving unrelated attributes and identities", (kind) => {
    const original = { id: INIT, action: "Une identité", format: "Texte", objectif: "Cohésion", status: "RECOMMENDED", budget: 0 };
    const other = { ...original, id: "33333333-3333-4333-8333-333333333333", action: "Autre identité" };
    const p = { i: { catalogueParCanal: { DIGITAL: [{ ...original }, other] }, actionsByDevotionLevel: { ENGAGE: [{ ...original, devotionImpact: "ENGAGE" }] }, actionsByOvertonPhase: [{ phase: "POPULAR", actions: [{ ...original, overtonShift: "Conserver" }] }] } };
    const payload = kind === "SELECT_INITIATIVE" ? { kind, initiativeId: INIT, timeframe: "SPRINT_90" as const }
      : kind === "REJECT_INITIATIVE" ? { kind, initiativeId: INIT, reason: "Décision revue" }
        : { kind, initiativeId: INIT, riskId: RISK };
    const result = applyPayloadToPillars(p, payload);
    const copies = (collectInitiatives(p.i) as Record<string, unknown>[]).filter(raw => raw.id === INIT);
    expect(copies).toHaveLength(3);
    for (const copy of copies) {
      if (kind === "SELECT_INITIATIVE") expect(copy).toMatchObject({ status: "SELECTED_FOR_ROADMAP", timeframe: "SPRINT_90", budget: 0 });
      if (kind === "REJECT_INITIATIVE") expect(copy.status).toBe("REJECTED");
      if (kind === "LINK_RISK") expect(copy.mitigatesRiskIds).toEqual([RISK]);
    }
    expect(p.i.actionsByDevotionLevel.ENGAGE[0]!.devotionImpact).toBe("ENGAGE");
    expect(p.i.actionsByOvertonPhase[0]!.actions[0]!.overtonShift).toBe("Conserver");
    expect(p.i.catalogueParCanal.DIGITAL[1]).toEqual(other);
    expect([...result.changed]).toEqual(["i"]);
    expect(result.warnings).toEqual([]);
  });

  it("SELECT_INITIATIVE sets status + timeframe by id", () => {
    const p = pillarsWithInitiative();
    const res = applyPayloadToPillars(p, { kind: "SELECT_INITIATIVE", initiativeId: INIT, timeframe: "SPRINT_90" });
    const init = (p.i!.catalogueParCanal as Record<string, Record<string, unknown>[]>).DIGITAL![0]!;
    expect(init.status).toBe("SELECTED_FOR_ROADMAP");
    expect(init.timeframe).toBe("SPRINT_90");
    expect(res.changed.has("i")).toBe(true);
  });

  it("LINK_RISK pushes the riskId (deduped) onto the initiative", () => {
    const p = pillarsWithInitiative();
    applyPayloadToPillars(p, { kind: "LINK_RISK", initiativeId: INIT, riskId: RISK });
    applyPayloadToPillars(p, { kind: "LINK_RISK", initiativeId: INIT, riskId: RISK }); // idempotent
    const init = (p.i!.catalogueParCanal as Record<string, Record<string, unknown>[]>).DIGITAL![0]!;
    expect(init.mitigatesRiskIds).toEqual([RISK]);
  });

  it("SET_RISK_STATUS mutates the matching risk", () => {
    const p = pillarsWithInitiative();
    const res = applyPayloadToPillars(p, { kind: "SET_RISK_STATUS", riskId: RISK, status: "MITIGATED" });
    expect((p.r!.probabilityImpactMatrix as Record<string, unknown>[])[0]!.status).toBe("MITIGATED");
    expect(res.changed.has("r")).toBe(true);
  });

  it("ADD_INITIATIVE appends to the chosen channel", () => {
    const p = pillarsWithInitiative();
    const init = { id: "33333333-3333-4333-8333-333333333333", action: "y", format: "f", objectif: "o", status: "RECOMMENDED" as const };
    applyPayloadToPillars(p, { kind: "ADD_INITIATIVE", pillar: "i", channel: "EVENT", initiative: init });
    expect((p.i!.catalogueParCanal as Record<string, unknown[]>).EVENT).toHaveLength(1);
  });

  it("UPDATE_ADVE_FIELD sets the field on the ADVE pillar", () => {
    const p = pillarsWithInitiative();
    const res = applyPayloadToPillars(p, { kind: "UPDATE_ADVE_FIELD", pillar: "A", field: "accroche", value: "nouvelle" });
    expect(p.a!.accroche).toBe("nouvelle");
    expect(res.changed.has("a")).toBe(true);
  });

  it("warns (does not corrupt) when the target id is unknown", () => {
    const p = pillarsWithInitiative();
    const res = applyPayloadToPillars(p, { kind: "SELECT_INITIATIVE", initiativeId: "99999999-9999-4999-8999-999999999999", timeframe: "PHASE_1" });
    expect(res.changed.size).toBe(0);
    expect(res.warnings[0]).toContain("not found");
  });

  it("SELECT_ROADMAP_ROUTE (ADR-0089) persists the ambition in S.computed and flags S changed", () => {
    const p = pillarsWithInitiative();
    const res = applyPayloadToPillars(p, { kind: "SELECT_ROADMAP_ROUTE", routeKey: "AMBITIOUS" });
    expect((p.s!.computed as Record<string, unknown>).selectedRouteKey).toBe("AMBITIOUS");
    expect(res.changed.has("s")).toBe(true);
    expect(res.warnings).toEqual([]);
  });
});
