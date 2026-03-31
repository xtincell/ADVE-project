import { describe, it, expect } from "vitest";
import { scorePillarStructural, applyQualityModulator, computeComposite } from "@/lib/utils/scoring";

describe("Advertis Scorer - Structural Scoring", () => {
  it("should return 0 when no atoms are filled", () => {
    const score = scorePillarStructural({
      atomesValides: 0,
      atomesRequis: 12,
      collectionsCompletes: 0,
      collectionsTotales: 3,
      crossRefsValides: 0,
      crossRefsRequises: 2,
    });
    expect(score).toBe(0);
  });

  it("should return 25 when all atoms, collections, and cross-refs are filled", () => {
    const score = scorePillarStructural({
      atomesValides: 12,
      atomesRequis: 12,
      collectionsCompletes: 3,
      collectionsTotales: 3,
      crossRefsValides: 2,
      crossRefsRequises: 2,
    });
    expect(score).toBe(25);
  });

  it("should produce deterministic results (variance = 0)", () => {
    const input = {
      atomesValides: 6,
      atomesRequis: 12,
      collectionsCompletes: 1,
      collectionsTotales: 3,
      crossRefsValides: 1,
      crossRefsRequises: 2,
    };

    const results = Array.from({ length: 100 }, () => scorePillarStructural(input));
    const first = results[0];
    expect(results.every((r) => r === first)).toBe(true);
  });

  it("should cap at 25", () => {
    const score = scorePillarStructural({
      atomesValides: 20,
      atomesRequis: 12,
      collectionsCompletes: 5,
      collectionsTotales: 3,
      crossRefsValides: 4,
      crossRefsRequises: 2,
    });
    expect(score).toBeLessThanOrEqual(25);
  });

  it("should handle zero denominators", () => {
    const score = scorePillarStructural({
      atomesValides: 0,
      atomesRequis: 0,
      collectionsCompletes: 0,
      collectionsTotales: 0,
      crossRefsValides: 0,
      crossRefsRequises: 0,
    });
    expect(score).toBe(0);
  });
});

describe("Quality Modulator", () => {
  it("should clamp modulator between 0.70 and 1.00", () => {
    expect(applyQualityModulator(20, 0.5)).toBe(20 * 0.70);
    expect(applyQualityModulator(20, 1.5)).toBe(20 * 1.00);
    expect(applyQualityModulator(20, 0.85)).toBe(20 * 0.85);
  });
});

describe("Composite Score", () => {
  it("should sum all 8 pillars", () => {
    const composite = computeComposite({
      a: 20, d: 18, v: 15, e: 12, r: 10, t: 8, i: 5, s: 3,
    });
    expect(composite).toBe(91);
  });
});
