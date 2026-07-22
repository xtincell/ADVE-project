/**
 * Ingestion Pipeline Router — Upload, extract, analyze, fill ADVE, validate
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure, operatorProcedure } from "../init";
import { strategyScopedProcedure } from "../middleware/strategy-scope";
import * as ingestion from "@/server/services/ingestion-pipeline";
import { AdveKeySchema } from "@/domain";
import { SourceCertaintySchema } from "@/domain/source-certainty";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

/**
 * Fire PROPOSE_VAULT_FROM_SOURCE for a freshly extracted source. Best-effort,
 * non-blocking — the operator can also re-trigger from the cockpit
 * Propositions vault panel if this fails. Auto-classification per the user
 * choice "Auto + validation opérateur" (no auto-promotion to CANDIDATE).
 */
function fireVaultProposalHook(
  strategyId: string,
  sourceId: string,
  operatorId: string,
): void {
  void (async () => {
    try {
      const { emitIntent } = await import("@/server/services/mestor/intents");
      await emitIntent(
        { kind: "PROPOSE_VAULT_FROM_SOURCE", strategyId, sourceId, operatorId },
        { caller: "ingestion-router:propose-vault" },
      );
    } catch (err) {
      console.warn(
        "[ingestion] PROPOSE_VAULT_FROM_SOURCE hook failed (non-blocking):",
        err instanceof Error ? err.message : err,
      );
    }
  })();
}

export const ingestionRouter = createTRPCRouter({
  // Upload a file (base64 content)
  uploadFile: governedProcedure({

    kind: "LEGACY_INGESTION_UPLOAD_FILE",

    inputSchema: z.object({
      strategyId: z.string(),
      fileName: z.string(),
      fileType: z.string(),
      content: z.string(), // base64
    }),

    caller: "ingestion:uploadFile",

  })
    .mutation(async ({ ctx, input }) => {
      const sourceId = await ingestion.ingestFile(input.strategyId, {
        name: input.fileName,
        type: input.fileType,
        content: input.content,
      });
      fireVaultProposalHook(input.strategyId, sourceId, ctx.session.user.id);
      return { sourceId };
    }),

  // Add manual text input
  addText: governedProcedure({

    kind: "LEGACY_INGESTION_ADD_TEXT",

    inputSchema: z.object({
      strategyId: z.string(),
      text: z.string().min(10),
      label: z.string().optional(),
    }),

    caller: "ingestion:addText",

  })
    .mutation(async ({ ctx, input }) => {
      const sourceId = await ingestion.ingestText(input.strategyId, input.text, input.label);
      fireVaultProposalHook(input.strategyId, sourceId, ctx.session.user.id);
      return { sourceId };
    }),

  // List data sources for a strategy
  listSources: strategyScopedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.brandDataSource.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          sourceType: true,
          fileName: true,
          fileType: true,
          processingStatus: true,
          pillarMapping: true,
          extractedFields: true,
          errorMessage: true,
          createdAt: true,
          // PR-A (ADR-0032)
          certainty: true,
          origin: true,
        },
      });
    }),

  // Get ONE source with its raw content (lazy — listSources omits rawContent
  // car volumineux). Consommé par le panneau d'édition de source du cockpit.
  getSource: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.brandDataSource.findUnique({
        where: { id: input.id },
        select: { id: true, fileName: true, rawContent: true, certainty: true, sourceType: true, origin: true },
      });
    }),

  // Delete a data source
  deleteSource: governedProcedure({

    kind: "LEGACY_INGESTION_DELETE_SOURCE",

    inputSchema: z.object({ id: z.string() }),

    caller: "ingestion:deleteSource",

  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.brandDataSource.delete({ where: { id: input.id } });
    }),

  // Update a manual source (title + content + certainty per PR-A/ADR-0032).
  // certainty is operator-controlled trust level — see src/domain/source-certainty.ts.
  updateSource: governedProcedure({

    kind: "LEGACY_INGESTION_UPDATE_SOURCE",

    inputSchema: z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      content: z.string().min(1).optional(),
      certainty: SourceCertaintySchema.optional(),
    }),

    caller: "ingestion:updateSource",

  })
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = {};
      if (input.title !== undefined) data.fileName = input.title;
      if (input.content !== undefined) data.rawContent = input.content;
      if (input.certainty !== undefined) data.certainty = input.certainty;
      return ctx.db.brandDataSource.update({ where: { id: input.id }, data });
    }),

  // Launch the full processing pipeline
  process: governedProcedure({

    kind: "LEGACY_INGESTION_PROCESS",

    inputSchema: z.object({ strategyId: z.string() }),

    caller: "ingestion:process",

  })
    .mutation(async ({ input }) => {
      return ingestion.processStrategy(input.strategyId);
    }),

  // Get ingestion pipeline status
  getStatus: strategyScopedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return ingestion.getIngestionStatus(input.strategyId);
    }),

  // Get AI-proposed content for a specific pillar (for operator review)
  getPillarProposal: strategyScopedProcedure
    .input(z.object({ strategyId: z.string(), pillarKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const pillar = await ctx.db.pillar.findUnique({
        where: { strategyId_key: { strategyId: input.strategyId, key: input.pillarKey } },
      });
      if (!pillar) return null;

      // Get glory outputs used for this pillar
      const gloryOutputs = await ctx.db.gloryOutput.findMany({
        where: {
          strategyId: input.strategyId,
          advertis_vector: { path: ["pillars"], array_contains: input.pillarKey },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      return {
        key: pillar.key,
        content: pillar.content,
        confidence: pillar.confidence,
        validationStatus: pillar.validationStatus,
        sources: pillar.sources,
        gloryOutputs: gloryOutputs.map((g) => ({
          id: g.id,
          toolSlug: g.toolSlug,
          output: g.output,
          createdAt: g.createdAt,
        })),
      };
    }),

  // Operator validates a pillar (with optional edits)
  validatePillar: governedProcedure({

    kind: "LEGACY_INGESTION_VALIDATE_PILLAR",

    inputSchema: z.object({
      strategyId: z.string(),
      pillarKey: z.string(),
      edits: z.record(z.string(), z.unknown()).optional(),
    }),

    caller: "ingestion:validatePillar",

  })
    .mutation(async ({ input }) => {
      await ingestion.validatePillar(input.strategyId, input.pillarKey, input.edits as Record<string, unknown> | undefined);
      return { success: true };
    }),

  // Reprocess a specific pillar
  reprocessPillar: governedProcedure({

    kind: "LEGACY_INGESTION_REPROCESS_PILLAR",

    inputSchema: z.object({ strategyId: z.string(), pillarKey: AdveKeySchema }),

    caller: "ingestion:reprocessPillar",

  })
    .mutation(async ({ ctx, input }) => {
      const sourceIds = (await ctx.db.brandDataSource.findMany({
        where: { strategyId: input.strategyId, processingStatus: { in: ["EXTRACTED", "PROCESSED"] } },
        select: { id: true },
      })).map((s) => s.id);

      const { fillPillar } = await import("@/server/services/ingestion-pipeline/ai-filler");
      return fillPillar(input.strategyId, input.pillarKey, sourceIds);
    }),

  // Add a manual text source (note, description, analysis)
  addManualSource: governedProcedure({

    kind: "LEGACY_INGESTION_ADD_MANUAL_SOURCE",

    inputSchema: z.object({
      strategyId: z.string(),
      title: z.string().min(1),
      content: z.string().min(1),
    }),

    caller: "ingestion:addManualSource",

  })
    .mutation(async ({ ctx, input }) => {
      const created = await ctx.db.brandDataSource.create({
        data: {
          strategyId: input.strategyId,
          sourceType: "MANUAL_INPUT",
          fileName: input.title,
          rawContent: input.content,
          rawData: { title: input.title, content: input.content, addedBy: ctx.session.user.id },
          processingStatus: "EXTRACTED", // Ready for enrichment
          pillarMapping: { a: true, d: true, v: true, e: true, r: true, t: true, i: true, s: true },
        },
      });
      // Fire RAG indexing + vault classification (both non-blocking).
      void (async () => {
        try {
          const { emitIntent } = await import("@/server/services/mestor/intents");
          await emitIntent(
            { kind: "INDEX_BRAND_SOURCE", strategyId: input.strategyId, sourceId: created.id },
            { caller: "ingestion-router:addManualSource" },
          );
        } catch (err) {
          console.warn(
            "[ingestion] INDEX_BRAND_SOURCE hook failed (non-blocking):",
            err instanceof Error ? err.message : err,
          );
        }
      })();
      fireVaultProposalHook(input.strategyId, created.id, ctx.session.user.id);
      return created;
    }),

  // ── Brand book ingestion (ADR-0173, Lot 1b) — preview→confirm, opérateur ──
  // L'écriture ADVE est une décision opérateur (STOP à Jehuty) → operatorProcedure.
  /** EXTRAIT un brand book uploadé pour REVUE (aucune écriture). Coûte un LLM en mode LLM. */
  previewBrandBook: operatorProcedure
    .input(z.object({ strategyId: z.string(), sourceId: z.string(), mode: z.enum(["LLM", "STRUCTURED"]).default("LLM") }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.brandDataSource.findFirst({
        where: { id: input.sourceId, strategyId: input.strategyId },
        select: { rawContent: true, fileName: true },
      });
      if (!source?.rawContent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source introuvable ou sans texte extrait — uploade d'abord le brand book." });
      }
      const { previewBrandBook } = await import("@/server/services/brand-book-ingestion");
      const extraction = await previewBrandBook({
        strategyId: input.strategyId,
        text: source.rawContent,
        mode: input.mode,
        caller: `operator:${ctx.session.user.id}`,
        sourceFilename: source.fileName ?? undefined,
      });
      return { extraction };
    }),

  /** PERSISTE une extraction RÉVISÉE via l'Intent gouverné (gateway + assets DRAFT). */
  ingestBrandBook: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      extraction: z.unknown(),
      sourceFilename: z.string().optional(),
      sourceDataSourceId: z.string().optional(),
      // C3 — le front transmet le mode utilisé au preview (LLM/STRUCTURED) pour
      // que le persister pose la bonne provenance (INFERRED vs SOURCE).
      extractionMode: z.enum(["LLM", "STRUCTURED"]).default("LLM"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Marque la source « OFFICIELLE » (fait vérifié) si fournie.
      if (input.sourceDataSourceId) {
        await ctx.db.brandDataSource.updateMany({
          where: { id: input.sourceDataSourceId, strategyId: input.strategyId },
          data: { certainty: "OFFICIAL" },
        });
      }
      const { emitIntent } = await import("@/server/services/mestor/intents");
      return emitIntent(
        {
          kind: "INGEST_BRAND_BOOK",
          strategyId: input.strategyId,
          operatorId: ctx.session.user.id,
          extraction: input.extraction,
          sourceFilename: input.sourceFilename,
          sourceDataSourceId: input.sourceDataSourceId,
          extractionMode: input.extractionMode,
        },
        { caller: "trpc.ingestion.ingestBrandBook" },
      );
    }),
});
