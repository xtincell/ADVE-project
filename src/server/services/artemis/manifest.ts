/**
 * Manifest — Artemis (protocol + execution + GLORY tools).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "artemis",
  governor: "ARTEMIS",
  version: "1.0.0",
  acceptsIntents: ["EXECUTE_FRAMEWORK", "EXECUTE_GLORY_SEQUENCE"],
  emits: ["INTENT_PROGRESS", "GLORY_TOOL_INVOKED"],
  capabilities: [
    {
      name: "execute",
      inputSchema: z
        .object({
          intentId: z.string(),
          plan: z.array(z.object({ tool: z.string(), inputs: z.unknown() })),
        })
        .passthrough(),
      outputSchema: z.object({
        success: z.boolean(),
        outputs: z.array(z.unknown()),
        costUsd: z.number().optional(),
      }),
      sideEffects: ["DB_WRITE", "LLM_CALL", "EVENT_EMIT"],
      qualityTier: "S",
      latencyBudgetMs: 60000,
    },
  ],
  dependencies: ["llm-gateway", "glory-tools", "advertis-scorer"],
  docs: {
    summary:
      "Receives a plan from Mestor and executes it through frameworks / GLORY tools, streaming progress events along the way.",
  },
});
