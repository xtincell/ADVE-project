/**
 * Manifest — creative-proposal (INFRASTRUCTURE).
 *
 * Proposition Créative : la gate de génération de production (ADR-0120). Sa
 * validation rattache le jeu d'initiatives de la route aux frames canon et génère
 * leurs briefs de production (le trigger a déménagé de l'Advertis vers ici).
 * Déterministe — zéro LLM dans la gate.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "creative-proposal",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [
    "CREATE_CREATIVE_PROPOSAL",
    "SUBMIT_CREATIVE_PROPOSAL",
    "VALIDATE_CREATIVE_PROPOSAL",
    "REJECT_CREATIVE_PROPOSAL",
    "DRAFT_CREATIVE_PROPOSAL_FROM_STRATEGY",
    "GUILD_SUBMIT_CREATIVE_PROPOSAL",
    "SEED_CREATIVE_AXES",
  ],
  capabilities: [
    { name: "createCreativeProposal", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "submitCreativeProposal", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "validateCreativeProposal", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "rejectCreativeProposal", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "draftCreativeDirectionFromStrategy", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["LLM_CALL"], idempotent: false },
    { name: "submitGuildCreativeProposal", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
  ],
  dependencies: ["campaign-canon", "campaign-manager"],
  missionContribution: "CHAIN_VIA:campaign-tracker",
});
