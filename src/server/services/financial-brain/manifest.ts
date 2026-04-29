/**
 * Manifest — Thot (financial brain / governance budgétaire).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "financial-brain",
  governor: "THOT",
  version: "1.0.0",
  acceptsIntents: ["CHECK_CAPACITY", "RECORD_COST", "VETO_INTENT"],
  emits: ["BUDGET_VETO", "BUDGET_DOWNGRADE"],
  capabilities: [
    {
      name: "checkCapacity",
      inputSchema: z.object({
        operatorId: z.string(),
        estimatedCostUsd: z.number().min(0),
      }),
      outputSchema: z.object({
        decision: z.enum(["OK", "DOWNGRADE", "VETO"]),
        remainingUsd: z.number(),
      }),
      sideEffects: ["DB_READ"],
      qualityTier: "A",
      latencyBudgetMs: 100,
      idempotent: true,
    },
    {
      name: "recordCost",
      inputSchema: z.object({
        intentId: z.string(),
        costUsd: z.number().min(0),
      }),
      outputSchema: z.object({ recorded: z.boolean() }),
      sideEffects: ["DB_WRITE"],
    },
  ],
  dependencies: [],
  docs: {
    summary:
      "Approves, vetoes, or downgrades intents based on operator capacity. Records realised cost. Authoritative source for cost p95 SLO.",
  },
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Without budget tracking, missions flame out — UPgraders cannot operate, no brand reaches apogee.",
});
