/**
 * Typed schemas for `KnowledgeEntry.data` (ADR-0037 PR-L).
 *
 * Avant PR-L, `data` était un `Json` ouvert où chaque caller inventait
 * sa propre forme. Conséquence : impossible de requêter un TAM ZA
 * cosmetics 2025 — la valeur était noyée dans `data.signals[3]
 * .causalChain[2]` ou ailleurs selon qui avait écrit l'entry.
 *
 * Après PR-L : discriminated union au runtime via Zod, par `entryType`.
 * Les types KnowledgeType existants (`SECTOR_BENCHMARK`, etc.) reçoivent
 * un schéma fermé. Les nouveaux types (PR-I) ont leur propre schéma
 * strict (TAM/COMPETITOR/SEGMENT/RAW).
 *
 * `MARKET_STUDY_RAW` reste tolérant (`fullExtraction: z.unknown()`)
 * pour permettre re-extraction avec un futur schéma sans perdre la
 * matière brute.
 */

import { z } from "zod";

// ── Building blocks ──────────────────────────────────────────────────

export const SourcedValueSchema = z.object({
  value: z.number(),
  currency: z.string().optional(),
  year: z.number().int(),
  methodology: z.string().optional(),
  source: z.string(),
});
export type SourcedValue = z.infer<typeof SourcedValueSchema>;

export const TamSamSomSchema = z.object({
  tam: SourcedValueSchema,
  sam: SourcedValueSchema.optional(),
  som: SourcedValueSchema.optional(),
});
export type TamSamSom = z.infer<typeof TamSamSomSchema>;

export const CompetitorShareSchema = z.object({
  name: z.string(),
  marketSharePct: z.number().min(0).max(100).optional(),
  year: z.number().int(),
  source: z.string().optional(),
});
export type CompetitorShare = z.infer<typeof CompetitorShareSchema>;

export const ConsumerSegmentSchema = z.object({
  segment: z.string(),
  sizePct: z.number().min(0).max(100),
  demographics: z.record(z.string(), z.unknown()).optional(),
  behaviors: z.array(z.string()).default([]),
  painPoints: z.array(z.string()).default([]),
});
export type ConsumerSegment = z.infer<typeof ConsumerSegmentSchema>;

export const MacroSignalSchema = z.object({
  trend: z.string(),
  evidence: z.string(),
  timeHorizon: z.enum(["SHORT", "MEDIUM", "LONG"]).optional(),
});
export type MacroSignal = z.infer<typeof MacroSignalSchema>;

export const WeakSignalLitelSchema = z.object({
  event: z.string(),
  causalChain: z.array(z.string()).default([]),
  impactCategory: z.string(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});
export type WeakSignalLite = z.infer<typeof WeakSignalLitelSchema>;

export const TrendTrackerExtractionSchema = z.record(
  z.string(),
  z.object({
    value: z.union([z.number(), z.string()]).nullable(),
    year: z.number().int().optional(),
    source: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
  }),
);
export type TrendTrackerExtraction = z.infer<typeof TrendTrackerExtractionSchema>;

// ── Per-entryType data schemas ───────────────────────────────────────

export const SectorBenchmarkDataSchema = z.object({
  type: z.string().optional(),
  signals: z.array(z.unknown()).optional(),
  pillarContent: z.unknown().optional(),
  weakSignals: z.array(z.unknown()).optional(),
  generatedAt: z.string().optional(),
  generatedFor: z.string().optional(),
  analyzedAt: z.string().optional(),
  // Forward-compat : older Wakanda seed has free-form benchmark KPIs.
}).passthrough();

export const MarketStudyTamDataSchema = z.object({
  tam: SourcedValueSchema,
  sam: SourcedValueSchema.optional(),
  som: SourcedValueSchema.optional(),
  studyTitle: z.string().optional(),
  publisher: z.string().optional(),
});

export const MarketStudyCompetitorDataSchema = CompetitorShareSchema.extend({
  studyTitle: z.string().optional(),
  publisher: z.string().optional(),
});

export const MarketStudySegmentDataSchema = ConsumerSegmentSchema.extend({
  studyTitle: z.string().optional(),
  publisher: z.string().optional(),
});

export const ExternalFeedDigestDataSchema = z.object({
  macroSignals: z.array(MacroSignalSchema).default([]),
  weakSignals: z.array(WeakSignalLitelSchema).default([]),
  trendTracker: TrendTrackerExtractionSchema.optional(),
  generatedAt: z.string(),
  feedSource: z.string().optional(),
});

export const MarketStudyRawDataSchema = z.object({
  fullExtraction: z.unknown(),
  sourceUrl: z.string().optional(),
  uploadedBy: z.string(),
  sha256: z.string(),
  uploadedAt: z.string(),
  studyTitle: z.string().optional(),
  publisher: z.string().optional(),
});

// ── Discriminated union per entryType ────────────────────────────────

export const KnowledgeEntryDataByType = {
  // Existing KnowledgeType values (kept tolerant for compat)
  DIAGNOSTIC_RESULT: z.unknown(),
  MISSION_OUTCOME: z.unknown(),
  BRIEF_PATTERN: z.unknown(),
  CREATOR_PATTERN: z.unknown(),
  SECTOR_BENCHMARK: SectorBenchmarkDataSchema,
  CAMPAIGN_TEMPLATE: z.unknown(),
  FEEDBACK_VALIDATED: z.unknown(),
  // PR-I new values (ADR-0037)
  MARKET_STUDY_TAM: MarketStudyTamDataSchema,
  MARKET_STUDY_COMPETITOR: MarketStudyCompetitorDataSchema,
  MARKET_STUDY_SEGMENT: MarketStudySegmentDataSchema,
  EXTERNAL_FEED_DIGEST: ExternalFeedDigestDataSchema,
  MARKET_STUDY_RAW: MarketStudyRawDataSchema,
} as const;

export type KnowledgeEntryType = keyof typeof KnowledgeEntryDataByType;

/**
 * Validate a `data` payload against the schema for its entryType.
 * Returns `{ ok: true, data }` on success, `{ ok: false, error }` on
 * failure. Never throws — caller decides if a failure is fatal.
 */
export function validateKnowledgeData<T extends KnowledgeEntryType>(
  entryType: T,
  data: unknown,
): { ok: true; data: z.infer<(typeof KnowledgeEntryDataByType)[T]> } | { ok: false; error: string } {
  const schema = KnowledgeEntryDataByType[entryType];
  if (!schema) return { ok: false, error: `Unknown entryType: ${entryType}` };
  const result = schema.safeParse(data);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, data: result.data as z.infer<(typeof KnowledgeEntryDataByType)[T]> };
}
