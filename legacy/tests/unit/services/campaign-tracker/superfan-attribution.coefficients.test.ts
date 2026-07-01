/**
 * Phase 23 Epic 4 Story 4.5 — manual coefficient-entry back-end mode
 * (FR25 peer to FR6, ADR-0060 parity).
 *
 * AC coverage :
 *   - `attributionCoefficientsSchema` equals the runtime `coefficients` shape
 *     (keyed by ATTRIBUTION_FEATURE_KEYS) — not a parallel schema.
 *   - both code paths (manual coefficients vs auto fit) return the same
 *     `AttributionResult.OK` shape — the parity invariant (downstream readers
 *     can't distinguish except via `AttributionEvaluation.mode`).
 *   - `persistAttributionCoefficients` writes `Campaign.attributionCoefficients`
 *     after validation + tenant guard ; discriminated REJECTED on bad input.
 *   - `loadAttributionCoefficients` reads + validates ; null on absent/malformed.
 *
 * Cf. _bmad-output/implementation-artifacts/4-5-manual-coefficient-entry-mode.md
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const campaignFindUniqueMock = vi.fn();
const campaignUpdateMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    campaign: {
      findUnique: (...args: unknown[]) => campaignFindUniqueMock(...args),
      update: (...args: unknown[]) => campaignUpdateMock(...args),
    },
  },
}));

import {
  type AttributionInputAction,
  ATTRIBUTION_FEATURE_KEYS,
  attributionCoefficientsSchema,
  isAttributionOk,
  loadAttributionCoefficients,
  persistAttributionCoefficients,
  scoreFromActions,
} from "@/server/services/campaign-tracker/superfan-attribution";

describe("Phase 23 Story 4.5 — attributionCoefficientsSchema equals the coefficients shape", () => {
  it("accepts a full coefficient record keyed by ATTRIBUTION_FEATURE_KEYS", () => {
    const full = { intercept: -1, bigIdeaCoherence: 2, normalizedBudget: 0.5 };
    expect(attributionCoefficientsSchema.safeParse(full).success).toBe(true);
  });

  it("accepts a partial record (missing keys default to 0 at the runtime)", () => {
    expect(attributionCoefficientsSchema.safeParse({ intercept: 1 }).success).toBe(true);
    expect(attributionCoefficientsSchema.safeParse({}).success).toBe(true);
  });

  it("rejects unknown keys (not part of the feature alphabet)", () => {
    const bad = attributionCoefficientsSchema.safeParse({ intercept: 1, bogusFeature: 5 });
    expect(bad.success).toBe(false);
  });

  it("rejects non-finite / non-number values (NaN, Infinity, string)", () => {
    expect(attributionCoefficientsSchema.safeParse({ intercept: Number.NaN }).success).toBe(false);
    expect(attributionCoefficientsSchema.safeParse({ intercept: Number.POSITIVE_INFINITY }).success).toBe(false);
    expect(attributionCoefficientsSchema.safeParse({ intercept: "1" as unknown as number }).success).toBe(false);
  });

  it("schema keys exactly match ATTRIBUTION_FEATURE_KEYS (single source of truth)", () => {
    // A coefficient record keyed by every feature key must validate ; this
    // pins the schema to the runtime alphabet so the Epic 6 form can't drift.
    const allKeys = Object.fromEntries(ATTRIBUTION_FEATURE_KEYS.map((k) => [k, 1]));
    expect(attributionCoefficientsSchema.safeParse(allKeys).success).toBe(true);
  });
});

describe("Phase 23 Story 4.5 — manual vs auto path return identical AttributionResult.OK shape", () => {
  function denseWindow(): AttributionInputAction[] {
    return Array.from({ length: 50 }, (_, i) => ({
      campaignActionId: `a-${i}`,
      campaignId: "c1",
      bigIdeaCoherenceScore: 0.5 + 0.005 * i,
      budget: 200_000,
      devotionTransitionsObserved:
        i % 5 === 0 ? [{ from: "AMBASSADEUR", to: "EVANGELISTE", count: 1 }] : [],
      observedAt: "2026-05-28T00:00:00.000Z",
    }));
  }

  it("OK shape is structurally identical (same keys) for manual + auto", () => {
    const window = denseWindow();
    const auto = scoreFromActions(window, { snapshotRef: "snap-auto" });
    const manual = scoreFromActions(window, {
      snapshotRef: "snap-manual",
      coefficients: { intercept: -1, bigIdeaCoherence: 2, normalizedBudget: 0.5 },
    });

    expect(isAttributionOk(auto.result)).toBe(true);
    expect(isAttributionOk(manual.result)).toBe(true);
    if (isAttributionOk(auto.result) && isAttributionOk(manual.result)) {
      // Downstream readers see the same OK shape — the parity invariant.
      expect(Object.keys(auto.result).sort()).toEqual(Object.keys(manual.result).sort());
      expect(Object.keys(auto.result).sort()).toEqual(["lineage", "score", "snapshotRef", "state"]);
    }
  });

  it("only the evaluation.mode discriminator distinguishes the two paths", () => {
    const window = denseWindow();
    const auto = scoreFromActions(window, { snapshotRef: "s1" });
    const manual = scoreFromActions(window, {
      snapshotRef: "s2",
      coefficients: { intercept: 0, bigIdeaCoherence: 1, normalizedBudget: 0 },
    });
    expect(auto.evaluation?.mode).toBe("ALGORITHMIC");
    expect(manual.evaluation?.mode).toBe("MANUAL_COEFFICIENTS");
  });
});

describe("Phase 23 Story 4.5 — persistAttributionCoefficients", () => {
  afterEach(() => {
    campaignFindUniqueMock.mockReset();
    campaignUpdateMock.mockReset();
  });

  it("validates + tenant-guards + writes Campaign.attributionCoefficients", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce({ id: "c1", strategyId: "s1" });
    campaignUpdateMock.mockResolvedValueOnce({});

    const result = await persistAttributionCoefficients({
      strategyId: "s1",
      campaignId: "c1",
      coefficients: { intercept: -1, bigIdeaCoherence: 2, normalizedBudget: 0.5 },
    });

    expect(result.state).toBe("OK");
    if (result.state === "OK") {
      expect(result.coefficients).toEqual({ intercept: -1, bigIdeaCoherence: 2, normalizedBudget: 0.5 });
    }
    expect(campaignUpdateMock).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { attributionCoefficients: { intercept: -1, bigIdeaCoherence: 2, normalizedBudget: 0.5 } },
    });
  });

  it("REJECTED / INVALID_COEFFICIENTS on bad input — no DB write", async () => {
    const result = await persistAttributionCoefficients({
      strategyId: "s1",
      campaignId: "c1",
      coefficients: { bogus: 5 },
    });
    expect(result.state).toBe("REJECTED");
    if (result.state === "REJECTED") expect(result.reason).toBe("INVALID_COEFFICIENTS");
    expect(campaignFindUniqueMock).not.toHaveBeenCalled();
    expect(campaignUpdateMock).not.toHaveBeenCalled();
  });

  it("REJECTED / CAMPAIGN_NOT_FOUND when campaign missing", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce(null);
    const result = await persistAttributionCoefficients({
      strategyId: "s1",
      campaignId: "missing",
      coefficients: { intercept: 1 },
    });
    expect(result.state).toBe("REJECTED");
    if (result.state === "REJECTED") expect(result.reason).toBe("CAMPAIGN_NOT_FOUND");
    expect(campaignUpdateMock).not.toHaveBeenCalled();
  });

  it("REJECTED / TENANT_MISMATCH when campaign belongs to another strategy", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce({ id: "c1", strategyId: "other" });
    const result = await persistAttributionCoefficients({
      strategyId: "s1",
      campaignId: "c1",
      coefficients: { intercept: 1 },
    });
    expect(result.state).toBe("REJECTED");
    if (result.state === "REJECTED") expect(result.reason).toBe("TENANT_MISMATCH");
    expect(campaignUpdateMock).not.toHaveBeenCalled();
  });
});

describe("Phase 23 Story 4.5 — loadAttributionCoefficients", () => {
  afterEach(() => {
    campaignFindUniqueMock.mockReset();
  });

  it("returns parsed coefficients when stored + valid", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce({
      attributionCoefficients: { intercept: -1, bigIdeaCoherence: 2 },
    });
    const loaded = await loadAttributionCoefficients("c1");
    expect(loaded).toEqual({ intercept: -1, bigIdeaCoherence: 2 });
  });

  it("returns null when none stored", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce({ attributionCoefficients: null });
    expect(await loadAttributionCoefficients("c1")).toBeNull();
  });

  it("returns null (defensive) when stored value is malformed — no garbage into regression", async () => {
    campaignFindUniqueMock.mockResolvedValueOnce({
      attributionCoefficients: { bogusKey: "not-a-number" },
    });
    expect(await loadAttributionCoefficients("c1")).toBeNull();
  });
});
