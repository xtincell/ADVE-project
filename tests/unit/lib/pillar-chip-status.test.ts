/**
 * Phase 21 F-A.5 (ADR-0069) — Unit tests for `getPillarChipStatus`
 *
 * Garanties verrouillées :
 *   - `stale: true` ⇒ variant "stale" + label "PÉRIMÉ" + isReadyForCascade=false,
 *     même si completionLevel=COMPLET ou FULL (override).
 *   - completionLevel=FULL  ⇒ variant "full"     + label "FULL".
 *   - completionLevel=COMPLET ⇒ variant "complet" + label "COMPLET".
 *   - Sinon                  ⇒ variant "incomplet" + label "INCOMPLET".
 *   - `isReadyForCascade` reflète `rtisCascadeReady` ET `!stale` (jamais ready si stale).
 */

import { describe, expect, it } from "vitest";
import {
  getPillarChipStatus,
  isPillarReadyForCascade,
  type PillarReadinessProjection,
} from "@/components/cockpit/notoria/lib/pillar-chip-status";

const baseComplete: PillarReadinessProjection = {
  completionLevel: "COMPLET",
  stage: "COMPLETE",
  stale: false,
  displayLabel: "Complet",
  validationStatus: "VALIDATED",
  rtisCascadeReady: true,
};

describe("getPillarChipStatus — variant precedence", () => {
  it("stale=true overrides COMPLET to PÉRIMÉ", () => {
    const out = getPillarChipStatus({ ...baseComplete, stale: true });
    expect(out.variant).toBe("stale");
    expect(out.label).toBe("PÉRIMÉ");
    expect(out.shouldRegenerate).toBe(true);
    expect(out.isReadyForCascade).toBe(false);
  });

  it("stale=true overrides FULL to PÉRIMÉ", () => {
    const out = getPillarChipStatus({
      ...baseComplete,
      completionLevel: "FULL",
      stale: true,
    });
    expect(out.variant).toBe("stale");
    expect(out.label).toBe("PÉRIMÉ");
    expect(out.isReadyForCascade).toBe(false);
  });

  it("FULL not stale → variant full", () => {
    const out = getPillarChipStatus({ ...baseComplete, completionLevel: "FULL" });
    expect(out.variant).toBe("full");
    expect(out.label).toBe("FULL");
    expect(out.shouldRegenerate).toBe(false);
  });

  it("COMPLET not stale → variant complet", () => {
    const out = getPillarChipStatus(baseComplete);
    expect(out.variant).toBe("complet");
    expect(out.label).toBe("COMPLET");
    expect(out.shouldRegenerate).toBe(false);
    expect(out.isReadyForCascade).toBe(true);
  });

  it("INCOMPLET not stale → variant incomplet", () => {
    const out = getPillarChipStatus({
      ...baseComplete,
      completionLevel: "INCOMPLET",
      stage: "INTAKE",
      validationStatus: "DRAFT",
      rtisCascadeReady: false,
    });
    expect(out.variant).toBe("incomplet");
    expect(out.label).toBe("INCOMPLET");
    expect(out.isReadyForCascade).toBe(false);
  });
});

describe("getPillarChipStatus — isReadyForCascade", () => {
  it("respects rtisCascadeReady=false on COMPLET", () => {
    const out = getPillarChipStatus({ ...baseComplete, rtisCascadeReady: false });
    expect(out.isReadyForCascade).toBe(false);
  });

  it("returns false when stale even if rtisCascadeReady would be true", () => {
    const out = getPillarChipStatus({ ...baseComplete, stale: true });
    expect(out.isReadyForCascade).toBe(false);
  });
});

describe("isPillarReadyForCascade — convenience", () => {
  it("delegates to getPillarChipStatus", () => {
    expect(isPillarReadyForCascade(baseComplete)).toBe(true);
    expect(isPillarReadyForCascade({ ...baseComplete, stale: true })).toBe(false);
    expect(isPillarReadyForCascade({ ...baseComplete, rtisCascadeReady: false })).toBe(false);
  });
});

describe("getPillarChipStatus — className mapping", () => {
  it("stale → amber tone", () => {
    expect(getPillarChipStatus({ ...baseComplete, stale: true }).className).toContain("amber");
  });

  it("FULL → emerald tone", () => {
    expect(getPillarChipStatus({ ...baseComplete, completionLevel: "FULL" }).className).toContain("emerald");
  });

  it("COMPLET → blue tone", () => {
    expect(getPillarChipStatus(baseComplete).className).toContain("blue");
  });

  it("INCOMPLET → error tone", () => {
    expect(
      getPillarChipStatus({ ...baseComplete, completionLevel: "INCOMPLET", stage: "EMPTY", rtisCascadeReady: false }).className,
    ).toContain("error");
  });
});
