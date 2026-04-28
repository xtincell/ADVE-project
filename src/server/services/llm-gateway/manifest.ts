/**
 * Manifest — LLM Gateway (multi-provider, routing matrix, cost tracking).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "llm-gateway",
  governor: "INFRASTRUCTURE",
  version: "5.0.0",
  acceptsIntents: ["LLM_CALL"],
  emits: ["LLM_TOKEN_USAGE"],
  capabilities: [
    {
      name: "complete",
      inputSchema: z.object({
        prompt: z.string(),
        qualityTier: z.enum(["S", "A", "B", "C"]).optional(),
        latencyBudgetMs: z.number().int().min(0).optional(),
        costCeilingUsd: z.number().min(0).optional(),
      }),
      outputSchema: z.object({
        text: z.string(),
        provider: z.string(),
        model: z.string(),
        costUsd: z.number().min(0),
        latencyMs: z.number().min(0),
      }),
      sideEffects: ["LLM_CALL", "EXTERNAL_API"],
    },
    {
      name: "stream",
      inputSchema: z.object({ prompt: z.string() }).passthrough(),
      outputSchema: z.object({ stream: z.unknown() }),
      sideEffects: ["LLM_CALL", "EXTERNAL_API"],
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "Multi-provider gateway with circuit breaker, cost tracking, and Phase-5 routing matrix that picks model from quality/latency/cost tiers per Intent kind.",
  },
});
