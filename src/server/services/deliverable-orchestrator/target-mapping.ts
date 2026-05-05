/**
 * Deliverable Orchestrator — target kind → Glory tool producer mapping.
 *
 * Phase 17 (ADR-0037). Map qui résout `BrandAsset.kind` matériel cible vers
 * le slug du Glory tool (declaring `forgeOutput`) qui doit être invoqué pour
 * produire le brief consommé en aval par Ptah.
 *
 * Pourquoi une table explicite plutôt qu'une déduction depuis `outputFormat`
 * ou `forgeKind` :
 *   1. `outputFormat` est une string libre côté Glory tool (`kv_prompts_list`,
 *      `print_ad_spec`, ...) — pas isomorphe avec `BrandAssetKind`.
 *   2. Plusieurs Glory tools peuvent légitimement matérialiser le même kind
 *      (ex: KV_VISUAL via `kv-banana-prompt-generator` ou `kv-art-direction-brief`
 *      selon le contexte). La table tranche explicitement.
 *   3. La table est l'endroit canonique pour étendre le support de nouveaux
 *      `BrandAsset.kind` matériels — sans toucher au registry Glory.
 *
 * Layer 1 — pas d'IO. Pure data.
 */

import type { BrandAssetKind } from "@/domain/brand-asset-kinds";

/**
 * Mapping `BrandAsset.kind` matériel cible → Glory tool slug producteur.
 *
 * Le tool référencé DOIT déclarer `forgeOutput` dans le registry Glory
 * (cf. `src/server/services/artemis/tools/registry.ts`) — sinon le composer
 * ne pourra pas matérialiser via Ptah.
 *
 * Liste minimale Phase 17 commit 3. Étendre au fur et à mesure.
 */
export const TARGET_KIND_TO_PRODUCER_SLUG = {
  // Visuels matériels (forge image Magnific)
  KV_VISUAL: "kv-banana-prompt-generator",
  PRINT_AD_SPEC: "print-ad-architect",
  STORYBOARD: "storyboard-generator",

  // Decks design (forge Canva/Figma)
  PITCH: "pitch-architect",

  // Audio (forge audio Magnific tts-premium)
  VOICEOVER_BRIEF: "voiceover-brief-generator",

  // Briefs de production (Hybrid layer)
  VENDOR_BRIEF: "vendor-brief-generator",
  CASTING_BRIEF: "casting-brief-generator",

  // Frameworks Big4 forgeable (Phase 13)
  BCG_PORTFOLIO: "bcg-portfolio-plotter",
  MCK_3H: "mckinsey-3-horizons-mapper",
} as const satisfies Partial<Record<BrandAssetKind, string>>;

/** Liste des `BrandAsset.kind` matériels supportés par le composer Phase 17. */
export type SupportedTargetKind = keyof typeof TARGET_KIND_TO_PRODUCER_SLUG;

export const SUPPORTED_TARGET_KINDS: readonly SupportedTargetKind[] = Object.keys(
  TARGET_KIND_TO_PRODUCER_SLUG,
) as SupportedTargetKind[];

/** Renvoie le slug Glory tool producteur pour ce kind matériel, ou `null` si non supporté. */
export function getProducerSlug(targetKind: BrandAssetKind): string | null {
  if (targetKind in TARGET_KIND_TO_PRODUCER_SLUG) {
    return TARGET_KIND_TO_PRODUCER_SLUG[targetKind as SupportedTargetKind];
  }
  return null;
}

/** Vérifie qu'un kind est dans la liste supportée Phase 17. */
export function isSupportedTargetKind(kind: string): kind is SupportedTargetKind {
  return kind in TARGET_KIND_TO_PRODUCER_SLUG;
}
