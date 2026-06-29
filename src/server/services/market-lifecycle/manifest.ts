/**
 * Manifest — market-lifecycle (MESTOR).
 *
 * Kill-switch marché gouverné (ADR-0105) : NEUTRALIZE (FROZEN | SHADOWBANNED),
 * REINSTATE (→ ACTIVE), PURGE (cascade BFS des stratégies → PURGED). Gouverné
 * par Mestor (pre-flight MARKET_STATUS gate). Déterministe.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "market-lifecycle",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: ["NEUTRALIZE_MARKET", "REINSTATE_MARKET", "PURGE_MARKET"],
  capabilities: [
    { name: "neutralizeMarket", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "reinstateMarket", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "purgeMarket", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "listMarkets", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
  ],
  dependencies: ["strategy-archive", "market-visibility"],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Gouvernance du cycle de vie d'un marché (gel/réintégration/purge, ADR-0105) — protège l'exécution des missions en suspendant ou purgeant les marchés sanctionnés sans toucher aux autres régions. Aucune génération de marque.",
});
