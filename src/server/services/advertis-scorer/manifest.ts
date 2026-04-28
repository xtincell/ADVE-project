/**
 * Manifest — ADVERTIS Scorer (semantic + structural scoring).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "advertis-scorer",
  governor: "INFRASTRUCTURE",
  version: "2.0.0",
  acceptsIntents: ["SCORE_PILLAR"],
  capabilities: [
    {
      name: "scoreObject",
      inputSchema: z.object({
        pillarKey: z.string(),
        content: z.unknown(),
      }),
      outputSchema: z.object({
        score: z.number().min(0).max(100),
        breakdown: z.unknown(),
      }),
      sideEffects: ["LLM_CALL"],
      qualityTier: "A",
      idempotent: true,
    },
  ],
  dependencies: ["llm-gateway"],
  docs: {
    summary:
      "Single source of truth for pillar maturity scoring. Wrapped by pillar-gateway.writePillarAndScore for write-and-score atomicity.",
  },
});
