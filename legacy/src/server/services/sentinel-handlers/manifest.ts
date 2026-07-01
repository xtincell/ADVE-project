/**
 * Manifest — sentinel-handlers (Phase 9-suite résidu, Loi 4 maintien orbite).
 *
 * Consomme les `IntentEmission` rows en status=PENDING émises par le cron
 * `/api/cron/sentinels` et exécute le travail réel pour chaque kind sentinel
 * (MAINTAIN_APOGEE, DEFEND_OVERTON, EXPAND_TO_ADJACENT_SECTOR).
 *
 * Sous tutelle MESTOR — les Intent kinds eux-mêmes sont owned par mestor/seshat
 * (cf. intent-kinds.ts). Ce service est un job batch idempotent qui draine la
 * queue, pas un destinataire d'Intents direct.
 *
 * Téléologie : sans ces handlers, les sentinels émis sont invisibles — pas
 * d'auto-correction APOGEE Loi 1+2, pas de Defense Overton Loi 4.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const StringId = z.string().min(1);

const SentinelRunResultSchema = z.object({
  scanned: z.number().int().nonnegative(),
  processed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  byKind: z.record(z.string(), z.number()),
  errors: z.array(z.object({
    id: StringId,
    kind: z.string(),
    error: z.string(),
  })),
  durationMs: z.number().int().nonnegative(),
});

export const manifest = defineManifest({
  service: "sentinel-handlers",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: [],
  emits: ["CULT_TIER_REVIEW", "OVERTON_COUNTERMOVE_DETECTED"],
  capabilities: [
    {
      name: "processPendingSentinels",
      inputSchema: z.object({}),
      outputSchema: SentinelRunResultSchema,
      sideEffects: ["DB_READ", "DB_WRITE", "EVENT_EMIT"],
      idempotent: true,
      latencyBudgetMs: 30000,
      missionContribution: "DIRECT_BOTH",
    },
  ],
  dependencies: ["seshat"],
  docs: {
    summary:
      "Job batch cron qui draine les IntentEmission sentinels PENDING. Idempotent : ne re-traite que PENDING, marque OK/FAILED. Phase 9-suite Loi 4 maintien orbite ICONE.",
  },
  missionContribution: "DIRECT_BOTH",
  missionStep: 5,
});
