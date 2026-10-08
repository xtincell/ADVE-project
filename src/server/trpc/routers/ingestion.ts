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
import { db } from "@/lib/db";
import { assertStrategyRead } from "./_strategy-read-guard";
import { getOperatorContext } from "@/server/services/operator-isolation";
import { listBrandSourceSummaries, resolveBrandSource, setSourceUse, invalidateSourceDerivatives } from "@/server/services/ingestion-pipeline/source-usage";
/* lafusee:governed-active */

/**
 * IDOR (round-10) — une source keyée sur son `id` (BrandDataSource) n'a pas de
 * strategyId de tête → aucune garde ne s'applique. `rawContent` est le matériel
 * brut de la marque (fuite/altération cross-tenant). Résout la source → sa marque.
 */
async function assertSourceAccess(userId: string, sourceId: string): Promise<void> {
  const source = await db.brandDataSource.findUniqueOrThrow({
    where: { id: sourceId },
    select: { strategyId: true },
  });
  await assertStrategyRead(userId, source.strategyId);
}

/**
 * Prepare an extracted source only after an explicit request. Storage and
 * deterministic extraction never imply consent to embeddings/classification.
 * Both existing commands stay governed; proposals remain DRAFT.
 */
function fireSourcePreparationHooks(
  strategyId: string,
  sourceId: string,
  operatorId: string,
): void {
  void (async () => {
    const { emitIntent } = await import("@/server/services/mestor/intents");
    for (const intent of [
      { kind: "INDEX_BRAND_SOURCE" as const, strategyId, sourceId },
      { kind: "PROPOSE_VAULT_FROM_SOURCE" as const, strategyId, sourceId, operatorId },
    ]) {
      try {
        await emitIntent(intent, { caller: "ingestion-router:prepare-source" });
      } catch (err) {
        console.warn(
          `[ingestion] ${intent.kind} preparation failed (non-blocking):`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  })().catch((err: unknown) => {
    console.warn("[ingestion] source preparation unavailable:", err instanceof Error ? err.message : err);
  });
}

export const ingestionRouter = createTRPCRouter({
  // Upload a file (base64 content)
  uploadFile: governedProcedure({

    kind: "LEGACY_INGESTION_UPLOAD_FILE",

    inputSchema: z.object({
      strategyId: z.string(),
      fileName: z.string().min(1).max(255),
      fileType: z.string().min(1).max(8),
      content: z.string().max(13_981_016), // base64, 10 MiB
      sourceId: z.string().optional(), // Explicit recovery of a legacy file source
      prepareAnalysis: z.boolean().default(false),
    }),

    caller: "ingestion:uploadFile",

  })
    .mutation(async ({ ctx, input }) => {
      if (input.sourceId) await assertSourceAccess(ctx.session.user.id, input.sourceId);
      const sourceId = await ingestion.ingestFile(input.strategyId, {
        name: input.fileName,
        type: input.fileType,
        content: input.content,
        sourceId: input.sourceId,
      }, ctx.session.user.id);
      if (input.prepareAnalysis) {
        fireSourcePreparationHooks(input.strategyId, sourceId, ctx.session.user.id);
      }
      return { sourceId };
    }),

  // Add manual text input
  addText: governedProcedure({

    kind: "LEGACY_INGESTION_ADD_TEXT",

    inputSchema: z.object({
      strategyId: z.string(),
      text: z.string().min(10),
      label: z.string().optional(),
      prepareAnalysis: z.boolean().default(false),
    }),

    caller: "ingestion:addText",

  })
    .mutation(async ({ ctx, input }) => {
      const sourceId = await ingestion.ingestText(input.strategyId, input.text, input.label);
      if (input.prepareAnalysis) {
        fireSourcePreparationHooks(input.strategyId, sourceId, ctx.session.user.id);
      }
      return { sourceId };
    }),

  // List data sources for a strategy
  listSources: strategyScopedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      return listBrandSourceSummaries(input.strategyId, ctx.db);
    }),

  // Get ONE source with its raw content (lazy — listSources omits rawContent
  // car volumineux). Consommé par le panneau d'édition de source du cockpit.
  getSource: protectedProcedure
    .input(z.object({ id: z.string(), strategyId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const { source, consumerStrategyId } = await resolveBrandSource(input.id, input.strategyId, ctx.db).catch((error: unknown) => {
        if (error instanceof Error && error.message.startsWith("SOURCE_UNAVAILABLE:")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Ce document n’est plus accessible dans ce dossier." });
        }
        throw error;
      });
      await assertStrategyRead(ctx.session.user.id, consumerStrategyId);
      return { id: source.id, fileName: source.fileName, rawContent: source.rawContent,
        certainty: source.certainty, sourceType: source.sourceType, origin: source.origin };
    }),

  // Owner chooses a destination in the existing portfolio; no document is copied.
  sourceUses: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertSourceAccess(ctx.session.user.id, input.id);
      const { source } = await resolveBrandSource(input.id, undefined, ctx.db);
      const op = await getOperatorContext(ctx.session.user.id);
      const canManageOwner = op.role === "ADMIN" || source.strategy.userId === op.userId || Boolean(op.operatorId && source.strategy.operatorId === op.operatorId);
      if (!canManageOwner) return [];
      const targets = await ctx.db.strategy.findMany({ where: {
        id: { not: source.strategyId }, OR: [
          ...(source.strategy.operatorId ? [{ operatorId: source.strategy.operatorId,
            ...(op.role === "ADMIN" || op.operatorId === source.strategy.operatorId ? {} : { userId: op.userId }) }] : []),
          { sourceUses: { some: { sourceId: input.id, revokedAt: null } } },
        ],
      }, select: { id: true, name: true, operatorId: true, sourceUses: { where: { sourceId: input.id, revokedAt: null }, select: { id: true, operatorId: true } } },
      orderBy: { name: "asc" } });
      return targets.map((t) => ({ id: t.id,
        name: t.operatorId && t.operatorId === source.strategy.operatorId ? t.name : "Dossier hors de votre portefeuille",
        linked: t.sourceUses.length > 0,
        suspended: t.sourceUses.length > 0 && (!t.operatorId || t.operatorId !== source.strategy.operatorId || t.sourceUses[0]?.operatorId !== t.operatorId),
      }));
    }),

  // Delete a data source
  deleteSource: governedProcedure({

    kind: "LEGACY_INGESTION_DELETE_SOURCE",

    inputSchema: z.object({ id: z.string() }),

    caller: "ingestion:deleteSource",

  })
    .mutation(async ({ ctx, input }) => {
      await assertSourceAccess(ctx.session.user.id, input.id);
      // Retirer le document SANS retirer son index laissait des fragments
      // orphelins : `BrandContextNode.sourceId` est un `String?` nu — pas de clé
      // étrangère, donc aucune cascade. Ces fragments restent récupérables par
      // le RAG et cités avec un `sourceId` qui ne désigne plus rien. Depuis
      // l'ancrage documentaire (ADR-0184), une citation se vérifie PAR cette
      // ancre : un orphelin est donc une citation qui paraît vérifiée et ne
      // l'est pas. Les deux suppressions vont ensemble, en transaction.
      return ctx.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "BrandDataSource" WHERE id = ${input.id} FOR UPDATE`;
        await invalidateSourceDerivatives(tx, input.id);
        return tx.brandDataSource.delete({ where: { id: input.id } });
      });
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
      use: z.object({ strategyId: z.string(), revoke: z.boolean().default(false) }).optional(),
    }).refine((v) => v.use || v.title !== undefined || v.content !== undefined || v.certainty !== undefined,
      "Choisir une correction ou un usage du document.").refine((v) => !v.use || (v.title === undefined && v.content === undefined && v.certainty === undefined),
      "Lier un usage et corriger le document sont deux gestes distincts."),

    caller: "ingestion:updateSource",

  })
    .mutation(async ({ ctx, input }) => {
      await assertSourceAccess(ctx.session.user.id, input.id);
      if (input.use) {
        const op = await getOperatorContext(ctx.session.user.id);
        return setSourceUse({ sourceId: input.id, strategyId: input.use.strategyId, revoke: input.use.revoke,
          userId: op.userId, operatorId: op.operatorId, admin: op.role === "ADMIN" });
      }
      const data: Record<string, unknown> = { processingStatus: "EXTRACTED", pillarMapping: {} };
      if (input.title !== undefined) data.fileName = input.title;
      if (input.content !== undefined) {
        data.rawContent = input.content;
        data.processingStatus = "EXTRACTED";
        data.errorMessage = null;
        // Structured values derived from the previous text must no longer
        // outrank the corrected source in subsequent extraction.
        data.extractedFields = {};
        data.rawData = {};
      }
      if (input.certainty !== undefined) data.certainty = input.certainty;
      // Same atomic boundary as deletion: readers see either the old source
      // with its index, or the revised source awaiting explicit preparation.
      // No embedding or generation follows a manual correction implicitly.
      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.brandDataSource.update({ where: { id: input.id }, data });
        await invalidateSourceDerivatives(tx, input.id);
        return updated;
      });
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
      prepareAnalysis: z.boolean().default(false),
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
      if (input.prepareAnalysis) {
        fireSourcePreparationHooks(input.strategyId, created.id, ctx.session.user.id);
      }
      return created;
    }),

  // ── Brand book ingestion (ADR-0173, Lot 1b) — preview→confirm, opérateur ──
  // L'écriture ADVE est une décision opérateur (STOP à Jehuty) → operatorProcedure.
  /** EXTRAIT un brand book uploadé pour REVUE (aucune écriture). Coûte un LLM en mode LLM. */
  previewBrandBook: operatorProcedure
    .input(z.object({ strategyId: z.string(), sourceId: z.string(), mode: z.enum(["LLM", "STRUCTURED"]).default("LLM") }))
    .mutation(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      const { source, contentHash } = await resolveBrandSource(input.sourceId, input.strategyId, ctx.db);
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
      return { extraction, sourceReceipt: { sourceId: source.id, contentHash } };
    }),

  /** PERSISTE une extraction RÉVISÉE via l'Intent gouverné (gateway + assets DRAFT). */
  ingestBrandBook: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      extraction: z.unknown(),
      sourceFilename: z.string().optional(),
      sourceDataSourceId: z.string().optional(),
      sourceReceipt: z.object({ sourceId: z.string(), contentHash: z.string().regex(/^[a-f0-9]{64}$/) }).optional(),
      // C3 — le front transmet le mode utilisé au preview (LLM/STRUCTURED) pour
      // que le persister pose la bonne provenance (INFERRED vs SOURCE).
      extractionMode: z.enum(["LLM", "STRUCTURED"]).default("LLM"),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      if (input.sourceDataSourceId && input.sourceReceipt?.sourceId !== input.sourceDataSourceId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Relisez ce document avant d’appliquer son extraction." });
      }
      // Reading a document as a brand book does not certify its authority.
      const { emitIntent } = await import("@/server/services/mestor/intents");
      return emitIntent(
        {
          kind: "INGEST_BRAND_BOOK",
          strategyId: input.strategyId,
          operatorId: ctx.session.user.id,
          extraction: input.extraction,
          sourceFilename: input.sourceFilename,
          sourceDataSourceId: input.sourceDataSourceId,
          sourceReceipt: input.sourceReceipt,
          extractionMode: input.extractionMode,
        },
        { caller: "trpc.ingestion.ingestBrandBook" },
      );
    }),
});
