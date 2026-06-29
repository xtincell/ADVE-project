/**
 * Manifest — market-visibility (INFRASTRUCTURE).
 *
 * Substrat read-filter (ADR-0105) : résout les pays invisibles (SHADOWBANNED)
 * + descendants pour le default-deny tenant-scoped. Cache TTL 15s, déterministe.
 * N'est pas un Neter — plomberie de gouvernance (comme NSP / Yggdrasil).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "market-visibility",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  capabilities: [
    { name: "resolveMarketVisibility", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
    { name: "invalidateMarketVisibility", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: [], idempotent: true },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Filtre de lecture qui applique le kill-switch marché (FROZEN/SHADOWBANNED/PURGED) au moment de la requête (ADR-0105) — sans lui, l'OS exécuterait des missions sur des marchés neutralisés. Substrat de gouvernance, pas de génération.",
});
