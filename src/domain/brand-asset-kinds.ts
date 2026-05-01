/**
 * BrandAsset.kind — taxonomie complète des actifs de marque.
 *
 * Source de vérité TypeScript pour le `kind` field du model Prisma `BrandAsset`
 * (cf. prisma/schema.prisma:888 — String @default("GENERIC")).
 *
 * Phase 10 (ADR-0012 BrandVault unifié) a posé la taxonomie initiale.
 * Phase 13 (Oracle 35-section sprint, ADR-0015) ajoute 8 kinds Big4 + distinctifs.
 *
 * **Layer 0** : zero IO, zero Prisma. Pure domain enum.
 *
 * Cf. CLAUDE.md §"ANTI-DRIFT", LEXICON.md §"BrandAsset", APOGEE.md §4.1 Propulsion.
 */

import { z } from "zod";

/**
 * Familles d'actifs de marque (taxonomie Phase 10 + Phase 13).
 *
 * - **CONCEPTUAL** : actif intellectuel — payload structuré (output Glory tool, brief, etc.)
 * - **MATERIAL** : actif matériel — fileUrl (image/vidéo/audio/icône forgée par Ptah)
 * - **HYBRID** : mélange (payload + asset matériel attaché)
 *
 * Cf. BrandAsset.family dans schema.prisma:892
 */
export const BRAND_ASSET_FAMILIES = ["CONCEPTUAL", "MATERIAL", "HYBRID"] as const;
export type BrandAssetFamily = (typeof BRAND_ASSET_FAMILIES)[number];

/**
 * Source canonique des `BrandAsset.kind` valides.
 *
 * Phase 10 — taxonomie initiale (~50 kinds) :
 * BIG_IDEA, CREATIVE_BRIEF, BRIEF_360, BRAINSTORM, CONCEPT, CLAIM, MANIFESTO, NAMING,
 * POSITIONING, TONE_CHARTER, PERSONA, SUPERFAN_JOURNEY, KV_ART_DIRECTION_BRIEF,
 * KV_VISUAL, KV_PROMPT, SCRIPT, STORYBOARD, DIALOGUE, SOUND_BRIEF, VOICEOVER_BRIEF,
 * CASTING_BRIEF, VENDOR_BRIEF, PRINT_AD_SPEC, SOCIAL_COPY, RADIO_COPY, LONG_COPY,
 * VALUE_PROPOSITION, PITCH, CHROMATIC_STRATEGY, TYPOGRAPHY_SYSTEM, LOGO_IDEA,
 * LOGO_FINAL, VIDEO_SPOT, AUDIO_JINGLE, PACKAGING_LAYOUT, OOH_LAYOUT, TREND_RADAR,
 * SEO_REPORT, GENERIC.
 *
 * Phase 13 — extension Oracle 35-section (ADR-0015) :
 * 7 Big4 baseline (MCK_7S, BCG_PORTFOLIO, BAIN_NPS, MCK_3H, BCG_STRATEGY_PALETTE,
 * DELOITTE_GREENHOUSE, DELOITTE_BUDGET) + 3 distinctifs Oracle (CULT_INDEX,
 * MANIPULATION_MATRIX, OVERTON_WINDOW).
 *
 * Note : extension non-cassante car `BrandAsset.kind` est `String @default` côté Prisma.
 */
export const BRAND_ASSET_KINDS = [
  // ── Phase 10 baseline ──────────────────────────────────────────────────────
  // Identité & Vision
  "BIG_IDEA",
  "MANIFESTO",
  "POSITIONING",
  "VALUE_PROPOSITION",
  "TONE_CHARTER",
  "NAMING",
  // Cible
  "PERSONA",
  "SUPERFAN_JOURNEY",
  // Briefs
  "CREATIVE_BRIEF",
  "BRIEF_360",
  "KV_ART_DIRECTION_BRIEF",
  "SOUND_BRIEF",
  "VOICEOVER_BRIEF",
  "CASTING_BRIEF",
  "VENDOR_BRIEF",
  // Idéation
  "BRAINSTORM",
  "CONCEPT",
  "CLAIM",
  // Visuel
  "KV_VISUAL",
  "KV_PROMPT",
  "CHROMATIC_STRATEGY",
  "TYPOGRAPHY_SYSTEM",
  "LOGO_IDEA",
  "LOGO_FINAL",
  // Production audiovisuelle
  "SCRIPT",
  "STORYBOARD",
  "DIALOGUE",
  "VIDEO_SPOT",
  "AUDIO_JINGLE",
  // Production print/OOH
  "PRINT_AD_SPEC",
  "PACKAGING_LAYOUT",
  "OOH_LAYOUT",
  // Copy
  "SOCIAL_COPY",
  "RADIO_COPY",
  "LONG_COPY",
  // Stratégie & Diagnostic
  "PITCH",
  "TREND_RADAR",
  "SEO_REPORT",
  // Fallback
  "GENERIC",

  // ── Phase 13 — Oracle 35-section extension (ADR-0015) ──────────────────────
  // Big4 baseline (7) — frameworks consulting one-shot
  "MCK_7S", // McKinsey 7S framework
  "BCG_PORTFOLIO", // BCG Growth-Share Matrix
  "BAIN_NPS", // Bain Net Promoter System
  "MCK_3H", // McKinsey Three Horizons of Growth
  "BCG_STRATEGY_PALETTE", // BCG Strategy Palette (5 environments)
  "DELOITTE_GREENHOUSE", // Deloitte Greenhouse talent program
  "DELOITTE_BUDGET", // Deloitte FinOps budget framework
  // Distinctifs Oracle (3) — valeur ajoutée La Fusée vs Big4
  "CULT_INDEX", // Score composite cultural mass (Seshat cult-index-engine)
  "MANIPULATION_MATRIX", // 4 modes peddler/dealer/facilitator/entertainer
  "OVERTON_WINDOW", // Mapping fenêtre d'Overton sectorielle
] as const;

export type BrandAssetKind = (typeof BRAND_ASSET_KINDS)[number];

export const BrandAssetKindSchema = z.enum(BRAND_ASSET_KINDS);

/**
 * Kinds ajoutés par Phase 13 — utiles pour ADR-0015 audit + tests anti-drift.
 */
export const PHASE_13_BRAND_ASSET_KINDS = [
  "MCK_7S",
  "BCG_PORTFOLIO",
  "BAIN_NPS",
  "MCK_3H",
  "BCG_STRATEGY_PALETTE",
  "DELOITTE_GREENHOUSE",
  "DELOITTE_BUDGET",
  "CULT_INDEX",
  "MANIPULATION_MATRIX",
  "OVERTON_WINDOW",
] as const satisfies readonly BrandAssetKind[];

/**
 * Validateur runtime — vérifie qu'une string est un BrandAssetKind connu.
 * Utilisé par writeback BrandAsset promotion (B4 SECTION_ENRICHMENT) +
 * Ptah materialize (cascade hash-chain f9cd9de).
 */
export function isBrandAssetKind(value: unknown): value is BrandAssetKind {
  return typeof value === "string" && (BRAND_ASSET_KINDS as readonly string[]).includes(value);
}
