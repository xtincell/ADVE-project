/**
 * Manifest — Pillar Versioning (per-pillar content history).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "pillar-versioning",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  capabilities: [
    {
      name: "createVersion",
      inputSchema: z.object({
        pillarId: z.string().min(1),
        content: z.unknown(),
        author: z.string().optional(),
      }).passthrough(),
      outputSchema: z.string(),
      sideEffects: ["DB_WRITE"],
      missionContribution: "CHAIN_VIA:pillar-gateway",
    },
    {
      name: "getHistory",
      inputSchema: z.object({
        pillarId: z.string().min(1),
        limit: z.number().int().positive().optional(),
      }),
      outputSchema: z.array(z.unknown()),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Historique versions pour UI cockpit (timeline du pilier) ; la restauration depuis cet historique passe par pillar-gateway/rollback (ADR-0207) — sans cela aucune trace des changements.",
    },
  ],
  missionContribution: "CHAIN_VIA:pillar-gateway",
  missionStep: 1,
});
