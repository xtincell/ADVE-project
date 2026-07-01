/**
 * Phase 23 Pattern P22-4 — PROMOTE_PIVOT_SUBCLUSTER state-machine guards.
 *
 * Activated **HARD** in Epic 6 Story 6.7 against the live handler
 * `services/campaign-tracker/lifecycle.ts` + the Mestor pre-flight gate
 * `services/mestor/gates/calibration-snapshot-required.ts`.
 *
 * Asserts :
 *   1. STUB→PARTIAL→MVP→PRODUCTION single-step ordering enforced at the handler.
 *   2. skip-forward / reverse transitions refused with typed governance errors.
 *   3. PRODUCTION without `calibrationSnapshotRef` refused at the Mestor gate
 *      (NOT just the handler) — and the gate is wired into `emitIntent`'s
 *      pre-flight chain (no dispatch path bypasses it).
 *   4. A `calibrationSnapshotRef` pointing to a non-existent or INSUFFICIENT_DATA
 *      emission is refused at the gate.
 *   5. Mode HARD.
 *
 * Cf. ADR-0080, architecture P22-4, Epic 6 Stories 6.2 + 6.3.
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  db: { intentEmission: { findUnique: (...a: unknown[]) => findUniqueMock(...a) } },
}));

import { promotePivotSubcluster } from "@/server/services/campaign-tracker/lifecycle";
import { calibrationSnapshotRequiredGate } from "@/server/services/mestor/gates/calibration-snapshot-required";
import type { Intent } from "@/server/services/mestor/intents";

type PromoteIntent = Extract<Intent, { kind: "PROMOTE_PIVOT_SUBCLUSTER" }>;

function intent(over: Partial<PromoteIntent> = {}): PromoteIntent {
  return {
    kind: "PROMOTE_PIVOT_SUBCLUSTER",
    strategyId: "s",
    operatorId: "op",
    subClusterSlug: "superfan.attribution",
    fromState: "MVP",
    toState: "PRODUCTION",
    calibrationSnapshotRef: "e-ok",
    reason: "reviewed",
    ...over,
  } as PromoteIntent;
}

afterEach(() => vi.clearAllMocks());

describe("Phase 23 P22-4 — Pivot sub-cluster lifecycle state-machine (HARD)", () => {
  it("STUB→PARTIAL→MVP→PRODUCTION ordering enforced (single-step accepted)", async () => {
    expect((await promotePivotSubcluster(intent({ fromState: "STUB", toState: "PARTIAL", calibrationSnapshotRef: undefined }))).status).toBe("OK");
    expect((await promotePivotSubcluster(intent({ fromState: "PARTIAL", toState: "MVP", calibrationSnapshotRef: undefined }))).status).toBe("OK");
    expect((await promotePivotSubcluster(intent({ fromState: "MVP", toState: "PRODUCTION" }))).status).toBe("OK");
  });

  it("skip-forward / reverse transitions refused", async () => {
    const skip = await promotePivotSubcluster(intent({ fromState: "STUB", toState: "MVP", calibrationSnapshotRef: undefined }));
    expect(skip.status).toBe("VETOED");
    expect(skip.reason).toBe("SKIP_FORWARD_REFUSED");
    const reverse = await promotePivotSubcluster(intent({ fromState: "MVP", toState: "PARTIAL", calibrationSnapshotRef: undefined }));
    expect(reverse.status).toBe("VETOED");
    expect(reverse.reason).toBe("REVERSE_TRANSITION_REFUSED");
  });

  it("PRODUCTION without calibrationSnapshotRef refused at the Mestor gate", async () => {
    const v = await calibrationSnapshotRequiredGate({ kind: "PROMOTE_PIVOT_SUBCLUSTER", toState: "PRODUCTION" });
    expect(v.verdict).toBe("BLOCK");
  });

  it("invalid calibrationSnapshotRef refused at the gate (non-existent + INSUFFICIENT_DATA)", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    expect((await calibrationSnapshotRequiredGate({ kind: "PROMOTE_PIVOT_SUBCLUSTER", toState: "PRODUCTION", calibrationSnapshotRef: "nope" })).verdict).toBe("BLOCK");
    findUniqueMock.mockResolvedValueOnce({
      id: "e", intentKind: "RUN_ATTRIBUTION_CALIBRATION",
      result: { status: "OK", output: { state: "INSUFFICIENT_DATA" } },
    });
    expect((await calibrationSnapshotRequiredGate({ kind: "PROMOTE_PIVOT_SUBCLUSTER", toState: "PRODUCTION", calibrationSnapshotRef: "e" })).verdict).toBe("BLOCK");
  });

  it("the gate is wired into emitIntent's pre-flight chain (no bypass)", () => {
    const intents = fs.readFileSync(
      path.resolve(__dirname, "../../../src/server/services/mestor/intents.ts"),
      "utf8",
    );
    expect(intents).toContain("preflightCalibrationSnapshot");
    expect(intents).toContain("calibration-snapshot-required");
    // The pre-flight wrapper is invoked inside emitIntent before dispatch.
    expect(intents).toMatch(/const calibCheck = await preflightCalibrationSnapshot\(intent\)/);
  });

  it("commandant dispatches PROMOTE_PIVOT_SUBCLUSTER to the lifecycle handler", () => {
    const commandant = fs.readFileSync(
      path.resolve(__dirname, "../../../src/server/services/artemis/commandant.ts"),
      "utf8",
    );
    expect(commandant).toContain('case "PROMOTE_PIVOT_SUBCLUSTER"');
    expect(commandant).toContain("promotePivotSubcluster");
  });
});
