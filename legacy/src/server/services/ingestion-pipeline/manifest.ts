/**
 * Manifest — Ingestion Pipeline (file/text → ADVE filling).
 *
 * Pipeline complet d'ingestion data externe : files (PDF, docx, txt), text raw,
 * batch sources → analyse LLM → mapping vers piliers ADVE → write via gateway.
 * Inclut tracking de source, validation par pilier, RTIS cascade post-fill,
 * et incremental updates pour ré-enrichir des strategies existantes.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";
import { PillarKeySchema } from "@/domain/pillars";

const StringId = z.string().min(1);

export const manifest = defineManifest({
  service: "ingestion-pipeline",
  governor: "MESTOR",
  version: "1.1.0",
  acceptsIntents: ["INGEST_BRAND_DATA"],
  capabilities: [
    {
      name: "ingestFile",
      inputSchema: z.object({
        strategyId: StringId,
        file: z.unknown(),
      }).passthrough(),
      outputSchema: z.object({ sourceId: StringId }),
      sideEffects: ["DB_WRITE", "FILE_WRITE"],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Ingestion fichier est le point d'entrée standard pour onboarding founder — sans cela, aucune brand mémoire matérielle ne nourrit l'OS.",
    },
    {
      name: "ingestText",
      inputSchema: z.object({
        strategyId: StringId,
        text: z.string().min(1),
        sourceLabel: z.string().optional(),
      }),
      outputSchema: z.object({ sourceId: StringId }),
      sideEffects: ["DB_WRITE"],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Ingestion text raw permet copier-coller direct depuis briefs externes — réduit friction onboarding vs upload de fichiers.",
    },
    {
      name: "processStrategy",
      inputSchema: z.object({ strategyId: StringId }),
      outputSchema: z.object({ processed: z.boolean() }),
      sideEffects: ["DB_WRITE", "LLM_CALL"],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Trigger global d'analyse de toutes les sources d'une strategy — orchestre l'AI extraction puis le mapping vers piliers ADVE.",
    },
    {
      name: "validatePillar",
      inputSchema: z.object({
        strategyId: StringId,
        pillarKey: PillarKeySchema,
      }),
      outputSchema: z.object({
        valid: z.boolean(),
        warnings: z.array(z.string()).optional(),
      }).passthrough(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Validation par pilier post-ingestion — garantit que le contenu extrait passe les contraintes structurelles avant write gateway.",
    },
    {
      name: "triggerRTIS",
      inputSchema: z.object({ strategyId: StringId }),
      outputSchema: z.object({ triggered: z.boolean() }),
      sideEffects: ["EVENT_EMIT"],
      missionContribution: "CHAIN_VIA:mestor",
    },
    {
      name: "getIngestionStatus",
      inputSchema: z.object({ strategyId: StringId }),
      outputSchema: z.object({
        sourcesCount: z.number().int().nonnegative(),
        processedCount: z.number().int().nonnegative(),
        pendingCount: z.number().int().nonnegative(),
      }).passthrough(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Status read pour UI cockpit — sans cela l'opérateur ne sait pas si une upload a été processée.",
    },
    {
      name: "trackDataSource",
      inputSchema: z.object({
        strategyId: StringId,
        url: z.string().url().optional(),
        type: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
      outputSchema: z.object({ sourceId: StringId }),
      sideEffects: ["DB_WRITE"],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Track une source data externe (URL, social profile, etc.) pour ingestion ultérieure — utilisé par advertis-connectors.",
    },
    {
      name: "fillPillar",
      inputSchema: z.object({
        strategyId: StringId,
        pillarKey: PillarKeySchema,
        sourceIds: z.array(StringId),
      }),
      outputSchema: z.unknown(),
      sideEffects: ["DB_WRITE", "LLM_CALL"],
      missionContribution: "DIRECT_BOTH",
    },
    {
      name: "triggerRTISCascade",
      inputSchema: z.object({ strategyId: StringId }),
      outputSchema: z.object({ cascadeId: StringId }).passthrough(),
      sideEffects: ["EVENT_EMIT", "DB_WRITE"],
      missionContribution: "CHAIN_VIA:mestor",
    },
    {
      name: "batchIngest",
      inputSchema: z.object({
        strategyId: StringId,
        items: z.array(z.object({
          type: z.enum(["FILE", "TEXT", "URL"]),
          payload: z.unknown(),
        })).min(1),
      }),
      outputSchema: z.object({
        sourceIds: z.array(StringId),
        failed: z.array(z.object({ index: z.number(), error: z.string() })),
      }),
      sideEffects: ["DB_WRITE", "FILE_WRITE"],
      latencyBudgetMs: 60000,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Batch ingestion pour upload massif (vault founder pré-existant) — sans cela onboarding d'une brand mature prend des heures.",
    },
    {
      name: "incrementalUpdate",
      inputSchema: z.object({
        strategyId: StringId,
        newSourceIds: z.array(StringId).min(1),
      }),
      outputSchema: z.object({
        pillarsUpdated: z.array(PillarKeySchema),
      }).passthrough(),
      sideEffects: ["DB_WRITE", "LLM_CALL"],
      missionContribution: "DIRECT_BOTH",
    },
  ],
  dependencies: ["llm-gateway", "pillar-gateway", "advertis-scorer"],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Without data ingestion, the OS has no inputs to evaluate; missions cannot start.",
});
