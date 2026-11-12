import { describe, expect, it } from "vitest";
import { computePillarS, generateStrategy } from "@/server/services/rtis-protocols/strategy";
import { summarizeCrossReferences, validatePillarCrossReferences } from "@/server/services/cross-validator";
import { PillarSSchema } from "@/lib/types/pillar-schemas";

describe("S coherence is calculated from the current plan", () => {
  const source = {
    a: { noyauIdentitaire: "Des artisans transmettent leurs gestes." },
    d: { positionnement: "Un service de réservation pour des ateliers locaux." },
    r: { coherenceRisks: Array.from({ length: 10 }, () => ({ description: "Observation" })),
      probabilityImpactMatrix: [{ id: "11111111-1111-4111-8111-111111111111", risk: "Parcours incomplet" }] },
    i: { catalogueParCanal: { DIGITAL: [{ id: "22222222-2222-4222-8222-222222222222", action: "Tester le parcours",
      format: "Pilote", objectif: "Valider le premier usage", pilierImpact: "V", budget: 100,
      timeframe: "SPRINT_90", devotionImpact: "PARTICIPANT", mitigatesRiskIds: ["11111111-1111-4111-8111-111111111111"] }] } },
    s: { coherenceScore: 99, globalBudget: 999, computed: { selectedRouteKey: "TARGET" } },
  };
  it("uses the existing validator on the newly generated S, not its stale predecessor or risk count", () => {
    const before = structuredClone(source);
    const computed = computePillarS(source);
    const current = generateStrategy(source, "TARGET");
    const checks = validatePillarCrossReferences({ ...source, s: current });
    expect(computed.coherenceSummary).toEqual(summarizeCrossReferences(checks));
    expect(computed.coherenceChecks).toEqual(checks);
    expect(computed.coherenceScore).toBe(summarizeCrossReferences(checks).score);
    expect(computed.coherenceIssueCount).toBe(10);
    expect(computed.coherenceScore).not.toBe(99);
    expect(checks.find(c => c.ruleId === 30)?.status).toBe("VALID");
    expect(source).toEqual(before);
    expect(PillarSSchema.shape.computed.safeParse(computed).success).toBe(true);
  });
  it("keeps unevaluated checks distinct from valid checks and an explicit zero score", () => {
    const checks = [{ rule: "Incomplete", ruleId: 1, from: "A", to: "D", status: "SKIPPED" as const, message: "Missing premise" }];
    expect(summarizeCrossReferences(checks)).toEqual({ total: 1, valid: 0, invalid: 0, skipped: 1, score: 0 });
    expect(summarizeCrossReferences([...checks, { ...checks[0]!, ruleId: 2, status: "VALID" }]))
      .toEqual({ total: 2, valid: 1, invalid: 0, skipped: 1, score: 100 });
  });
  it("carries an actual risk link into the sprint but does not certify a dangling link", () => {
    expect(generateStrategy(source, "TARGET").sprint90Days)
      .toEqual([expect.objectContaining({ isRiskMitigation: true })]);
    const stale = { ...source, r: { probabilityImpactMatrix: [{ id: "33333333-3333-4333-8333-333333333333" }] } };
    expect(generateStrategy(stale, "TARGET").sprint90Days)
      .toEqual([expect.objectContaining({ isRiskMitigation: false })]);
    expect(validatePillarCrossReferences(stale).find(c => c.ruleId === 32)?.status).toBe("INVALID");
  });
});
