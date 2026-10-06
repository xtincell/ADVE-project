import { describe, expect, it } from "vitest";
import { normalizedPerformance, evaluatePattern, annotationSchema, declaredCompetitorNames, type Observation, type RecipeInput } from "@/domain/creative-intelligence";

const sample = (i: number, value = 100): Observation => ({ specimenId: `p${i}`, metricId: `m${i}`, accountId: "one", platform: "TIKTOK", format: "SHORT_VIDEO", sector: "food", countryCode: "CI", publishedAt: new Date(`2026-09-${String(i + 1).padStart(2, "0")}T00:00:00Z`), observedAt: new Date(`2026-09-${String(i + 2).padStart(2, "0")}T00:00:00Z`), value, paidStatus: "ORGANIC" });
const annotation = annotationSchema.parse({ hook: "RESULT_FIRST", narrative: "TRANSFORMATION", visual: "MACRO", socialDriver: "UTILITY", evidence: ["hook", "narrative", "visual", "socialDriver"].map(field => ({ field, observation: "Observation dans la source", confidence: "MEDIUM" })) });
const input: RecipeInput = { sector: "food", countryCode: "CI", platform: "TIKTOK", format: "SHORT_VIDEO", hook: "RESULT_FIRST", narrative: "TRANSFORMATION", visual: "MACRO", metric: "views", asOf: new Date("2026-10-01") };

describe("creative normalization", () => {
  it("uses preceding same-account, same-age observations, with a reproducible baseline", () => {
    const prior = [0, 1, 2, 3, 4].map(i => sample(i));
    const target = sample(6, 500);
    expect(normalizedPerformance(target, [...prior, target, sample(7, 9000)])).toMatchObject({ ratio: 5, n: 5, expected: 100, baselineMetricIds: prior.toReversed().map(o => o.metricId) });
  });
  it("never turns missing, zero denominators or paid exposure into performance evidence", () => {
    const prior = [0, 1, 2, 3, 4].map(i => sample(i));
    expect(normalizedPerformance({ ...sample(6), value: null }, prior).ratio).toBeNull();
    expect(normalizedPerformance({ ...sample(6), paidStatus: "UNKNOWN" }, prior).ratio).toBeNull();
    expect(normalizedPerformance(sample(6), prior.map(p => ({ ...p, value: 0 }))).reason).toBe("ZERO_BASELINE");
    expect(normalizedPerformance(sample(6, 0), prior).ratio).toBe(0);
  });
  it("requires five different comparable posts, excluding future snapshots and contexts", () => {
    const prior = [0, 1, 2, 3, 4].map(i => sample(i));
    expect(normalizedPerformance(sample(6), Array(10).fill(prior[0])).reason).toBe("INSUFFICIENT_BASELINE");
    for (const changes of [{ accountId: "another" }, { countryCode: "FR" }, { sector: "tech" }, { format: "IMAGE" }, { platform: "YOUTUBE" }, { observedAt: new Date("2026-10-01") }]) {
      expect(normalizedPerformance(sample(6), prior.map(p => ({ ...p, ...changes }))).ratio).toBeNull();
    }
  });
  it("cannot inflate a baseline by importing public and private copies of the same native posts", () => {
    const twoNativePosts = [0, 1].map(i => ({ ...sample(i), externalId: `native-${i}` }));
    const copies = twoNativePosts.flatMap(o => Array.from({ length: 4 }, (_, i) => ({ ...o, specimenId: `${o.specimenId}-copy-${i}` })));
    expect(normalizedPerformance(sample(6), copies)).toMatchObject({ ratio: null, n: 2, reason: "INSUFFICIENT_BASELINE" });
  });
});

describe("empirical patterns", () => {
  it("retains matching losers and nonmatching controls; one account cannot justify observed status", () => {
    const corpus = Array.from({ length: 18 }, (_, i) => ({ ...sample(i, i >= 6 && i % 2 === 0 ? 50 : 100), analysisId: `a${i}`, annotation: { ...annotation, hook: i % 2 === 0 ? "RESULT_FIRST" as const : "QUESTION" as const } }));
    const evaluated = evaluatePattern(input, corpus);
    expect(evaluated.status).toBe("CANDIDATE");
    expect(evaluated.examples.n).toBeGreaterThan(0);
    expect(evaluated.controls.n).toBeGreaterThan(0);
    expect(evaluated.evidence.some(e => e.role === "EXAMPLE" && e.observedRatio! < 1)).toBe(true);
    expect(evaluated.holdout.validation.examples.n + evaluated.holdout.training.examples.n).toBe(evaluated.examples.n);
  });
  it("counts adoption in the observed corpus without inventing market saturation", () => {
    const evaluated = evaluatePattern(input, []);
    expect(evaluated.coverage.observedContents).toBe(0);
    expect(evaluated.trend.every(t => t.adoptionInObservedCorpus === null)).toBe(true);
    expect(evaluated.examples.medianRatio).toBeNull();
  });
  it("rejects unsupported annotations and time intervals", () => {
    expect(annotationSchema.safeParse({ ...annotation, evidence: annotation.evidence.slice(0, 1) }).success).toBe(false);
    expect(annotationSchema.safeParse({ ...annotation, durationSeconds: 5, evidence: annotation.evidence.map(e => ({ ...e, startSeconds: 6 })) }).success).toBe(false);
  });
  it("reads both established competitive pillar shapes without changing them", () => {
    const pillar = { concurrents: ["Alpha"], paysageConcurrentiel: [{ nom: "Beta" }, { name: "Alpha" }] };
    expect(declaredCompetitorNames(pillar)).toEqual(["Alpha", "Beta"]);
    expect(pillar.concurrents).toEqual(["Alpha"]);
  });
});
