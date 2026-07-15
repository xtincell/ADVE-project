/**
 * Manifest — Seshat (observation + Tarsis weak signals + ranker).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "seshat",
  governor: "SESHAT",
  version: "1.0.0",
  acceptsIntents: ["OBSERVE_INTENT", "RANK_PEERS", "SEARCH_BRAND_CONTEXT", "SESHAT_HUNT_VICTORIES"],
  emits: ["TARSIS_SIGNAL_DETECTED"],
  capabilities: [
    {
      // ADR-0154 — Hunter cherche des victoires dyadiques documentées (LLM via
      // Gateway) → EpreuveCandidate en quarantaine. LLM_CALL déclaré → cost-gate
      // Thot (Loi 3) sur le seul kind coûteux du flux prospect-scoring.
      name: "huntVictories",
      inputSchema: z.object({ strategyId: z.string(), rivalName: z.string() }).passthrough(),
      outputSchema: z.object({ candidates: z.number(), deferred: z.boolean() }),
      sideEffects: ["LLM_CALL", "DB_WRITE"],
      qualityTier: "B",
      latencyBudgetMs: 20_000,
    },
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
  missionContribution: "DIRECT_OVERTON",
  missionStep: 4,
});
