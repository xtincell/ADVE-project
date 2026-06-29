/**
 * Manifest — bureau-etudes (INFRASTRUCTURE).
 *
 * Acteur « Bureau d'étude » (ADR-0110/0114) : vagues d'étude time-spine,
 * significativité vague-sur-vague, fusion pondérée de sources par provenance
 * — statistiques DÉTERMINISTES (zéro LLM). Alimente l'intelligence marché Seshat.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "bureau-etudes",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [
    "LEGACY_RESEARCH_WAVE_CREATE",
    "LEGACY_RESEARCH_WAVE_RECORD",
    "LEGACY_SOURCE_SET_PROVENANCE",
  ],
  capabilities: [
    { name: "createResearchWave", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "recordWaveAchieved", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "setSourceProvenance", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "listWaves", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
    { name: "compareWaves", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
    { name: "fuseStudySources", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
    { name: "listStudies", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
    { name: "listStudySources", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
    { name: "listCompetitorsByStudy", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Mesure de marché déterministe (vagues, significativité, fusion de sources, ADR-0110/0114) qui alimente l'intelligence marché Seshat — sans elle, le calibrage de maturité de marque et la détection de signaux n'ont pas de base chiffrée fiable. Aucune génération de marque.",
});
