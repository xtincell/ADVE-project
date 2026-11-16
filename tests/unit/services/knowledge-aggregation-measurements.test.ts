import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ entries: vi.fn(), signals: vi.fn(), strategies: vi.fn(), intake: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  knowledgeEntry: { findMany: mocks.entries, upsert: mocks.upsert, updateMany: mocks.updateMany },
  signal: { findMany: mocks.signals },
  strategy: { findMany: mocks.strategies },
  quickIntake: { findFirst: mocks.intake },
} }));
vi.mock("@prisma/client", () => ({ Prisma: { JsonNull: "JsonNull", DbNull: "DbNull" } }));

import {
  aggregateBriefPatterns,
  aggregateFrameworkRankings,
  aggregateSectorBenchmarks,
  getBriefPatterns,
  getCreatorPatterns,
  getFrameworkRankings,
  getSectorBenchmarks,
  ingestMediaPerformance,
} from "@/server/services/knowledge-aggregator";
import { enrichBrief, queryReferences } from "@/server/services/seshat/references";
import { socialMetricEvidence } from "@/domain/social-metric-evidence";

function reported(data: Record<string, unknown>, source: "DECLARED" | "SIGNED_WEBHOOK" = "DECLARED") {
  const evidence = socialMetricEvidence(data, ["engagement", "clicks"], source);
  return { data: { ...data, ...evidence.receipt } };
}

const mediaMetricCases: Record<string, number>[] = [
  {}, { engagementRate: 0 }, { ctr: 0.1 }, { roas: 4 },
  { engagementRate: 0.2, ctr: 0.05, roas: 8 },
];

beforeEach(() => {
  vi.resetAllMocks();
  mocks.entries.mockResolvedValue([]);
  mocks.signals.mockResolvedValue([]);
  mocks.strategies.mockResolvedValue([]);
  mocks.intake.mockResolvedValue(null);
  mocks.upsert.mockImplementation(async (input) => input.create);
  mocks.updateMany.mockResolvedValue({ count: 0 });
});

describe("Knowledge aggregation preserves missing measurements", () => {
  it("excludes missing framework scores from both persisted and direct rankings", async () => {
    mocks.entries.mockResolvedValue([
      { data: { framework: "measured" }, successScore: 0, sector: "food" },
      { data: { framework: "measured" }, successScore: 0.8, sector: "food" },
      { data: { framework: "measured" }, successScore: null, sector: "food" },
      { data: { framework: "unknown" }, successScore: null, sector: null },
      { data: { framework: "unknown" }, successScore: Number.NaN, sector: null },
    ]);

    await aggregateFrameworkRankings();
    const stored = mocks.upsert.mock.calls[0]![0];
    expect(stored.create.data.rankings).toEqual([
      { framework: "measured", effectiveness: 0.4, usageCount: 3, observedCount: 2, missingCount: 1 },
      { framework: "unknown", effectiveness: null, usageCount: 2, observedCount: 0, missingCount: 2 },
    ]);
    expect(stored.update.data).toEqual(stored.create.data);
    expect(await getFrameworkRankings()).toEqual([
      { framework: "measured", avgScore: 0.4, usageCount: 3, observedCount: 2, missingCount: 1, sectors: ["food"] },
      { framework: "unknown", avgScore: null, usageCount: 2, observedCount: 0, missingCount: 2, sectors: [] },
    ]);
  });

  it("clears the persisted ranking when no diagnostic remains", async () => {
    expect(await aggregateFrameworkRankings()).toBe(0);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ data: expect.objectContaining({ rankings: [] }) }),
    }));
  });

  it("does not mix clicks into engagement and reports each denominator", async () => {
    mocks.signals.mockResolvedValue([
      reported({ platform: "INSTAGRAM", engagement: 0, clicks: 100 }),
      { data: { platform: "INSTAGRAM", engagement: 30 } },
      { data: { platform: "INSTAGRAM", engagement: 60, clicks: 200 } },
      { data: { platform: "INSTAGRAM", clicks: 300 } },
      { data: { platform: "INSTAGRAM" } },
      { data: { platform: "INSTAGRAM", engagement: "900", clicks: -1 } },
    ]);
    expect(await aggregateBriefPatterns()).toBe(1);
    const stored = mocks.upsert.mock.calls[0]![0];
    expect(stored.create.sampleSize).toBe(3);
    expect(stored.create.data).toMatchObject({
      metricsVersion: 1, channel: "INSTAGRAM", avgEngagement: 30, avgClicks: 200,
      sampleSize: 3, signalCount: 6,
      coverage: {
        engagement: { observedCount: 3, missingCount: 3, totalCount: 6 },
        clicks: { observedCount: 3, missingCount: 3, totalCount: 6 },
      },
    });
    expect(stored.update.data).toEqual(stored.create.data);
  });

  it("keeps an unmeasured channel and insufficient samples explicit, without a zero mean", async () => {
    mocks.signals.mockResolvedValue([
      { data: { channel: "VIDEO" } }, { data: { channel: "VIDEO", engagement: null } },
      { data: { channel: "VIDEO", engagement: Number.POSITIVE_INFINITY } },
      reported({ channel: "PR", engagement: 0 }),
      { data: { channel: "PR", engagement: 2 } }, { data: { channel: "PR" } },
    ]);
    await aggregateBriefPatterns();
    const writes = mocks.upsert.mock.calls.map(([input]) => input.create);
    expect(writes[0].data.avgEngagement).toBeNull();
    expect(writes[0].sampleSize).toBe(0);
    expect(writes[0].data.coverage.engagement).toEqual({ observedCount: 0, missingCount: 3, totalCount: 3 });
    expect(writes[1].data.avgEngagement).toBeNull();
    expect(writes[1].data.coverage.engagement.observedCount).toBe(2);
  });

  it("replaces a previous mean with insufficient coverage when the channel shrinks", async () => {
    mocks.signals.mockResolvedValue([{ data: { channel: "PR", engagement: 5 } }]);
    await aggregateBriefPatterns();
    expect(mocks.upsert.mock.calls[0]![0].update.data).toMatchObject({
      avgEngagement: null, sampleSize: 1,
      coverage: { engagement: { observedCount: 1, missingCount: 0, totalCount: 1 } },
    });
  });

  it("preserves an observed zero average and never coerces missing signal payloads", async () => {
    mocks.signals.mockResolvedValue([
      ...Array.from({ length: 3 }, () => reported({ channel: "PR", engagement: 0 })),
      { data: null },
    ]);
    await aggregateBriefPatterns();
    const writes = mocks.upsert.mock.calls.map(([input]) => input.create);
    expect(writes[0].data.avgEngagement).toBe(0);
    expect(writes[0].data.coverage.engagement.observedCount).toBe(3);
    expect(writes[1].data).toMatchObject({ channel: "UNKNOWN", avgEngagement: null, sampleSize: 0 });
  });

  it("distinguishes declared, signed and historical values without certifying legacy zeroes", async () => {
    mocks.signals.mockResolvedValue([
      reported({ channel: "PR", engagement: 0 }),
      reported({ channel: "PR", engagement: 12 }, "SIGNED_WEBHOOK"),
      { data: { channel: "PR", engagement: 6, clicks: 0 } },
      { data: { channel: "PR", engagement: 0, clicks: 0 } },
      { data: { channel: "PR", engagement: 0, measurementVersion: 1, measurementSource: "DECLARED", observedMetricKeys: [] } },
      { data: { channel: "PR", engagement: 99, measurementVersion: 2 } },
    ]);
    await aggregateBriefPatterns();
    const stored = mocks.upsert.mock.calls[0]![0].create;
    expect(stored.data).toMatchObject({ avgEngagement: 6, avgClicks: null,
      coverage: { engagement: { observedCount: 3, missingCount: 3, totalCount: 6 }, clicks: { observedCount: 0, missingCount: 6, totalCount: 6 } },
      measurementSources: {
        engagement: { DECLARED: 1, SIGNED_WEBHOOK: 1, LEGACY_REPORTED: 1 },
        clicks: { DECLARED: 0, SIGNED_WEBHOOK: 0, LEGACY_REPORTED: 0 },
      },
    });
    mocks.entries.mockResolvedValue([stored]);
    expect((await getBriefPatterns())[0]!.measurementSources).toEqual(stored.data.measurementSources);
  });

  it("expires a channel that disappeared and revives it only after fresh aggregation", async () => {
    mocks.signals.mockResolvedValue(Array.from({ length: 3 }, () => reported({ channel: "PR", engagement: 12 })));
    await aggregateBriefPatterns();
    let stored = mocks.upsert.mock.calls[0]![0].create;
    mocks.entries.mockImplementation(async () => [stored]);
    mocks.updateMany.mockImplementation(async ({ where, data }) => {
      if (stored.sourceHash === where.sourceHash && stored.id.startsWith(where.id.startsWith) && !where.id.notIn.includes(stored.id)) {
        stored = { ...stored, ...data };
      }
      return { count: 1 };
    });
    mocks.signals.mockResolvedValue([]);
    await aggregateBriefPatterns();
    expect((await getBriefPatterns())[0]).toMatchObject({ avgEngagement: null, sampleSize: 0, aggregationStatus: "EXPIRED" });
    expect(stored.data.avgEngagement).toBe(12); // historical JSON is retained, no longer current evidence
    mocks.upsert.mockImplementation(async ({ update }) => (stored = { ...stored, ...update }));
    mocks.signals.mockResolvedValue(Array.from({ length: 3 }, () => reported({ channel: "PR", engagement: 6 })));
    await aggregateBriefPatterns();
    expect((await getBriefPatterns())[0]).toMatchObject({ avgEngagement: 6, sampleSize: 3, aggregationStatus: "CURRENT" });
  });

  it("serves new coverage and does not certify historical aggregates or missing scores", async () => {
    mocks.entries.mockResolvedValue([
      { id: "agg-brief-old", channel: "old", data: { avgEngagement: 0 }, sampleSize: 3, successScore: null, sector: null },
      { id: "agg-brief-new", channel: "new", data: {
        metricsVersion: 1, avgEngagement: 0, avgClicks: null, signalCount: 4,
        coverage: { engagement: { observedCount: 3, missingCount: 1, totalCount: 4 }, clicks: { observedCount: 0, missingCount: 4, totalCount: 4 } },
      }, sampleSize: 3, successScore: 0, sector: null },
    ]);
    const rows = await getBriefPatterns();
    expect(rows[0]).toMatchObject({ avgEngagement: null, successScore: null, coverage: null });
    expect(rows[1]).toMatchObject({ avgEngagement: 0, avgClicks: null, successScore: 0,
      coverage: { engagement: { observedCount: 3, missingCount: 1, totalCount: 4 } },
    });
  });

  it("does not describe a brief aggregate as a zero success rate in either Seshat reader", async () => {
    const pattern = { id: "agg-brief-VIDEO", entryType: "BRIEF_PATTERN", channel: "VIDEO", successScore: null,
      data: { metricsVersion: 1, avgEngagement: null, avgClicks: null,
        coverage: { engagement: { observedCount: 0, missingCount: 3, totalCount: 3 }, clicks: { observedCount: 0, missingCount: 3, totalCount: 3 } } },
    };
    mocks.entries.mockResolvedValueOnce([pattern]).mockResolvedValueOnce([]);
    const enriched = await enrichBrief({ channel: "VIDEO" });
    expect(enriched[0]!.excerpt).toContain("0/3");
    expect(enriched[0]!.excerpt).toContain("non mesuré");
    expect(enriched[0]!.excerpt).not.toContain("0%");
    mocks.entries.mockResolvedValue([pattern]);
    const refs = await queryReferences({ topic: "VIDEO", sector: "food" });
    expect(refs[0]!.excerpt).toBe(enriched[0]!.excerpt);
  });

  it("keeps a declared zero success rate and omits private fields from reference excerpts", async () => {
    mocks.entries.mockResolvedValueOnce([{ id: "seed-brief", channel: "PR", successScore: 0,
      data: { successRate: 0, avgRevisions: 0, strategyId: "private-brand", insight: "private-customer" },
    }]).mockResolvedValueOnce([]);
    const refs = await enrichBrief({ channel: "PR" });
    expect(refs[0]!.excerpt).toContain("Taux de succès: 0%");
    expect(refs[0]!.excerpt).toContain("Révisions moyennes: 0");
    expect(refs[0]!.excerpt).not.toContain("private");
  });

  it("ranks creator tiers by observed scores, including zero, with coverage", async () => {
    mocks.entries.mockResolvedValue([
      { data: { tier: "measured", skills: ["design"] }, successScore: 0 },
      { data: { tier: "measured", skills: ["design"] }, successScore: null },
      { data: { tier: "unknown" }, successScore: null },
    ]);
    expect(await getCreatorPatterns()).toEqual([
      { tier: "measured", avgScore: 0, count: 2, observedCount: 1, missingCount: 1, topSkills: [{ skill: "design", frequency: 2 }] },
      { tier: "unknown", avgScore: null, count: 1, observedCount: 0, missingCount: 1, topSkills: [] },
    ]);
  });

  it("keeps zero composites and computes separate populations for each sector and market", async () => {
    const strategies = [
      { id: "cm1", advertis_vector: { composite: 0 } },
      { id: "cm2", advertis_vector: { composite: 100 } },
      { id: "cm3", advertis_vector: null },
      { id: "ci1", advertis_vector: { composite: 200 } },
      { id: "ci2", advertis_vector: { composite: 100 } },
    ];
    const canonical = strategies.map(s => ({ ...s, client: { sector: "Alimentation" }, countryCode: s.id.startsWith("cm") ? "CM" : "CI", marketScale: "NATION" }));
    mocks.strategies.mockImplementation(async ({ where }) => where.advertis_vector ? canonical.filter(s => s.advertis_vector !== null) : canonical);
    mocks.intake.mockImplementation(async ({ where }) => ({ sector: "food", country: where.convertedToId.startsWith("cm") ? "CM" : "CI" }));
    await aggregateSectorBenchmarks();
    const writes = mocks.upsert.mock.calls.map(([input]) => input.create);
    expect(writes).toHaveLength(2);
    expect(mocks.intake).not.toHaveBeenCalled();
    expect(writes[0]).toMatchObject({ id: "agg-benchmark-food-CM-NATION", countryCode: "CM", sampleSize: 2,
      data: { avgComposite: 50, topQuartile: 100, coverage: { observedCount: 2, missingCount: 1, totalCount: 3 } } });
    expect(writes[1]).toMatchObject({ id: "agg-benchmark-food-CI-NATION", countryCode: "CI", sampleSize: 2,
      data: { avgComposite: 150, topQuartile: 200, coverage: { observedCount: 2, missingCount: 0, totalCount: 2 } } });
  });

  it("separates canonical scales, preserves valid zeroes, and rejects invalid composite scores", async () => {
    const row = (marketScale: string, composite: unknown) => ({ client: { sector: "FOOD" }, countryCode: "CM", marketScale, advertis_vector: { composite } });
    mocks.strategies.mockResolvedValue([
      row("NATION", 0), row("NATION", 100), row("NATION", 201), row("NATION", NaN), row("NATION", Infinity),
      row("VILLE", 180), row("VILLE", 200),
    ]);
    mocks.intake.mockResolvedValue({ sector: "TECH", country: "FR" });
    await aggregateSectorBenchmarks();
    const writes = mocks.upsert.mock.calls.map(([input]) => input.create);
    expect(writes).toHaveLength(2);
    expect(writes[0]).toMatchObject({ sector: "food", market: "CM", countryCode: "CM", data: {
      metricsVersion: 2, avgComposite: 50, coverage: { observedCount: 2, missingCount: 3, totalCount: 5 },
      cohort: { sector: "food", countryCode: "CM", marketScale: "NATION", qualified: true },
    } });
    expect(writes[1]).toMatchObject({ data: { avgComposite: 190, cohort: { marketScale: "VILLE" } } });
    expect(mocks.intake).not.toHaveBeenCalled();
    mocks.entries.mockResolvedValue(writes);
    const rows = await getSectorBenchmarks("food");
    expect(rows[0]).toMatchObject({ avgComposite: 50, basis: "AGGREGATED", cohort: { marketScale: "NATION" } });
  });

  it.each([
    { client: { sector: null }, countryCode: "CM", marketScale: "NATION" },
    { client: { sector: "unrecognized-xyz" }, countryCode: "CM", marketScale: "NATION" },
    { client: { sector: "FOOD" }, countryCode: null, marketScale: "NATION" },
    { client: { sector: "FOOD" }, countryCode: "CM", marketScale: null },
  ])("qualifies incomplete canonical coordinates without inventing a benchmark: %j", async (coordinates) => {
    mocks.strategies.mockResolvedValue([0, 100].map(composite => ({ ...coordinates, advertis_vector: { composite } })));
    mocks.intake.mockResolvedValue({ sector: "FOOD", country: "CM" });
    await aggregateSectorBenchmarks();
    const stored = mocks.upsert.mock.calls[0]![0].create;
    expect(stored).toMatchObject({ sampleSize: 2, successScore: null, data: {
      avgComposite: null, topQuartile: null, cohort: { qualified: false },
      coverage: { observedCount: 2, missingCount: 0, totalCount: 2 },
    } });
    mocks.entries.mockResolvedValue([stored]);
    expect((await getSectorBenchmarks("food"))[0]).toMatchObject({ avgComposite: null, basis: "UNQUALIFIED_COHORT" });
  });

  it("does not certify a version-one intake cohort even when its score coverage was valid", async () => {
    mocks.entries.mockResolvedValue([{ id: "agg-benchmark-food-CM", sector: "food", market: "CM", sampleSize: 2,
      data: { metricsVersion: 1, avgComposite: 100, topQuartile: 150, coverage: { observedCount: 2, missingCount: 0, totalCount: 2 } },
    }]);
    expect((await getSectorBenchmarks("food"))[0]).toMatchObject({ avgComposite: null, topQuartile: null, basis: "UNVERIFIED_AGGREGATE" });
  });

  it("does not manufacture sector benchmarks from absent or insufficient composites", async () => {
    mocks.strategies.mockResolvedValue([{ id: "a", advertis_vector: {} }, { id: "b", advertis_vector: { composite: 0 } }]);
    await aggregateSectorBenchmarks();
    expect(mocks.upsert.mock.calls[0]![0].create).toMatchObject({ sampleSize: 1, successScore: null,
      data: { avgComposite: null, topQuartile: null, coverage: { observedCount: 1, missingCount: 1, totalCount: 2 } } });
    mocks.entries.mockResolvedValue([
      { id: "missing", sector: "food", market: "CM", data: {}, sampleSize: 0 },
      { id: "declared-zero", sector: "food", market: "CM", data: { avgComposite: 0, topQuartile: 0 }, sampleSize: 0 },
    ]);
    const rows = await getSectorBenchmarks("food");
    expect(rows[0]).toMatchObject({ avgComposite: null, topQuartile: null });
    expect(rows[1]).toMatchObject({ avgComposite: 0, topQuartile: 0 });
  });

  it("expires sector aggregates when no active population remains", async () => {
    mocks.strategies.mockResolvedValue([40, 60].map(composite => ({ client: { sector: "FOOD" }, countryCode: "CM", marketScale: "NATION", advertis_vector: { composite } })));
    await aggregateSectorBenchmarks();
    let stored = mocks.upsert.mock.calls[0]![0].create;
    mocks.entries.mockImplementation(async () => [stored]);
    mocks.updateMany.mockImplementation(async ({ where, data }) => {
      if (stored.sourceHash === where.sourceHash && stored.id.startsWith(where.id.startsWith) && !where.id.notIn.includes(stored.id)) stored = { ...stored, ...data };
      return { count: 1 };
    });
    mocks.strategies.mockResolvedValue([]);
    await aggregateSectorBenchmarks();
    expect((await getSectorBenchmarks("UNKNOWN"))[0]).toMatchObject({ avgComposite: null, topQuartile: null, sampleSize: 0, basis: "EXPIRED_AGGREGATE" });
    expect(stored.data.avgComposite).toBe(50);
  });

  it.each(mediaMetricCases)("retains distinct media metrics without inventing a unified success score: %j", async (metrics) => {
    await ingestMediaPerformance("brand", { channel: "PR", metrics });
    const stored = mocks.upsert.mock.calls[0]![0];
    expect(stored.create.successScore).toBeNull();
    expect(stored.update.successScore).toBeNull();
    expect(stored.create.data.metrics).toEqual(metrics);
    expect(stored.update.data.metrics).toEqual(metrics);
  });

  it("does not reuse an old mixed media score when reading its separate metrics", async () => {
    mocks.entries.mockResolvedValue([{ id: "old-media", channel: "PR", sector: null, sampleSize: 1, successScore: 1,
      data: { type: "media_performance", metrics: { engagementRate: 0, ctr: 0.1, roas: 4, privateField: 12 } },
    }]);
    const rows = await getBriefPatterns();
    expect(rows[0]).toMatchObject({ successScore: null,
      performanceMetrics: { engagementRate: 0, ctr: 0.1, roas: 4 } });
    expect(rows[0]!.performanceMetrics).not.toHaveProperty("privateField");
  });

  it("keeps an old cross-market aggregate unverified in Seshat rather than quoting its mean", async () => {
    const old = { id: "agg-benchmark-food-CM", entryType: "SECTOR_BENCHMARK", sector: "food", market: "CM", channel: null,
      data: { avgComposite: 133, topQuartile: 200 }, sampleSize: 3, successScore: 0.665 };
    mocks.entries.mockResolvedValueOnce([]).mockResolvedValueOnce([old]);
    const enriched = await enrichBrief({ channel: "PR", sector: "food", market: "CM" });
    expect(enriched[0]!.excerpt).not.toContain("133");
    expect(enriched[0]!.excerpt).toContain("recalculer");
    mocks.entries.mockResolvedValue([old]);
    const refs = await queryReferences({ topic: "food", sector: "food" });
    expect(refs[0]!.excerpt).toBe(enriched[0]!.excerpt);
  });
});
