/**
 * Phase 23 Epic 6 Story 6.3 — calibration-snapshot-required Mestor gate tests.
 *
 * Coverage (verbatim AC) :
 *   (a) refuses on missing ref
 *   (b) refuses on ref → non-existent emission
 *   (c) refuses on ref → INSUFFICIENT_DATA emission
 *   (d) passes on valid ref (succeeded RUN_ATTRIBUTION_CALIBRATION emission)
 *   (e) refuses on ref → wrong-kind emission
 *   (f) passes (skips) for non-PRODUCTION transitions
 *   (g) refuses on ref → emission whose IntentResult.status !== OK
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: { intentEmission: { findUnique: (...a: unknown[]) => findUniqueMock(...a) } },
}));

import { calibrationSnapshotRequiredGate } from "@/server/services/mestor/gates/calibration-snapshot-required";

afterEach(() => vi.clearAllMocks());

const PROD = { kind: "PROMOTE_PIVOT_SUBCLUSTER", toState: "PRODUCTION" } as const;

describe("Story 6.3 — calibrationSnapshotRequiredGate", () => {
  it("(a) BLOCK on missing calibrationSnapshotRef", async () => {
    const v = await calibrationSnapshotRequiredGate({ ...PROD });
    expect(v.verdict).toBe("BLOCK");
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("(b) BLOCK on ref → non-existent emission", async () => {
    findUniqueMock.mockResolvedValue(null);
    const v = await calibrationSnapshotRequiredGate({ ...PROD, calibrationSnapshotRef: "missing" });
    expect(v.verdict).toBe("BLOCK");
  });

  it("(c) BLOCK on ref → INSUFFICIENT_DATA emission", async () => {
    findUniqueMock.mockResolvedValue({
      id: "e1",
      intentKind: "RUN_ATTRIBUTION_CALIBRATION",
      result: { status: "OK", output: { state: "INSUFFICIENT_DATA" } },
    });
    const v = await calibrationSnapshotRequiredGate({ ...PROD, calibrationSnapshotRef: "e1" });
    expect(v.verdict).toBe("BLOCK");
  });

  it("(d) PASS on valid succeeded calibration emission", async () => {
    findUniqueMock.mockResolvedValue({
      id: "e2",
      intentKind: "RUN_ATTRIBUTION_CALIBRATION",
      result: { status: "OK", output: { state: "OK", snapshot: { rocAuc: 0.82 } } },
    });
    const v = await calibrationSnapshotRequiredGate({ ...PROD, calibrationSnapshotRef: "e2" });
    expect(v.verdict).toBe("PASS");
  });

  it("(e) BLOCK on ref → wrong-kind emission", async () => {
    findUniqueMock.mockResolvedValue({
      id: "e3",
      intentKind: "OPERATOR_TAG_OVERTON_DELTA",
      result: { status: "OK", output: { state: "OK" } },
    });
    const v = await calibrationSnapshotRequiredGate({ ...PROD, calibrationSnapshotRef: "e3" });
    expect(v.verdict).toBe("BLOCK");
  });

  it("(f) PASS (skip) for non-PRODUCTION transitions", async () => {
    const v = await calibrationSnapshotRequiredGate({ kind: "PROMOTE_PIVOT_SUBCLUSTER", toState: "MVP" });
    expect(v.verdict).toBe("PASS");
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("(g) BLOCK on ref → emission whose IntentResult.status !== OK", async () => {
    findUniqueMock.mockResolvedValue({
      id: "e4",
      intentKind: "RUN_ATTRIBUTION_CALIBRATION",
      result: { status: "FAILED", output: { state: "OK" } },
    });
    const v = await calibrationSnapshotRequiredGate({ ...PROD, calibrationSnapshotRef: "e4" });
    expect(v.verdict).toBe("BLOCK");
  });
});
