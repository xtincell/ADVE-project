/**
 * Phase 23 Epic 6 Story 6.2 — PROMOTE_PIVOT_SUBCLUSTER handler tests.
 *
 * Coverage (verbatim AC) :
 *   (a) valid linear promotion (MVP → PRODUCTION with snapshotRef) → OK
 *   (b) skip-forward (STUB → MVP) → VETOED SKIP_FORWARD_REFUSED
 *   (c) reverse (MVP → PARTIAL) → VETOED REVERSE_TRANSITION_REFUSED
 *   (d) PRODUCTION without snapshotRef → VETOED MISSING_CALIBRATION_SNAPSHOT_REF
 *   (e) unknown sub-cluster → VETOED UNKNOWN_SUBCLUSTER
 *   (f) valid intermediate (PARTIAL → MVP, no snapshot needed) → OK
 *
 * Pure state-machine assertion — no DB, no mocks.
 */

import { describe, expect, it } from "vitest";
import { promotePivotSubcluster } from "@/server/services/campaign-tracker/lifecycle";
import type { Intent } from "@/server/services/mestor/intents";

type PromoteIntent = Extract<Intent, { kind: "PROMOTE_PIVOT_SUBCLUSTER" }>;

function intent(over: Partial<PromoteIntent> = {}): PromoteIntent {
  return {
    kind: "PROMOTE_PIVOT_SUBCLUSTER",
    strategyId: "strat-1",
    operatorId: "op-1",
    subClusterSlug: "superfan.attribution",
    fromState: "MVP",
    toState: "PRODUCTION",
    calibrationSnapshotRef: "emission-123",
    reason: "ROC AUC 0.82 reviewed and accepted",
    ...over,
  } as PromoteIntent;
}

describe("Story 6.2 — promotePivotSubcluster state machine", () => {
  it("(a) valid linear MVP → PRODUCTION with snapshotRef → OK", async () => {
    const res = await promotePivotSubcluster(intent());
    expect(res.status).toBe("OK");
    const out = res.output as Record<string, unknown>;
    expect(out.fromState).toBe("MVP");
    expect(out.toState).toBe("PRODUCTION");
    expect(out.calibrationSnapshotRef).toBe("emission-123");
    expect(out.actor).toBe("op-1");
  });

  it("(b) skip-forward STUB → MVP → VETOED", async () => {
    const res = await promotePivotSubcluster(intent({ fromState: "STUB", toState: "MVP", calibrationSnapshotRef: undefined }));
    expect(res.status).toBe("VETOED");
    expect(res.reason).toBe("SKIP_FORWARD_REFUSED");
  });

  it("(c) reverse MVP → PARTIAL → VETOED", async () => {
    const res = await promotePivotSubcluster(intent({ fromState: "MVP", toState: "PARTIAL", calibrationSnapshotRef: undefined }));
    expect(res.status).toBe("VETOED");
    expect(res.reason).toBe("REVERSE_TRANSITION_REFUSED");
  });

  it("(d) PRODUCTION without snapshotRef → VETOED", async () => {
    const res = await promotePivotSubcluster(intent({ calibrationSnapshotRef: undefined }));
    expect(res.status).toBe("VETOED");
    expect(res.reason).toBe("MISSING_CALIBRATION_SNAPSHOT_REF");
  });

  it("(e) unknown sub-cluster → VETOED", async () => {
    const res = await promotePivotSubcluster(
      intent({ subClusterSlug: "nonexistent.cluster" as PromoteIntent["subClusterSlug"] }),
    );
    expect(res.status).toBe("VETOED");
    expect(res.reason).toBe("UNKNOWN_SUBCLUSTER");
  });

  it("(f) valid intermediate PARTIAL → MVP (no snapshot needed) → OK", async () => {
    const res = await promotePivotSubcluster(intent({ fromState: "PARTIAL", toState: "MVP", calibrationSnapshotRef: undefined }));
    expect(res.status).toBe("OK");
  });
});
