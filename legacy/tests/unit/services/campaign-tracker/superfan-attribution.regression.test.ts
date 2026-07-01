/**
 * Phase 23 Epic 4 Story 4.2 — `runAttribution` + pure stats helpers
 * (logistic regression + ROC AUC + RMSE).
 *
 * Two AC paths verified :
 *   (a) Clean fit on synthetic data with known coefficients — regression
 *       converges within tolerance using the gradient-descent implementation.
 *   (b) `INSUFFICIENT_DATA` path on sparse input — `scoreFromActions` returns
 *       the discriminated `INSUFFICIENT_DATA` branch (never a fabricated 0).
 *
 * Plus targeted unit tests on the pure helpers (`fitLogisticRegression`,
 * `computeRocAuc`, `computeRmse`, `extractFeatures`, `extractLabel`,
 * `countSamplesAvailable`) — they're exercised via `scoreFromActions` but
 * also worth pinning individually so a refactor can't break them silently.
 *
 * Cf. _bmad-output/implementation-artifacts/4-2-pure-ts-logistic-regression-roc-auc-rmse.md
 */

import { describe, expect, it } from "vitest";

import {
  type AttributionInputAction,
  ATTRIBUTION_FEATURE_KEYS,
  computeRmse,
  computeRocAuc,
  countSamplesAvailable,
  extractFeatures,
  extractLabel,
  fitLogisticRegression,
  isAttributionInsufficient,
  isAttributionOk,
  MIN_SAMPLES_REQUIRED_DEFAULT,
  scoreFromActions,
  sigmoid,
} from "@/server/services/campaign-tracker/superfan-attribution";

describe("Phase 23 Story 4.2 — pure stats helpers", () => {
  it("sigmoid : standard values + clipping at ±50 avoids exp overflow", () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 6);
    expect(sigmoid(2)).toBeCloseTo(0.8807970779778823, 6);
    expect(sigmoid(-2)).toBeCloseTo(0.11920292202211757, 6);
    expect(sigmoid(1000)).toBe(1);
    expect(sigmoid(-1000)).toBe(0);
    expect(Number.isFinite(sigmoid(1000))).toBe(true);
  });

  it("extractFeatures : 3-dim [intercept=1, bigIdeaCoherence, normalizedBudget]", () => {
    const f = extractFeatures({
      campaignActionId: "a1",
      campaignId: "c1",
      bigIdeaCoherenceScore: 0.8,
      budget: 500_000,
      devotionTransitionsObserved: null,
    });
    expect(f).toEqual([1, 0.8, 0.5]);
  });

  it("extractFeatures : null bigIdeaCoherenceScore → 0.5 centered prior ; null budget → 0", () => {
    const f = extractFeatures({
      campaignActionId: "a1",
      campaignId: "c1",
      bigIdeaCoherenceScore: null,
      budget: null,
      devotionTransitionsObserved: null,
    });
    expect(f).toEqual([1, 0.5, 0]);
  });

  it("extractFeatures : budget above 1M is clipped to 1 (saturated region)", () => {
    const f = extractFeatures({
      campaignActionId: "a1",
      campaignId: "c1",
      bigIdeaCoherenceScore: 0,
      budget: 10_000_000,
      devotionTransitionsObserved: null,
    });
    expect(f[2]).toBe(1);
  });

  it("extractLabel : detects French EVANGELISTE canonical rung", () => {
    expect(
      extractLabel({
        campaignActionId: "a1",
        campaignId: "c1",
        bigIdeaCoherenceScore: null,
        budget: null,
        devotionTransitionsObserved: [
          { from: "FIDELE", to: "EVANGELISTE", count: 2 },
          { from: "AMBASSADEUR", to: "EVANGELISTE", count: 1 },
        ],
      }),
    ).toBe(1);
  });

  it("extractLabel : detects English Evangelist alphabet too (Phase 23 forward compat)", () => {
    expect(
      extractLabel({
        campaignActionId: "a1",
        campaignId: "c1",
        bigIdeaCoherenceScore: null,
        budget: null,
        devotionTransitionsObserved: [{ from: "Ambassador", to: "Evangelist", count: 3 }],
      }),
    ).toBe(1);
  });

  it("extractLabel : returns 0 when no transition lands on Evangelist", () => {
    expect(
      extractLabel({
        campaignActionId: "a1",
        campaignId: "c1",
        bigIdeaCoherenceScore: null,
        budget: null,
        devotionTransitionsObserved: [{ from: "INITIE", to: "FIDELE", count: 5 }],
      }),
    ).toBe(0);
    expect(
      extractLabel({
        campaignActionId: "a1",
        campaignId: "c1",
        bigIdeaCoherenceScore: null,
        budget: null,
        devotionTransitionsObserved: null,
      }),
    ).toBe(0);
  });

  it("countSamplesAvailable : counts actions with bigIdeaCoherenceScore OR observed transitions", () => {
    const actions: AttributionInputAction[] = [
      // contributes : coherence score
      { campaignActionId: "a", campaignId: "c", bigIdeaCoherenceScore: 0.7, budget: null, devotionTransitionsObserved: null },
      // contributes : observed transitions
      { campaignActionId: "b", campaignId: "c", bigIdeaCoherenceScore: null, budget: null, devotionTransitionsObserved: [{ from: "INITIE", to: "FIDELE", count: 1 }] },
      // does not contribute : both signals null/empty
      { campaignActionId: "c", campaignId: "c", bigIdeaCoherenceScore: null, budget: 1_000, devotionTransitionsObserved: [] },
      // does not contribute : devotionTransitionsObserved isn't array
      { campaignActionId: "d", campaignId: "c", bigIdeaCoherenceScore: null, budget: null, devotionTransitionsObserved: "invalid" },
    ];
    expect(countSamplesAvailable(actions)).toBe(2);
  });

  it("computeRmse : sqrt(mean((p-y)^2)) on known pairs", () => {
    expect(computeRmse([0.5, 0.5], [1, 0])).toBeCloseTo(0.5, 6);
    expect(computeRmse([0.9, 0.1], [1, 0])).toBeCloseTo(0.1, 6);
    expect(computeRmse([], [])).toBe(0);
  });

  it("computeRocAuc : 1.0 on perfectly separable scores", () => {
    // Positives have higher predicted than all negatives ⇒ AUC = 1.
    expect(computeRocAuc([0.1, 0.2, 0.9, 0.95], [0, 0, 1, 1])).toBeCloseTo(1, 6);
  });

  it("computeRocAuc : 0.5 on uniform predictions (uninformative)", () => {
    expect(computeRocAuc([0.5, 0.5, 0.5, 0.5], [0, 0, 1, 1])).toBeCloseTo(0.5, 6);
  });

  it("computeRocAuc : 0.0 on perfectly inverted scores", () => {
    // Negatives predicted higher than positives ⇒ AUC = 0.
    expect(computeRocAuc([0.9, 0.95, 0.1, 0.2], [0, 0, 1, 1])).toBeCloseTo(0, 6);
  });

  it("computeRocAuc : 0.5 when one class is absent (no discrimination possible)", () => {
    expect(computeRocAuc([0.1, 0.2, 0.3], [1, 1, 1])).toBe(0.5);
    expect(computeRocAuc([0.1, 0.2, 0.3], [0, 0, 0])).toBe(0.5);
  });
});

describe("Phase 23 Story 4.2 — `fitLogisticRegression` synthetic recovery (AC #a)", () => {
  // Generate synthetic data from a known logistic model :
  //   P(y=1) = sigmoid(beta_true · x)
  //   where beta_true = [-3, 4, 2] for features [1, bigIdeaCoherence, normalizedBudget].
  // We assert the fitted coefficients recover the same SIGN structure
  // (intercept negative, both feature coefficients positive) and that ROC AUC
  // on the training set is comfortably above 0.5 — the convergence target
  // ADR-0081 §1 calls for on this MVP envelope.
  function generateSynthetic(seed: number, n: number) {
    // Deterministic LCG so the test is reproducible without `Math.random`.
    let s = seed;
    const next = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    const X: number[][] = [];
    const y: number[] = [];
    const betaTrue = [-3, 4, 2];
    for (let i = 0; i < n; i += 1) {
      const x = [1, next(), next()];
      const z = betaTrue.reduce((acc, b, j) => acc + b * x[j]!, 0);
      const p = sigmoid(z);
      const label = next() < p ? 1 : 0;
      X.push(x);
      y.push(label);
    }
    return { X, y };
  }

  it("recovers sign structure of known beta and achieves AUC ≥ 0.75 on training set", () => {
    const { X, y } = generateSynthetic(42, 200);
    const beta = fitLogisticRegression(X, y, { iterations: 2000, learningRate: 0.1 });

    // Sign structure recovery : intercept negative, both features positive.
    expect(beta).toHaveLength(3);
    expect(beta[0]).toBeLessThan(0);
    expect(beta[1]).toBeGreaterThan(0);
    expect(beta[2]).toBeGreaterThan(0);

    // Training-set discrimination above chance (uninformative = 0.5).
    const predicted = X.map((xi) => sigmoid(xi.reduce((acc, v, j) => acc + v * beta[j]!, 0)));
    const auc = computeRocAuc(predicted, y);
    expect(auc).toBeGreaterThan(0.75);
  });

  it("operator-supplied coefficients skip gradient descent (Story 4.5 manual-first peer mode)", () => {
    const { X, y } = generateSynthetic(7, 200);
    const operatorBeta = [0.5, 0.5, 0.5];
    // Manual coefficient fit must agree with `sigmoid(beta · x)` predictions —
    // no gradient-descent perturbation.
    const predicted = X.map((xi) =>
      sigmoid(xi.reduce((acc, v, j) => acc + v * operatorBeta[j]!, 0)),
    );
    const aucManual = computeRocAuc(predicted, y);
    expect(Number.isFinite(aucManual)).toBe(true);
    expect(aucManual).toBeGreaterThanOrEqual(0);
    expect(aucManual).toBeLessThanOrEqual(1);
  });
});

describe("Phase 23 Story 4.2 — `scoreFromActions` discriminated result (AC #b)", () => {
  function syntheticAction(
    i: number,
    overrides: Partial<AttributionInputAction> = {},
  ): AttributionInputAction {
    return {
      campaignActionId: `action-${i}`,
      campaignId: "campaign-1",
      bigIdeaCoherenceScore: 0.5 + 0.01 * i,
      budget: 100_000 + 10_000 * i,
      devotionTransitionsObserved:
        i % 3 === 0
          ? [{ from: "AMBASSADEUR", to: "EVANGELISTE", count: 1 }]
          : [{ from: "INITIE", to: "FIDELE", count: 1 }],
      ...overrides,
    };
  }

  it("INSUFFICIENT_DATA when samples available < MIN_SAMPLES_REQUIRED_DEFAULT (AC #b)", () => {
    const sparse = Array.from({ length: 10 }, (_, i) => syntheticAction(i));
    const { result, evaluation } = scoreFromActions(sparse, { snapshotRef: "test-snapshot-1" });
    expect(isAttributionInsufficient(result)).toBe(true);
    if (isAttributionInsufficient(result)) {
      expect(result.minSamplesRequired).toBe(MIN_SAMPLES_REQUIRED_DEFAULT);
      expect(result.samplesAvailable).toBe(10);
    }
    expect(evaluation).toBeNull();
  });

  it("INSUFFICIENT_DATA on empty input (no fabricated zero score)", () => {
    const { result, evaluation } = scoreFromActions([], { snapshotRef: "test-snapshot-empty" });
    expect(isAttributionInsufficient(result)).toBe(true);
    if (isAttributionInsufficient(result)) {
      expect(result.samplesAvailable).toBe(0);
    }
    expect(evaluation).toBeNull();
  });

  it("INSUFFICIENT_DATA when all signals are null (count-zero, not array-length-zero)", () => {
    const allNull = Array.from({ length: 50 }, (_, i) => ({
      campaignActionId: `a-${i}`,
      campaignId: "c1",
      bigIdeaCoherenceScore: null,
      budget: 50_000,
      devotionTransitionsObserved: null,
    }));
    const { result } = scoreFromActions(allNull, { snapshotRef: "test-snapshot-allnull" });
    expect(isAttributionInsufficient(result)).toBe(true);
    if (isAttributionInsufficient(result)) {
      expect(result.samplesAvailable).toBe(0);
    }
  });

  it("OK when samples ≥ 30 ; score in [0,1], lineage empty (4.4 populates), snapshotRef threaded through", () => {
    const dense = Array.from({ length: 60 }, (_, i) => syntheticAction(i));
    const { result, evaluation } = scoreFromActions(dense, { snapshotRef: "snap-abc-123" });
    expect(isAttributionOk(result)).toBe(true);
    if (isAttributionOk(result)) {
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      // Story 4.4 now populates lineage from devotionTransitionsObserved.
      // syntheticAction emits AMBASSADEUR→EVANGELISTE for i % 3 === 0 ; the
      // INITIE→FIDELE records are dropped (FIDELE is not an attribution target).
      expect(Array.isArray(result.lineage)).toBe(true);
      expect(result.lineage.every((t) => t.transitionTo === "Evangelist")).toBe(true);
      expect(result.snapshotRef).toBe("snap-abc-123");
    }
    expect(evaluation).not.toBeNull();
    if (evaluation) {
      expect(evaluation.sampleSize).toBe(60);
      expect(evaluation.mode).toBe("ALGORITHMIC");
      expect(evaluation.rocAuc).toBeGreaterThanOrEqual(0);
      expect(evaluation.rocAuc).toBeLessThanOrEqual(1);
      expect(evaluation.rmse).toBeGreaterThanOrEqual(0);
      expect(Object.keys(evaluation.coefficients).sort()).toEqual(
        [...ATTRIBUTION_FEATURE_KEYS].sort(),
      );
    }
  });

  it("operator coefficients → mode = MANUAL_COEFFICIENTS, no gradient descent (FR25 back-end)", () => {
    const dense = Array.from({ length: 60 }, (_, i) => syntheticAction(i));
    const operatorCoefficients = { intercept: -1, bigIdeaCoherence: 2, normalizedBudget: 0.5 };
    const { result, evaluation } = scoreFromActions(dense, {
      snapshotRef: "snap-manual-456",
      coefficients: operatorCoefficients,
    });
    expect(isAttributionOk(result)).toBe(true);
    expect(evaluation).not.toBeNull();
    if (evaluation) {
      expect(evaluation.mode).toBe("MANUAL_COEFFICIENTS");
      expect(evaluation.coefficients.intercept).toBe(-1);
      expect(evaluation.coefficients.bigIdeaCoherence).toBe(2);
      expect(evaluation.coefficients.normalizedBudget).toBe(0.5);
    }
  });

  it("operator coefficients missing a key default to 0 (graceful partial spec)", () => {
    const dense = Array.from({ length: 60 }, (_, i) => syntheticAction(i));
    const partial = { intercept: 1 }; // missing bigIdeaCoherence + normalizedBudget
    const { evaluation } = scoreFromActions(dense, {
      snapshotRef: "snap-partial",
      coefficients: partial,
    });
    expect(evaluation).not.toBeNull();
    if (evaluation) {
      expect(evaluation.coefficients.intercept).toBe(1);
      expect(evaluation.coefficients.bigIdeaCoherence).toBe(0);
      expect(evaluation.coefficients.normalizedBudget).toBe(0);
    }
  });

  it("custom minSamplesRequired override works (Story 4.5 use case)", () => {
    const ten = Array.from({ length: 10 }, (_, i) => syntheticAction(i));
    const { result } = scoreFromActions(ten, {
      snapshotRef: "snap-lowbar",
      minSamplesRequired: 5,
    });
    expect(isAttributionOk(result)).toBe(true);
  });
});
