/**
 * Phase 18-N5 (heuristic, ADR-0061) — Variable Bible classification par BrandNature.
 *
 * Plutôt qu'une reclassif manuelle exhaustive des ~300 entrées (Phase 18-N5-bis,
 * domain-business), ce helper classe heuristiquement par préfixe / nom :
 *   - `BIBLE_A.tone` / `BIBLE_A.archetype` → universel (tous archétypes)
 *   - `BIBLE_E.shopper-*` → PRODUCT + RETAIL_SPACE
 *   - `BIBLE_E.shelf-share-*` → PRODUCT
 *   - `BIBLE_I.feature-roadmap` → PLATFORM
 *   - `BIBLE_I.activation-calendar` → FESTIVAL_IP + PRODUCT
 *   - `BIBLE_*.fan-*` → CHARACTER_IP + MEDIA_IP + FESTIVAL_IP
 *   - `BIBLE_*.donor-*` → INSTITUTION
 *   - etc.
 *
 * Le helper retourne `applicableNatures: BrandNature[]` pour une variable bible
 * key donnée. Default = ALL_BRAND_NATURES (universel) si pas de match.
 *
 * Le résultat est utilisable côté UI (afficher uniquement les variables
 * pertinentes pour le BrandNode) et côté Mestor pre-flight (refuser une
 * mutation `OPERATOR_AMEND_PILLAR` sur une variable non-applicable au nœud).
 */

import type { BrandNature } from "@prisma/client";
import { ALL_BRAND_NATURES } from "@/domain/brand-nature-archetypes";

export type InheritanceMode = "INHERIT_BY_DEFAULT" | "NEVER_INHERIT" | "MERGE_WITH_PARENT";

export interface BibleVarClassification {
  applicableNatures: readonly BrandNature[];
  inheritanceMode: InheritanceMode;
  /** Source de la classification — "HEURISTIC" pour MVP, "MANUAL_OVERRIDE" Phase 18-N5-bis. */
  source: "HEURISTIC" | "MANUAL_OVERRIDE";
}

/** Tableaux de patterns regex → classification. Évalués dans l'ordre, premier match gagne. */
const PATTERNS: { regex: RegExp; classification: BibleVarClassification }[] = [
  // Geographic / market scope → NEVER_INHERIT (chaque regional brand a son countryCode propre)
  {
    regex: /\b(country|countryCode|currencyCode|market|region|localCalendar|publicHolidays)\b/i,
    classification: {
      applicableNatures: ALL_BRAND_NATURES,
      inheritanceMode: "NEVER_INHERIT",
      source: "HEURISTIC",
    },
  },
  // Tone-of-voice / archetype / mission → INHERIT_BY_DEFAULT (master brand cascade)
  {
    regex: /BIBLE_A\.(tone|archetype|mission|values|public-voice|character-voice)/i,
    classification: {
      applicableNatures: ALL_BRAND_NATURES,
      inheritanceMode: "INHERIT_BY_DEFAULT",
      source: "HEURISTIC",
    },
  },
  // Manipulation mix → MERGE_WITH_PARENT (regional ajoute sans contradire)
  {
    regex: /manipulation|peddler|dealer|facilitator|entertainer/i,
    classification: {
      applicableNatures: ALL_BRAND_NATURES,
      inheritanceMode: "MERGE_WITH_PARENT",
      source: "HEURISTIC",
    },
  },
  // Shopper / shelf-share → PRODUCT + RETAIL_SPACE
  {
    regex: /\b(shopper|shelf-share|shelf-position|sku|packaging|claim)\b/i,
    classification: {
      applicableNatures: ["PRODUCT", "RETAIL_SPACE"],
      inheritanceMode: "INHERIT_BY_DEFAULT",
      source: "HEURISTIC",
    },
  },
  // Festival / lineup → FESTIVAL_IP only
  {
    regex: /\b(lineup|venue|fomo|edition|attendee|after-movie)\b/i,
    classification: {
      applicableNatures: ["FESTIVAL_IP"],
      inheritanceMode: "INHERIT_BY_DEFAULT",
      source: "HEURISTIC",
    },
  },
  // Story / writers / character → CHARACTER_IP + MEDIA_IP
  {
    regex: /\b(writers-room|character|story-arc|episode|chapter|canon|franchise)\b/i,
    classification: {
      applicableNatures: ["CHARACTER_IP", "MEDIA_IP"],
      inheritanceMode: "INHERIT_BY_DEFAULT",
      source: "HEURISTIC",
    },
  },
  // Fan culture → CHARACTER_IP + MEDIA_IP + FESTIVAL_IP
  {
    regex: /\bfan-/i,
    classification: {
      applicableNatures: ["CHARACTER_IP", "MEDIA_IP", "FESTIVAL_IP"],
      inheritanceMode: "INHERIT_BY_DEFAULT",
      source: "HEURISTIC",
    },
  },
  // Donor / volunteer / advocacy → INSTITUTION
  {
    regex: /\b(donor|volunteer|advocacy|civic|stakeholder|program)\b/i,
    classification: {
      applicableNatures: ["INSTITUTION"],
      inheritanceMode: "INHERIT_BY_DEFAULT",
      source: "HEURISTIC",
    },
  },
  // Platform / feature / network-effect → PLATFORM
  {
    regex: /\b(network-effect|feature-line|developer|user-onboarding|growth-loop|API)\b/i,
    classification: {
      applicableNatures: ["PLATFORM"],
      inheritanceMode: "INHERIT_BY_DEFAULT",
      source: "HEURISTIC",
    },
  },
  // Service / customer-experience → SERVICE
  {
    regex: /\b(service-design|customer-experience|trust-narrative|premium-segment|pricing-positioning)\b/i,
    classification: {
      applicableNatures: ["SERVICE"],
      inheritanceMode: "INHERIT_BY_DEFAULT",
      source: "HEURISTIC",
    },
  },
  // Personal brand / drop / podcast → PERSONAL
  {
    regex: /\b(personal-archetype|content-pillars|drop-strategy|podcast|book-launch|speaking-circuit)\b/i,
    classification: {
      applicableNatures: ["PERSONAL"],
      inheritanceMode: "INHERIT_BY_DEFAULT",
      source: "HEURISTIC",
    },
  },
];

/** Default fallback : universel + INHERIT_BY_DEFAULT. */
const DEFAULT_CLASSIFICATION: BibleVarClassification = {
  applicableNatures: ALL_BRAND_NATURES,
  inheritanceMode: "INHERIT_BY_DEFAULT",
  source: "HEURISTIC",
};

/**
 * Classe une variable bible par sa key.
 *
 * @param bibleKey — ex: "BIBLE_A.tone", "BIBLE_E.shopper-journey", "BIBLE_I.activation-calendar"
 */
export function classifyBibleVar(bibleKey: string): BibleVarClassification {
  for (const pattern of PATTERNS) {
    if (pattern.regex.test(bibleKey)) return pattern.classification;
  }
  return DEFAULT_CLASSIFICATION;
}

/**
 * Filtre une liste de bible keys pour ne retenir que celles applicables à la nature.
 */
export function filterBibleKeysByNature(keys: string[], nature: BrandNature): string[] {
  return keys.filter((k) => classifyBibleVar(k).applicableNatures.includes(nature));
}
