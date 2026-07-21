/**
 * src/domain/brand-tier.ts — Layer 0. The single source of truth for the
 * APOGEE brand ladder (palier).
 *
 * Canon (ADR-0001 APOGEE, R7-zombie-latent, STATE_FINAL_BLUEPRINT §6.1):
 * SIX ordered tiers, ground → apex:
 *
 *   LATENT → FRAGILE → ORDINAIRE → FORTE → CULTE → ICONE
 *
 * Before 2026-06 the ground tier was named "ZOMBIE" and the *deterministic*
 * composite classifier (`classifyBrand`) silently skipped FRAGILE — a 5-tier
 * vs 6-tier drift between the scorer and the intake ladder, plus ~15 scattered
 * inline `composite<=80?"ZOMBIE":...` ladders that each re-encoded the cutoffs.
 *
 * This module collapses all of that into one deterministic function. Every
 * classification in the codebase MUST route through `classifyTier`. The legacy
 * "ZOMBIE" string survives ONLY inside `normalizePalier` so historical
 * NspEvent / snapshot rows remain readable (Loi 1 — no silent mutation).
 *
 * Pure: zod only, no I/O, no LLM, variance 0.
 */

import { z } from "zod";

export const BRAND_TIERS = [
  "LATENT",
  "FRAGILE",
  "ORDINAIRE",
  "FORTE",
  "CULTE",
  "ICONE",
] as const;

export type BrandTier = (typeof BRAND_TIERS)[number];

/** zod enum for runtime validation. */
export const BrandTierSchema = z.enum(BRAND_TIERS);

/**
 * Upper bounds (inclusive) on the canonical /200 composite scale. ICONE is the
 * open-ended apex (> 180). Chosen so each band widens as it nears the apex —
 * the higher the tier, the harder each point is to earn.
 */
export const TIER_UPPER_BOUNDS_200: Record<Exclude<BrandTier, "ICONE">, number> = {
  LATENT: 40,
  FRAGILE: 80,
  ORDINAIRE: 120,
  FORTE: 160,
  CULTE: 180,
};

/**
 * Deterministic classification from a composite score. `maxScore` normalises
 * from other scales (e.g. a /100 cult composite). Same input → same output.
 */
export function classifyTier(composite: number, maxScore = 200): BrandTier {
  const n = maxScore === 200 ? composite : (composite / maxScore) * 200;
  if (n <= TIER_UPPER_BOUNDS_200.LATENT) return "LATENT";
  if (n <= TIER_UPPER_BOUNDS_200.FRAGILE) return "FRAGILE";
  if (n <= TIER_UPPER_BOUNDS_200.ORDINAIRE) return "ORDINAIRE";
  if (n <= TIER_UPPER_BOUNDS_200.FORTE) return "FORTE";
  if (n <= TIER_UPPER_BOUNDS_200.CULTE) return "CULTE";
  return "ICONE";
}

/** 0-based ladder rank. LATENT = 0 … ICONE = 5. */
export function tierIndex(tier: BrandTier): number {
  return BRAND_TIERS.indexOf(tier);
}

/** < 0 if a is lower than b, 0 if equal, > 0 if higher. */
export function compareTiers(a: BrandTier, b: BrandTier): number {
  return tierIndex(a) - tierIndex(b);
}

export function nextTier(tier: BrandTier): BrandTier | null {
  return BRAND_TIERS[tierIndex(tier) + 1] ?? null;
}

export function prevTier(tier: BrandTier): BrandTier | null {
  const i = tierIndex(tier);
  return i > 0 ? BRAND_TIERS[i - 1]! : null;
}

/** Tier at-or-above a floor — used by tier-gated surfaces. */
export function tierAtOrAbove(tier: BrandTier, floor: BrandTier): boolean {
  return compareTiers(tier, floor) >= 0;
}

/**
 * Legacy palier normalisation. Maps deprecated "ZOMBIE" (any case) → "LATENT"
 * and validates canonical values. Returns `null` for unrecognised input.
 *
 * THIS IS THE ONLY PLACE THE "ZOMBIE" LITERAL IS ALLOWED TO LIVE — it exists
 * so historical serialized rows (NspEvent.brandLevel, ScoreSnapshot, indexer)
 * stay readable without being mutated (Loi 1 conservation d'altitude).
 */
const LEGACY_PALIER_ALIASES: Record<string, BrandTier> = {
  ZOMBIE: "LATENT",
};

export function normalizePalier(raw: unknown): BrandTier | null {
  if (typeof raw !== "string") return null;
  const up = raw.trim().toUpperCase();
  if ((BRAND_TIERS as readonly string[]).includes(up)) return up as BrandTier;
  return LEGACY_PALIER_ALIASES[up] ?? null;
}

/**
 * Palier EFFECTIF d'une marque (ADR-0167) : le palier officiel PERSISTÉ
 * (`Strategy.apogeeTier`, ratchet mû seulement par une transition gouvernée
 * PROMOTE ou DEMOTE) s'il est posé, sinon le palier IMPLIQUÉ par le score.
 *
 * C'est ce qui donne des dents à la Loi 1 « conservation d'altitude » : une
 * fois `apogeeTier` posé, une baisse de composite ne rétrograde plus le palier
 * en silence — seul un DEMOTE explicite le fait. `apogeeTier === null` (toutes
 * les marques avant leur première promotion) ⇒ comportement dérivé inchangé.
 *
 * Pur, déterministe. Réutilise `normalizePalier` (valide + alias legacy) et
 * `classifyTier` (le fallback dérivé).
 */
export function effectiveTier(args: {
  apogeeTier?: string | null;
  composite: number | null | undefined;
}): BrandTier {
  return normalizePalier(args.apogeeTier) ?? classifyTier(args.composite ?? 0);
}

export interface TierDefinition {
  /** Short FR label for UI badges. */
  label: string;
  /** One-line positioning. */
  tagline: string;
  /** Observable signals that place a brand at this tier. */
  signals: string;
  /** CSS custom property (Tier-3 domain token) carrying the tier colour. */
  colorVar: string;
}

export const TIER_DEFINITIONS: Record<BrandTier, TierDefinition> = {
  LATENT: {
    label: "Latent",
    tagline: "Invisible — fondations à poser",
    signals:
      "Pas de proposition de valeur différenciée, pas d'ADN exprimé, pas de communauté, langage générique. La marque existe juridiquement mais pas dans la tête des gens.",
    colorVar: "var(--color-class-latent)",
  },
  FRAGILE: {
    label: "Fragile",
    tagline: "Intuitions justes — cohérence à stabiliser",
    signals:
      "Mission ou promesse esquissée mais pas codifiée. Brand book absent ou partiel. Cohérence verbale/visuelle inconstante. Communauté embryonnaire, pas de rituels.",
    colorVar: "var(--color-class-fragile)",
  },
  ORDINAIRE: {
    label: "Ordinaire",
    tagline: "Fonctionnelle — substituable",
    signals:
      "La marque livre. Identité présente mais générique sur son marché. Concurrence directe interchangeable. Pas de signature mémorable. Pas d'ennemi nommé.",
    colorVar: "var(--color-class-ordinaire)",
  },
  FORTE: {
    label: "Forte",
    tagline: "Distincte — préférée par certains",
    signals:
      "Positionnement clair, différenciation réelle, voix reconnaissable. Premiers ambassadeurs spontanés. Rituels émergents. Promesse maître formulée et tenue.",
    colorVar: "var(--color-class-forte)",
  },
  CULTE: {
    label: "Culte",
    tagline: "Mouvement — communauté engagée",
    signals:
      "Communauté structurée avec hiérarchie tacite, rituels réguliers, signature visuelle/verbale identifiable. Mythologie portée par les fans. Ennemi commun. Vocabulaire interne.",
    colorVar: "var(--color-class-culte)",
  },
  ICONE: {
    label: "Icône",
    tagline: "Référence sectorielle — patrimoine",
    signals:
      "Position dominante établie, transmission générationnelle, défense de territoire. La marque définit la catégorie. Ambassadeurs publics, presse acquise.",
    colorVar: "var(--color-class-icone)",
  },
};
