/**
 * Phase 23 Epic 3 Story 3.6 — unit tests for the Oracle Overton-distinctive
 * real-signal builder.
 *
 * Coverage :
 *   (a) NO_CAMPAIGNS branch when zero campaigns carry an Overton hypothesis.
 *   (b) ALL_DEGRADED branch when every campaign returns null shift + the
 *       union of upstream degradationCodes propagates.
 *   (c) OK branch with mean-over-measurable aggregation : null shifts are NOT
 *       folded as 0 ; the denominator is `measurableCampaigns`, not `samples.length`.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const campaignFindManyMock = vi.fn();
const measureOvertonShiftMock = vi.fn();
const evaluateOvertonReadinessMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    campaign: {
      findMany: (...args: unknown[]) => campaignFindManyMock(...args),
    },
  },
}));

vi.mock("@/server/services/campaign-tracker/signals-culture", () => ({
  measureOvertonShift: (...args: unknown[]) => measureOvertonShiftMock(...args),
  evaluateOvertonReadiness: (...args: unknown[]) => evaluateOvertonReadinessMock(...args),
}));

import { buildOvertonRealSignalForOracle } from "@/server/services/strategy-presentation/overton-real-signal";

describe("buildOvertonRealSignalForOracle", () => {
  afterEach(() => {
    campaignFindManyMock.mockReset();
    measureOvertonShiftMock.mockReset();
    evaluateOvertonReadinessMock.mockReset();
  });

  it("returns INSUFFICIENT_DATA / NO_CAMPAIGNS when zero campaigns carry an Overton hypothesis", async () => {
    campaignFindManyMock.mockResolvedValueOnce([]);

    const result = await buildOvertonRealSignalForOracle("strat-1", "op-1");

    expect(result.state).toBe("INSUFFICIENT_DATA");
    if (result.state === "INSUFFICIENT_DATA") {
      expect(result.reason).toBe("NO_CAMPAIGNS");
      expect(result.degradationCodes).toContain("NO_CAMPAIGNS_WITH_OVERTON_HYPOTHESIS");
    }
    expect(measureOvertonShiftMock).not.toHaveBeenCalled();
    expect(evaluateOvertonReadinessMock).not.toHaveBeenCalled();
  });

  it("returns INSUFFICIENT_DATA / ALL_DEGRADED when every campaign yields a null shift score, with degradationCodes union", async () => {
    campaignFindManyMock.mockResolvedValueOnce([
      { id: "c-1", name: "Camp 1" },
      { id: "c-2", name: "Camp 2" },
    ]);
    measureOvertonShiftMock
      .mockResolvedValueOnce({
        campaignId: "c-1",
        overtonShiftScore: null,
        emergingTokens: [],
        sentimentDelta: null,
        degradationCodes: ["INSUFFICIENT_SECTOR_AXIS"],
      })
      .mockResolvedValueOnce({
        campaignId: "c-2",
        overtonShiftScore: null,
        emergingTokens: [],
        sentimentDelta: null,
        degradationCodes: ["MISSING_OVERTON_OBSERVED"],
      });
    evaluateOvertonReadinessMock
      .mockResolvedValueOnce({
        strategyId: "strat-1",
        campaignId: "c-1",
        readiness: "READY",
        reasoning: "",
        proximityScore: null,
        degradationCodes: ["MISSING_OVERTON_HYPOTHESIS"],
      })
      .mockResolvedValueOnce({
        strategyId: "strat-1",
        campaignId: "c-2",
        readiness: "READY",
        reasoning: "",
        proximityScore: null,
        degradationCodes: [],
      });

    const result = await buildOvertonRealSignalForOracle("strat-1", "op-1");

    expect(result.state).toBe("INSUFFICIENT_DATA");
    if (result.state === "INSUFFICIENT_DATA") {
      expect(result.reason).toBe("ALL_DEGRADED");
      expect(result.degradationCodes).toEqual(
        expect.arrayContaining([
          "INSUFFICIENT_SECTOR_AXIS",
          "MISSING_OVERTON_OBSERVED",
          "MISSING_OVERTON_HYPOTHESIS",
        ]),
      );
    }
  });

  it("returns OK with mean-over-measurable aggregation (null shifts NOT folded as 0)", async () => {
    campaignFindManyMock.mockResolvedValueOnce([
      { id: "c-1", name: "Camp 1" },
      { id: "c-2", name: "Camp 2" },
    ]);
    measureOvertonShiftMock
      .mockResolvedValueOnce({
        campaignId: "c-1",
        overtonShiftScore: 0.5,
        emergingTokens: [],
        sentimentDelta: null,
        degradationCodes: [],
      })
      .mockResolvedValueOnce({
        campaignId: "c-2",
        overtonShiftScore: null,
        emergingTokens: [],
        sentimentDelta: null,
        degradationCodes: ["INSUFFICIENT_SECTOR_AXIS"],
      });
    evaluateOvertonReadinessMock
      .mockResolvedValueOnce({
        strategyId: "strat-1",
        campaignId: "c-1",
        readiness: "READY",
        reasoning: "",
        proximityScore: 0.6,
        degradationCodes: [],
      })
      .mockResolvedValueOnce({
        strategyId: "strat-1",
        campaignId: "c-2",
        readiness: "READY",
        reasoning: "",
        proximityScore: null,
        degradationCodes: [],
      });

    const result = await buildOvertonRealSignalForOracle("strat-1", "op-1");

    expect(result.state).toBe("OK");
    if (result.state === "OK") {
      // P22-2 : denominator is the measurable subset (1), NOT samples.length (2).
      expect(result.measurableCampaigns).toBe(1);
      expect(result.meanShiftScore).toBe(0.5);
      expect(result.samples.length).toBe(2);
    }
  });
});
