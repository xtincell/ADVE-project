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
  // Phase 21 F-AB (ADR-0076) — sémantique stale 2-niveaux :
  // stale + COMPLET/FULL → "stale-advisory" (MAJ RECOMMANDÉE, non-bloquant)
  // stale + INCOMPLET    → "stale" (PÉRIMÉ, bloquant)
  it("stale + COMPLET → variant 'stale-advisory' (advisory, non-bloquant)", () => {
    const out = getPillarChipStatus({ ...baseComplete, stale: true });
    expect(out.variant).toBe("stale-advisory");
    expect(out.label).toBe("MAJ RECOMMANDÉE");
    expect(out.shouldRegenerate).toBe(true);
    // Advisory : isReadyForCascade reflète rtisCascadeReady (peut être true)
    expect(out.isReadyForCascade).toBe(true);
  });

  it("stale + FULL → variant 'stale-advisory' (advisory, non-bloquant)", () => {
    const out = getPillarChipStatus({
      ...baseComplete,
      completionLevel: "FULL",
      stale: true,
    });
    expect(out.variant).toBe("stale-advisory");
    expect(out.label).toBe("MAJ RECOMMANDÉE");
    expect(out.isReadyForCascade).toBe(true);
  });

  it("stale + INCOMPLET → variant 'stale' (PÉRIMÉ, bloquant)", () => {
    const out = getPillarChipStatus({
      ...baseComplete,
      completionLevel: "INCOMPLET",
      stage: "INTAKE",
      validationStatus: "DRAFT",
      rtisCascadeReady: false,
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

  it("stale + COMPLET respecte rtisCascadeReady serveur (advisory, ADR-0076)", () => {
    // Pré-F-AB le test affirmait isReadyForCascade=false dès stale=true.
    // Post F-AB la sémantique est : stale advisory tolère cascade — le
    // serveur (pillar-readiness gate RTIS_CASCADE) reflète déjà cette règle
    // via rtisCascadeReady=true même en stale-advisory.
    const out = getPillarChipStatus({ ...baseComplete, stale: true });
    expect(out.isReadyForCascade).toBe(true);
  });

  it("stale-blocking (INCOMPLET) bloque vraiment isReadyForCascade", () => {
    const out = getPillarChipStatus({
      ...baseComplete,
      completionLevel: "INCOMPLET",
      rtisCascadeReady: false,
      stale: true,
    });
    expect(out.isReadyForCascade).toBe(false);
  });
});

describe("isPillarReadyForCascade — convenience", () => {
  it("delegates to getPillarChipStatus (Phase 21 F-AB advisory tolerance)", () => {
    expect(isPillarReadyForCascade(baseComplete)).toBe(true);
    // stale + COMPLET → advisory, cascade tolérée
    expect(isPillarReadyForCascade({ ...baseComplete, stale: true })).toBe(true);
    // stale + INCOMPLET → blocking
    expect(
      isPillarReadyForCascade({
        ...baseComplete,
        completionLevel: "INCOMPLET",
        rtisCascadeReady: false,
        stale: true,
      }),
    ).toBe(false);
    // rtisCascadeReady false (pas stale) → bloquant naturellement
    expect(isPillarReadyForCascade({ ...baseComplete, rtisCascadeReady: false })).toBe(false);
  });
});

describe("getPillarChipStatus — className mapping", () => {
  it("stale → warning tone", () => {
    expect(getPillarChipStatus({ ...baseComplete, stale: true }).className).toContain("warning");
  });

  it("FULL → success tone", () => {
    expect(getPillarChipStatus({ ...baseComplete, completionLevel: "FULL" }).className).toContain("success");
  });

  it("COMPLET → info tone", () => {
    expect(getPillarChipStatus(baseComplete).className).toContain("info");
  });

  it("INCOMPLET → error tone", () => {
    expect(
      getPillarChipStatus({ ...baseComplete, completionLevel: "INCOMPLET", stage: "EMPTY", rtisCascadeReady: false }).className,
    ).toContain("error");
  });
});
