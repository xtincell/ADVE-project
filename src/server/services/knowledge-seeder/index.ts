import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { PILLAR_STORAGE_KEYS } from "@/domain";

/**
 * Knowledge Seeder (F.3) — Injects Alexandre's expertise as cold start data.
 * Called during initial setup to bootstrap the Knowledge Graph.
 */

// ---------------------------------------------------------------------------
// seedInitialKnowledge — Creates baseline KnowledgeEntry records from
// existing strategies, missions, and QC reviews already in the database.
// ---------------------------------------------------------------------------

export async function seedInitialKnowledge(): Promise<number> {
  let count = 0;

  // 1. Seed from existing strategies (DIAGNOSTIC_RESULT entries)
  const strategies = await db.strategy.findMany({
    where: { status: "ACTIVE", advertis_vector: { not: Prisma.JsonNull } },
    include: {
      pillars: true,
      missions: {
        include: {
          deliverables: { include: { qualityReviews: true } },
          driver: true,
        },
      },
    },
  });

  for (const strategy of strategies) {
    const vector = strategy.advertis_vector as Record<string, number> | null;
    if (!vector?.composite) continue;

    const sourceHash = crypto
      .createHash("sha256")
      .update(strategy.id)
      .digest("hex")
      .substring(0, 16);

    // Check if we already seeded this strategy
    const exists = await db.knowledgeEntry.findFirst({
      where: { sourceHash, entryType: "DIAGNOSTIC_RESULT" },
    });
    if (exists) continue;

    // Derive sector from QuickIntake if available
    const intake = await db.quickIntake.findFirst({
      where: { convertedToId: strategy.id },
      select: { sector: true, country: true, businessModel: true },
    });

    await db.knowledgeEntry.create({
      data: {
        entryType: "DIAGNOSTIC_RESULT",
        sector: intake?.sector ?? null,
        market: intake?.country ?? null,
        businessModel: intake?.businessModel ?? null,
        data: {
          composite: vector.composite,
          confidence: vector.confidence ?? 0,
          pillarScores: {
            a: vector.a ?? 0,
            d: vector.d ?? 0,
            v: vector.v ?? 0,
            e: vector.e ?? 0,
            r: vector.r ?? 0,
            t: vector.t ?? 0,
            i: vector.i ?? 0,
            s: vector.s ?? 0,
          },
          pillarCount: strategy.pillars.length,
          strategyName: strategy.name,
        } as Prisma.InputJsonValue,
        successScore: vector.composite / 200,
        sourceHash,
      },
    });
    count++;

    // 2. Seed MISSION_OUTCOME entries from completed missions
    for (const mission of strategy.missions) {
      if (mission.status !== "COMPLETED" && mission.status !== "DELIVERED") continue;

      const missionHash = crypto
        .createHash("sha256")
        .update(mission.id)
        .digest("hex")
        .substring(0, 16);

      const missionExists = await db.knowledgeEntry.findFirst({
        where: { sourceHash: missionHash, entryType: "MISSION_OUTCOME" },
      });
      if (missionExists) continue;

      const reviews = mission.deliverables.flatMap((d) => d.qualityReviews);
      const avgQcScore =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.overallScore, 0) / reviews.length
          : 0;
      const firstPassCount = reviews.filter((r) => r.verdict === "ACCEPTED").length;
      const firstPassRate = reviews.length > 0 ? firstPassCount / reviews.length : 0;

      await db.knowledgeEntry.create({
        data: {
          entryType: "MISSION_OUTCOME",
          sector: intake?.sector ?? null,
          market: intake?.country ?? null,
          channel: mission.driver?.channel ?? null,
          data: {
            missionTitle: mission.title,
            mode: mission.mode,
            channel: mission.driver?.channel ?? null,
            deliverableCount: mission.deliverables.length,
            avgQcScore,
            firstPassRate,
            reviewCount: reviews.length,
          } as Prisma.InputJsonValue,
          successScore: avgQcScore / 10,
          sampleSize: reviews.length || 1,
          sourceHash: missionHash,
        },
      });
      count++;

      // 3. Seed CREATOR_PATTERN entries from QC review data
      for (const review of reviews) {
        const pillarScores = review.pillarScores as Record<string, number> | null;
        if (!pillarScores) continue;

        // Find the strongest pillar for this review
        const bestPillar = Object.entries(pillarScores).reduce(
          (best, [key, val]) => (val > best.val ? { key, val } : best),
          { key: "", val: -1 }
        );

        if (bestPillar.key) {
          await db.knowledgeEntry.create({
            data: {
              entryType: "CREATOR_PATTERN",
              channel: mission.driver?.channel ?? null,
              pillarFocus: bestPillar.key,
              data: {
                reviewVerdict: review.verdict,
                overallScore: review.overallScore,
                pillarScores,
                reviewType: review.reviewType,
                channel: mission.driver?.channel ?? null,
              } as Prisma.InputJsonValue,
              successScore: review.overallScore / 10,
              sourceHash: crypto
                .createHash("sha256")
                .update(review.id)
                .digest("hex")
                .substring(0, 16),
            },
          });
          count++;
        }
      }
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// seedSectorBenchmarks — Creates benchmark entries for a specific sector by
// analyzing all strategies and knowledge entries associated with that sector.
// ---------------------------------------------------------------------------

export async function seedSectorBenchmarks(sector: string): Promise<number> {
  // Find all strategies linked to this sector via QuickIntake
  const intakes = await db.quickIntake.findMany({
    where: { sector, convertedToId: { not: null } },
    select: { convertedToId: true, country: true, businessModel: true },
  });

  const strategyIds = intakes
    .map((i) => i.convertedToId)
    .filter((id): id is string => id !== null);

  if (strategyIds.length === 0) {
    // No live data — generate expert-seeded benchmarks for this sector
    return seedExpertSectorBenchmarks(sector);
  }

  const strategies = await db.strategy.findMany({
    where: { id: { in: strategyIds }, advertis_vector: { not: Prisma.JsonNull } },
    select: { id: true, advertis_vector: true },
  });

  // Group by market
  const marketMap = new Map<
    string,
    { composites: number[]; vectors: Record<string, number>[] }
  >();

  for (const strategy of strategies) {
    const vector = strategy.advertis_vector as Record<string, number> | null;
    if (!vector?.composite) continue;

    const intake = intakes.find((i) => i.convertedToId === strategy.id);
    const market = intake?.country ?? "ALL";

    if (!marketMap.has(market)) {
      marketMap.set(market, { composites: [], vectors: [] });
    }
    const entry = marketMap.get(market)!;
    entry.composites.push(vector.composite);
    entry.vectors.push(vector);
  }

  let count = 0;
  for (const [market, data] of marketMap) {
    const sorted = [...data.composites].sort((a, b) => a - b);
    const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const topQuartile = sorted[Math.floor(sorted.length * 0.75)] ?? avg;
    const bottomQuartile = sorted[Math.floor(sorted.length * 0.25)] ?? avg;

    // Compute average per-pillar scores
    const pillarAvgs: Record<string, number> = {};
    for (const key of [...PILLAR_STORAGE_KEYS]) {
      const values = data.vectors.map((v) => v[key] ?? 0);
      pillarAvgs[key] =
        values.length > 0
          ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100
          : 0;
    }

    // Find weakest pillar
    const weakest = Object.entries(pillarAvgs).reduce(
      (min, [key, val]) => (val < min.val ? { key, val } : min),
      { key: "a", val: Infinity }
    );

    const id = `seed-benchmark-${sector}-${market}`;
    await db.knowledgeEntry.upsert({
      where: { id },
      update: {
        data: {
          avgComposite: Math.round(avg),
          topQuartile: Math.round(topQuartile),
          bottomQuartile: Math.round(bottomQuartile),
          pillarAverages: pillarAvgs,
          weakness: weakest.key.toUpperCase(),
          sampleSize: data.composites.length,
          aggregatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        sampleSize: data.composites.length,
        successScore: avg / 200,
      },
      create: {
        id,
        entryType: "SECTOR_BENCHMARK",
        sector,
        market,
        data: {
          avgComposite: Math.round(avg),
          topQuartile: Math.round(topQuartile),
          bottomQuartile: Math.round(bottomQuartile),
          pillarAverages: pillarAvgs,
          weakness: weakest.key.toUpperCase(),
          sampleSize: data.composites.length,
          aggregatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        sampleSize: data.composites.length,
        successScore: avg / 200,
        sourceHash: "seed-sector",
      },
    });
    count++;
  }

  return count;
}

/**
 * Generates expert-seeded benchmarks when no live data exists for a sector.
 */
async function seedExpertSectorBenchmarks(sector: string): Promise<number> {
  const defaultBenchmarks: Record<
    string,
    { avgComposite: number; weakness: string; markets: string[] }
  > = {
    FMCG: { avgComposite: 95, weakness: "D", markets: ["CM", "CI", "SN"] },
    BANQUE: { avgComposite: 110, weakness: "E", markets: ["CM", "CI"] },
    TELECOM: { avgComposite: 125, weakness: "A", markets: ["CM", "CI", "SN", "GA"] },
    IMMOBILIER: { avgComposite: 85, weakness: "T", markets: ["CM", "CI"] },
    TECH: { avgComposite: 100, weakness: "S", markets: ["CM", "CI", "SN"] },
    SANTE: { avgComposite: 90, weakness: "E", markets: ["CM"] },
    EDUCATION: { avgComposite: 88, weakness: "I", markets: ["CM", "CI"] },
    MODE: { avgComposite: 105, weakness: "R", markets: ["CI", "SN"] },
    SERVICES: { avgComposite: 100, weakness: "T", markets: ["CM", "CI"] },
  };

  const benchmark = defaultBenchmarks[sector];
  if (!benchmark) {
    // Unknown sector — create a generic benchmark
    const id = `seed-benchmark-${sector}-ALL`;
    await db.knowledgeEntry.upsert({
      where: { id },
      update: {
        data: {
          avgComposite: 100,
          topQuartile: 135,
          weakness: "V",
          sampleSize: 0,
          note: "Generic benchmark — no sector-specific data available",
          aggregatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
      create: {
        id,
        entryType: "SECTOR_BENCHMARK",
        sector,
        market: "ALL",
        data: {
          avgComposite: 100,
          topQuartile: 135,
          weakness: "V",
          sampleSize: 0,
          note: "Generic benchmark — no sector-specific data available",
          aggregatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        successScore: 0.5,
        sampleSize: 0,
        sourceHash: "seed-sector",
      },
    });
    return 1;
  }

  let count = 0;
  for (const market of benchmark.markets) {
    const id = `seed-benchmark-${sector}-${market}`;
    await db.knowledgeEntry.upsert({
      where: { id },
      update: {
        data: {
          avgComposite: benchmark.avgComposite,
          topQuartile: Math.round(benchmark.avgComposite * 1.4),
          weakness: benchmark.weakness,
          sampleSize: 5,
          aggregatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
      create: {
        id,
        entryType: "SECTOR_BENCHMARK",
        sector,
        market,
        data: {
          avgComposite: benchmark.avgComposite,
          topQuartile: Math.round(benchmark.avgComposite * 1.4),
          weakness: benchmark.weakness,
          sampleSize: 5,
          aggregatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        successScore: benchmark.avgComposite / 200,
        sampleSize: 5,
        sourceHash: "seed-sector",
      },
    });
    count++;
  }

  return count;
}

export async function seedExpertise(): Promise<number> {
  const existing = await db.knowledgeEntry.count({
    where: { sourceHash: "seed-expertise" },
  });

  if (existing > 0) {
    return existing; // Already seeded
  }

  const entries: Prisma.KnowledgeEntryCreateInput[] = [
    // Sector benchmarks by market
    ...generateSectorBenchmarks(),
    // Sector x business model benchmarks
    ...generateSectorBusinessModelBenchmarks(),
    // Brief patterns by channel
    ...generateBriefPatterns(),
    // Framework effectiveness rankings
    ...generateFrameworkRankings(),
  ];

  let count = 0;
  for (const entry of entries) {
    await db.knowledgeEntry.create({ data: entry });
    count++;
  }

  return count;
}

function generateSectorBenchmarks(): Prisma.KnowledgeEntryCreateInput[] {
  const sectors = [
    { sector: "FMCG", markets: ["CM", "CI", "SN"], avgComposite: 95, weakness: "D" },
    { sector: "BANQUE", markets: ["CM", "CI"], avgComposite: 110, weakness: "E" },
    { sector: "TELECOM", markets: ["CM", "CI", "SN", "GA"], avgComposite: 125, weakness: "A" },
    { sector: "IMMOBILIER", markets: ["CM", "CI"], avgComposite: 85, weakness: "T" },
    { sector: "TECH", markets: ["CM", "CI", "SN"], avgComposite: 100, weakness: "S" },
    { sector: "SANTE", markets: ["CM"], avgComposite: 90, weakness: "E" },
    { sector: "EDUCATION", markets: ["CM", "CI"], avgComposite: 88, weakness: "I" },
    { sector: "MODE", markets: ["CI", "SN"], avgComposite: 105, weakness: "R" },
  ];

  const entries: Prisma.KnowledgeEntryCreateInput[] = [];
  for (const s of sectors) {
    for (const market of s.markets) {
      entries.push({
        entryType: "SECTOR_BENCHMARK",
        sector: s.sector,
        market,
        data: {
          avgComposite: s.avgComposite,
          topQuartile: Math.round(s.avgComposite * 1.4),
          weakness: s.weakness,
          sampleSize: Math.floor(Math.random() * 15) + 5,
        } as Prisma.InputJsonValue,
        successScore: s.avgComposite / 200,
        sampleSize: Math.floor(Math.random() * 15) + 5,
        sourceHash: "seed-expertise",
      });
    }
  }
  return entries;
}

/**
 * Benchmarks differentiated by sector x business model x positioning.
 * A FMCG brand selling D2C has different dynamics than one selling through distributors.
 */
function generateSectorBusinessModelBenchmarks(): Prisma.KnowledgeEntryCreateInput[] {
  const benchmarks = [
    // FMCG differentiated by model
    { sector: "FMCG", businessModel: "DISTRIBUTION", positioning: "MAINSTREAM", avgComposite: 95, weakness: "D", strengths: ["V", "T"] },
    { sector: "FMCG", businessModel: "PRODUCTION", positioning: "PREMIUM", avgComposite: 110, weakness: "E", strengths: ["A", "D"] },
    { sector: "FMCG", businessModel: "DISTRIBUTION", positioning: "LOW_COST", avgComposite: 80, weakness: "A", strengths: ["V", "I"] },
    // TECH differentiated by model
    { sector: "TECH", businessModel: "ABONNEMENT", positioning: "PREMIUM", avgComposite: 115, weakness: "A", strengths: ["V", "E"] },
    { sector: "TECH", businessModel: "PLATEFORME", positioning: "MAINSTREAM", avgComposite: 105, weakness: "E", strengths: ["V", "I"] },
    { sector: "TECH", businessModel: "FREEMIUM_AD", positioning: "VALUE", avgComposite: 100, weakness: "D", strengths: ["V", "T"] },
    // MODE differentiated by positioning
    { sector: "MODE", businessModel: "DISTRIBUTION", positioning: "LUXE", avgComposite: 130, weakness: "T", strengths: ["A", "D"] },
    { sector: "MODE", businessModel: "DISTRIBUTION", positioning: "PREMIUM", avgComposite: 115, weakness: "E", strengths: ["D", "A"] },
    { sector: "MODE", businessModel: "DISTRIBUTION", positioning: "MAINSTREAM", avgComposite: 95, weakness: "D", strengths: ["V", "I"] },
    { sector: "MODE", businessModel: "DISTRIBUTION", positioning: "LOW_COST", avgComposite: 80, weakness: "A", strengths: ["V", "T"] },
    // BANQUE differentiated by model
    { sector: "BANQUE", businessModel: "FINANCIARISATION", positioning: "PREMIUM", avgComposite: 120, weakness: "E", strengths: ["R", "S"] },
    { sector: "BANQUE", businessModel: "ABONNEMENT", positioning: "MAINSTREAM", avgComposite: 105, weakness: "A", strengths: ["V", "T"] },
    { sector: "BANQUE", businessModel: "PLATEFORME", positioning: "VALUE", avgComposite: 100, weakness: "D", strengths: ["V", "E"] },
    // TELECOM
    { sector: "TELECOM", businessModel: "INFRASTRUCTURE", positioning: "MAINSTREAM", avgComposite: 125, weakness: "A", strengths: ["T", "I"] },
    { sector: "TELECOM", businessModel: "ABONNEMENT", positioning: "PREMIUM", avgComposite: 115, weakness: "E", strengths: ["V", "R"] },
    // SERVICES
    { sector: "SERVICES", businessModel: "SERVICES", positioning: "PREMIUM", avgComposite: 110, weakness: "T", strengths: ["A", "D"] },
    { sector: "SERVICES", businessModel: "SERVICES", positioning: "VALUE", avgComposite: 90, weakness: "D", strengths: ["V", "E"] },
    // IMMOBILIER
    { sector: "IMMOBILIER", businessModel: "PRODUCTION", positioning: "LUXE", avgComposite: 105, weakness: "E", strengths: ["A", "D"] },
    { sector: "IMMOBILIER", businessModel: "DISTRIBUTION", positioning: "MAINSTREAM", avgComposite: 85, weakness: "T", strengths: ["V", "I"] },
  ];

  return benchmarks.map((b) => ({
    entryType: "SECTOR_BENCHMARK" as const,
    sector: b.sector,
    businessModel: b.businessModel,
    data: {
      avgComposite: b.avgComposite,
      topQuartile: Math.round(b.avgComposite * 1.35),
      weakness: b.weakness,
      strengths: b.strengths,
      positioning: b.positioning,
      sampleSize: Math.floor(Math.random() * 10) + 3,
    } as Prisma.InputJsonValue,
    successScore: b.avgComposite / 200,
    sampleSize: Math.floor(Math.random() * 10) + 3,
    sourceHash: "seed-expertise",
  }));
}

function generateBriefPatterns(): Prisma.KnowledgeEntryCreateInput[] {
  const channels = [
    { channel: "INSTAGRAM", successRate: 0.78, avgRevisions: 1.2 },
    { channel: "FACEBOOK", successRate: 0.72, avgRevisions: 1.5 },
    { channel: "TIKTOK", successRate: 0.65, avgRevisions: 2.0 },
    { channel: "LINKEDIN", successRate: 0.80, avgRevisions: 1.1 },
    { channel: "VIDEO", successRate: 0.60, avgRevisions: 2.5 },
    { channel: "PR", successRate: 0.85, avgRevisions: 1.0 },
    { channel: "EVENT", successRate: 0.70, avgRevisions: 1.8 },
    { channel: "PACKAGING", successRate: 0.55, avgRevisions: 3.0 },
  ];

  return channels.map((c) => ({
    entryType: "BRIEF_PATTERN" as const,
    channel: c.channel,
    data: {
      successRate: c.successRate,
      avgRevisions: c.avgRevisions,
    } as Prisma.InputJsonValue,
    successScore: c.successRate,
    sampleSize: Math.floor(Math.random() * 40) + 20,
    sourceHash: "seed-expertise",
  }));
}

function generateFrameworkRankings(): Prisma.KnowledgeEntryCreateInput[] {
  return [
    {
      entryType: "DIAGNOSTIC_RESULT",
      data: {
        type: "framework_ranking",
        rankings: [
          { framework: "FW-01-BRAND-AUDIT", effectiveness: 0.85, usageCount: 120 },
          { framework: "FW-02-COMPETITOR-MAP", effectiveness: 0.78, usageCount: 95 },
          { framework: "FW-03-BRAND-PRISM", effectiveness: 0.82, usageCount: 80 },
          { framework: "FW-04-SWOT-PLUS", effectiveness: 0.75, usageCount: 110 },
          { framework: "FW-05-POSITIONING-MAP", effectiveness: 0.80, usageCount: 70 },
        ],
      } as Prisma.InputJsonValue,
      sourceHash: "seed-expertise",
    },
  ];
}
