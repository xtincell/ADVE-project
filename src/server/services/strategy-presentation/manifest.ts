/**
 * Manifest — Strategy Presentation (Oracle 21 sections + enrichment + export).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "strategy-presentation",
  governor: "ARTEMIS",
  version: "5.2.0",
  acceptsIntents: ["ENRICH_ORACLE", "EXPORT_ORACLE"],
  emits: ["ORACLE_SECTION_COMPLETED", "ORACLE_SNAPSHOT_TAKEN"],
  capabilities: [
    {
      name: "enrichOracleNeteru",
      inputSchema: z.object({
        strategyId: z.string(),
        sections: z.array(z.string()).optional(),
        lang: z.enum(["fr", "en"]).optional(),
      }),
      outputSchema: z.object({
        enriched: z.array(z.string()),
        costUsd: z.number(),
      }),
      sideEffects: ["DB_WRITE", "LLM_CALL", "EVENT_EMIT"],
      qualityTier: "S",
      latencyBudgetMs: 60000,
    },
    {
      name: "exportOracleAsPdf",
      inputSchema: z.object({
        strategyId: z.string(),
        snapshotId: z.string().optional(),
      }),
      outputSchema: z.object({ pdfPath: z.string() }),
      sideEffects: ["FILE_WRITE", "DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 45000,
    },
    {
      name: "exportOracleAsMarkdown",
      inputSchema: z.object({ strategyId: z.string() }),
      outputSchema: z.object({ markdown: z.string() }),
      sideEffects: ["DB_READ"],
      qualityTier: "C",
      idempotent: true,
    },
  ],
  dependencies: ["llm-gateway", "advertis-scorer"],
});
