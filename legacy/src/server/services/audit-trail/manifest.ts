/**
 * Manifest — audit-trail.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): INFRASTRUCTURE governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Exposes 4 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "audit-trail",
  governor: "INFRASTRUCTURE",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "log",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Audit trail is the immutable backbone of trust; without it founder cannot trust the system, breaking the cult-formation prerequisite.",
    },
    {
      name: "getEntityHistory",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Audit trail is the immutable backbone of trust; without it founder cannot trust the system, breaking the cult-formation prerequisite.",
    },
    {
      name: "getUserActivity",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Audit trail is the immutable backbone of trust; without it founder cannot trust the system, breaking the cult-formation prerequisite.",
    },
    {
      name: "getRecentActivity",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Audit trail is the immutable backbone of trust; without it founder cannot trust the system, breaking the cult-formation prerequisite.",
    }
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Audit trail is the immutable backbone of trust; without it founder cannot trust the system, breaking the cult-formation prerequisite.",
});
