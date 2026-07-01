import { describe, it, expect } from "vitest";
import { fuseEstimates, type SourcePoint } from "@/server/services/bureau-etudes/fusion";

/** Fusion pondérée + erreur honnête (ADR-0114) — PUR, zéro mock. */

describe("bureau-etudes/fusion — fuseEstimates", () => {
  it("moyenne pondérée par fiabilité + dispersion", () => {
    const points: SourcePoint[] = [
      { value: 100, reliability: 1.0, provenanceClass: "FIRST_PARTY" },
      { value: 200, reliability: 0.5, provenanceClass: "SYNDICATED" },
    ];
    const r = fuseEstimates(points)!;
    // (100×1 + 200×0.5) / 1.5 = 133.33
    expect(r.fused).toBeCloseTo(133.3333, 2);
    expect(r.usedN).toBe(2);
    expect(r.dispersion).toBeGreaterThan(0);
    expect(r.byProvenance).toEqual({ FIRST_PARTY: 1, SYNDICATED: 1 });
  });

  it("sources sans fiabilité exclues (jamais inventées)", () => {
    const r = fuseEstimates([
      { value: 100, reliability: 1 },
      { value: 999, reliability: null },
    ])!;
    expect(r.usedN).toBe(1);
    expect(r.excludedN).toBe(1);
    expect(r.fused).toBe(100);
    expect(r.dispersion).toBe(0); // une seule source pondérée
  });

  it("aucune source pondérable → null", () => {
    expect(fuseEstimates([{ value: 5, reliability: null }])).toBeNull();
    expect(fuseEstimates([])).toBeNull();
  });

  it("convergence parfaite → dispersion 0", () => {
    const r = fuseEstimates([
      { value: 50, reliability: 0.8 },
      { value: 50, reliability: 0.4 },
    ])!;
    expect(r.fused).toBe(50);
    expect(r.dispersion).toBe(0);
  });
});
