/**
 * Manifest — GLORY Tools (107 atomic creative operations).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "glory-tools",
  governor: "ARTEMIS",
  version: "1.0.0",
  // EXECUTE_GLORY_SEQUENCE belongs to artemis (the sequenceur is an artemis
  // tool that *consumes* the atomic glory-tools registered here).
  acceptsIntents: ["INVOKE_GLORY_TOOL"],
  emits: ["GLORY_TOOL_INVOKED"],
  capabilities: [
    {
      name: "invokeTool",
      inputSchema: z.object({
        slug: z.string(),
        inputs: z.unknown(),
        variant: z.string().optional(),
      }),
      outputSchema: z.object({
        outputs: z.unknown(),
        costUsd: z.number().min(0),
        latencyMs: z.number().min(0),
      }),
      sideEffects: ["LLM_CALL", "DB_WRITE", "EVENT_EMIT"],
    },
    {
      name: "executeSequence",
      inputSchema: z.object({
        sequenceSlug: z.string(),
        strategyId: z.string(),
      }),
      outputSchema: z.object({
        toolsRun: z.number(),
        outputs: z.array(z.unknown()),
      }),
      sideEffects: ["LLM_CALL", "DB_WRITE", "EVENT_EMIT"],
      // GLORY sequences depend on COMPLETE ADVE pillars + operator
      // validation. Running a sequence on a DRAFT pillar produces
      // expensive low-quality output (the LLM happily fills gaps).
      preconditions: ["GLORY_SEQUENCE"],
    },
  ],
  dependencies: ["llm-gateway", "advertis-scorer"],
  docs: {
    summary:
      "Per-tool quality/cost tiers and A/B variants live inside the registry (`artemis/tools/registry.ts`). See scripts/inventory-glory-tools.ts for the snapshot.",
  },
});
