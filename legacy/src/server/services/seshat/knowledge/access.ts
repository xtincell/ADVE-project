/**
 * Knowledge access helpers (ADR-0037 PR-L).
 *
 * Replaces ad-hoc `db.knowledgeEntry.findMany` scattered across services
 * with country+sector typed lookups. Pillar T `tamSamSom`,
 * `competitorOvertonPositions`, `marketReality`, `weakSignalAnalysis` —
 * all consume these helpers post-PR-L. No more LLM hallucination of TAM
 * when an actual study has been ingested for that country/sector.
 */

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  type TamSamSom,
  type CompetitorShare,
  type ConsumerSegment,
  type TrendTrackerExtraction,
  validateKnowledgeData,
  MarketStudyTamDataSchema,
  MarketStudyCompetitorDataSchema,
  MarketStudySegmentDataSchema,
  ExternalFeedDigestDataSchema,
} from "./schemas";

const FRESH_DEFAULT_DAYS = 90; // market-study data is fresh longer than weak signals.

function staleCutoff(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Get the freshest TAM/SAM/SOM available for a country+sector pair.
 * Returns `null` if no MARKET_STUDY_TAM entry exists or all are stale.
 */
export async function getTamForCountrySector(
  countryCode: string,
  sector: string,
  options?: { maxAgeDays?: number },
): Promise<TamSamSom | null> {
  const cutoff = staleCutoff(options?.maxAgeDays ?? FRESH_DEFAULT_DAYS);
  const entry = await db.knowledgeEntry.findFirst({
    where: {
      entryType: "MARKET_STUDY_TAM",
      countryCode,
      sector: { contains: sector, mode: "insensitive" as Prisma.QueryMode },
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    select: { data: true },
  });
  if (!entry) return null;
  const parsed = MarketStudyTamDataSchema.safeParse(entry.data);
  if (!parsed.success) return null;
  return { tam: parsed.data.tam, sam: parsed.data.sam, som: parsed.data.som };
}

/**
 * Get all competitor market shares for a country+sector pair.
 * Returns an empty array if no MARKET_STUDY_COMPETITOR entries exist.
 */
export async function getCompetitorSharesForCountrySector(
  countryCode: string,
  sector: string,
  options?: { maxAgeDays?: number },
): Promise<CompetitorShare[]> {
  const cutoff = staleCutoff(options?.maxAgeDays ?? FRESH_DEFAULT_DAYS);
  const entries = await db.knowledgeEntry.findMany({
    where: {
      entryType: "MARKET_STUDY_COMPETITOR",
      countryCode,
      sector: { contains: sector, mode: "insensitive" as Prisma.QueryMode },
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    select: { data: true },
  });
  const out: CompetitorShare[] = [];
  for (const e of entries) {
    const parsed = MarketStudyCompetitorDataSchema.safeParse(e.data);
    if (parsed.success) {
      out.push({ name: parsed.data.name, marketSharePct: parsed.data.marketSharePct, year: parsed.data.year, source: parsed.data.source });
    }
  }
  return out;
}

/**
 * Get all consumer segments for a country+sector pair.
 */
export async function getMarketSegmentsForCountrySector(
  countryCode: string,
  sector: string,
  options?: { maxAgeDays?: number },
): Promise<ConsumerSegment[]> {
  const cutoff = staleCutoff(options?.maxAgeDays ?? FRESH_DEFAULT_DAYS);
  const entries = await db.knowledgeEntry.findMany({
    where: {
      entryType: "MARKET_STUDY_SEGMENT",
      countryCode,
      sector: { contains: sector, mode: "insensitive" as Prisma.QueryMode },
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    select: { data: true },
  });
  const out: ConsumerSegment[] = [];
  for (const e of entries) {
    const parsed = MarketStudySegmentDataSchema.safeParse(e.data);
    if (parsed.success) {
      out.push({ segment: parsed.data.segment, sizePct: parsed.data.sizePct, demographics: parsed.data.demographics, behaviors: parsed.data.behaviors, painPoints: parsed.data.painPoints });
    }
  }
  return out;
}

/**
 * Get aggregated macro + weak signals digest for a country+sector pair.
 */
export async function getMacroAndWeakSignalsForCountrySector(
  countryCode: string,
  sector: string,
  options?: { maxAgeDays?: number },
): Promise<{ macroSignals: Array<{ trend: string; evidence: string }>; weakSignals: Array<{ event: string; causalChain: string[]; impactCategory: string }> }> {
  const cutoff = staleCutoff(options?.maxAgeDays ?? FRESH_DEFAULT_DAYS);
  const entries = await db.knowledgeEntry.findMany({
    where: {
      entryType: "EXTERNAL_FEED_DIGEST",
      countryCode,
      sector: { contains: sector, mode: "insensitive" as Prisma.QueryMode },
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { data: true },
  });
  const macroSignals: Array<{ trend: string; evidence: string }> = [];
  const weakSignals: Array<{ event: string; causalChain: string[]; impactCategory: string }> = [];
  for (const e of entries) {
    const parsed = ExternalFeedDigestDataSchema.safeParse(e.data);
    if (!parsed.success) continue;
    for (const m of parsed.data.macroSignals ?? []) macroSignals.push({ trend: m.trend, evidence: m.evidence });
    for (const w of parsed.data.weakSignals ?? []) weakSignals.push({ event: w.event, causalChain: w.causalChain, impactCategory: w.impactCategory });
  }
  return { macroSignals, weakSignals };
}

/**
 * Get the most recent Trend Tracker 49-variable extraction for a
 * country+sector pair. Returns null if no extraction has been ingested.
 */
export async function getTrendTrackerForCountrySector(
  countryCode: string,
  sector: string,
  options?: { maxAgeDays?: number },
): Promise<TrendTrackerExtraction | null> {
  const cutoff = staleCutoff(options?.maxAgeDays ?? FRESH_DEFAULT_DAYS);
  const entry = await db.knowledgeEntry.findFirst({
    where: {
      entryType: "EXTERNAL_FEED_DIGEST",
      countryCode,
      sector: { contains: sector, mode: "insensitive" as Prisma.QueryMode },
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    select: { data: true },
  });
  if (!entry) return null;
  const parsed = ExternalFeedDigestDataSchema.safeParse(entry.data);
  if (!parsed.success) return null;
  return parsed.data.trendTracker ?? null;
}

/**
 * Convenience : load everything country-scoped relevant for pillar T
 * synthesis in one call. Returns empty arrays / null when nothing
 * available — the caller (Tarsis runMarketIntelligence) falls back to
 * LLM-only synthesis with the CONTEXTE PAYS block (PR-D) so behaviour
 * gracefully degrades.
 */
export async function loadCountrySectorIntelligence(
  countryCode: string,
  sector: string,
): Promise<{
  tamSamSom: TamSamSom | null;
  competitors: CompetitorShare[];
  segments: ConsumerSegment[];
  signals: { macroSignals: Array<{ trend: string; evidence: string }>; weakSignals: Array<{ event: string; causalChain: string[]; impactCategory: string }> };
  trendTracker: TrendTrackerExtraction | null;
}> {
  const [tamSamSom, competitors, segments, signals, trendTracker] = await Promise.all([
    getTamForCountrySector(countryCode, sector),
    getCompetitorSharesForCountrySector(countryCode, sector),
    getMarketSegmentsForCountrySector(countryCode, sector),
    getMacroAndWeakSignalsForCountrySector(countryCode, sector),
    getTrendTrackerForCountrySector(countryCode, sector),
  ]);
  return { tamSamSom, competitors, segments, signals, trendTracker };
}

// Re-export validation helper for callers
export { validateKnowledgeData };
