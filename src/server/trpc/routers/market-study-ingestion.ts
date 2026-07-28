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
import { assertRawStrategyScope, accessibleStrategyIds } from "../middleware/strategy-scope";
import { previewMarketStudy } from "@/server/services/seshat/market-study-ingestion";
import { MarketStudyExtractionSchema } from "@/server/services/seshat/market-study-ingestion/types";
import { TREND_TRACKER_49, trendTrackerByCategory } from "@/server/services/seshat/knowledge/trend-tracker-49";
import { getTrendTrackerForCountrySector, loadCountrySectorIntelligence } from "@/server/services/seshat/knowledge/access";
import { emitIntent } from "@/server/services/mestor/intents";
import { db } from "@/lib/db";

/* lafusee:governed-active — confirm mutation traverses mestor.emitIntent({ kind: "INGEST_MARKET_STUDY" }), seshat imports are read-only previews + knowledge accessors (Loi 3 — Seshat doesn't write outside emitIntent) */

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
      // ADR-0166 — un strategyId fourni doit appartenir au caller.
      await assertRawStrategyScope(ctx.session.user.id, input, { optional: true });
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
      // ADR-0166 — un strategyId fourni doit appartenir au caller.
      await assertRawStrategyScope(ctx.session.user.id, input, { optional: true });
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

  /**
   * Les études DE L'APPELANT — jamais celles des autres clients (ADR-0186).
   *
   * Cette procédure rendait TOUTES les entrées `MARKET_STUDY_RAW` de la base à
   * tout compte authentifié, sous un libellé cockpit « Vos études ingérées ».
   * Un fondateur voyait donc les documents déposés pour d'autres marques —
   * constaté sur SPAWT, qui affichait des études « Ciment » et « La passion
   * pour propulseur ». La justification (« pool marché global ») vaut pour la
   * connaissance sectorielle DÉRIVÉE (`MarketBenchmark`), pas pour le document
   * déposé par un client : celui-là reste le sien.
   *
   * Les entrées non attribuables (`originStrategyId` nul — seeds sectoriels,
   * legacy) ne sont montrées à personne comme « ses » études : faute de pouvoir
   * dire à qui elles appartiennent, on ne les attribue pas.
   */
  list: protectedProcedure
    .input(z.object({
      countryCode: z.string().length(2).optional(),
      sector: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const allowed = await accessibleStrategyIds(ctx.session.user.id);
      const where: Record<string, unknown> = { entryType: "MARKET_STUDY_RAW" };
      // `null` = ADMIN (voit tout, y compris le non-attribué).
      if (allowed !== null) where.originStrategyId = { in: allowed };
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

  /**
   * Le détail d'une étude — même garde que la liste (ADR-0186).
   *
   * Plus grave encore que la liste : celle-ci ne fuitait que des titres, tandis
   * qu'ici c'est l'EXTRACTION COMPLÈTE qui était rendue à tout authentifié
   * connaissant un identifiant.
   */
  getDetail: protectedProcedure
    .input(z.object({ rawEntryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const raw = await db.knowledgeEntry.findUnique({ where: { id: input.rawEntryId } });
      if (!raw || raw.entryType !== "MARKET_STUDY_RAW") {
        throw new Error("Market study not found");
      }
      const allowed = await accessibleStrategyIds(ctx.session.user.id);
      if (allowed !== null && (!raw.originStrategyId || !allowed.includes(raw.originStrategyId))) {
        // Même message qu'une étude absente : ne pas confirmer l'existence d'un
        // document qu'on n'a pas le droit de lire.
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
          // lafusee:allow-adhoc-completion: market-study ingest progress (entries processed ratio)
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

  /**
   * Run an LLM-driven market research for a (countryCode, sector) pair.
   * Optional source URLs ground the LLM ; absent URLs trigger a memory-only
   * mode flagged in the UI. Output is parsed via the same deterministic
   * parser used for the manual upload, then persisted as KnowledgeEntry
   * rows (cross-brand reusable). Awaits the handler completion.
   */
  runResearch: protectedProcedure
    .input(z.object({
      query: z.string().min(8).max(4000),
      countryCode: z.string().length(2),
      sector: z.string().min(1),
      sourceUrls: z.array(z.string().url()).max(20).optional(),
      strategyId: z.string().optional(),
      brandNature: z.string().optional(),
      cascadeLevel: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // ADR-0166 — un strategyId fourni doit appartenir au caller.
      await assertRawStrategyScope(ctx.session.user.id, input, { optional: true });
      const result = await emitIntent(
        {
          kind: "RUN_MARKET_RESEARCH",
          strategyId: input.strategyId ?? "(global)",
          payload: {
            query: input.query,
            countryCode: input.countryCode,
            sector: input.sector,
            sourceUrls: input.sourceUrls,
            uploadedBy: ctx.session?.user?.id ?? "anonymous",
            brandNature: input.brandNature,
            cascadeLevel: input.cascadeLevel,
          },
        },
        { caller: "market-study-ingestion:runResearch" },
      );
      return result;
    }),

  /**
   * Generate a PDF for a previously persisted MARKET_STUDY_RAW entry.
   * Returns the PDF as a base64 string for the client to download.
   */
  /** Export PDF — même garde que `getDetail` : c'est l'étude ENTIÈRE (ADR-0186). */
  exportResearchPdf: protectedProcedure
    .input(z.object({ rawEntryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const raw = await db.knowledgeEntry.findUnique({ where: { id: input.rawEntryId } });
      if (!raw || raw.entryType !== "MARKET_STUDY_RAW") {
        throw new Error("Market study not found");
      }
      const allowed = await accessibleStrategyIds(ctx.session.user.id);
      if (allowed !== null && (!raw.originStrategyId || !allowed.includes(raw.originStrategyId))) {
        throw new Error("Market study not found");
      }
      const data = raw.data as {
        fullExtraction?: unknown;
        sourceUrl?: string;
        uploadedAt?: string;
      };
      const { MarketStudyExtractionSchema } = await import("@/server/services/seshat/market-study-ingestion/types");
      const validated = MarketStudyExtractionSchema.safeParse(data.fullExtraction);
      if (!validated.success) {
        throw new Error(`Stored extraction does not match schema: ${validated.error.message.slice(0, 200)}`);
      }
      const { renderMarketStudyPdf } = await import("@/server/services/artemis/market-research/pdf-renderer");
      const pdf = renderMarketStudyPdf({
        extraction: validated.data,
        countryCode: raw.countryCode ?? "—",
        sector: raw.sector ?? "—",
        generatedAt: data.uploadedAt ?? raw.createdAt.toISOString(),
        sourcesUrls: data.sourceUrl ? [data.sourceUrl] : undefined,
        memoryOnlyWarning: !data.sourceUrl,
      });
      return {
        rawEntryId: raw.id,
        pdfBase64: pdf.toString("base64"),
        contentType: "application/pdf",
        filenameSuggested: `market-study-${raw.countryCode ?? "XX"}-${(raw.sector ?? "sector").replace(/\s+/g, "-")}-${raw.id.slice(0, 8)}.pdf`,
      };
    }),
});
