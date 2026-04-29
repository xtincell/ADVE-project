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
      name: "snapshot",
      inputSchema: z.object({ strategyId: z.string(), pillarKey: z.string() }),
      outputSchema: z.object({ versionId: z.string() }),
      sideEffects: ["DB_WRITE"],
    },
    {
      name: "list",
      inputSchema: z.object({ strategyId: z.string(), pillarKey: z.string() }),
      outputSchema: z.object({ versions: z.array(z.unknown()) }),
      sideEffects: ["DB_READ"],
      idempotent: true,
    },
  ],
  missionContribution: "CHAIN_VIA:pillar-gateway",
  missionStep: 1,
});
