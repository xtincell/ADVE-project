import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

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
    where: { status: "ACTIVE", advertis_vector: { not: Prisma.JsonNull } },
    select: { id: true, advertis_vector: true, operatorId: true },
  });

  // Group by sector (derived from associated KnowledgeEntries)
  const sectorMap = new Map<string, { composites: number[]; markets: Set<string> }>();

  for (const strategy of strategies) {
    const vector = strategy.advertis_vector as Record<string, number> | null;
    if (!vector?.composite) continue;

    // Find sector from related QuickIntake or KnowledgeEntry
    const intake = await db.quickIntake.findFirst({
      where: { convertedToId: strategy.id },
      select: { sector: true, country: true },
    });

    const sector = intake?.sector ?? "UNKNOWN";
    const market = intake?.country ?? "UNKNOWN";

    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, { composites: [], markets: new Set() });
    }
    const entry = sectorMap.get(sector)!;
    entry.composites.push(vector.composite);
    entry.markets.add(market);
  }

  let count = 0;
  for (const [sector, data] of sectorMap) {
    if (data.composites.length < 2) continue; // Need at least 2 data points

    const sorted = [...data.composites].sort((a, b) => a - b);
    const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const topQuartile = sorted[Math.floor(sorted.length * 0.75)] ?? avg;

    // Find weakest pillar across sector
    // (simplified — in production would aggregate pillar-level data)

    for (const market of data.markets) {
      await db.knowledgeEntry.upsert({
        where: { id: `agg-benchmark-${sector}-${market}` },
        update: {
          data: {
            avgComposite: Math.round(avg),
            topQuartile: Math.round(topQuartile),
            sampleSize: data.composites.length,
            aggregatedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
          sampleSize: data.composites.length,
          successScore: avg / 200,
        },
        create: {
          id: `agg-benchmark-${sector}-${market}`,
          entryType: "SECTOR_BENCHMARK",
          sector,
          market,
          data: {
            avgComposite: Math.round(avg),
            topQuartile: Math.round(topQuartile),
            sampleSize: data.composites.length,
            aggregatedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
          sampleSize: data.composites.length,
          successScore: avg / 200,
          sourceHash: "aggregator",
        },
      });
      count++;
    }
  }

  return count;
}

/**
 * P5.3: Rank ARTEMIS frameworks by effectiveness.
 */
async function aggregateFrameworkRankings(): Promise<number> {
  const diagnostics = await db.knowledgeEntry.findMany({
    where: { entryType: "DIAGNOSTIC_RESULT" },
  });

  const frameworkStats = new Map<string, { totalScore: number; count: number }>();

  for (const d of diagnostics) {
    const data = d.data as Record<string, unknown>;
    const framework = data.framework as string;
    if (!framework) continue;

    const score = d.successScore ?? 0.5;
    if (!frameworkStats.has(framework)) {
      frameworkStats.set(framework, { totalScore: 0, count: 0 });
    }
    const stats = frameworkStats.get(framework)!;
    stats.totalScore += score;
    stats.count++;
  }

  const rankings = [...frameworkStats.entries()]
    .map(([framework, stats]) => ({
      framework,
      effectiveness: stats.count > 0 ? stats.totalScore / stats.count : 0,
      usageCount: stats.count,
    }))
    .sort((a, b) => b.effectiveness - a.effectiveness);

  if (rankings.length > 0) {
    await db.knowledgeEntry.upsert({
      where: { id: "agg-framework-rankings" },
      update: {
        data: { rankings, aggregatedAt: new Date().toISOString() } as Prisma.InputJsonValue,
      },
      create: {
        id: "agg-framework-rankings",
        entryType: "DIAGNOSTIC_RESULT",
        data: {
          type: "framework_ranking",
          rankings,
          aggregatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        sourceHash: "aggregator",
      },
    });
  }

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

  const channelStats = new Map<string, { totalEngagement: number; count: number }>();

  for (const s of signals) {
    const data = s.data as Record<string, unknown> | null;
    if (!data) continue;
    const channel = (data.platform as string) ?? (data.channel as string) ?? "UNKNOWN";
    const engagement = (data.engagement as number) ?? (data.clicks as number) ?? 0;

    if (!channelStats.has(channel)) {
      channelStats.set(channel, { totalEngagement: 0, count: 0 });
    }
    const stats = channelStats.get(channel)!;
    stats.totalEngagement += engagement;
    stats.count++;
  }

  let count = 0;
  for (const [channel, stats] of channelStats) {
    if (stats.count < 3) continue;

    await db.knowledgeEntry.upsert({
      where: { id: `agg-brief-${channel}` },
      update: {
        data: {
          channel,
          avgEngagement: stats.count > 0 ? Math.round(stats.totalEngagement / stats.count) : 0,
          sampleSize: stats.count,
          aggregatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        sampleSize: stats.count,
      },
      create: {
        id: `agg-brief-${channel}`,
        entryType: "BRIEF_PATTERN",
        channel,
        data: {
          channel,
          avgEngagement: stats.count > 0 ? Math.round(stats.totalEngagement / stats.count) : 0,
          sampleSize: stats.count,
          aggregatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        sampleSize: stats.count,
        sourceHash: "aggregator",
      },
    });
    count++;
  }

  return count;
}

/**
 * P5.11: Anonymize a source identifier using SHA-256.
 */
export function anonymizeSource(sourceId: string): string {
  return crypto.createHash("sha256").update(sourceId).digest("hex").slice(0, 16);
}
