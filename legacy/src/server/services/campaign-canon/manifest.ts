/**
 * Manifest — campaign-canon (INFRASTRUCTURE).
 *
 * Génère les 3 campagnes canon (30-60-90 / annuelle / always-on) depuis le
 * Pilier I + campagnes ponctuelles déclenchées par insight externe (ADR-0119).
 * Déterministe — exception documentée au STOP-à-Jehuty (ne mute aucun pilier).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "campaign-canon",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: ["GENERATE_CANONICAL_CAMPAIGNS", "CREATE_PUNCTUAL_CAMPAIGN"],
  capabilities: [
    { name: "generateCanonicalCampaigns", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "createPunctualCampaign", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "ensureCanonTemplates", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
  ],
  dependencies: [],
  missionContribution: "CHAIN_VIA:campaign-tracker",
});
