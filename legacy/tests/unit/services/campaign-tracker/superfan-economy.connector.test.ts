/**
 * Phase 23 Epic 4 Story 4.3 — superfan-economy CRM connector wiring tests.
 *
 * Coverage matrix (per AC #7) :
 *   measureDevotionStickinessCohort :
 *     (a) LIVE all three windows → OK with J30/J90/J180 snapshots
 *     (b) DEFERRED_AWAITING_CREDENTIALS → INSUFFICIENT_DATA
 *     (c) DEGRADED (each of 4 reasons) → INSUFFICIENT_DATA + mapped reason
 *     (d) WINDOW_NOT_REACHED (campaign too recent) → INSUFFICIENT_DATA
 *     (e) CAMPAIGN_NOT_FOUND defensive
 *     (f) TENANT_MISMATCH defensive
 *
 *   captureSuperfansFromCampaign :
 *     (a) LIVE → OK with localEvangelistCount + crmCohortSize
 *     (b) DEFERRED → INSUFFICIENT_DATA, local count preserved on branch
 *     (c) DEGRADED → INSUFFICIENT_DATA + mapped reason, local count preserved
 *     (d) NO_EVANGELISTS_DETECTED short-circuit (skips CRM call)
 *     (e) CAMPAIGN_NOT_FOUND / TENANT_MISMATCH defensive
 *
 * Validates the P22-1 exhaustive-switch invariant + the P22-2 typed-reason
 * invariant for the Phase 23 superfan-stickiness + crmCapture sub-clusters.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const campaignFindUniqueMock = vi.fn();
const fetchCohortSignalMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    campaign: {
      findUnique: (...args: unknown[]) => campaignFindUniqueMock(...args),
    },
  },
}));

vi.mock("@/server/services/anubis/providers/crm-provider", () => ({
  fetchCohortSignal: (...args: unknown[]) => fetchCohortSignalMock(...args),
}));

import {
  captureSuperfansFromCampaign,
  measureDevotionStickinessCohort,
} from "@/server/services/campaign-tracker/superfan-economy";

const OP = "op-1";
const STRAT = "strat-1";
const CAMP = "camp-1";

function liveSignal(cohortSize = 100, retained = 60, observedAt = "2026-05-28T10:00:00.000Z") {
  return {
    state: "LIVE" as const,
    data: {
      cohortSize,
      retained,
      retentionRate: retained / cohortSize,
      cohortTokens: [],
      cohortStartedAt: "2026-01-01T00:00:00.000Z",
      windowAt: observedAt,
    },
    observedAt,
  };
}

const stickinessCampaign = (overrides: Record<string, unknown> = {}) => ({
  id: CAMP,
  code: "fast-campaign",
  strategyId: STRAT,
  // endDate well in the past so all three windows are reachable from `asOf` defaults.
  endDate: new Date("2025-01-01T00:00:00.000Z"),
  ...overrides,
});

const captureCampaign = (
  evangelistsPerAction: number,
  overrides: Record<string, unknown> = {},
) => ({
  id: CAMP,
  code: "capture-campaign",
  strategyId: STRAT,
  actions: [
    {
      devotionTransitionsObserved: [
        { from: "AMBASSADEUR", to: "EVANGELISTE", count: evangelistsPerAction },
      ],
    },
  ],
  ...overrides,
});

describe("measureDevotionStickinessCohort — Phase 23 Story 4.3 (P22-1 + P22-2)", () => {
  afterEach(() => {
    campaignFindUniqueMock.mockReset();
    fetchCohortSignalMock.mockReset();
  });

  it("(a) all three windows LIVE → OK with J30/J90/J180 snapshots", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce(stickinessCampaign());
    fetchCohortSignalMock
      .mockResolvedValueOnce(liveSignal(100, 80))
      .mockResolvedValueOnce(liveSignal(100, 70))
      .mockResolvedValueOnce(liveSignal(100, 60));

    const result = await measureDevotionStickinessCohort({
      operatorId: OP,
      strategyId: STRAT,
      campaignId: CAMP,
    });

    expect(result.state).toBe("OK");
    if (result.state === "OK") {
      expect(result.J30.retentionRate).toBeCloseTo(0.8);
      expect(result.J90.retentionRate).toBeCloseTo(0.7);
      expect(result.J180.retentionRate).toBeCloseTo(0.6);
      expect(result.campaignId).toBe(CAMP);
    }
    expect(fetchCohortSignalMock).toHaveBeenCalledTimes(3);
    expect(fetchCohortSignalMock).toHaveBeenNthCalledWith(1, OP, CAMP, "J+30");
    expect(fetchCohortSignalMock).toHaveBeenNthCalledWith(2, OP, CAMP, "J+90");
    expect(fetchCohortSignalMock).toHaveBeenNthCalledWith(3, OP, CAMP, "J+180");
  });

  it("(b) DEFERRED_AWAITING_CREDENTIALS on J+30 → INSUFFICIENT_DATA, no fabricated retention", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce(stickinessCampaign());
    fetchCohortSignalMock.mockResolvedValueOnce({
      state: "DEFERRED_AWAITING_CREDENTIALS",
      connectorId: "crm-provider",
    });

    const result = await measureDevotionStickinessCohort({
      operatorId: OP,
      strategyId: STRAT,
      campaignId: CAMP,
    });

    expect(result.state).toBe("INSUFFICIENT_DATA");
    if (result.state === "INSUFFICIENT_DATA") {
      expect(result.reason).toBe("DEFERRED_AWAITING_CREDENTIALS");
    }
    // Short-circuit : second window not attempted once first is non-LIVE.
    expect(fetchCohortSignalMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["INSUFFICIENT_DATA", "DEGRADED_INSUFFICIENT_DATA"],
    ["VENDOR_OUTAGE", "DEGRADED_VENDOR_OUTAGE"],
    ["RATE_LIMITED", "DEGRADED_RATE_LIMITED"],
    ["AUTH_REVOKED", "DEGRADED_AUTH_REVOKED"],
  ] as const)(
    "(c) DEGRADED reason %s → INSUFFICIENT_DATA with mapped reason %s",
    async (degradationReason, expectedReason) => {
      campaignFindUniqueMock.mockResolvedValueOnce(stickinessCampaign());
      fetchCohortSignalMock.mockResolvedValueOnce({
        state: "DEGRADED",
        reason: degradationReason,
      });

      const result = await measureDevotionStickinessCohort({
        operatorId: OP,
        strategyId: STRAT,
        campaignId: CAMP,
      });

      expect(result.state).toBe("INSUFFICIENT_DATA");
      if (result.state === "INSUFFICIENT_DATA") {
        expect(result.reason).toBe(expectedReason);
      }
    },
  );

  it("(d) WINDOW_NOT_REACHED (campaign too recent) → INSUFFICIENT_DATA with nextReachableAt", async () => {
    // endDate is yesterday ; even J+30 isn't reachable.
    const recent = new Date();
    recent.setDate(recent.getDate() - 1);
    campaignFindUniqueMock.mockResolvedValueOnce(stickinessCampaign({ endDate: recent }));

    const result = await measureDevotionStickinessCohort({
      operatorId: OP,
      strategyId: STRAT,
      campaignId: CAMP,
    });

    expect(result.state).toBe("INSUFFICIENT_DATA");
    if (result.state === "INSUFFICIENT_DATA") {
      expect(result.reason).toBe("WINDOW_NOT_REACHED");
      expect(result.nextReachableAt).toBeDefined();
    }
    expect(fetchCohortSignalMock).not.toHaveBeenCalled();
  });

  it("(e) CAMPAIGN_NOT_FOUND defensive (no Prisma exception path)", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce(null);

    const result = await measureDevotionStickinessCohort({
      operatorId: OP,
      strategyId: STRAT,
      campaignId: "nonexistent",
    });

    expect(result.state).toBe("INSUFFICIENT_DATA");
    if (result.state === "INSUFFICIENT_DATA") {
      expect(result.reason).toBe("CAMPAIGN_NOT_FOUND");
    }
    expect(fetchCohortSignalMock).not.toHaveBeenCalled();
  });

  it("(f) TENANT_MISMATCH defensive (campaign exists but belongs to another strategy)", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce(stickinessCampaign({ strategyId: "other-strat" }));

    const result = await measureDevotionStickinessCohort({
      operatorId: OP,
      strategyId: STRAT,
      campaignId: CAMP,
    });

    expect(result.state).toBe("INSUFFICIENT_DATA");
    if (result.state === "INSUFFICIENT_DATA") {
      expect(result.reason).toBe("TENANT_MISMATCH");
    }
    expect(fetchCohortSignalMock).not.toHaveBeenCalled();
  });
});

describe("captureSuperfansFromCampaign — Phase 23 Story 4.3 (P22-1 + P22-2)", () => {
  afterEach(() => {
    campaignFindUniqueMock.mockReset();
    fetchCohortSignalMock.mockReset();
  });

  it("(a) LIVE → OK with both local + CRM counts", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce(captureCampaign(5));
    fetchCohortSignalMock.mockResolvedValueOnce(liveSignal(42, 30));

    const result = await captureSuperfansFromCampaign({
      operatorId: OP,
      strategyId: STRAT,
      campaignId: CAMP,
    });

    expect(result.state).toBe("OK");
    if (result.state === "OK") {
      expect(result.localEvangelistCount).toBe(5);
      expect(result.crmCohortSize).toBe(42);
      expect(result.segmentName).toBe("superfans-capture-campaign");
    }
    expect(fetchCohortSignalMock).toHaveBeenCalledWith(OP, CAMP, "J+30");
  });

  it("(b) DEFERRED → INSUFFICIENT_DATA, local count preserved on branch", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce(captureCampaign(7));
    fetchCohortSignalMock.mockResolvedValueOnce({
      state: "DEFERRED_AWAITING_CREDENTIALS",
      connectorId: "crm-provider",
    });

    const result = await captureSuperfansFromCampaign({
      operatorId: OP,
      strategyId: STRAT,
      campaignId: CAMP,
    });

    expect(result.state).toBe("INSUFFICIENT_DATA");
    if (result.state === "INSUFFICIENT_DATA") {
      expect(result.reason).toBe("DEFERRED_AWAITING_CREDENTIALS");
      expect(result.localEvangelistCount).toBe(7); // observable even without CRM
      expect(result.segmentName).toBe("superfans-capture-campaign");
    }
  });

  it.each([
    ["INSUFFICIENT_DATA", "DEGRADED_INSUFFICIENT_DATA"],
    ["VENDOR_OUTAGE", "DEGRADED_VENDOR_OUTAGE"],
    ["RATE_LIMITED", "DEGRADED_RATE_LIMITED"],
    ["AUTH_REVOKED", "DEGRADED_AUTH_REVOKED"],
  ] as const)(
    "(c) DEGRADED %s → INSUFFICIENT_DATA + mapped reason %s, local count preserved",
    async (degradationReason, expectedReason) => {
      campaignFindUniqueMock.mockResolvedValueOnce(captureCampaign(3));
      fetchCohortSignalMock.mockResolvedValueOnce({
        state: "DEGRADED",
        reason: degradationReason,
      });

      const result = await captureSuperfansFromCampaign({
        operatorId: OP,
        strategyId: STRAT,
        campaignId: CAMP,
      });

      expect(result.state).toBe("INSUFFICIENT_DATA");
      if (result.state === "INSUFFICIENT_DATA") {
        expect(result.reason).toBe(expectedReason);
        expect(result.localEvangelistCount).toBe(3);
      }
    },
  );

  it("(d) NO_EVANGELISTS_DETECTED short-circuit — CRM call skipped on empty local count", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce(captureCampaign(0));

    const result = await captureSuperfansFromCampaign({
      operatorId: OP,
      strategyId: STRAT,
      campaignId: CAMP,
    });

    expect(result.state).toBe("INSUFFICIENT_DATA");
    if (result.state === "INSUFFICIENT_DATA") {
      expect(result.reason).toBe("NO_EVANGELISTS_DETECTED");
      expect(result.localEvangelistCount).toBe(0);
    }
    expect(fetchCohortSignalMock).not.toHaveBeenCalled();
  });

  it("(e1) CAMPAIGN_NOT_FOUND defensive", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce(null);
    const result = await captureSuperfansFromCampaign({
      operatorId: OP,
      strategyId: STRAT,
      campaignId: "nope",
    });
    expect(result.state).toBe("INSUFFICIENT_DATA");
    if (result.state === "INSUFFICIENT_DATA") {
      expect(result.reason).toBe("CAMPAIGN_NOT_FOUND");
    }
  });

  it("(e2) TENANT_MISMATCH defensive", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce(captureCampaign(2, { strategyId: "other-strat" }));
    const result = await captureSuperfansFromCampaign({
      operatorId: OP,
      strategyId: STRAT,
      campaignId: CAMP,
    });
    expect(result.state).toBe("INSUFFICIENT_DATA");
    if (result.state === "INSUFFICIENT_DATA") {
      expect(result.reason).toBe("TENANT_MISMATCH");
    }
  });

  it("(f) FIDELE transitions also count toward local evangelist tally (Phase 19 LTV semantic preserved)", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce({
      id: CAMP,
      code: "fidele-mix",
      strategyId: STRAT,
      actions: [
        {
          devotionTransitionsObserved: [
            { from: "AMBASSADEUR", to: "EVANGELISTE", count: 2 },
            { from: "ENGAGE", to: "FIDELE", count: 3 },
            { from: "INITIE", to: "PARTICIPANT", count: 10 }, // ignored
          ],
        },
      ],
    });
    fetchCohortSignalMock.mockResolvedValueOnce(liveSignal(50, 40));

    const result = await captureSuperfansFromCampaign({
      operatorId: OP,
      strategyId: STRAT,
      campaignId: CAMP,
    });

    expect(result.state).toBe("OK");
    if (result.state === "OK") {
      expect(result.localEvangelistCount).toBe(5); // 2 EVANGELISTE + 3 FIDELE
      expect(result.crmCohortSize).toBe(50);
    }
  });
});

describe("childAdr 0081 propagation — capability-state registry (P22-7)", () => {
  it("superfan.attribution + .stickiness + .crmCapture all reference ADR-0081", async () => {
    const { CLUSTER_BY_SLUG } = await import(
      "@/server/services/campaign-tracker/capability-state"
    );
    expect(CLUSTER_BY_SLUG.get("superfan.attribution")?.childAdr).toBe("0081");
    expect(CLUSTER_BY_SLUG.get("superfan.stickiness")?.childAdr).toBe("0081");
    expect(CLUSTER_BY_SLUG.get("superfan.crmCapture")?.childAdr).toBe("0081");
  });

  it("no childAdr points at a phantom 0053-0057 slug (P22-7 retirement)", async () => {
    const { CLUSTER_CAPABILITIES } = await import(
      "@/server/services/campaign-tracker/capability-state"
    );
    // The 5 retired phantom ADRs share the 0053-0057 number range with a kebab
    // suffix. Legit childAdr pointers (bare numbers like "0081", or other planned
    // ADRs in the 0052-x / 0058 range) are untouched. Pattern, not literal slug,
    // so this test file stays clean for the global phase22-no-dangling-adr-refs scan.
    for (const cap of CLUSTER_CAPABILITIES) {
      if (cap.childAdr !== undefined) {
        expect(cap.childAdr).not.toMatch(/^005[3-7]-/);
      }
    }
  });
});
