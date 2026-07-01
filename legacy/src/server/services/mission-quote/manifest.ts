/**
 * Manifest — mission-quote (INFRASTRUCTURE).
 *
 * Devis structuré prestataire → marque (Guilde, ADR-0118) : soumission +
 * décision (accepté/rejeté), totaux (sous-total/taxe/total) déterministes.
 * Surface de négociation pré-exécution (distincte de l'Invoice post-exécution).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "mission-quote",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: ["LEGACY_MISSION_QUOTE_SUBMIT", "LEGACY_MISSION_QUOTE_DECIDE"],
  capabilities: [
    { name: "submitQuote", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "decideQuote", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "listQuotesByMission", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
    { name: "listMyQuotes", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Négociation de prix transparente prestataire↔marque (ADR-0118) — sans elle, pas de contrat de confiance pré-exécution, donc friction sur l'engagement du crew qui produit les campagnes. Aucune génération de marque.",
});
