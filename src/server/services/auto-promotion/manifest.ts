/**
 * src/server/services/auto-promotion/manifest.ts — Neteru manifest.
 *
 * Governor : MESTOR (governance, non-strategy-scoped).
 * MissionContribution : GROUND_INFRASTRUCTURE (timer-based scheduled
 * transitions safety windows).
 */

import { z } from "zod";
import type { NeteruManifest } from "@/server/governance/manifest";

const RunInputSchema = z.object({
  operatorId: z.string(),
  dryRun: z.boolean().optional(),
});

const RunOutputSchema = z.object({
  startedAt: z.string(),
  completedAt: z.string(),
  totalEvaluated: z.number(),
  totalPromoted: z.number(),
  totalSkipped: z.number(),
  totalWaiting: z.number(),
  dryRun: z.boolean(),
});

const ReadModeOutputSchema = z.object({
  mode: z.enum(["SOFT", "HARD"]),
});

export const autoPromotionManifest: NeteruManifest = {
  service: "auto-promotion",
  version: "1.0.0",
  governor: "MESTOR",
  acceptsIntents: ["AUTO_PROMOTION_EVALUATE", "TOGGLE_QUALITY_GATE_MODE"],
  capabilities: [
    {
      name: "runAutoPromotion",
      inputSchema: RunInputSchema,
      outputSchema: RunOutputSchema,
      sideEffects: ["DB_WRITE"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Safety windows ADR-0040+0041+0042 — module exécute exactement les transitions calendar-locked sans force-bypass. Cf. NEFER §3 interdit n°2 (pas de raccourci).",
    },
    {
      name: "getQualityGateMode",
      inputSchema: z.object({}),
      outputSchema: ReadModeOutputSchema,
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Read-only state derivation depuis IntentEmission log — pattern hash-chain immutability ADR-0005.",
    },
  ],
};
