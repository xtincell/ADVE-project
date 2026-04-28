/**
 * Manifest — Notoria (recommendation engine + diagnostic batch).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "notoria",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: [
    "GENERATE_RECOMMENDATIONS",
    "APPLY_RECOMMENDATIONS",
    "RUN_DIAGNOSTIC",
  ],
  emits: ["RECO_GENERATED", "DIAGNOSTIC_COMPLETED"],
  capabilities: [
    {
      name: "generateBatch",
      inputSchema: z.object({
        strategyId: z.string(),
        scope: z.string().optional(),
      }),
      outputSchema: z.object({
        recos: z.array(z.unknown()),
        costUsd: z.number().optional(),
      }),
      sideEffects: ["DB_WRITE", "LLM_CALL"],
      qualityTier: "A",
      latencyBudgetMs: 20000,
    },
    {
      name: "runDiagnostic",
      inputSchema: z.object({ strategyId: z.string() }),
      outputSchema: z.object({ riskScore: z.number() }),
      sideEffects: ["DB_WRITE", "LLM_CALL"],
    },
  ],
  dependencies: ["llm-gateway", "advertis-scorer", "pillar-gateway"],
});
