/**
 * Manifest — consulting (INFRASTRUCTURE).
 *
 * Acteur « Conseil » (ADR-0109/0113) : priorisation RICE déterministe des
 * recommandations + chaîne de preuve (engagements → hypothèses → évidences →
 * verdict recalculé). Zéro LLM. Trace la décision pour le gate de priorisation.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "consulting",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [
    "LEGACY_RECOMMENDATION_SET_RICE",
    "LEGACY_CONSULTING_CREATE_ENGAGEMENT",
    "LEGACY_CONSULTING_ADD_HYPOTHESIS",
    "LEGACY_CONSULTING_ADD_EVIDENCE",
    "LEGACY_CONSULTING_LINK_RECO",
  ],
  capabilities: [
    { name: "setRecommendationRice", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "createEngagement", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "addHypothesis", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "addEvidence", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "recomputeHypothesis", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "linkRecommendationToHypothesis", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Priorisation RICE déterministe + chaîne de preuve (ADR-0109/0113) qui ordonnance les recommandations opérateur — sans elle, la sélection d'action repose sur l'intuition au lieu d'un score traçable. Aucune génération de marque.",
});
