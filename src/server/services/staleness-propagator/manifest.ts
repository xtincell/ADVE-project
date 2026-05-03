/**
 * Manifest — Staleness Propagator (cascade invalidation).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "staleness-propagator",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  capabilities: [
    {
      name: "propagateFromPillar",
      inputSchema: z.object({
        strategyId: z.string().min(1),
        pillarKey: z.string().min(1),
      }).passthrough(),
      outputSchema: z.object({ markedStale: z.array(z.string()) }),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      missionContribution: "CHAIN_VIA:pillar-gateway",
    },
    {
      name: "auditAllStrategies",
      inputSchema: z.object({}),
      outputSchema: z.object({
        scanned: z.number().int().nonnegative(),
        stalePropagations: z.number().int().nonnegative(),
      }).passthrough(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      latencyBudgetMs: 120000,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Audit cron pour détecter les staleness orphelines — sans cela un crash post-write laisse des assets fading sans propagation.",
    },
    {
      name: "checkStaleness",
      inputSchema: z.object({
        targetType: z.string().min(1),
        targetId: z.string().min(1),
      }),
      outputSchema: z.object({
        isStale: z.boolean(),
        staleAt: z.date().nullable(),
        reason: z.string().optional(),
      }).passthrough(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Read read-only pour UI badges 'stale' sur Oracle/BrandAsset — sans cela l'opérateur ne sait pas si un livrable est obsolète.",
    },
  ],
  missionContribution: "CHAIN_VIA:pillar-gateway",
  missionStep: 3,
});
