/**
 * Manifest — intention (ARTEMIS).
 *
 * Aval de l'ADVE (Phase 24, ADR-0106) : capture l'intention du dirigeant,
 * génère un brief candidat (intention × ADVE, LLM ou MANUAL — manual-first
 * parity), valide contre le gate de cohérence ADVE. Ne mute aucun pilier.
 * Dispatché par le commandant Artemis.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "intention",
  governor: "ARTEMIS",
  version: "1.0.0",
  acceptsIntents: [
    "CAPTURE_INTENTION",
    "GENERATE_BRIEF_FROM_INTENTION",
    "VALIDATE_INTENTION_BRIEF",
  ],
  capabilities: [
    { name: "captureIntention", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "generateBriefFromIntention", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE", "LLM_CALL"], idempotent: false },
    { name: "validateIntentionBrief", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "listIntentions", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
    { name: "getIntention", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
  ],
  dependencies: ["mestor"],
  missionContribution: "CHAIN_VIA:ptah",
});
