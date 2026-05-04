/**
 * MarketStudy → KnowledgeEntry persister (ADR-0037 PR-I).
 *
 * Decomposes one MarketStudyExtraction into N typed KnowledgeEntry rows
 * indexed by (entryType, countryCode, sector, sourceHash). Idempotent
 * via sourceHash dedup (re-uploading the same file is a no-op).
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { MarketStudyExtraction } from "./types";

export interface PersistOptions {
  countryCode: string;
  sector: string;
  sha256: string;
  uploadedBy: string;
  sourceUrl?: string;
  uploadedAt?: string;
  strategyId?: string;
}

export interface PersistResult {
  rawEntryId: string;
  tamEntryId?: string;
  competitorEntryIds: string[];
  segmentEntryIds: string[];
  digestEntryId?: string;
  totalCreated: number;
}

export async function persistMarketStudy(
  extraction: MarketStudyExtraction,
  opts: PersistOptions,
): Promise<PersistResult> {
  const uploadedAt = opts.uploadedAt ?? new Date().toISOString();
  const studyTitle = extraction.study.title;
  const publisher = extraction.study.publisher;

  // 1. RAW archive (always created — audit + re-extract)
  const raw = await db.knowledgeEntry.create({
    data: {
      entryType: "MARKET_STUDY_RAW",
      sector: opts.sector,
      countryCode: opts.countryCode,
      market: opts.countryCode, // legacy mirror for backwards compat
      sourceHash: opts.sha256,
      data: JSON.parse(JSON.stringify({
        fullExtraction: extraction,
        sourceUrl: opts.sourceUrl,
        uploadedBy: opts.uploadedBy,
        sha256: opts.sha256,
        uploadedAt,
        studyTitle,
        publisher,
      })) as Prisma.InputJsonValue,
      sampleSize: 1,
    },
  });

  let tamEntryId: string | undefined;
  const competitorEntryIds: string[] = [];
  const segmentEntryIds: string[] = [];
  let digestEntryId: string | undefined;
  let totalCreated = 1; // raw counted

  // 2. TAM / SAM / SOM entry (only if at least TAM is present)
  if (extraction.tam) {
    const t = await db.knowledgeEntry.create({
      data: {
        entryType: "MARKET_STUDY_TAM",
        sector: opts.sector,
        countryCode: opts.countryCode,
        market: opts.countryCode,
        sourceHash: opts.sha256,
        data: JSON.parse(JSON.stringify({
          tam: extraction.tam,
          sam: extraction.sam ?? undefined,
          som: extraction.som ?? undefined,
          studyTitle,
          publisher,
        })) as Prisma.InputJsonValue,
        sampleSize: 1,
      },
    });
    tamEntryId = t.id;
    totalCreated++;
  }

  // 3. Competitor shares — 1 entry per competitor
  for (const c of extraction.competitorShares) {
    const e = await db.knowledgeEntry.create({
      data: {
        entryType: "MARKET_STUDY_COMPETITOR",
        sector: opts.sector,
        countryCode: opts.countryCode,
        market: opts.countryCode,
        sourceHash: opts.sha256,
        data: JSON.parse(JSON.stringify({ ...c, studyTitle, publisher })) as Prisma.InputJsonValue,
        sampleSize: 1,
      },
    });
    competitorEntryIds.push(e.id);
    totalCreated++;
  }

  // 4. Consumer segments — 1 entry per segment
  for (const s of extraction.consumerSegments) {
    const e = await db.knowledgeEntry.create({
      data: {
        entryType: "MARKET_STUDY_SEGMENT",
        sector: opts.sector,
        countryCode: opts.countryCode,
        market: opts.countryCode,
        sourceHash: opts.sha256,
        data: JSON.parse(JSON.stringify({ ...s, studyTitle, publisher })) as Prisma.InputJsonValue,
        sampleSize: 1,
      },
    });
    segmentEntryIds.push(e.id);
    totalCreated++;
  }

  // 5. Aggregated signals digest (only if any signal present)
  if (extraction.macroSignals.length > 0 || extraction.weakSignals.length > 0 || extraction.trendTracker) {
    const e = await db.knowledgeEntry.create({
      data: {
        entryType: "EXTERNAL_FEED_DIGEST",
        sector: opts.sector,
        countryCode: opts.countryCode,
        market: opts.countryCode,
        sourceHash: opts.sha256,
        data: JSON.parse(JSON.stringify({
          macroSignals: extraction.macroSignals,
          weakSignals: extraction.weakSignals,
          trendTracker: extraction.trendTracker,
          generatedAt: uploadedAt,
          feedSource: `market-study:${studyTitle}`,
        })) as Prisma.InputJsonValue,
        sampleSize: extraction.macroSignals.length + extraction.weakSignals.length,
      },
    });
    digestEntryId = e.id;
    totalCreated++;
  }

  return {
    rawEntryId: raw.id,
    tamEntryId,
    competitorEntryIds,
    segmentEntryIds,
    digestEntryId,
    totalCreated,
  };
}

/**
 * Delete all derived entries (TAM/COMPETITOR/SEGMENT/DIGEST) for a
 * sourceHash, keeping the RAW. Used by re-extraction flow.
 */
export async function deleteDerivedEntries(sha256: string): Promise<number> {
  const result = await db.knowledgeEntry.deleteMany({
    where: {
      sourceHash: sha256,
      entryType: { in: ["MARKET_STUDY_TAM", "MARKET_STUDY_COMPETITOR", "MARKET_STUDY_SEGMENT", "EXTERNAL_FEED_DIGEST"] },
    },
  });
  return result.count;
}
