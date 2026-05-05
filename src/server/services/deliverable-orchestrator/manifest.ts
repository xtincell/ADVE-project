/**
 * Manifest — deliverable-orchestrator (Phase 17, ADR-0037).
 *
 * APOGEE classification : Propulsion (Mission #1) — sous-composant Artemis,
 * mission contribution = CHAIN_VIA:artemis. Output-first deliverable
 * composition : prend un `BrandAsset.kind` matériel cible, remonte le DAG
 * des briefs requis via `GloryToolForgeOutput.requires`, scanne le vault
 * pour réutilisation, retourne une composition complète.
 *
 * Phase 17 commit 3 : 1 capability `composeDeliverable` (mode PREVIEW —
 * read-only). Les capabilities du dispatch async (commit 4) viendront en
 * extension du même manifest.
 */

import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "deliverable-orchestrator",
  governor: "ARTEMIS",
  version: "0.1.0",
  acceptsIntents: ["COMPOSE_DELIVERABLE"],
  emits: [
    // Anticipation commit 4 — le composer en mode DISPATCHED ré-émettra ces
    // 3 Intents existants. Pas d'Intent kind nouveau côté composer.
    "INVOKE_GLORY_TOOL",
    "PTAH_MATERIALIZE_BRIEF",
  ],
  capabilities: [
    {
      name: "composeDeliverable",
      inputSchema: z.object({
        strategyId: z.string(),
        operatorId: z.string(),
        targetKind: z.string(),
        campaignId: z.string().optional(),
        overrideManipulationMode: z
          .enum(["peddler", "dealer", "facilitator", "entertainer"])
          .optional(),
        previewOnly: z.boolean().optional(),
      }),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 60_000,
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 3,
    },
  ],
  dependencies: ["artemis"],
  missionContribution: "CHAIN_VIA:artemis",
  missionStep: 3,
});
