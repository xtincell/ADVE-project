/**
 * Data Contract — Proposition Créative (ADR-0120). PUR, client-safe (Layer: lib).
 *
 * Forme canonique UNIQUE de la Proposition Créative, IDENTIQUE que la source soit
 * l'API La Fusée (Voie A — Glory IA) ou le front La Guilde (Voie B — humain/agence).
 * C'est le « Data Contract » verrouillé exigé par la doctrine : un objet Proposition
 * a exactement cette forme quel que soit son producteur. Sa validation déclenche la
 * génération des actions + briefs de production dans les frames canon (cf. service
 * `creative-proposal/`).
 *
 * Zéro dépendance runtime hors zod + l'enum de routes (niveaux d'exécution ADR-0089).
 */

import { z } from "zod";
import { ROADMAP_ROUTE_KEYS } from "@/lib/types/pillar-schemas";

export const CREATIVE_PROPOSAL_SOURCES = ["LAFUSEE_AI", "LAGUILDE_HUMAN"] as const;
export type CreativeProposalSource = (typeof CREATIVE_PROPOSAL_SOURCES)[number];

export const CREATIVE_PROPOSAL_STATUSES = ["DRAFT", "SUBMITTED", "VALIDATED", "REJECTED"] as const;
export type CreativeProposalStatus = (typeof CREATIVE_PROPOSAL_STATUSES)[number];

export const CREATIVE_PROPOSAL_SOURCE_LABEL: Record<CreativeProposalSource, string> = {
  LAFUSEE_AI: "La Fusée (IA)",
  LAGUILDE_HUMAN: "La Guilde (humain)",
};

/**
 * Direction créative — le cœur de ce que la validation tranche (Big Idea / insight /
 * axe / pistes). `bigIdea` est le seul champ requis : une proposition minimale est
 * une Big Idea + un niveau d'exécution.
 */
export const creativeDirectionSchema = z.object({
  bigIdea: z.string().min(3).max(2000),
  insight: z.string().max(2000).default(""),
  axe: z.string().max(2000).default(""),
  pistes: z.array(z.string().max(500)).max(20).default([]),
});
export type CreativeDirection = z.infer<typeof creativeDirectionSchema>;

/**
 * AssetRef — pointeur vers un visuel : un `BrandAsset` (Voie A généré via image API /
 * Voie B importé) et/ou une URL. Tolérant : au moins l'un de brandAssetId|url.
 */
export const assetRefSchema = z.object({
  kind: z.string().max(60), // KEY_VISUAL | MOCKUP | SOCIAL_POST | ...
  brandAssetId: z.string().nullable().default(null),
  url: z.string().max(2000).nullable().default(null),
  label: z.string().max(200).nullable().default(null),
});
export type AssetRef = z.infer<typeof assetRefSchema>;

export const creativeProposalVisualsSchema = z.object({
  mockups: z.array(assetRefSchema).max(50).default([]),
  socialSim: z.array(assetRefSchema).max(50).default([]),
  keyVisual: assetRefSchema.nullable().default(null),
});
export type CreativeProposalVisuals = z.infer<typeof creativeProposalVisualsSchema>;

/**
 * Le Data Contract canonique d'entrée — ce qu'une source (Voie A ou B) soumet.
 * `executionLevels` (snapshot computeRoadmapRoutes) est dérivé côté service au moment
 * de la création, donc absent de l'entrée. `routeKey` = le niveau d'exécution choisi.
 */
export const creativeProposalContractSchema = z.object({
  strategyId: z.string().min(1),
  routeKey: z.enum(ROADMAP_ROUTE_KEYS),
  source: z.enum(CREATIVE_PROPOSAL_SOURCES).default("LAFUSEE_AI"),
  direction: creativeDirectionSchema,
  visuals: creativeProposalVisualsSchema.optional(),
});
export type CreativeProposalContract = z.infer<typeof creativeProposalContractSchema>;

/** Parse tolérant d'un `direction` JSON stocké (jamais throw — défauts si legacy). */
export function parseCreativeDirection(raw: unknown): CreativeDirection {
  const r = creativeDirectionSchema.safeParse(raw);
  if (r.success) return r.data;
  return { bigIdea: "", insight: "", axe: "", pistes: [] };
}

/** Parse tolérant d'un `visuals` JSON stocké (jamais throw). */
export function parseCreativeProposalVisuals(raw: unknown): CreativeProposalVisuals {
  const r = creativeProposalVisualsSchema.safeParse(raw ?? {});
  if (r.success) return r.data;
  return { mockups: [], socialSim: [], keyVisual: null };
}
