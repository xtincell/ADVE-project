/**
 * Manifest — morning-batch (Phase 18-A1-δ, ADR-0062).
 *
 * 7 capabilities CRUD + workflow ingestion mail/slack avec middle portal validation.
 * Manual-first parity (ADR-0060) : 2 capabilities `OPERATOR_CREATE_INGESTED_SOURCE`
 * et `OPERATOR_CREATE_BRIEF_DRAFT` permettent saisie 100% manuelle sans LLM.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const StringId = z.string().min(1);
const HandlerResult = z.object({
  status: z.enum(["OK", "FAILED", "VETOED", "DOWNGRADED"]),
  summary: z.string(),
  tool: z.string(),
  output: z.unknown(),
  reason: z.string().optional(),
  estimatedCost: z.object({
    amount: z.number().nonnegative(),
    currency: z.string(),
  }),
});

export const manifest = defineManifest({
  service: "morning-batch",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: [
    "MORNING_BRIEF_BATCH_PREVIEW",
    "BRIEF_BATCH_PERSIST_DRAFTS",
    "BRIEF_DRAFT_UPDATE_FIELDS",
    "BRIEF_DRAFT_REQUEST_REANALYSIS",
    "MORNING_BRIEF_BATCH_CONFIRM",
    "OPERATOR_CREATE_INGESTED_SOURCE",
    "OPERATOR_CREATE_BRIEF_DRAFT",
  ],
  emits: [],
  capabilities: [
    {
      name: "previewBatchHandler",
      inputSchema: z.object({
        kind: z.literal("MORNING_BRIEF_BATCH_PREVIEW"),
        operatorId: StringId,
        rawInput: z.string().min(1),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE", "LLM_CALL"],
      idempotent: false,
      latencyBudgetMs: 30_000,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 1,
    },
    {
      name: "persistDraftsHandler",
      inputSchema: z.object({
        kind: z.literal("BRIEF_BATCH_PERSIST_DRAFTS"),
        operatorId: StringId,
        batchId: StringId,
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Sauvegarde des drafts produits par previewBatch — étape persistante avant la validation humaine.",
    },
    {
      name: "updateDraftFieldsHandler",
      inputSchema: z.object({
        kind: z.literal("BRIEF_DRAFT_UPDATE_FIELDS"),
        operatorId: StringId,
        draftId: StringId,
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Édition manuelle d'un draft pendant le middle portal review (Manual-first parity ADR-0060).",
    },
    {
      name: "requestReanalysisHandler",
      inputSchema: z.object({
        kind: z.literal("BRIEF_DRAFT_REQUEST_REANALYSIS"),
        operatorId: StringId,
        draftId: StringId,
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["LLM_CALL", "DB_WRITE"],
      idempotent: true,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 1,
    },
    {
      name: "confirmBatchHandler",
      inputSchema: z.object({
        kind: z.literal("MORNING_BRIEF_BATCH_CONFIRM"),
        operatorId: StringId,
        batchId: StringId,
        draftIds: z.array(StringId),
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: false,
      latencyBudgetMs: 10_000,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 1,
    },
    {
      name: "createIngestedSourceHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_CREATE_INGESTED_SOURCE"),
        operatorId: StringId,
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: false,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Saisie manuelle d'une source (mail/slack/whatsapp) sans LLM. Manual-first parity ADR-0060.",
    },
    {
      name: "createBriefDraftHandler",
      inputSchema: z.object({
        kind: z.literal("OPERATOR_CREATE_BRIEF_DRAFT"),
        operatorId: StringId,
      }).passthrough(),
      outputSchema: HandlerResult,
      sideEffects: ["DB_WRITE"],
      idempotent: false,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Saisie manuelle d'un brief draft sans LLM. Manual-first parity ADR-0060.",
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "Morning Brief Batch ingestion mail/slack/whatsapp avec middle portal validation humaine. 7 Intent kinds. Manual-first parity (saisie manuelle alternative pour chaque LLM action). Cf. ADR-0062.",
  },
  missionContribution: "DIRECT_SUPERFAN",
  groundJustification:
    "Cadence quotidienne ~30-60 min/jour de saisie économisée par opérateur Matanga. Ingestion + classification + matching BrandNode + matérialisation Campaign+Brief en 1 batch validé.",
  missionStep: 1,
});
