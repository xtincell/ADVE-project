/**
 * Manifest — production (INFRASTRUCTURE).
 *
 * Acteur « Production » (ADR-0111/0112) : fan-out d'une exécution en specs de
 * livrable, droits d'usage (talent × livrable) avec gate d'expiration, devis
 * AICP (lignes prévues + réalisé + variance). Déterministe.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "production",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [
    "LEGACY_DELIVERABLE_FANOUT",
    "LEGACY_USAGE_GRANT_CREATE",
    "LEGACY_AICP_ADD_LINE",
    "LEGACY_AICP_RECORD_ACTUAL",
  ],
  capabilities: [
    { name: "fanOutDeliverables", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "createUsageGrant", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "checkDiffusionAllowed", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
    { name: "addAicpLine", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "recordAicpActual", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "getAicpDevis", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Couche d'opérationnalisation des livrables (ADR-0111/0112) : traduit les briefs validés en specs concrètes, gère les droits d'usage talent et le devis AICP — sans elle, pas de traçabilité coût/droits sur la production diffusée. Aucune génération de marque.",
});
