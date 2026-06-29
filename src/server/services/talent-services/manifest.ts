/**
 * Manifest — talent-services (INFRASTRUCTURE).
 *
 * Catalogue offre-side de la Guilde (ADR-0117) : le prestataire publie des gigs
 * à prix fixe, indépendants des missions ouvertes (pattern Fiverr/Malt supply).
 * Déterministe. Visibilité de l'offre crew.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "talent-services",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [
    "LEGACY_TALENT_SERVICE_CREATE",
    "LEGACY_TALENT_SERVICE_UPDATE",
    "LEGACY_TALENT_SERVICE_TOGGLE",
  ],
  capabilities: [
    { name: "createService", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "updateService", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "toggleService", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "listPublicServices", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
    { name: "listMyServices", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Visibilité offre-side du crew (ADR-0117) : permet au talent de diffuser capacité/prix à l'échelle plutôt que de candidater mission par mission — renforce la robustesse de la chaîne d'approvisionnement crew de la Guilde. Aucune génération de marque.",
});
