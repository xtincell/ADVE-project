/**
 * Manifest — Ingestion Pipeline (file/text → ADVE filling).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "ingestion-pipeline",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: ["INGEST_BRAND_DATA"],
  capabilities: [
    {
      name: "ingestFile",
      inputSchema: z.object({
        strategyId: z.string(),
        file: z.unknown(),
      }),
      outputSchema: z.object({ sourceId: z.string() }),
      sideEffects: ["DB_WRITE", "FILE_WRITE"],
    },
    {
      name: "processStrategy",
      inputSchema: z.object({ strategyId: z.string() }),
      outputSchema: z.object({ processed: z.boolean() }),
      sideEffects: ["DB_WRITE", "LLM_CALL"],
    },
    {
      name: "fillPillar",
      inputSchema: z.object({
        strategyId: z.string(),
        pillarKey: z.string(),
        sourceIds: z.array(z.string()),
      }),
      outputSchema: z.unknown(),
      sideEffects: ["DB_WRITE", "LLM_CALL"],
    },
  ],
  dependencies: ["llm-gateway", "pillar-gateway", "advertis-scorer"],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Without data ingestion, the OS has no inputs to evaluate; missions cannot start.",
});
