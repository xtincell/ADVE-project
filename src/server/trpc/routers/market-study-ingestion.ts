/**
 * Market Study Ingestion Router — NETERU-governed (Mestor → Seshat).
 *
 * Cf. ADR-0037 PR-J. Pattern calqué sur brief-ingest (preview → confirm).
 *
 * Procedures :
 *   - preview  : extract + LLM, no persist. Operator reviews extraction.
 *   - confirm  : persist via INGEST_MARKET_STUDY intent (mestor.emitIntent).
 *   - list     : list MARKET_STUDY_RAW entries (cockpit + console).
 *   - getDetail: fetch one RAW + derived (countries summary).
 *   - reExtract: re-extract from archived RAW.
 *   - listTrendTracker : fetch the canon 49-variable catalog (UI).
 *   - getTrendTrackerForCountrySector : fetch ingested values for the page Track.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { previewMarketStudy } from "@/server/services/seshat/market-study-ingestion";
import { MarketStudyExtractionSchema } from "@/server/services/seshat/market-study-ingestion/types";
import { TREND_TRACKER_49, trendTrackerByCategory } from "@/server/services/seshat/knowledge/trend-tracker-49";
import { getTrendTrackerForCountrySector, loadCountrySectorIntelligence } from "@/server/services/seshat/knowledge/access";
import { emitIntent } from "@/server/services/mestor/intents";
import { db } from "@/lib/db";

const FileInputSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  /** base64-encoded file content (browser FileReader.result without data: prefix). */
  base64: z.string().min(1),
});

function decodeFile(input: { base64: string; filename: string; mimeType: string }): { buffer: Buffer; filename: string; mimeType: string } {
  const cleaned = input.base64.replace(/^data:[^;]+;base64,/, "");
  return {
    buffer: Buffer.from(cleaned, "base64"),
    filename: input.filename,
    mimeType: input.mimeType,
  };
}

export const marketStudyIngestionRouter = createTRPCRouter({
  preview: protectedProcedure
    .input(z.object({
      file: FileInputSchema,
      strategyId: z.string().optional(),
      declaredCountryCode: z.string().length(2).optional(),
      declaredSector: z.string().optional(),
      sourceUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const file = decodeFile(input.file);
      if (file.buffer.length > 50 * 1024 * 1024) {
        throw new Error("File too large (max 50 MB).");
      }
      const result = await previewMarketStudy({
        file,
        uploadedBy: ctx.session?.user?.id ?? "anonymous",
        strategyId: input.strategyId,
        declaredCountryCode: input.declaredCountryCode,
        declaredSector: input.declaredSector,
        sourceUrl: input.sourceUrl,
      });
      return result;
    }),

  confirm: protectedProcedure
    .input(z.object({
      sha256: z.string().length(64),
      countryCode: z.string().length(2),
      sector: z.string().min(1),
      extraction: MarketStudyExtractionSchema,
      strategyId: z.string().optional(),
      sourceUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await emitIntent(
        {
          kind: "INGEST_MARKET_STUDY",
          strategyId: input.strategyId ?? "(global)",
          payload: {
            sha256: input.sha256,
            countryCode: input.countryCode,
            sector: input.sector,
            uploadedBy: ctx.session?.user?.id ?? "anonymous",
            extraction: input.extraction,
            sourceUrl: input.sourceUrl,
          },
        },
        { caller: "market-study-ingestion:confirm" },
      );
      return result;
    }),

  list: protectedProcedure
    .input(z.object({
      strategyId: z.string().optional(),
      countryCode: z.string().length(2).optional(),
      sector: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      const where: Record<string, unknown> = { entryType: "MARKET_STUDY_RAW" };
      if (input.countryCode) where.countryCode = input.countryCode;
      if (input.sector) where.sector = { contains: input.sector, mode: "insensitive" };
      const entries = await db.knowledgeEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          sector: true,
          countryCode: true,
          sourceHash: true,
          data: true,
          createdAt: true,
        },
      });
      return entries.map((e) => {
        const d = e.data as { studyTitle?: string; publisher?: string; uploadedBy?: string };
        return {
          id: e.id,
          sector: e.sector,
          countryCode: e.countryCode,
          sourceHash: e.sourceHash,
          studyTitle: d.studyTitle ?? "(sans titre)",
          publisher: d.publisher,
          uploadedBy: d.uploadedBy,
          createdAt: e.createdAt,
        };
      });
    }),

  getDetail: protectedProcedure
    .input(z.object({ rawEntryId: z.string() }))
    .query(async ({ input }) => {
      const raw = await db.knowledgeEntry.findUnique({ where: { id: input.rawEntryId } });
      if (!raw || raw.entryType !== "MARKET_STUDY_RAW") {
        throw new Error("Market study not found");
      }
      const derived = await db.knowledgeEntry.findMany({
        where: {
          sourceHash: raw.sourceHash ?? undefined,
          entryType: { in: ["MARKET_STUDY_TAM", "MARKET_STUDY_COMPETITOR", "MARKET_STUDY_SEGMENT", "EXTERNAL_FEED_DIGEST"] },
        },
      });
      return {
        raw: { id: raw.id, sector: raw.sector, countryCode: raw.countryCode, sourceHash: raw.sourceHash, data: raw.data, createdAt: raw.createdAt },
        derived: derived.map((d) => ({ id: d.id, entryType: d.entryType, data: d.data, createdAt: d.createdAt })),
      };
    }),

  reExtract: adminProcedure
    .input(z.object({ rawEntryId: z.string() }))
    .mutation(async ({ input }) => {
      const result = await emitIntent(
        {
          kind: "RE_EXTRACT_MARKET_STUDY",
          strategyId: "(global)",
          rawEntryId: input.rawEntryId,
        },
        { caller: "market-study-ingestion:reExtract" },
      );
      return result;
    }),

  /** Trend Tracker 49 catalog. Static — no DB call. */
  listTrendTracker: protectedProcedure.query(() => {
    return {
      version: "V1_2026_05",
      total: TREND_TRACKER_49.length,
      byCategory: trendTrackerByCategory(),
      flat: TREND_TRACKER_49,
    };
  }),

  /**
   * Trend Tracker values ingested for a (countryCode, sector) pair.
   * Powers the cockpit page Track view.
   */
  getTrendTrackerForCountrySector: protectedProcedure
    .input(z.object({
      countryCode: z.string().length(2),
      sector: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const tracker = await getTrendTrackerForCountrySector(input.countryCode, input.sector);
      return {
        countryCode: input.countryCode,
        sector: input.sector,
        catalog: TREND_TRACKER_49,
        values: tracker ?? {},
        coveragePct: tracker
          ? Math.round((Object.keys(tracker).filter((k) => tracker[k]?.value != null).length / TREND_TRACKER_49.length) * 100)
          : 0,
      };
    }),

  /** Full intelligence dump for a country/sector — used by Track page summary. */
  loadCountrySectorIntelligence: protectedProcedure
    .input(z.object({
      countryCode: z.string().length(2),
      sector: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const data = await loadCountrySectorIntelligence(input.countryCode, input.sector);
      return data;
    }),
});
