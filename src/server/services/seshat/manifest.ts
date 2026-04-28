/**
 * Manifest — Seshat (observation + Tarsis weak signals + ranker).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "seshat",
  governor: "SESHAT",
  version: "1.0.0",
  acceptsIntents: ["OBSERVE_INTENT", "RANK_PEERS", "SEARCH_BRAND_CONTEXT"],
  emits: ["TARSIS_SIGNAL_DETECTED"],
  capabilities: [
    {
      name: "rank",
      inputSchema: z.object({ candidates: z.array(z.unknown()) }).passthrough(),
      outputSchema: z.object({ ranked: z.array(z.unknown()) }),
      sideEffects: ["DB_READ"],
      qualityTier: "A",
      latencyBudgetMs: 1500,
      idempotent: true,
    },
    {
      name: "observe",
      inputSchema: z.object({ intentId: z.string() }),
      outputSchema: z.object({ recorded: z.boolean() }),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      qualityTier: "B",
    },
  ],
  dependencies: ["llm-gateway"],
  docs: {
    summary:
      "Read-only observation of intent traffic. Indexes outcomes, surfaces weak signals via Tarsis, powers the cross-brand ranker.",
  },
});
