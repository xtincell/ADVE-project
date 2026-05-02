/**
 * KIND_TO_PILLAR — canonical mapping BrandAssetKind → ADVERTIS pillar source.
 *
 * Source de vérité unique. Imported by the source classifier (assigns
 * `BrandAsset.pillarSource`) and by asset-tagger (warm-starts `pillarTags`).
 *
 * Test anti-drift `tests/unit/services/source-classifier-pillar-map.test.ts`
 * enforces that every BrandAssetKind has exactly one PillarKey.
 */

import type { BrandAssetKind } from "@/domain/brand-asset-kinds";
import { BRAND_ASSET_KINDS } from "@/domain/brand-asset-kinds";
import type { PillarKey } from "./types";

export const KIND_TO_PILLAR: Record<BrandAssetKind, PillarKey> = {
  // ── Authentic identity (A) ──
  MANIFESTO: "A",
  TONE_CHARTER: "A",
  NAMING: "A",
  LOGO_IDEA: "A",
  LOGO_FINAL: "A",
  GENERIC: "A",

  // ── Distinction (D) ──
  POSITIONING: "D",
  CLAIM: "D",
  KV_VISUAL: "D",
  CHROMATIC_STRATEGY: "D",
  TYPOGRAPHY_SYSTEM: "D",

  // ── Value (V) ──
  VALUE_PROPOSITION: "V",

  // ── Engagement (E) ──
  PERSONA: "E",
  SUPERFAN_JOURNEY: "E",

  // ── Reach (R) ──
  VIDEO_SPOT: "R",
  AUDIO_JINGLE: "R",
  PRINT_AD_SPEC: "R",
  PACKAGING_LAYOUT: "R",
  OOH_LAYOUT: "R",
  SOCIAL_COPY: "R",
  RADIO_COPY: "R",
  LONG_COPY: "R",
  SEO_REPORT: "R",

  // ── Trust (T) ──
  BAIN_NPS: "T",
  CULT_INDEX: "T",

  // ── Innovation (I) — briefs + ideation ──
  BIG_IDEA: "I",
  CREATIVE_BRIEF: "I",
  BRIEF_360: "I",
  KV_ART_DIRECTION_BRIEF: "I",
  SOUND_BRIEF: "I",
  VOICEOVER_BRIEF: "I",
  CASTING_BRIEF: "I",
  BRAINSTORM: "I",
  CONCEPT: "I",
  KV_PROMPT: "I",
  SCRIPT: "I",
  STORYBOARD: "I",
  DIALOGUE: "I",

  // ── Strategy (S) — frameworks, planning, vendor ops ──
  VENDOR_BRIEF: "S",
  PITCH: "S",
  TREND_RADAR: "S",
  MCK_7S: "S",
  BCG_PORTFOLIO: "S",
  MCK_3H: "S",
  BCG_STRATEGY_PALETTE: "S",
  DELOITTE_GREENHOUSE: "S",
  DELOITTE_BUDGET: "S",
  MANIPULATION_MATRIX: "S",
  OVERTON_WINDOW: "S",
};

/**
 * Lookup helper. Always returns a PillarKey — falls back to "A" for any
 * unknown kind to keep callers safe at runtime, but the build-time test
 * ensures every BrandAssetKind has an explicit entry.
 */
export function inferPillarSource(kind: BrandAssetKind): PillarKey {
  return KIND_TO_PILLAR[kind] ?? "A";
}

/** Used by tests to verify exhaustivity vs BRAND_ASSET_KINDS. */
export const KIND_TO_PILLAR_KEYS = BRAND_ASSET_KINDS;
