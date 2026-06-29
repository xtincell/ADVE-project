/**
 * Manifest — media-perf (INFRASTRUCTURE).
 *
 * Ingestion de performance média réelle → CampaignAmplification (acteur Média,
 * ADR-0115). Manuel (déterministe) ou live via connecteur credential-gated
 * (ConnectorResult honnête : DEFERRED/DEGRADED). Alimente la mesure de campagne.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "media-perf",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: ["LEGACY_MEDIA_PERF_INGEST_MANUAL"],
  capabilities: [
    { name: "ingestManualPerformance", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "ingestLivePerformance", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["EXTERNAL_API", "DB_READ"], idempotent: true },
  ],
  dependencies: ["anubis"],
  missionContribution: "CHAIN_VIA:campaign-tracker",
});
