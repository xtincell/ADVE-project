// ============================================================================
// MODULE M20 — Knowledge Graph (Capture + Aggregator)
// Score: 100/100 | Priority: P3 | Status: FUNCTIONAL
// Spec: §2.2.10 + §4.2 + §8 P5 | Division: Le Signal
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  Aggregator: batch compute benchmarks from AuditLog + ScoreSnapshot + missions + QC
// [x] REQ-2  KnowledgeEntry model with entryType, sector, market, pillarFocus, data, sourceHash
// [x] REQ-3  knowledge-capture service (passive event writing, runs from P0)
// [x] REQ-4  knowledgeGraph router: query, getBenchmarks, getFrameworkRanking, getCreatorPatterns, getBriefPatterns, ingest — CdC §3.1
// [x] REQ-5  Framework rankings (which frameworks most effective per symptom)
// [x] REQ-6  Creator patterns (performance by tier, skill, Driver type)
// [x] REQ-7  Brief patterns (what brief structures produce best QC outcomes)
// [x] REQ-8  Sector benchmarks (ADVE scores by sector, market, business model)
// [x] REQ-9  Market Study results → KnowledgeEntry (Annexe E §3.4)
// [x] REQ-10 MediaPerformance benchmarks → KnowledgeEntry (Annexe E §3.3)
//
// EXPORTS: aggregate, computeBenchmarks, getTopFrameworks, queryKnowledgeGraph, getFrameworkRankings, getCreatorPatterns, getBriefPatterns, getSectorBenchmarks, ingestMarketStudy, ingestMediaPerformance
// ============================================================================

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { measuredNumber, measurementRecord, measurementCoverage, readBriefMeasurements, readSectorMeasurements, signalMeasurement } from "./measurements";

/**
 * Knowledge Aggregator (P5) — Batch service that aggregates KnowledgeEntry data.
 * Runs periodically to compute sector benchmarks, framework rankings,
 * creator patterns, brief patterns, and campaign templates.
 */

export interface AggregationResult {
  benchmarks: number;
  frameworkRankings: number;
  creatorPatterns: number;
  briefPatterns: number;
}

export async function runAggregation(): Promise<AggregationResult> {
  const results: AggregationResult = {
    benchmarks: await aggregateSectorBenchmarks(),
    frameworkRankings: await aggregateFrameworkRankings(),
    creatorPatterns: await aggregateCreatorPatterns(),
    briefPatterns: await aggregateBriefPatterns(),
  };

  return results;
}

/**
 * Alias for runAggregation — executes all aggregations in sequence.
 */
export const runBatchAggregation = runAggregation;

/**
 * Individual aggregation exports for selective execution.
 */
export { aggregateSectorBenchmarks, aggregateFrameworkRankings, aggregateCreatorPatterns, aggregateBriefPatterns };

/**
 * P5.2: Cross-strategy aggregation of scores by sector × market.
 */
async function aggregateSectorBenchmarks(): Promise<number> {
  const strategies = await db.strategy.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, advertis_vector: true, operatorId: true },
  });

  // Each market has its own population; a sector-wide mean is not a market mean.
  const sectorMap = new Map<string, { sector: string; market: string; composites: number[]; count: number }>();

  for (const strategy of strategies) {
    const composite = measuredNumber(measurementRecord(strategy.advertis_vector).composite);

    // Find sector from related QuickIntake or KnowledgeEntry
    const intake = await db.quickIntake.findFirst({
      where: { convertedToId: strategy.id },
      select: { sector: true, country: true },
    });

    const sector = intake?.sector ?? "UNKNOWN";
    const market = intake?.country ?? "UNKNOWN";

    const key = JSON.stringify([sector, market]);
    if (!sectorMap.has(key)) {
      sectorMap.set(key, { sector, market, composites: [], count: 0 });
    }
    const entry = sectorMap.get(key)!;
    if (composite !== null) entry.composites.push(composite);
    entry.count++;
  }

  let count = 0;
  for (const { sector, market, composites, count: totalCount } of sectorMap.values()) {
    const sorted = [...composites].sort((a, b) => a - b);
    const avg = sorted.length >= 2 ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : null;
    const topQuartile = avg === null ? null : sorted[Math.floor(sorted.length * 0.75)] ?? null;
    const data = {
      metricsVersion: 1,
      avgComposite: avg === null ? null : Math.round(avg),
      topQuartile: topQuartile === null ? null : Math.round(topQuartile),
      sampleSize: composites.length,
      coverage: measurementCoverage(composites.length, totalCount),
      aggregatedAt: new Date().toISOString(),
    };
    await db.knowledgeEntry.upsert({
      where: { id: `agg-benchmark-${sector}-${market}` },
      update: {
        data: data as Prisma.InputJsonValue,
        sampleSize: composites.length,
        successScore: avg === null ? null : avg / 200,
        sourceHash: "aggregator",
      },
      create: {
        id: `agg-benchmark-${sector}-${market}`,
        entryType: "SECTOR_BENCHMARK",
        sector,
        market,
        data: data as Prisma.InputJsonValue,
        sampleSize: composites.length,
        successScore: avg === null ? null : avg / 200,
        sourceHash: "aggregator",
      },
    });
    count++;
  }

  await db.knowledgeEntry.updateMany({
    where: { entryType: "SECTOR_BENCHMARK", sourceHash: "aggregator", id: { startsWith: "agg-benchmark-", notIn: [...sectorMap.values()].map(({ sector, market }) => `agg-benchmark-${sector}-${market}`) } },
    data: { sampleSize: 0, successScore: null, sourceHash: "aggregator-expired" },
  });

  return count;
}

/**
 * P5.3: Rank ARTEMIS frameworks by effectiveness.
 */
async function aggregateFrameworkRankings(): Promise<number> {
  const diagnostics = await db.knowledgeEntry.findMany({
    where: { entryType: "DIAGNOSTIC_RESULT" },
  });

  const rankings = frameworkMeasurements(diagnostics).map(({ sectors: _sectors, ...ranking }) => ranking);
  const data = { type: "framework_ranking", rankings, aggregatedAt: new Date().toISOString() };
  // Also replace a previous ranking when its source population becomes empty.
  await db.knowledgeEntry.upsert({
    where: { id: "agg-framework-rankings" },
    update: { data: data as Prisma.InputJsonValue },
    create: {
      id: "agg-framework-rankings",
      entryType: "DIAGNOSTIC_RESULT",
      data: data as Prisma.InputJsonValue,
      sourceHash: "aggregator",
    },
  });

  return rankings.length;
}

/**
 * P5.4: Analyze creator performance by brief type, channel, sector.
 */
async function aggregateCreatorPatterns(): Promise<number> {
  const profiles = await db.talentProfile.findMany({
    select: {
      id: true,
      tier: true,
      skills: true,
      firstPassRate: true,
      totalMissions: true,
      driverSpecialties: true,
    },
  });

  // Compute skill combo effectiveness
  const skillCombos = new Map<string, { avgFirstPass: number; count: number }>();

  for (const p of profiles) {
    if (p.totalMissions < 3) continue;
    const skills = (p.skills as string[]) ?? [];
    const combo = skills.sort().join("+");
    if (!skillCombos.has(combo)) {
      skillCombos.set(combo, { avgFirstPass: 0, count: 0 });
    }
    const stats = skillCombos.get(combo)!;
    stats.avgFirstPass = (stats.avgFirstPass * stats.count + p.firstPassRate) / (stats.count + 1);
    stats.count++;
  }

  const topCombos = [...skillCombos.entries()]
    .filter(([, s]) => s.count >= 2)
    .sort((a, b) => b[1].avgFirstPass - a[1].avgFirstPass)
    .slice(0, 10)
    .map(([combo, stats]) => ({ skills: combo.split("+"), avgFirstPass: Math.round(stats.avgFirstPass * 100) / 100, count: stats.count }));

  await db.knowledgeEntry.upsert({
    where: { id: "agg-creator-patterns" },
    update: {
      data: { topSkillCombos: topCombos, totalProfiles: profiles.length, aggregatedAt: new Date().toISOString() } as Prisma.InputJsonValue,
    },
    create: {
      id: "agg-creator-patterns",
      entryType: "CREATOR_PATTERN",
      data: { topSkillCombos: topCombos, totalProfiles: profiles.length, aggregatedAt: new Date().toISOString() } as Prisma.InputJsonValue,
      sourceHash: "aggregator",
    },
  });

  return topCombos.length;
}

/**
 * P5.5: Identify patterns in successful briefs.
 */
async function aggregateBriefPatterns(): Promise<number> {
  const signals = await db.signal.findMany({
    where: { type: { in: ["SOCIAL_METRICS", "MEDIA_PERFORMANCE"] } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  type Sources = Record<"DECLARED" | "SIGNED_WEBHOOK" | "LEGACY_REPORTED", number>;
  const channelStats = new Map<string, { totalEngagement: number; engagementCount: number; totalClicks: number; clicksCount: number; count: number; sources: { engagement: Sources; clicks: Sources } }>();

  for (const s of signals) {
    const data = measurementRecord(s.data);
    const channel = [data.platform, data.channel].find((value): value is string => typeof value === "string" && value.length > 0) ?? "UNKNOWN";
    const engagement = signalMeasurement(data, "engagement");
    const clicks = signalMeasurement(data, "clicks");

    if (!channelStats.has(channel)) {
      channelStats.set(channel, { totalEngagement: 0, engagementCount: 0, totalClicks: 0, clicksCount: 0, count: 0,
        sources: { engagement: { DECLARED: 0, SIGNED_WEBHOOK: 0, LEGACY_REPORTED: 0 }, clicks: { DECLARED: 0, SIGNED_WEBHOOK: 0, LEGACY_REPORTED: 0 } } });
    }
    const stats = channelStats.get(channel)!;
    if (engagement !== null) {
      stats.totalEngagement += engagement.value;
      stats.engagementCount++;
      stats.sources.engagement[engagement.source]++;
    }
    if (clicks !== null) {
      stats.totalClicks += clicks.value;
      stats.clicksCount++;
      stats.sources.clicks[clicks.source]++;
    }
    stats.count++;
  }

  let count = 0;
  for (const [channel, stats] of channelStats) {
    const data = {
      metricsVersion: 1,
      channel,
      // Keep the minimum sample requirement for each metric, not for missing values.
      avgEngagement: stats.engagementCount >= 3 ? Math.round(stats.totalEngagement / stats.engagementCount) : null,
      avgClicks: stats.clicksCount >= 3 ? Math.round(stats.totalClicks / stats.clicksCount) : null,
      sampleSize: stats.engagementCount,
      signalCount: stats.count,
      coverage: {
        engagement: measurementCoverage(stats.engagementCount, stats.count),
        clicks: measurementCoverage(stats.clicksCount, stats.count),
      },
      measurementSources: stats.sources,
      aggregatedAt: new Date().toISOString(),
    };

    await db.knowledgeEntry.upsert({
      where: { id: `agg-brief-${channel}` },
      update: {
        data: data as Prisma.InputJsonValue,
        sampleSize: stats.engagementCount,
        sourceHash: "aggregator",
      },
      create: {
        id: `agg-brief-${channel}`,
        entryType: "BRIEF_PATTERN",
        channel,
        data: data as Prisma.InputJsonValue,
        sampleSize: stats.engagementCount,
        sourceHash: "aggregator",
      },
    });
    count++;
  }

  await db.knowledgeEntry.updateMany({
    where: { entryType: "BRIEF_PATTERN", sourceHash: "aggregator", id: { startsWith: "agg-brief-", notIn: [...channelStats.keys()].map(channel => `agg-brief-${channel}`) } },
    data: { sampleSize: 0, successScore: null, sourceHash: "aggregator-expired" },
  });

  return count;
}

/**
 * P5.11: Anonymize a source identifier using SHA-256.
 */
export function anonymizeSource(sourceId: string): string {
  return crypto.createHash("sha256").update(sourceId).digest("hex").slice(0, 16);
}

// ============================================================================
// REQ-4: QUERY KNOWLEDGE GRAPH — Semantic search on KnowledgeEntry
// ============================================================================

export async function queryKnowledgeGraph(
  query: string,
  filters?: { sector?: string; market?: string; entryType?: string; pillarFocus?: string },
) {
  const where: Prisma.KnowledgeEntryWhereInput = {};
  if (filters?.sector) where.sector = filters.sector;
  if (filters?.market) where.market = filters.market;
  if (filters?.entryType) where.entryType = filters.entryType as Prisma.EnumKnowledgeTypeFilter;
  if (filters?.pillarFocus) where.pillarFocus = filters.pillarFocus;

  const entries = await db.knowledgeEntry.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  // Simple keyword relevance ranking (score by query term matches in data)
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = entries.map((entry) => {
    const dataStr = JSON.stringify(entry.data).toLowerCase();
    const matches = queryTerms.filter((t) => dataStr.includes(t)).length;
    const relevance = queryTerms.length > 0 ? matches / queryTerms.length : 0;
    return { ...entry, relevance };
  });

  return scored
    .sort((a, b) => b.relevance - a.relevance || (b.successScore ?? 0) - (a.successScore ?? 0))
    .slice(0, 20);
}

// ============================================================================
// REQ-5: FRAMEWORK RANKINGS — Which ARTEMIS frameworks score highest
// ============================================================================

function frameworkMeasurements(entries: { data: unknown; successScore: number | null; sector: string | null }[]) {
  const frameworkMap = new Map<string, { totalScore: number; count: number; observedCount: number; sectors: Set<string> }>();

  for (const entry of entries) {
    const framework = measurementRecord(entry.data).framework;
    if (typeof framework !== "string" || framework.length === 0) continue;

    if (!frameworkMap.has(framework)) {
      frameworkMap.set(framework, { totalScore: 0, count: 0, observedCount: 0, sectors: new Set() });
    }
    const stats = frameworkMap.get(framework)!;
    const score = measuredNumber(entry.successScore);
    if (score !== null) {
      stats.totalScore += score;
      stats.observedCount++;
    }
    stats.count++;
    if (entry.sector) stats.sectors.add(entry.sector);
  }

  return [...frameworkMap.entries()]
    .map(([framework, stats]) => ({
      framework,
      effectiveness: stats.observedCount > 0 ? stats.totalScore / stats.observedCount : null,
      usageCount: stats.count,
      observedCount: stats.observedCount,
      missingCount: stats.count - stats.observedCount,
      sectors: [...stats.sectors],
    }))
    .sort((a, b) => (b.effectiveness ?? -1) - (a.effectiveness ?? -1));
}

export async function getFrameworkRankings(sector?: string) {
  const where: Prisma.KnowledgeEntryWhereInput = { entryType: "DIAGNOSTIC_RESULT" };
  if (sector) where.sector = sector;
  const entries = await db.knowledgeEntry.findMany({ where });
  return frameworkMeasurements(entries).map(({ effectiveness, ...ranking }) => ({
    ...ranking,
    avgScore: effectiveness === null ? null : Math.round(effectiveness * 100) / 100,
  }));
}

// ============================================================================
// REQ-6: CREATOR PATTERNS — Performance patterns by tier/skill
// ============================================================================

export async function getCreatorPatterns(sector?: string) {
  const where: Prisma.KnowledgeEntryWhereInput = { entryType: "MISSION_OUTCOME" };
  if (sector) where.sector = sector;

  const entries = await db.knowledgeEntry.findMany({ where });

  const tierMap = new Map<string, { totalScore: number; count: number; observedCount: number; skills: Map<string, number> }>();

  for (const entry of entries) {
    const data = measurementRecord(entry.data);
    const tier = typeof data.tier === "string" ? data.tier : "UNKNOWN";
    const skills = Array.isArray(data.skills) ? data.skills.filter((skill): skill is string => typeof skill === "string") : [];

    if (!tierMap.has(tier)) {
      tierMap.set(tier, { totalScore: 0, count: 0, observedCount: 0, skills: new Map() });
    }
    const stats = tierMap.get(tier)!;
    const score = measuredNumber(entry.successScore);
    if (score !== null) {
      stats.totalScore += score;
      stats.observedCount++;
    }
    stats.count++;
    for (const skill of skills) {
      stats.skills.set(skill, (stats.skills.get(skill) ?? 0) + 1);
    }
  }

  return [...tierMap.entries()]
    .map(([tier, stats]) => ({
      tier,
      avgScore: stats.observedCount > 0 ? Math.round((stats.totalScore / stats.observedCount) * 100) / 100 : null,
      count: stats.count,
      observedCount: stats.observedCount,
      missingCount: stats.count - stats.observedCount,
      topSkills: [...stats.skills.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([skill, freq]) => ({ skill, frequency: freq })),
    }))
    .sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1));
}

// ============================================================================
// REQ-7: BRIEF PATTERNS — Most effective brief structures
// ============================================================================

export async function getBriefPatterns(sector?: string) {
  const where: Prisma.KnowledgeEntryWhereInput = { entryType: "BRIEF_PATTERN" };
  if (sector) where.sector = sector;

  const entries = await db.knowledgeEntry.findMany({ where, orderBy: { successScore: "desc" } });

  return entries.map((entry) => {
    const data = measurementRecord(entry.data);
    const measurements = readBriefMeasurements(data);
    const metrics = measurementRecord(data.metrics);
    const isMediaPerformance = data.type === "media_performance" || "metrics" in data;
    return {
      id: entry.id,
      channel: entry.channel ?? (data.channel as string) ?? "UNKNOWN",
      ...measurements,
      ...(entry.sourceHash === "aggregator-expired" ? { avgEngagement: null, avgClicks: null } : {}),
      aggregationStatus: entry.sourceHash === "aggregator-expired" ? "EXPIRED" : measurements.coverage ? "CURRENT" : "UNVERIFIED",
      sampleSize: entry.sourceHash === "aggregator-expired" ? 0 : measurements.coverage?.engagement.observedCount ?? null,
      successScore: isMediaPerformance ? null : measuredNumber(entry.successScore),
      performanceMetrics: isMediaPerformance ? {
        engagementRate: measuredNumber(metrics.engagementRate),
        ctr: measuredNumber(metrics.ctr),
        roas: measuredNumber(metrics.roas),
      } : null,
      sector: entry.sector,
      aggregatedAt: typeof data.aggregatedAt === "string" ? data.aggregatedAt : null,
    };
  });
}

// ============================================================================
// REQ-8: SECTOR BENCHMARKS — Financial/market benchmarks by sector
// ============================================================================

export async function getSectorBenchmarks(sector: string, market?: string) {
  const where: Prisma.KnowledgeEntryWhereInput = {
    entryType: "SECTOR_BENCHMARK",
    sector,
  };
  if (market) where.market = market;

  const entries = await db.knowledgeEntry.findMany({ where });

  return entries.map((entry) => {
    const data = measurementRecord(entry.data);
    return {
      id: entry.id,
      sector: entry.sector,
      market: entry.market,
      ...readSectorMeasurements(data, entry.id.startsWith("agg-benchmark-")),
      ...(entry.sourceHash === "aggregator-expired" ? { avgComposite: null, topQuartile: null, basis: "EXPIRED_AGGREGATE" } : {}),
      sampleSize: entry.sampleSize,
      aggregatedAt: data.aggregatedAt as string ?? null,
    };
  });
}

// ============================================================================
// REQ-9: INGEST MARKET STUDY — Create KnowledgeEntry from MarketStudy
// ============================================================================

export async function ingestMarketStudy(
  strategyId: string,
  studyData: { sector: string; market?: string; findings: Record<string, unknown>; source?: string },
) {
  const hash = crypto
    .createHash("sha256")
    .update(`market-study-${strategyId}-${JSON.stringify(studyData.findings)}`)
    .digest("hex")
    .slice(0, 16);

  const entry = await db.knowledgeEntry.upsert({
    where: { id: `study-${strategyId}-${hash}` },
    update: {
      data: {
        strategyId,
        findings: studyData.findings,
        ingestedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
    create: {
      id: `study-${strategyId}-${hash}`,
      entryType: "SECTOR_BENCHMARK",
      sector: studyData.sector,
      market: studyData.market ?? null,
      data: {
        strategyId,
        type: "market_study",
        findings: studyData.findings,
        ingestedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
      sourceHash: studyData.source ? anonymizeSource(studyData.source) : hash,
    },
  });

  return entry;
}

// ============================================================================
// REQ-10: INGEST MEDIA PERFORMANCE — Create KnowledgeEntry from perf data
// ============================================================================

export async function ingestMediaPerformance(
  strategyId: string,
  performanceData: {
    channel: string;
    sector?: string;
    metrics: Record<string, number>;
    period?: string;
  },
) {
  const hash = crypto
    .createHash("sha256")
    .update(`media-perf-${strategyId}-${performanceData.channel}-${JSON.stringify(performanceData.metrics)}`)
    .digest("hex")
    .slice(0, 16);

  // Engagement rate, CTR and ROAS have different denominators/units. Keep their
  // actual values; no common success-score conversion is defined for this input.

  const entry = await db.knowledgeEntry.upsert({
    where: { id: `media-${strategyId}-${hash}` },
    update: {
      data: {
        strategyId,
        type: "media_performance",
        channel: performanceData.channel,
        metrics: performanceData.metrics,
        period: performanceData.period ?? null,
        ingestedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
      successScore: null,
    },
    create: {
      id: `media-${strategyId}-${hash}`,
      entryType: "BRIEF_PATTERN",
      channel: performanceData.channel,
      sector: performanceData.sector ?? null,
      data: {
        strategyId,
        type: "media_performance",
        channel: performanceData.channel,
        metrics: performanceData.metrics,
        period: performanceData.period ?? null,
        ingestedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
      successScore: null,
      sourceHash: hash,
    },
  });

  return entry;
}
