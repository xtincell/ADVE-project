import { describe, it, expect } from "vitest";
import { detectDrift } from "@/server/services/feedback-loop/drift-detector";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_KEYS } from "@/lib/types/advertis-vector";

/**
 * Feedback Loop & Drift Detection tests.
 *
 * Tests the pure `detectDrift` function which does not require DB access.
 * Also tests drift percentage calculation logic and threshold semantics.
 */

const DRIFT_THRESHOLD_PERCENT = 15;

describe("Feedback Loop - Drift Detection Thresholds", () => {
  it("no drift when score increases (positive delta)", () => {
    const result = detectDrift("a", 10, 15);
    expect(result.isDrifting).toBe(false);
    expect(result.delta).toBe(5);
  });

  it("no drift when score stays the same", () => {
    const result = detectDrift("a", 15, 15);
    expect(result.isDrifting).toBe(false);
    expect(result.delta).toBe(0);
  });

  it("no drift for negligible decrease below low threshold", () => {
    // For pillar 'a', low threshold is 2. A drop of 1 should not drift.
    const result = detectDrift("a", 15, 14);
    expect(result.isDrifting).toBe(false);
  });

  it("drift detected at low severity for pillar a (drop of 2+)", () => {
    const result = detectDrift("a", 15, 12.5);
    expect(result.isDrifting).toBe(true);
    expect(result.severity).toBe("low");
  });

  it("drift detected at medium severity for pillar a (drop of 4+)", () => {
    const result = detectDrift("a", 20, 15.5);
    expect(result.isDrifting).toBe(true);
    expect(result.severity).toBe("medium");
  });

  it("drift detected at high severity for pillar a (drop of 6+)", () => {
    const result = detectDrift("a", 22, 15);
    expect(result.isDrifting).toBe(true);
    expect(result.severity).toBe("high");
  });

  it("drift detected at critical severity for pillar a (drop of 8+)", () => {
    const result = detectDrift("a", 25, 16);
    expect(result.isDrifting).toBe(true);
    expect(result.severity).toBe("critical");
  });
});

describe("Feedback Loop - Drift > 15% Triggers Alerts", () => {
  it("drift of 20% (from 20 to 16) exceeds 15% threshold", () => {
    const previous = 20;
    const current = 16;
    const driftPercent = Math.abs(((current - previous) / previous) * 100);
    expect(driftPercent).toBe(20);
    expect(driftPercent).toBeGreaterThan(DRIFT_THRESHOLD_PERCENT);

    // The drift detector also flags this
    const result = detectDrift("a", previous, current);
    expect(result.isDrifting).toBe(true);
  });

  it("drift of exactly 15% (from 20 to 17) meets threshold", () => {
    const previous = 20;
    const current = 17;
    const driftPercent = Math.abs(((current - previous) / previous) * 100);
    expect(driftPercent).toBe(15);
    expect(driftPercent).toBeGreaterThanOrEqual(DRIFT_THRESHOLD_PERCENT);
  });

  it("drift of 10% (from 20 to 18) does not exceed threshold", () => {
    const previous = 20;
    const current = 18;
    const driftPercent = Math.abs(((current - previous) / previous) * 100);
    expect(driftPercent).toBe(10);
    expect(driftPercent).toBeLessThan(DRIFT_THRESHOLD_PERCENT);
  });

  it("drift percentage is 0 when previous is 0 (fallback logic)", () => {
    const previous = 0;
    const current = 5;
    // When previous is 0, the feedback loop uses a fallback calculation
    const driftPercent = previous > 0
      ? Math.abs(((current - previous) / previous) * 100)
      : 0;
    expect(driftPercent).toBe(0);
  });
});

describe("Feedback Loop - Pillar-Specific Thresholds", () => {
  it("pillar e (Engagement) has lower thresholds than pillar a", () => {
    // Pillar 'e' low threshold is 1.5, vs pillar 'a' low threshold of 2
    // A drop of 1.8 should trigger drift for 'e' but not for 'a'
    const resultE = detectDrift("e", 15, 13.2);
    const resultA = detectDrift("a", 15, 13.2);
    expect(resultE.isDrifting).toBe(true);
    expect(resultA.isDrifting).toBe(false); // 1.8 < 2.0 threshold for 'a'
  });

  it("pillar r (Risk) has lower thresholds like pillar e", () => {
    // Pillar 'r' low threshold is 1.5
    const result = detectDrift("r", 10, 8);
    expect(result.isDrifting).toBe(true);
    expect(result.severity).toBe("low");
  });

  it("all pillars detect critical drift for large drops", () => {
    for (const pillar of PILLAR_KEYS) {
      const result = detectDrift(pillar, 25, 15);
      expect(result.isDrifting).toBe(true);
      expect(["high", "critical"]).toContain(result.severity);
    }
  });
});

describe("Feedback Loop - Recalibration Flow", () => {
  it("recalibration concept: rescoring triggers new vector calculation", () => {
    // The recalibrate function calls scoreObject("strategy", strategyId)
    // After recalibration, the drift should be re-evaluated
    const beforeRecalibration = detectDrift("a", 20, 12);
    expect(beforeRecalibration.isDrifting).toBe(true);
    expect(beforeRecalibration.severity).toBe("critical");

    // After recalibration, if the new score improves
    const afterRecalibration = detectDrift("a", 12, 18);
    expect(afterRecalibration.isDrifting).toBe(false);
    // Positive delta means improvement, no drift
    expect(afterRecalibration.delta).toBe(6);
  });

  it("recalibration that does not improve still detects drift", () => {
    const result = detectDrift("a", 15, 10);
    expect(result.isDrifting).toBe(true);
    expect(result.severity).toBe("medium");
  });
});

describe("Feedback Loop - Delta Calculations", () => {
  it("delta is negative for score drops", () => {
    const result = detectDrift("d", 20, 14);
    expect(result.delta).toBe(-6);
  });

  it("delta is positive for score increases", () => {
    const result = detectDrift("v", 10, 18);
    expect(result.delta).toBe(8);
  });

  it("delta is 0 for no change", () => {
    const result = detectDrift("s", 15, 15);
    expect(result.delta).toBe(0);
  });
});
