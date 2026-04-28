/**
 * Manifest — Pillar Gateway (write-and-score atomic operation).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "pillar-gateway",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: ["WRITE_PILLAR"],
  capabilities: [
    {
      name: "writePillarAndScore",
      inputSchema: z.object({
        strategyId: z.string(),
        pillarKey: z.string(),
        operation: z.unknown(),
        author: z.unknown(),
      }),
      outputSchema: z.object({
        success: z.boolean(),
        warnings: z.array(z.string()).optional(),
        error: z.string().optional(),
        newContent: z.unknown().optional(),
      }),
      sideEffects: ["DB_WRITE", "LLM_CALL", "EVENT_EMIT"],
    },
  ],
  dependencies: ["advertis-scorer", "pillar-versioning", "staleness-propagator"],
});
