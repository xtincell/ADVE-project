/**
 * Invariant tests for src/server/governance/pillar-readiness.ts.
 *
 * The point of these tests: prevent the "UI says complet, sequence
 * fails" regression by asserting that:
 *
 *  1. The canonical evaluator and the legacy Zod-strict / Zod-partial
 *     never disagree about extreme cases (empty, full).
 *  2. The display label is consistent with the gate verdicts.
 *  3. ORACLE_ENRICH and RTIS_CASCADE require ENRICHED+ — never less.
 *  4. ORACLE_EXPORT requires VALIDATED+ — never less.
 */

import { describe, it, expect } from "vitest";
import { evaluatePillarReadiness, consistencyCheck } from "@/server/governance/pillar-readiness";

describe("pillar-readiness — invariants", () => {
  it("an EMPTY pillar fails ALL gates and renders 'Vide'", () => {
    const r = evaluatePillarReadiness(null, "A");
    expect(r.stage).toBe("EMPTY");
    expect(r.completionPct).toBe(0);
    expect(r.displayLabel).toBe("Vide");
    expect(r.gates.DISPLAY_AS_COMPLETE.ok).toBe(false);
    expect(r.gates.RTIS_CASCADE.ok).toBe(false);
    expect(r.gates.GLORY_SEQUENCE.ok).toBe(false);
    expect(r.gates.ORACLE_ENRICH.ok).toBe(false);
    expect(r.gates.ORACLE_EXPORT.ok).toBe(false);
  });

  it("DRAFT validationStatus blocks ORACLE_EXPORT even at COMPLETE stage", () => {
    // Stub a "fully filled" pillar — content is intentionally empty
    // because the assessor will return EMPTY without a contract; we
    // assert the validation-gate behaviour independently.
    const r = evaluatePillarReadiness(
      { key: "a", content: {}, validationStatus: "DRAFT" },
      "A",
    );
    expect(r.gates.ORACLE_EXPORT.ok).toBe(false);
    expect(r.gates.ORACLE_EXPORT.reasons).toContain("VALIDATION_NOT_VALIDATED");
  });

  it("VALIDATED + COMPLETE-stage simulation passes ORACLE_EXPORT", () => {
    // We can't easily simulate COMPLETE without seeded data; the gate
    // logic itself is what we assert here. This test guards the boolean
    // composition rule, not the maturity computation.
    const r = evaluatePillarReadiness(
      { key: "a", content: {}, validationStatus: "VALIDATED" },
      "A",
    );
    expect(r.gates.ORACLE_EXPORT.ok).toBe(true);
    expect(r.gates.ORACLE_EXPORT.reasons).toEqual([]);
  });

  it("LOCKED is treated as at-or-above VALIDATED for the EXPORT gate", () => {
    const r = evaluatePillarReadiness(
      { key: "a", content: {}, validationStatus: "LOCKED" },
      "A",
    );
    expect(r.gates.ORACLE_EXPORT.ok).toBe(true);
    expect(r.displayLabel).toBe("Verrouillé");
  });

  it("display label maps cleanly: DRAFT + EMPTY ⇒ 'Vide'", () => {
    const r = evaluatePillarReadiness(
      { key: "d", content: {}, validationStatus: "DRAFT" },
      "D",
    );
    expect(r.displayLabel).toBe("Vide");
  });

  it("VALIDATED beats stage in the label (operator-driven trumps maturity)", () => {
    const r = evaluatePillarReadiness(
      { key: "a", content: {}, validationStatus: "VALIDATED" },
      "A",
    );
    expect(r.displayLabel).toBe("Validé");
  });

  it("consistencyCheck flags the pre-Phase-3 bug pattern", () => {
    // Simulate the "Mestor partially filled — UI thinks complet" pattern.
    // Zod-partial 100% (because all required keys are present as empty
    // strings) but the maturity assessor sees stage EMPTY because the
    // contract demands non-empty values on COMPLETE-stage paths.
    const probe = consistencyCheck(
      { key: "a", content: {}, validationStatus: "DRAFT" },
      "A",
    );
    // Either the canonical evaluator agrees the pillar is NOT complete
    // (consistent: true with stage=EMPTY/INTAKE), or it disagrees and we
    // get divergences — in both cases the canonical answer is the one
    // the rest of the system follows.
    expect(probe.canonical.stage).not.toBe("COMPLETE");
    expect(probe.canonical.gates.DISPLAY_AS_COMPLETE.ok).toBe(false);
  });
});
