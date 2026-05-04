/**
 * MarketStudy ingestion — types & Zod schemas (ADR-0037 PR-I).
 *
 * `MarketStudyExtraction` is the canonical shape returned by the LLM
 * extractor (`extractor-llm.ts`) when it digests a PDF/DOCX/XLSX
 * uploaded by an operator. The persister (`persister.ts`) decomposes
 * this single object into N typed `KnowledgeEntry` rows.
 *
 * The Zod schema is tolerant : every nested field is optional. The
 * extractor returns `null` for sections it cannot find in the source
 * — anti-hallucination. Validation runs after the LLM call to drop
 * malformed sections without losing the whole extraction.
 */

import { z } from "zod";
import {
  SourcedValueSchema,
  CompetitorShareSchema,
  ConsumerSegmentSchema,
  MacroSignalSchema,
  WeakSignalLitelSchema,
  TrendTrackerExtractionSchema,
} from "@/server/services/seshat/knowledge/schemas";

export const MarketStudyMetaSchema = z.object({
  title: z.string(),
  publisher: z.string().optional(),
  publishedAt: z.string().optional(), // ISO date
  methodology: z.string().optional(),
  sampleSize: z.number().int().optional(),
  geography: z.string().optional(), // free-text country/region as found
  sectorCoverage: z.array(z.string()).default([]),
});
export type MarketStudyMeta = z.infer<typeof MarketStudyMetaSchema>;

export const MarketStudyExtractionSchema = z.object({
  study: MarketStudyMetaSchema,
  tam: SourcedValueSchema.nullable().optional(),
  sam: SourcedValueSchema.nullable().optional(),
  som: SourcedValueSchema.nullable().optional(),
  growthRates: z.array(z.object({
    segment: z.string(),
    cagr: z.number(),
    period: z.string(),
    source: z.string().optional(),
  })).default([]),
  competitorShares: z.array(CompetitorShareSchema).default([]),
  consumerSegments: z.array(ConsumerSegmentSchema).default([]),
  pricePoints: z.array(z.object({
    tier: z.string(),
    range: z.string().optional(),
    asp: z.number().optional(),
    source: z.string().optional(),
  })).default([]),
  channelMix: z.array(z.object({
    channel: z.string(),
    sharePct: z.number().min(0).max(100),
    growthTrend: z.string().optional(),
  })).default([]),
  regulatorySignals: z.array(z.object({
    regulation: z.string(),
    impactSeverity: z.enum(["LOW", "MEDIUM", "HIGH"]),
    timeline: z.string().optional(),
  })).default([]),
  macroSignals: z.array(MacroSignalSchema).default([]),
  weakSignals: z.array(WeakSignalLitelSchema).default([]),
  trendTracker: TrendTrackerExtractionSchema.optional(),
});
export type MarketStudyExtraction = z.infer<typeof MarketStudyExtractionSchema>;

export interface IngestMarketStudyInput {
  /** Raw uploaded file as Buffer + filename + mime. */
  file: { buffer: Buffer; filename: string; mimeType: string };
  /** Operator who uploaded — for lineage/audit. */
  uploadedBy: string;
  /** Strategy this study is associated with (optional — global studies skip). */
  strategyId?: string;
  /** Operator-declared country (overrides extraction.geography mapping if set). */
  declaredCountryCode?: string;
  /** Operator-declared sector (overrides extraction.sectorCoverage[0] if set). */
  declaredSector?: string;
  /** Source URL if downloaded from web (Statista, etc.). */
  sourceUrl?: string;
}

export interface IngestMarketStudyResult {
  status: "OK" | "DUPLICATE" | "PARSE_FAILED" | "EMPTY_EXTRACTION";
  sha256: string;
  countryCode?: string;
  sector?: string;
  entriesCreated: number;
  rawEntryId?: string;
  extraction?: MarketStudyExtraction;
  error?: string;
}
