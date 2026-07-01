/**
 * Phase 23 Epic 6 Story 6.1 — RUN_ATTRIBUTION_CALIBRATION handler tests.
 *
 * Coverage :
 *   (a) MANUAL_COEFFICIENTS without operatorCoefficients → VETOED (no DB touch)
 *   (b) AUTO with ≥30 samples → OK + canonical snapshot (modelVersion / rocAuc /
 *       rmse / sampleSize / dataWindow / computedAt)
 *   (c) AUTO with < 30 samples → explicit INSUFFICIENT_DATA, no fabricated metric
 *   (d) MANUAL_COEFFICIENTS with coefficients → snapshot.mode === MANUAL_COEFFICIENTS
 *   (e) default scope (no campaignIds) resolves all campaigns under the strategy
 *
 * Validates ADR-0081 §3 snapshot shape + P22-2 INSUFFICIENT_DATA first-class.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const campaignFindManyMock = vi.fn();
const campaignActionFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    campaign: { findMany: (...a: unknown[]) => campaignFindManyMock(...a) },
    campaignAction: { findMany: (...a: unknown[]) => campaignActionFindManyMock(...a) },
  },
}));

import { runAttributionCalibration, ATTRIBUTION_MODEL_VERSION } from "@/server/services/campaign-tracker/calibration";
import type { Intent } from "@/server/services/mestor/intents";

type CalibrationIntent = Extract<Intent, { kind: "RUN_ATTRIBUTION_CALIBRATION" }>;

function intent(over: Partial<CalibrationIntent> = {}): CalibrationIntent {
  return {
    kind: "RUN_ATTRIBUTION_CALIBRATION",
    strategyId: "strat-1",
    operatorId: "op-1",
    campaignIds: ["camp-1"],
    mode: "AUTO",
    ...over,
  } as CalibrationIntent;
}

/** Synthetic CampaignAction rows : `evangelists` carry an EVANGELISTE transition (label 1). */
function rows(total: number, evangelists: number) {
  const base = new Date("2026-05-01T00:00:00.000Z").getTime();
  return Array.from({ length: total }, (_, i) => ({
    id: `act-${i}`,
    campaignId: "camp-1",
    bigIdeaCoherenceScore: i < evangelists ? 0.85 : 0.2,
    budget: i < evangelists ? 800_000 : 100_000,
    devotionTransitionsObserved: i < evangelists ? [{ from: "Ambassador", to: "EVANGELISTE" }] : [],
    updatedAt: new Date(base + i * 86_400_000),
  }));
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("Story 6.1 — runAttributionCalibration", () => {
  it("(a) MANUAL_COEFFICIENTS without operatorCoefficients → VETOED", async () => {
    const res = await runAttributionCalibration(intent({ mode: "MANUAL_COEFFICIENTS" }));
    expect(res.status).toBe("VETOED");
    expect(res.reason).toBe("MISSING_OPERATOR_COEFFICIENTS");
    expect(campaignActionFindManyMock).not.toHaveBeenCalled();
  });

  it("(b) AUTO with ≥30 samples → OK + canonical snapshot", async () => {
    campaignActionFindManyMock.mockResolvedValue(rows(40, 20));
    const res = await runAttributionCalibration(intent());
    expect(res.status).toBe("OK");
    const out = res.output as Record<string, unknown>;
    expect(out.state).toBe("OK");
    const snap = out.snapshot as Record<string, unknown>;
    expect(snap.modelVersion).toBe(ATTRIBUTION_MODEL_VERSION);
    expect(typeof snap.rocAuc).toBe("number");
    expect(typeof snap.rmse).toBe("number");
    expect(snap.sampleSize).toBe(40);
    expect(snap.mode).toBe("ALGORITHMIC");
    const win = snap.dataWindow as { from: string | null; to: string | null };
    expect(win.from).toBeTruthy();
    expect(win.to).toBeTruthy();
    expect(typeof snap.computedAt).toBe("string");
  });

  it("(c) AUTO with < 30 samples → explicit INSUFFICIENT_DATA, no snapshot", async () => {
    campaignActionFindManyMock.mockResolvedValue(rows(5, 2));
    const res = await runAttributionCalibration(intent());
    expect(res.status).toBe("OK");
    const out = res.output as Record<string, unknown>;
    expect(out.state).toBe("INSUFFICIENT_DATA");
    expect(out.snapshot).toBeUndefined();
    expect(out.samplesAvailable).toBe(5);
  });

  it("(d) MANUAL_COEFFICIENTS with coefficients → snapshot.mode === MANUAL_COEFFICIENTS", async () => {
    campaignActionFindManyMock.mockResolvedValue(rows(40, 20));
    const res = await runAttributionCalibration(
      intent({ mode: "MANUAL_COEFFICIENTS", operatorCoefficients: {} }),
    );
    expect(res.status).toBe("OK");
    const snap = (res.output as Record<string, unknown>).snapshot as Record<string, unknown>;
    expect(snap.mode).toBe("MANUAL_COEFFICIENTS");
  });

  it("(e) default scope (no campaignIds) resolves all campaigns under the strategy", async () => {
    campaignFindManyMock.mockResolvedValue([{ id: "camp-1" }, { id: "camp-2" }]);
    campaignActionFindManyMock.mockResolvedValue(rows(40, 20));
    const res = await runAttributionCalibration(intent({ campaignIds: undefined }));
    expect(campaignFindManyMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe("OK");
  });
});
