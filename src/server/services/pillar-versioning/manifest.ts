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
    {
      name: "getCatalogueHistory",
      inputSchema: z.object({ strategyId: z.string().min(1) }),
      outputSchema: z.object({ currentVersion: z.number().int(), events: z.array(z.unknown()) }).passthrough(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Entrées, retraits et réintroductions des produits du catalogue, dérivés des versions conservées (ADR-0205, amendement 568) — l'identité d'un produit ne se lit pas sans son histoire.",
    },
  ],
  missionContribution: "CHAIN_VIA:pillar-gateway",
  missionStep: 1,
});
