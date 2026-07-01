import { describe, it, expect } from "vitest";
import { detectDrift } from "@/server/services/feedback-loop/drift-detector";

describe("Drift Detector", () => {
  it("does not flag positive drift", () => {
    const result = detectDrift("a", 15, 18);
    expect(result.isDrifting).toBe(false);
    expect(result.delta).toBe(3);
  });

  it("does not flag small negative drift", () => {
    const result = detectDrift("a", 15, 14.5);
    expect(result.isDrifting).toBe(false);
  });

  it("flags low severity drift", () => {
    const result = detectDrift("a", 15, 12.5);
    expect(result.isDrifting).toBe(true);
    expect(result.severity).toBe("low");
  });

  it("flags medium severity drift", () => {
    const result = detectDrift("a", 20, 15.5);
    expect(result.isDrifting).toBe(true);
    expect(result.severity).toBe("medium");
  });

  it("flags high severity drift", () => {
    const result = detectDrift("a", 22, 15);
    expect(result.isDrifting).toBe(true);
    expect(result.severity).toBe("high");
  });

  it("flags critical drift", () => {
    const result = detectDrift("a", 25, 16);
    expect(result.isDrifting).toBe(true);
    expect(result.severity).toBe("critical");
  });

  it("returns correct delta", () => {
    const result = detectDrift("d", 20, 14);
    expect(result.delta).toBe(-6);
  });
});
