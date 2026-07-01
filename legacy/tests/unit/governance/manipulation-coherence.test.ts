/**
 * Anti-drift CI test — Manipulation Matrix invariants.
 *
 * Cf. MANIPULATION-MATRIX.md §4.5.
 */

import { describe, it, expect } from "vitest";
import {
  isValidManipulationMode,
  ManipulationCoherenceError,
} from "@/server/services/ptah/governance";
import {
  estimateExpectedSuperfans,
  ROI_BENCHMARKS_BY_MODE,
  costPerExpectedSuperfan,
} from "@/server/services/ptah/pricing";
import { MANIPULATION_MODES } from "@/server/services/ptah/types";

describe("manipulation-coherence", () => {
  it("4 modes sont disjoints et exhaustifs", () => {
    expect(MANIPULATION_MODES).toEqual(["peddler", "dealer", "facilitator", "entertainer"]);
  });

  it("isValidManipulationMode reconnaît les 4 modes", () => {
    for (const m of MANIPULATION_MODES) {
      expect(isValidManipulationMode(m)).toBe(true);
    }
    expect(isValidManipulationMode("manipulator")).toBe(false);
    expect(isValidManipulationMode("")).toBe(false);
  });

  it("ROI_BENCHMARKS_BY_MODE défini pour les 4 modes", () => {
    for (const m of MANIPULATION_MODES) {
      expect(ROI_BENCHMARKS_BY_MODE[m]).toBeDefined();
      expect(ROI_BENCHMARKS_BY_MODE[m].costPerSuperfanCeilingUsd).toBeGreaterThan(0);
    }
  });

  it("ceiling cost/superfan croît avec la profondeur du mode", () => {
    expect(ROI_BENCHMARKS_BY_MODE.peddler.costPerSuperfanCeilingUsd).toBeLessThan(
      ROI_BENCHMARKS_BY_MODE.dealer.costPerSuperfanCeilingUsd,
    );
    expect(ROI_BENCHMARKS_BY_MODE.dealer.costPerSuperfanCeilingUsd).toBeLessThan(
      ROI_BENCHMARKS_BY_MODE.facilitator.costPerSuperfanCeilingUsd,
    );
    expect(ROI_BENCHMARKS_BY_MODE.facilitator.costPerSuperfanCeilingUsd).toBeLessThan(
      ROI_BENCHMARKS_BY_MODE.entertainer.costPerSuperfanCeilingUsd,
    );
  });

  it("estimateExpectedSuperfans renvoie un entier positif pour tous les modes", () => {
    for (const mode of MANIPULATION_MODES) {
      const brief = {
        briefText: "test",
        forgeSpec: { kind: "image" as const, parameters: {} },
        pillarSource: "D" as const,
        manipulationMode: mode,
      };
      const n = estimateExpectedSuperfans(brief);
      expect(n).toBeGreaterThan(0);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it("entertainer pillar=E donne le plus haut potentiel superfan vs peddler pillar=T", () => {
    const high = estimateExpectedSuperfans({
      briefText: "x",
      forgeSpec: { kind: "image", parameters: {} },
      pillarSource: "E",
      manipulationMode: "entertainer",
    });
    const low = estimateExpectedSuperfans({
      briefText: "x",
      forgeSpec: { kind: "image", parameters: {} },
      pillarSource: "T",
      manipulationMode: "peddler",
    });
    expect(high).toBeGreaterThan(low);
  });

  it("costPerExpectedSuperfan = Infinity si superfans=0", () => {
    expect(costPerExpectedSuperfan(10, 0)).toBe(Infinity);
  });

  it("costPerExpectedSuperfan = cost/superfans sinon", () => {
    expect(costPerExpectedSuperfan(10, 5)).toBe(2);
  });

  it("ManipulationCoherenceError porte un reason MIX_VIOLATION", () => {
    const err = new ManipulationCoherenceError("peddler", 0, 0.05);
    expect(err.reason).toBe("MIX_VIOLATION");
    expect(err.message).toMatch(/peddler/);
  });
});
