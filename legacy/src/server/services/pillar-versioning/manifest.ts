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
        "Historique versions pour UI cockpit (timeline du pilier) + rollback workflow — sans cela aucune trace des changements.",
    },
    {
      name: "rollback",
      inputSchema: z.object({
        pillarId: z.string().min(1),
        versionId: z.string().min(1),
        author: z.string().optional(),
      }),
      outputSchema: z.void(),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Rollback explicite vers une version antérieure quand l'opérateur veut annuler une cascade — sans cela les édits sont définitifs et la friction d'expérimentation augmente.",
    },
  ],
  missionContribution: "CHAIN_VIA:pillar-gateway",
  missionStep: 1,
});
