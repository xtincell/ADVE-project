/**
 * Ingestion Pipeline Router — Upload, extract, analyze, fill ADVE, validate
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import * as ingestion from "@/server/services/ingestion-pipeline";

export const ingestionRouter = createTRPCRouter({
  // Upload a file (base64 content)
  uploadFile: adminProcedure
    .input(z.object({
      strategyId: z.string(),
      fileName: z.string(),
      fileType: z.string(),
      content: z.string(), // base64
    }))
    .mutation(async ({ input }) => {
      const sourceId = await ingestion.ingestFile(input.strategyId, {
        name: input.fileName,
        type: input.fileType,
        content: input.content,
      });
      return { sourceId };
    }),

  // Add manual text input
  addText: adminProcedure
    .input(z.object({
      strategyId: z.string(),
      text: z.string().min(10),
      label: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const sourceId = await ingestion.ingestText(input.strategyId, input.text, input.label);
      return { sourceId };
    }),

  // List data sources for a strategy
  listSources: protectedProcedure
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
        },
      });
    }),

  // Delete a data source
  deleteSource: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.brandDataSource.delete({ where: { id: input.id } });
    }),

  // Update a manual source (title + content)
  updateSource: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      content: z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = {};
      if (input.title !== undefined) data.fileName = input.title;
      if (input.content !== undefined) data.rawContent = input.content;
      return ctx.db.brandDataSource.update({ where: { id: input.id }, data });
    }),

  // Launch the full processing pipeline
  process: adminProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ input }) => {
      return ingestion.processStrategy(input.strategyId);
    }),

  // Get ingestion pipeline status
  getStatus: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return ingestion.getIngestionStatus(input.strategyId);
    }),

  // Get AI-proposed content for a specific pillar (for operator review)
  getPillarProposal: protectedProcedure
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
  validatePillar: adminProcedure
    .input(z.object({
      strategyId: z.string(),
      pillarKey: z.string(),
      edits: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      await ingestion.validatePillar(input.strategyId, input.pillarKey, input.edits as Record<string, unknown> | undefined);
      return { success: true };
    }),

  // Reprocess a specific pillar
  reprocessPillar: adminProcedure
    .input(z.object({ strategyId: z.string(), pillarKey: z.enum(["A", "D", "V", "E"]) }))
    .mutation(async ({ ctx, input }) => {
      const sourceIds = (await ctx.db.brandDataSource.findMany({
        where: { strategyId: input.strategyId, processingStatus: { in: ["EXTRACTED", "PROCESSED"] } },
        select: { id: true },
      })).map((s) => s.id);

      const { fillPillar } = await import("@/server/services/ingestion-pipeline/ai-filler");
      return fillPillar(input.strategyId, input.pillarKey, sourceIds);
    }),

  // Add a manual text source (note, description, analysis)
  addManualSource: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      title: z.string().min(1),
      content: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.brandDataSource.create({
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
    }),
});
