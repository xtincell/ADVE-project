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
        type: z.string().min(1),
        id: z.string().min(1),
      }).passthrough(),
      outputSchema: z.object({
        score: z.number().min(0).max(100),
        breakdown: z.unknown(),
      }).passthrough(),
      sideEffects: ["LLM_CALL", "DB_READ"],
      qualityTier: "A",
      idempotent: true,
      missionContribution: "DIRECT_SUPERFAN",
    },
    {
      name: "batchScore",
      inputSchema: z.object({
        items: z.array(z.object({
          type: z.string().min(1),
          id: z.string().min(1),
        })).min(1),
      }),
      outputSchema: z.object({
        scored: z.array(z.object({
          id: z.string(),
          score: z.number(),
        }).passthrough()),
        failed: z.array(z.object({
          id: z.string(),
          error: z.string(),
        })),
      }),
      sideEffects: ["LLM_CALL", "DB_READ"],
      qualityTier: "A",
      latencyBudgetMs: 90000,
      missionContribution: "DIRECT_SUPERFAN",
    },
    {
      name: "snapshotAllStrategies",
      inputSchema: z.object({}),
      outputSchema: z.object({
        strategiesScored: z.number().int().nonnegative(),
        durationMs: z.number().int().nonnegative(),
      }).passthrough(),
      sideEffects: ["LLM_CALL", "DB_WRITE"],
      latencyBudgetMs: 600000,
      missionContribution: "DIRECT_OVERTON",
    },
    {
      name: "getScoreHistory",
      inputSchema: z.object({
        type: z.string().min(1),
        id: z.string().min(1),
        windowDays: z.number().int().positive().optional(),
      }),
      outputSchema: z.array(z.object({
        scoredAt: z.date(),
        score: z.number(),
      }).passthrough()),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Historique des scores requis pour graphs cockpit (évolution score par pilier dans le temps) et detect drift loop.",
    },
  ],
  dependencies: ["llm-gateway"],
  docs: {
    summary:
      "Single source of truth for pillar maturity scoring. Wrapped by pillar-gateway.writePillarAndScore for write-and-score atomicity.",
  },
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 3,
});
