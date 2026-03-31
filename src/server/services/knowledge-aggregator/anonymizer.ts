/**
 * Knowledge Graph Anonymization Pipeline
 * Generates sourceHash for cross-client data without revealing identities
 */

import { db } from "@/lib/db";
import { createHash } from "crypto";

/**
 * Generate a one-way hash for anonymizing strategy/client data
 */
export function generateSourceHash(strategyId: string, salt?: string): string {
  const hashSalt = salt ?? process.env.KNOWLEDGE_HASH_SALT ?? "lafusee-kg-v1";
  return createHash("sha256").update(`${strategyId}:${hashSalt}`).digest("hex").slice(0, 16);
}

/**
 * Anonymize a knowledge entry — strip identifiable info, add sourceHash
 */
export function anonymizeEntry(data: Record<string, unknown>, strategyId: string): Record<string, unknown> {
  const hash = generateSourceHash(strategyId);
  const anonymized = { ...data };

  // Remove directly identifiable fields
  const sensitiveFields = [
    "strategyId", "userId", "clientName", "brandName", "companyName",
    "contactName", "contactEmail", "contactPhone", "operatorId",
  ];

  for (const field of sensitiveFields) {
    delete anonymized[field];
  }

  // Replace nested identifiable data
  if (typeof anonymized.strategy === "object" && anonymized.strategy !== null) {
    const strat = anonymized.strategy as Record<string, unknown>;
    delete strat.name;
    delete strat.description;
    delete strat.userId;
    anonymized.strategy = strat;
  }

  anonymized.sourceHash = hash;
  return anonymized;
}

/**
 * Run the anonymization pipeline on all knowledge entries missing sourceHash
 */
export async function runAnonymizationPipeline(): Promise<{ processed: number; errors: number }> {
  const entries = await db.knowledgeEntry.findMany({
    where: { sourceHash: null },
    take: 500, // Process in batches
  });

  let processed = 0;
  let errors = 0;

  for (const entry of entries) {
    try {
      const data = entry.data as Record<string, unknown>;

      // Extract strategyId from data if available
      const strategyId = (data.strategyId as string) ?? entry.id;
      const hash = generateSourceHash(strategyId);
      const anonymizedData = anonymizeEntry(data, strategyId);

      await db.knowledgeEntry.update({
        where: { id: entry.id },
        data: {
          sourceHash: hash,
          data: anonymizedData as never,
        },
      });

      processed++;
    } catch {
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * Aggregate anonymized cross-client benchmarks
 */
export async function aggregateCrossClientBenchmarks(sector?: string, market?: string) {
  const where: Record<string, unknown> = {
    sourceHash: { not: null }, // Only anonymized entries
    entryType: "SECTOR_BENCHMARK",
  };
  if (sector) where.sector = sector;
  if (market) where.market = market;

  const entries = await db.knowledgeEntry.findMany({ where: where as never });

  // Aggregate scores by sector
  const byKey = new Map<string, { scores: number[]; count: number }>();
  for (const entry of entries) {
    const data = entry.data as Record<string, unknown>;
    const score = typeof data.score === "number" ? data.score : null;
    if (score == null) continue;

    const key = `${entry.sector ?? "unknown"}:${entry.market ?? "all"}`;
    const existing = byKey.get(key) ?? { scores: [], count: 0 };
    existing.scores.push(score);
    existing.count++;
    byKey.set(key, existing);
  }

  return Array.from(byKey.entries()).map(([key, { scores, count }]) => {
    const [sectorKey, marketKey] = key.split(":");
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;

    return {
      sector: sectorKey,
      market: marketKey,
      count,
      avgScore: Math.round(avg * 100) / 100,
      medianScore: median,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      p25: sorted[Math.floor(sorted.length * 0.25)] ?? 0,
      p75: sorted[Math.floor(sorted.length * 0.75)] ?? 0,
    };
  });
}
