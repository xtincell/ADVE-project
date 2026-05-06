/**
 * Morning Brief Batch Router — Phase 18-A1-δ (ADR-0062).
 *
 * 7 mutations governées + 3 read queries. Manual-first parity (ADR-0060) :
 * `createIngestedSourceManual` + `createBriefDraftManual` permettent saisie
 * sans LLM via le même flux qu'un opérateur humain.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import {
  previewBatch,
  getBatch,
  listBatchesForOperator,
  listIngestedSourcesForOperator,
} from "@/server/services/morning-batch";
import { db } from "@/lib/db";

/* lafusee:governed-active — Phase 18/19 router. Toutes les mutations utilisent governedProcedure (ADR-0004 strict cible atteinte) ; tag corrigé 2026-05-06 strangler→governed (faux positif initial — le router a toujours utilisé governedProcedure depuis sa création). */

const StringId = z.string().min(1);
const ClassificationEnum = z.enum(["NEW_BRIEF", "UPDATE_OF_BRIEF", "NON_BRIEF", "OPS_ACTION", "AMBIGUOUS"]);
const DraftStateEnum = z.enum(["PENDING_REVIEW", "ACCEPTED", "REJECTED", "EDITED"]);
const SourceKindEnum = z.enum(["EMAIL", "SLACK", "WHATSAPP", "MANUAL_PASTE", "FILE_UPLOAD"]);

export const morningBatchRouter = createTRPCRouter({
  preview: governedProcedure({
    kind: "MORNING_BRIEF_BATCH_PREVIEW",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      rawInput: z.string().min(10).max(50000),
    }),
  }).mutation(async ({ input }) => {
    try {
      const result = await previewBatch({
        operatorId: input.operatorId,
        rawInput: input.rawInput,
      });
      return { ok: true as const, batchId: result.batch.id, sourceCount: result.sourceCount, draftCount: result.draftCount };
    } catch (err) {
      throw new TRPCError({ code: "BAD_REQUEST", message: err instanceof Error ? err.message : "previewBatch failed" });
    }
  }),

  updateDraft: governedProcedure({
    kind: "BRIEF_DRAFT_UPDATE_FIELDS",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      draftId: StringId,
      classification: ClassificationEnum.optional(),
      resolvedNodeId: StringId.nullable().optional(),
      resolvedNodePath: z.array(z.string()).optional(),
      resolvedCampaignId: StringId.nullable().optional(),
      payload: z.unknown().optional(),
      state: DraftStateEnum.optional(),
      reviewNotes: z.string().nullable().optional(),
    }),
  }).mutation(async ({ input }) => {
    try {
      const draft = await db.briefIngestionDraft.update({
        where: { id: input.draftId },
        data: {
          classification: input.classification ?? undefined,
          resolvedNodeId: input.resolvedNodeId === null ? null : input.resolvedNodeId ?? undefined,
          resolvedNodePath: input.resolvedNodePath ?? undefined,
          resolvedCampaignId: input.resolvedCampaignId === null ? null : input.resolvedCampaignId ?? undefined,
          payload: input.payload as never,
          state: input.state ?? "EDITED",
          reviewedBy: input.operatorId,
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes ?? undefined,
        },
      });
      return { ok: true as const, draft };
    } catch (err) {
      throw new TRPCError({ code: "BAD_REQUEST", message: err instanceof Error ? err.message : "updateDraft failed" });
    }
  }),

  reanalyze: governedProcedure({
    kind: "BRIEF_DRAFT_REQUEST_REANALYSIS",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      draftId: StringId,
    }),
  }).mutation(async ({ input }) => {
    try {
      const { requestReanalysisHandler } = await import("@/server/services/morning-batch");
      const result = await requestReanalysisHandler({
        kind: "BRIEF_DRAFT_REQUEST_REANALYSIS",
        strategyId: input.strategyId,
        operatorId: input.operatorId,
        draftId: input.draftId,
      });
      return { ok: result.status === "OK", result };
    } catch (err) {
      throw new TRPCError({ code: "BAD_REQUEST", message: err instanceof Error ? err.message : "reanalyze failed" });
    }
  }),

  confirm: governedProcedure({
    kind: "MORNING_BRIEF_BATCH_CONFIRM",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      batchId: StringId,
      draftIds: z.array(StringId),
    }),
  }).mutation(async ({ input }) => {
    try {
      const { confirmBatchHandler } = await import("@/server/services/morning-batch");
      const result = await confirmBatchHandler({
        kind: "MORNING_BRIEF_BATCH_CONFIRM",
        strategyId: input.strategyId,
        operatorId: input.operatorId,
        batchId: input.batchId,
        draftIds: input.draftIds,
      });
      return { ok: result.status === "OK", result };
    } catch (err) {
      throw new TRPCError({ code: "BAD_REQUEST", message: err instanceof Error ? err.message : "confirm failed" });
    }
  }),

  // Manual-first parity (ADR-0060)
  createSourceManual: governedProcedure({
    kind: "OPERATOR_CREATE_INGESTED_SOURCE",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      sourceKind: SourceKindEnum.optional(),
      externalId: z.string().nullable().optional(),
      sourceUrl: z.string().url().nullable().optional(),
      sender: z.string().nullable().optional(),
      subject: z.string().nullable().optional(),
      rawSnippet: z.string().min(1).max(8000),
      language: z.string().nullable().optional(),
    }),
  }).mutation(async ({ input }) => {
    try {
      const { createIngestedSourceHandler } = await import("@/server/services/morning-batch");
      const result = await createIngestedSourceHandler({
        kind: "OPERATOR_CREATE_INGESTED_SOURCE",
        strategyId: input.strategyId,
        operatorId: input.operatorId,
        sourceKind: input.sourceKind,
        externalId: input.externalId,
        sourceUrl: input.sourceUrl,
        sender: input.sender,
        subject: input.subject,
        rawSnippet: input.rawSnippet,
        language: input.language,
      });
      return { ok: result.status === "OK", result };
    } catch (err) {
      throw new TRPCError({ code: "BAD_REQUEST", message: err instanceof Error ? err.message : "createSourceManual failed" });
    }
  }),

  createDraftManual: governedProcedure({
    kind: "OPERATOR_CREATE_BRIEF_DRAFT",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      batchId: StringId,
      sourceId: StringId,
      classification: ClassificationEnum,
      resolvedNodeId: StringId.nullable().optional(),
      resolvedNodePath: z.array(z.string()).optional(),
      payload: z.unknown(),
    }),
  }).mutation(async ({ input }) => {
    try {
      const { createBriefDraftHandler } = await import("@/server/services/morning-batch");
      const result = await createBriefDraftHandler({
        kind: "OPERATOR_CREATE_BRIEF_DRAFT",
        strategyId: input.strategyId,
        operatorId: input.operatorId,
        batchId: input.batchId,
        sourceId: input.sourceId,
        classification: input.classification,
        resolvedNodeId: input.resolvedNodeId,
        resolvedNodePath: input.resolvedNodePath,
        payload: input.payload,
      });
      return { ok: result.status === "OK", result };
    } catch (err) {
      throw new TRPCError({ code: "BAD_REQUEST", message: err instanceof Error ? err.message : "createDraftManual failed" });
    }
  }),

  // Reads
  getBatch: protectedProcedure
    .input(z.object({ batchId: StringId }))
    .query(({ input }) => getBatch(input.batchId)),

  listBatches: protectedProcedure
    .input(z.object({ operatorId: StringId, limit: z.number().min(1).max(100).optional() }))
    .query(({ input }) => listBatchesForOperator(input.operatorId, input.limit)),

  listSources: protectedProcedure
    .input(z.object({ operatorId: StringId, limit: z.number().min(1).max(200).optional() }))
    .query(({ input }) => listIngestedSourcesForOperator(input.operatorId, input.limit)),
});
