import { describe, it, expect } from "vitest";
import { nextObservationStatus } from "@/server/services/seshat/observe";

describe("Seshat observeIntent — boucle d'observation (ADR-0038)", () => {
  it("OK / DOWNGRADED depuis PENDING_OBSERVATION → OBSERVED", () => {
    expect(nextObservationStatus("OK", "PENDING_OBSERVATION")).toBe("OBSERVED");
    expect(nextObservationStatus("DOWNGRADED", "PENDING_OBSERVATION")).toBe("OBSERVED");
  });

  it("FAILED / VETOED depuis PENDING_OBSERVATION → NOT_APPLICABLE (rien à mesurer)", () => {
    expect(nextObservationStatus("FAILED", "PENDING_OBSERVATION")).toBe("NOT_APPLICABLE");
    expect(nextObservationStatus("VETOED", "PENDING_OBSERVATION")).toBe("NOT_APPLICABLE");
  });

  it("idempotent : aucune transition hors PENDING_OBSERVATION", () => {
    for (const obs of ["OBSERVED", "STALE_OBSERVATION", "NOT_APPLICABLE", "OBSERVATION_FAILED"]) {
      expect(nextObservationStatus("OK", obs)).toBeNull();
    }
  });
});
