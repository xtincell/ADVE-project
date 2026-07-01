/**
 * Manifest — collab-doc.
 *
 * APOGEE classification: INFRASTRUCTURE governance, mission contribution =
 * GROUND_INFRASTRUCTURE. Persistence layer for StrategyDoc collaborative
 * documents (Yjs-compatible opaque state + optimistic concurrency).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "collab-doc",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "loadDoc",
      inputSchema: z.object({
        strategyId: z.string(),
        docKind: z.string(),
        docKey: z.string(),
      }),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Read snapshot of a collaborative doc; pre-requisite for any consultant working on a strategy without overwriting peers.",
    },
    {
      name: "saveDoc",
      inputSchema: z.object({
        strategyId: z.string(),
        docKind: z.string(),
        docKey: z.string(),
        baseVersion: z.number().int().nonnegative(),
        editorId: z.string().nullable(),
      }),
      outputSchema: z.unknown(),
      sideEffects: ["DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Persist Yjs/JSON snapshot with optimistic concurrency; loss of writes here breaks operator trust in the OS.",
    },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Collaborative authoring infrastructure; without it, multi-operator agencies overwrite each other and abandon the OS.",
});
