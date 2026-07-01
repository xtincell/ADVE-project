/**
 * Phase 18 (ADR-0061) — `BRAND_NATURE_ARCHETYPES` source de vérité unique.
 *
 * Pour chaque `BrandNature` (cf. enum Prisma `BrandNature`), définit la cascade
 * canonique de `nodeKind`, les transitions parent → child autorisées, les Glory
 * tools applicables, les variables Bible applicables, le manipulation mix par
 * défaut, et le `identityRootKind` (= ancêtre considéré comme centre identitaire
 * pour le RAG retrieval default scope).
 *
 * **Validation runtime** : Mestor gate `NATURE_TRANSITION_VALIDITY` (cf.
 * `src/server/services/brand-node/handlers.ts` Phase 18-A0 J3) consulte cette
 * const pour refuser les transitions absurdes (`SKU → CORPORATE`,
 * `FESTIVAL_IP → SKU`, etc.) avant écriture DB.
 *
 * **Phase 18-A0** : PRODUCT operable end-to-end (FrieslandCampina ingéré).
 * **Phase 18 noyau** : Glory tools annotation `applicableNatures` (56 tools).
 * **Phase 18-bis** : 8 autres natures opérables avec wizards intake spécialisés.
 *
 * Cf. ADR-0061 [docs/governance/adr/0061-brand-nature-archetypes-template.md].
 */

import type { BrandNature } from "@prisma/client";

/** Mode d'inheritance d'un champ pillar / variable bible. */
export type InheritanceMode =
  | "INHERIT_BY_DEFAULT" // hérité du parent sauf override explicite (ex: tone-of-voice)
  | "NEVER_INHERIT" // jamais hérité — local strictement (ex: countryCode regional)
  | "MERGE_WITH_PARENT"; // mergé avec parent (ex: manipulation mix qui s'ajoute)

/** Mode de manipulation Matrix (cf. MANIPULATION-MATRIX.md). */
export type ManipulationMode = "peddler" | "dealer" | "facilitator" | "entertainer";

export interface BrandNatureArchetype {
  /** Cascade canonique de `nodeKind`, du root vers la feuille. */
  cascade: readonly string[];
  /**
   * Matrice transitions parent → children authorisées.
   * Clé "ROOT" = nœud sans parent (racine de l'arbre).
   * Si une clé est absente : aucune transition n'est autorisée depuis ce kind.
   * Si la valeur est `[]` : feuille (pas d'enfant).
   */
  validTransitions: Readonly<Record<string, readonly string[]>>;
  /**
   * Glory tools applicables (slug du registre Artemis tools).
   * Wildcard `"*"` = tous tools applicables (rare, utilisé pour TS Phase 18-A0
   * en attendant l'annotation explicite Phase 18 noyau).
   */
  applicableGloryTools: readonly string[];
  /**
   * Variables Bible applicables (clés de `src/lib/types/variable-bible.ts`).
   * Wildcard `"*"` = toutes variables ADVE/RTIS applicables (Phase 18-A0 default
   * en attendant la reclassif fine Phase 18 noyau ~300 entrées).
   */
  applicableBibleVars: readonly string[];
  /** Manipulation modes par défaut pour ce type de marque. */
  defaultManipulationMix: readonly ManipulationMode[];
  /**
   * RAG retrieval default scope — quel niveau d'ancêtre est l'identité racine.
   * Le retriever pondère plus fort les contextNodes attachés à ce kind ancestor.
   */
  identityRootKind: string;
}

/**
 * Source de vérité unique des 9 archétypes par BrandNature.
 *
 * Pour ajouter une nouvelle nature ou une nouvelle transition : ADR follow-up
 * obligatoire (NEFER §3 trois interdits — pas de drift narratif silencieux).
 */
export const BRAND_NATURE_ARCHETYPES: Readonly<Record<BrandNature, BrandNatureArchetype>> = {
  PRODUCT: {
    cascade: [
      "CORPORATE",
      "MASTER_BRAND",
      "REGIONAL_CLUSTER",
      "REGIONAL_BRAND",
      "PRODUCT_LINE",
      "PRODUCT_VARIANT",
      "SKU",
    ],
    validTransitions: {
      ROOT: ["CORPORATE", "MASTER_BRAND", "STANDALONE_BRAND"],
      CORPORATE: ["MASTER_BRAND"],
      MASTER_BRAND: ["REGIONAL_CLUSTER", "REGIONAL_BRAND", "PRODUCT_LINE"],
      REGIONAL_CLUSTER: ["REGIONAL_BRAND"],
      REGIONAL_BRAND: ["PRODUCT_LINE"],
      PRODUCT_LINE: ["PRODUCT_VARIANT", "SKU"],
      PRODUCT_VARIANT: ["SKU"],
      SKU: [],
      STANDALONE_BRAND: [
        // Backfill fallback : un STANDALONE_BRAND peut éventuellement gagner
        // une descendance complète si l'opérateur l'éclate via wizard.
        "REGIONAL_CLUSTER",
        "REGIONAL_BRAND",
        "PRODUCT_LINE",
      ],
    },
    applicableGloryTools: [
      "creative-brief",
      "kv-art-direction-brief",
      "manifesto-writing",
      "claim-extraction",
      "packaging-storytelling",
      "shelf-share-strategy",
      "shopper-journey-map",
      "promo-mechanics-brief",
      "trade-marketing-plan",
      // Higgsfield MCP video tools (ADR-0048 §16-B)
      "higgsfield-dop",
      "higgsfield-soul",
      "higgsfield-steal",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype",
      "BIBLE_A.tone",
      "BIBLE_D.unique-mechanism",
      "BIBLE_V.functional-value",
      "BIBLE_V.emotional-value",
      "BIBLE_E.shopper-journey",
      "BIBLE_E.shelf-share-target",
      "BIBLE_R.competitor-set",
      "BIBLE_T.cultural-trends",
      "BIBLE_I.activation-roadmap",
      "BIBLE_S.synthesis-pillar",
    ],
    defaultManipulationMix: ["peddler", "entertainer"],
    identityRootKind: "MASTER_BRAND",
  },

  SERVICE: {
    cascade: ["CORPORATE", "SERVICE_BRAND", "MARKET", "CUSTOMER_SEGMENT", "OFFER"],
    validTransitions: {
      ROOT: ["CORPORATE", "SERVICE_BRAND", "STANDALONE_BRAND"],
      CORPORATE: ["SERVICE_BRAND"],
      SERVICE_BRAND: ["MARKET"],
      MARKET: ["CUSTOMER_SEGMENT"],
      CUSTOMER_SEGMENT: ["OFFER"],
      OFFER: [],
      STANDALONE_BRAND: ["MARKET", "CUSTOMER_SEGMENT", "OFFER"],
    },
    applicableGloryTools: [
      "creative-brief",
      "manifesto-writing",
      "service-design-brief",
      "customer-experience-map",
      "pricing-positioning-brief",
      "trust-narrative-strategy",
      "premium-segment-brief",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype",
      "BIBLE_A.tone",
      "BIBLE_D.service-differentiator",
      "BIBLE_V.functional-value",
      "BIBLE_V.trust-value",
      "BIBLE_E.customer-touchpoints",
      "BIBLE_R.competitor-set",
      "BIBLE_T.cultural-trends",
      "BIBLE_I.experience-roadmap",
    ],
    defaultManipulationMix: ["facilitator", "dealer"],
    identityRootKind: "SERVICE_BRAND",
  },

  CHARACTER_IP: {
    cascade: ["IP_OWNER", "CHARACTER", "UNIVERSE", "EXPLOITATION_DOMAIN", "FORMAT"],
    validTransitions: {
      ROOT: ["IP_OWNER", "STANDALONE_BRAND"],
      IP_OWNER: ["CHARACTER"],
      CHARACTER: ["UNIVERSE", "EXPLOITATION_DOMAIN"],
      UNIVERSE: ["EXPLOITATION_DOMAIN"],
      EXPLOITATION_DOMAIN: ["FORMAT"],
      FORMAT: [],
      STANDALONE_BRAND: ["UNIVERSE", "EXPLOITATION_DOMAIN", "FORMAT"],
    },
    applicableGloryTools: [
      "writers-room-outline",
      "character-bible-extraction",
      "story-arc-brief",
      "transmedia-extension-brief",
      "merchandising-line-brief",
      "fan-community-strategy",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype",
      "BIBLE_A.character-voice",
      "BIBLE_D.canon-element",
      "BIBLE_V.fan-emotional-value",
      "BIBLE_E.fan-touchpoints",
      "BIBLE_T.fan-culture",
      "BIBLE_I.transmedia-roadmap",
    ],
    defaultManipulationMix: ["entertainer", "dealer"],
    identityRootKind: "CHARACTER",
  },

  FESTIVAL_IP: {
    cascade: ["ORGANIZATION", "FESTIVAL", "EDITION", "EXPERIENCE_TYPE", "ACTIVATION"],
    validTransitions: {
      ROOT: ["ORGANIZATION", "STANDALONE_BRAND"],
      ORGANIZATION: ["FESTIVAL"],
      FESTIVAL: ["EDITION"],
      EDITION: ["EXPERIENCE_TYPE"],
      EXPERIENCE_TYPE: ["ACTIVATION"],
      ACTIVATION: [],
      STANDALONE_BRAND: ["EDITION", "EXPERIENCE_TYPE", "ACTIVATION"],
    },
    applicableGloryTools: [
      "lineup-reveal-strategy",
      "edition-narrative-brief",
      "fomo-mechanics-brief",
      "venue-experience-map",
      "merchandise-drop-brief",
      "after-movie-brief",
      "ticketing-tier-strategy",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype",
      "BIBLE_D.signature-experience",
      "BIBLE_V.attendee-emotional-value",
      "BIBLE_E.fomo-loops",
      "BIBLE_R.competitor-festivals",
      "BIBLE_T.subculture-trends",
      "BIBLE_I.activation-calendar",
    ],
    defaultManipulationMix: ["dealer", "entertainer"],
    identityRootKind: "FESTIVAL",
  },

  MEDIA_IP: {
    cascade: ["STUDIO", "FRANCHISE", "TITLE", "VARIANT", "EPISODE_OR_CHAPTER"],
    validTransitions: {
      ROOT: ["STUDIO", "STANDALONE_BRAND"],
      STUDIO: ["FRANCHISE", "TITLE"],
      FRANCHISE: ["TITLE"],
      TITLE: ["VARIANT", "EPISODE_OR_CHAPTER"],
      VARIANT: ["EPISODE_OR_CHAPTER"],
      EPISODE_OR_CHAPTER: [],
      STANDALONE_BRAND: ["TITLE", "VARIANT", "EPISODE_OR_CHAPTER"],
    },
    applicableGloryTools: [
      "writers-room-outline",
      "season-arc-brief",
      "episode-brief",
      "marketing-trailer-brief",
      "press-kit-brief",
      "festival-circuit-strategy",
      "streaming-launch-brief",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype",
      "BIBLE_A.tone",
      "BIBLE_D.story-engine",
      "BIBLE_V.emotional-arc-value",
      "BIBLE_E.fandom-touchpoints",
      "BIBLE_T.cultural-trends",
    ],
    defaultManipulationMix: ["entertainer", "facilitator"],
    identityRootKind: "FRANCHISE",
  },

  RETAIL_SPACE: {
    cascade: ["OPERATOR_GROUP", "BANNER", "REGION", "STORE", "DEPARTMENT"],
    validTransitions: {
      ROOT: ["OPERATOR_GROUP", "STANDALONE_BRAND"],
      OPERATOR_GROUP: ["BANNER"],
      BANNER: ["REGION"],
      REGION: ["STORE"],
      STORE: ["DEPARTMENT"],
      DEPARTMENT: [],
      STANDALONE_BRAND: ["REGION", "STORE", "DEPARTMENT"],
    },
    applicableGloryTools: [
      "store-experience-brief",
      "banner-positioning-brief",
      "department-merchandising-brief",
      "loyalty-program-brief",
      "in-store-activation-brief",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype",
      "BIBLE_D.shopper-promise",
      "BIBLE_V.convenience-value",
      "BIBLE_E.in-store-touchpoints",
      "BIBLE_I.store-rollout-plan",
    ],
    defaultManipulationMix: ["facilitator", "peddler"],
    identityRootKind: "BANNER",
  },

  PLATFORM: {
    cascade: ["COMPANY", "PLATFORM", "MARKET", "FEATURE_LINE", "FEATURE_VERSION"],
    validTransitions: {
      ROOT: ["COMPANY", "STANDALONE_BRAND"],
      COMPANY: ["PLATFORM"],
      PLATFORM: ["MARKET", "FEATURE_LINE"],
      MARKET: ["FEATURE_LINE"],
      FEATURE_LINE: ["FEATURE_VERSION"],
      FEATURE_VERSION: [],
      STANDALONE_BRAND: ["MARKET", "FEATURE_LINE", "FEATURE_VERSION"],
    },
    applicableGloryTools: [
      "feature-launch-brief",
      "user-onboarding-brief",
      "growth-loop-brief",
      "platform-positioning-brief",
      "developer-ecosystem-brief",
    ],
    applicableBibleVars: [
      "BIBLE_A.archetype",
      "BIBLE_D.network-effect",
      "BIBLE_V.utility-value",
      "BIBLE_E.user-loops",
      "BIBLE_T.platform-trends",
      "BIBLE_I.feature-roadmap",
    ],
    defaultManipulationMix: ["facilitator", "dealer"],
    identityRootKind: "PLATFORM",
  },

  INSTITUTION: {
    cascade: ["INSTITUTION", "DIVISION", "MARKET", "PROGRAM", "ACTIVITY"],
    validTransitions: {
      ROOT: ["INSTITUTION", "STANDALONE_BRAND"],
      INSTITUTION: ["DIVISION"],
      DIVISION: ["MARKET", "PROGRAM"],
      MARKET: ["PROGRAM"],
      PROGRAM: ["ACTIVITY"],
      ACTIVITY: [],
      STANDALONE_BRAND: ["DIVISION", "PROGRAM", "ACTIVITY"],
    },
    applicableGloryTools: [
      "mission-narrative-brief",
      "donor-engagement-brief",
      "advocacy-campaign-brief",
      "field-program-brief",
      "stakeholder-communication-brief",
    ],
    applicableBibleVars: [
      "BIBLE_A.mission",
      "BIBLE_A.values",
      "BIBLE_D.signature-action",
      "BIBLE_V.civic-value",
      "BIBLE_E.donor-volunteer-touchpoints",
      "BIBLE_I.program-calendar",
    ],
    defaultManipulationMix: ["facilitator", "entertainer"],
    identityRootKind: "INSTITUTION",
  },

  PERSONAL: {
    cascade: ["PERSON", "VENTURE_DIVISION", "PROJECT", "DELIVERABLE", "INSTANCE"],
    validTransitions: {
      ROOT: ["PERSON", "STANDALONE_BRAND"],
      PERSON: ["VENTURE_DIVISION", "PROJECT"],
      VENTURE_DIVISION: ["PROJECT"],
      PROJECT: ["DELIVERABLE"],
      DELIVERABLE: ["INSTANCE"],
      INSTANCE: [],
      STANDALONE_BRAND: ["VENTURE_DIVISION", "PROJECT", "DELIVERABLE"],
    },
    applicableGloryTools: [
      "personal-narrative-brief",
      "content-pillars-brief",
      "drop-strategy-brief",
      "audience-funnel-brief",
      "speaking-circuit-brief",
      "book-launch-brief",
    ],
    applicableBibleVars: [
      "BIBLE_A.personal-archetype",
      "BIBLE_A.public-voice",
      "BIBLE_D.signature-take",
      "BIBLE_V.audience-emotional-value",
      "BIBLE_E.audience-touchpoints",
      "BIBLE_I.content-calendar",
    ],
    defaultManipulationMix: ["entertainer", "dealer"],
    identityRootKind: "PERSON",
  },
} as const;

/**
 * Transitions de nature autorisées au passage d'un parent à un enfant.
 *
 * Quand un nœud parent a `nodeNature: A` et qu'un enfant est créé avec
 * `nodeNature: B ≠ A`, on vérifie si `A → B` est dans la liste.
 *
 * Cas canonique : Disney INSTITUTION → Mickey CHARACTER_IP →
 * Disney Toys PRODUCT → Disneyland FESTIVAL_IP. Mélange légitime.
 *
 * Cas refusé : SKU → CORPORATE (sauf spin-off explicite Phase 18-bis).
 */
export const NATURE_TRANSITIONS_VALID: Readonly<Partial<Record<BrandNature, readonly BrandNature[]>>> = {
  INSTITUTION: ["CHARACTER_IP", "MEDIA_IP", "FESTIVAL_IP", "PRODUCT", "PERSONAL", "PLATFORM", "RETAIL_SPACE"],
  CHARACTER_IP: ["MEDIA_IP", "PRODUCT", "FESTIVAL_IP"],
  MEDIA_IP: ["PRODUCT", "FESTIVAL_IP", "MEDIA_IP"],
  PERSONAL: ["MEDIA_IP", "PRODUCT", "INSTITUTION", "SERVICE"],
  PLATFORM: ["PRODUCT", "SERVICE"],
  RETAIL_SPACE: ["PRODUCT", "SERVICE"],
  PRODUCT: ["PRODUCT"], // PRODUCT reste PRODUCT en cascade FMCG normale
  SERVICE: ["SERVICE", "PRODUCT"], // un service peut spawn un produit dérivé
  FESTIVAL_IP: ["FESTIVAL_IP", "PRODUCT", "MEDIA_IP"], // merch + after-movie d'un festival
} as const;

/**
 * Helper de validation runtime invoqué par Mestor gate `NATURE_TRANSITION_VALIDITY`.
 *
 * Logique en 2 branches selon que la nature change ou non :
 *
 * **Branche A — nature identique parent→child (cas dominant cascade FMCG)** :
 * 1. Vérifie que `childNodeKind` est dans `validTransitions[parentKind]` pour la nature.
 *    Cela enforce la cascade canonique stricte (CORPORATE → MASTER_BRAND → ... → SKU).
 *
 * **Branche B — nature change parent→child (cas Disney INSTITUTION → CHARACTER_IP, etc.)** :
 * 1. Vérifie que `parentNature → childNature` est dans `NATURE_TRANSITIONS_VALID`.
 *    Cela enforce les croisements légitimes (INSTITUTION peut spawn CHARACTER_IP, mais SKU ne peut pas).
 * 2. Vérifie que `childNodeKind` est dans la `cascade` de la nature enfant. Le sous-arbre
 *    enfant démarre à n'importe quel niveau (le parent fait office de "outer container"
 *    qui sort du modèle interne de l'enfant). Mickey CHARACTER peut démarrer directement
 *    sous Disney INSTITUTION, sans nécessiter un IP_OWNER niveau intermédiaire.
 *
 * @returns `{ valid: true }` ou `{ valid: false, reason: string }` pour audit Mestor.
 */
export function validateNodeTransition(args: {
  parentNodeKind: string | null; // null = ROOT (pas de parent)
  parentNodeNature: BrandNature | null; // null = ROOT
  childNodeKind: string;
  childNodeNature: BrandNature;
}): { valid: true } | { valid: false; reason: string } {
  const { parentNodeKind, parentNodeNature, childNodeKind, childNodeNature } = args;
  const childArchetype = BRAND_NATURE_ARCHETYPES[childNodeNature];

  const isRoot = parentNodeKind === null && parentNodeNature === null;
  const isNatureChange = !isRoot && parentNodeNature !== null && parentNodeNature !== childNodeNature;

  // Branche A — nature identique (ou ROOT) : cascade canonique stricte
  if (!isNatureChange) {
    const parentKindKey = parentNodeKind ?? "ROOT";
    const allowedKinds = childArchetype.validTransitions[parentKindKey] ?? [];
    if (!allowedKinds.includes(childNodeKind)) {
      return {
        valid: false,
        reason: `NATURE_TRANSITION_INVALID kind-level : parent=${parentKindKey} (nature=${childNodeNature}) ne peut engendrer ${childNodeKind}. Transitions valides: ${allowedKinds.join(", ") || "(aucune — feuille)"}`,
      };
    }
    return { valid: true };
  }

  // Branche B — nature change
  // 1. Validation nature-level
  const allowedNatures = NATURE_TRANSITIONS_VALID[parentNodeNature!] ?? [];
  if (!allowedNatures.includes(childNodeNature)) {
    return {
      valid: false,
      reason: `NATURE_TRANSITION_INVALID nature-level : ${parentNodeNature} ne peut engendrer ${childNodeNature}. Natures valides depuis ${parentNodeNature}: ${allowedNatures.join(", ") || "(aucune)"}`,
    };
  }

  // 2. Validation kind-level cross-nature : le child kind doit être dans la cascade de sa nature.
  // Le STANDALONE_BRAND fallback est aussi accepté (cas backfill / migration legacy).
  const validKindsForChildNature = [...childArchetype.cascade, "STANDALONE_BRAND"];
  if (!validKindsForChildNature.includes(childNodeKind)) {
    return {
      valid: false,
      reason: `NATURE_TRANSITION_INVALID kind-level cross-nature : ${childNodeKind} pas dans la cascade canonique de ${childNodeNature}. Kinds valides: ${validKindsForChildNature.join(", ")}`,
    };
  }

  return { valid: true };
}

/** Toutes les BrandNature dans l'ordre de l'enum Prisma. */
export const ALL_BRAND_NATURES: readonly BrandNature[] = [
  "PRODUCT",
  "SERVICE",
  "CHARACTER_IP",
  "FESTIVAL_IP",
  "MEDIA_IP",
  "RETAIL_SPACE",
  "PLATFORM",
  "INSTITUTION",
  "PERSONAL",
] as const;

/** Helper récupération cascade pour UI dropdown. */
export function getCascadeForNature(nature: BrandNature): readonly string[] {
  return BRAND_NATURE_ARCHETYPES[nature].cascade;
}

/** Helper récupération nodeKind valides en aval d'un parent. */
export function getValidChildKinds(parentNodeKind: string | null, childNature: BrandNature): readonly string[] {
  const archetype = BRAND_NATURE_ARCHETYPES[childNature];
  return archetype.validTransitions[parentNodeKind ?? "ROOT"] ?? [];
}
