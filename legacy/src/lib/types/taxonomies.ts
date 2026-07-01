/**
 * TAXONOMIES DE RÉFÉRENCE — T.01 à T.08
 * Contraintes ontologiques fondamentales du protocole ADVE-RTIS
 */

// ============================================================================
// T.01 — ARCHÉTYPES DE MARQUE (Jung, 12 archétypes)
// ============================================================================

export const ARCHETYPES = [
  "INNOCENT", "SAGE", "EXPLORATEUR", "REBELLE", "MAGICIEN", "HEROS",
  "AMOUREUX", "BOUFFON", "CITOYEN", "SOUVERAIN", "CREATEUR", "PROTECTEUR",
] as const;
export type Archetype = (typeof ARCHETYPES)[number];

// ============================================================================
// T.02 — VALEURS DE SCHWARTZ (10 valeurs universelles + tensions)
// ============================================================================

export const SCHWARTZ_VALUES = [
  "POUVOIR", "ACCOMPLISSEMENT", "HEDONISME", "STIMULATION", "AUTONOMIE",
  "UNIVERSALISME", "BIENVEILLANCE", "TRADITION", "CONFORMITE", "SECURITE",
] as const;
export type SchwartzValue = (typeof SCHWARTZ_VALUES)[number];

/** Matrice de tensions entre valeurs de Schwartz (oppositions structurelles) */
export const SCHWARTZ_TENSIONS: Record<SchwartzValue, SchwartzValue[]> = {
  POUVOIR: ["UNIVERSALISME", "BIENVEILLANCE"],
  ACCOMPLISSEMENT: ["BIENVEILLANCE", "UNIVERSALISME"],
  HEDONISME: ["CONFORMITE", "TRADITION"],
  STIMULATION: ["SECURITE", "CONFORMITE", "TRADITION"],
  AUTONOMIE: ["CONFORMITE", "TRADITION", "SECURITE"],
  UNIVERSALISME: ["POUVOIR", "ACCOMPLISSEMENT"],
  BIENVEILLANCE: ["POUVOIR", "ACCOMPLISSEMENT"],
  TRADITION: ["STIMULATION", "HEDONISME", "AUTONOMIE"],
  CONFORMITE: ["STIMULATION", "HEDONISME", "AUTONOMIE"],
  SECURITE: ["STIMULATION", "AUTONOMIE"],
};

/** Vérifie la cohérence des tensions déclarées avec la matrice Schwartz */
export function validateSchwartzTension(value: SchwartzValue, tensionWith: SchwartzValue[]): {
  valid: boolean;
  invalidTensions: SchwartzValue[];
} {
  const expectedTensions = SCHWARTZ_TENSIONS[value] ?? [];
  const invalidTensions = tensionWith.filter((t) => !expectedTensions.includes(t));
  return { valid: invalidTensions.length === 0, invalidTensions };
}

// ============================================================================
// T.03 — LIFE FORCE 8 (LF8 — 8 motivations biologiques)
// ============================================================================

export const LIFE_FORCE_8 = [
  "SURVIE_SANTE", "NOURRITURE_PLAISIR", "LIBERTE_DANGER", "COMPAGNON_SEXUEL",
  "CONDITIONS_CONFORT", "SUPERIORITE_STATUT", "PROTECTION_PROCHES", "APPROBATION_SOCIALE",
] as const;
export type LifeForce8 = (typeof LIFE_FORCE_8)[number];

export const LF8_LABELS: Record<LifeForce8, string> = {
  SURVIE_SANTE: "Survie, jouissance de la vie, prolongation de la vie",
  NOURRITURE_PLAISIR: "Plaisir de manger et de boire",
  LIBERTE_DANGER: "Être libre de la peur, de la douleur et du danger",
  COMPAGNON_SEXUEL: "Compagnonnage sexuel",
  CONDITIONS_CONFORT: "Conditions de vie confortables",
  SUPERIORITE_STATUT: "Être supérieur, gagner, suivre le rythme",
  PROTECTION_PROCHES: "Soin et protection des êtres chers",
  APPROBATION_SOCIALE: "Approbation sociale",
};

// ============================================================================
// T.04 — SEGMENTS DE TENSION (33 segments psychographiques)
// ============================================================================

export const TENSION_CATEGORIES = ["MONEY", "AGE", "GENDER", "IDENTITY", "POWER", "RELATION"] as const;
export type TensionCategory = (typeof TENSION_CATEGORIES)[number];

export const TENSION_SEGMENTS: Array<{ id: string; category: TensionCategory; label: string }> = [
  // MONEY (6)
  { id: "MON-01", category: "MONEY", label: "Nouveau riche vs. Old money" },
  { id: "MON-02", category: "MONEY", label: "Dépensier vs. Épargnant" },
  { id: "MON-03", category: "MONEY", label: "Matérialiste vs. Expérientiel" },
  { id: "MON-04", category: "MONEY", label: "Ostentatoire vs. Discret" },
  { id: "MON-05", category: "MONEY", label: "Gratuit vs. Premium" },
  { id: "MON-06", category: "MONEY", label: "Investisseur vs. Consommateur" },
  // AGE (5)
  { id: "AGE-01", category: "AGE", label: "Nostalgie vs. Innovation" },
  { id: "AGE-02", category: "AGE", label: "Sagesse vs. Énergie" },
  { id: "AGE-03", category: "AGE", label: "Stabilité vs. Aventure" },
  { id: "AGE-04", category: "AGE", label: "Tradition vs. Modernité" },
  { id: "AGE-05", category: "AGE", label: "Patience vs. Immédiateté" },
  // GENDER (5)
  { id: "GEN-01", category: "GENDER", label: "Masculin vs. Féminin" },
  { id: "GEN-02", category: "GENDER", label: "Force vs. Sensibilité" },
  { id: "GEN-03", category: "GENDER", label: "Dominant vs. Nourricier" },
  { id: "GEN-04", category: "GENDER", label: "Individuel vs. Communautaire" },
  { id: "GEN-05", category: "GENDER", label: "Performance vs. Bien-être" },
  // IDENTITY (6)
  { id: "IDE-01", category: "IDENTITY", label: "Local vs. Global" },
  { id: "IDE-02", category: "IDENTITY", label: "Roots vs. Cosmopolite" },
  { id: "IDE-03", category: "IDENTITY", label: "Mainstream vs. Underground" },
  { id: "IDE-04", category: "IDENTITY", label: "Conformiste vs. Rebelle" },
  { id: "IDE-05", category: "IDENTITY", label: "Authentique vs. Aspirationnel" },
  { id: "IDE-06", category: "IDENTITY", label: "Naturel vs. Technologique" },
  // POWER (5)
  { id: "POW-01", category: "POWER", label: "Leader vs. Suiveur" },
  { id: "POW-02", category: "POWER", label: "Contrôle vs. Lâcher-prise" },
  { id: "POW-03", category: "POWER", label: "Visible vs. Invisible" },
  { id: "POW-04", category: "POWER", label: "Compétition vs. Coopération" },
  { id: "POW-05", category: "POWER", label: "Indépendant vs. Institutionnel" },
  // RELATION (6)
  { id: "REL-01", category: "RELATION", label: "Intimité vs. Distance" },
  { id: "REL-02", category: "RELATION", label: "Fidélité vs. Exploration" },
  { id: "REL-03", category: "RELATION", label: "Exclusivité vs. Accessibilité" },
  { id: "REL-04", category: "RELATION", label: "Passion vs. Raison" },
  { id: "REL-05", category: "RELATION", label: "Possession vs. Partage" },
  { id: "REL-06", category: "RELATION", label: "Dépendance vs. Liberté" },
];

// ============================================================================
// T.05 — AARRR STAGES (Pirate Metrics)
// ============================================================================

export const AARRR_STAGES = ["ACQUISITION", "ACTIVATION", "RETENTION", "REVENUE", "REFERRAL"] as const;
export type AARRRStage = (typeof AARRR_STAGES)[number];

// ============================================================================
// T.06 — PRODUCT LIFECYCLE
// ============================================================================

export const PRODUCT_LIFECYCLE = ["LAUNCH", "GROWTH", "MATURITY", "DECLINE"] as const;
export type ProductLifecycle = (typeof PRODUCT_LIFECYCLE)[number];

// ============================================================================
// T.07 — DEVOTION LADDER (6 niveaux)
// ============================================================================

export const DEVOTION_LEVELS = [
  "SPECTATEUR", "INTERESSE", "PARTICIPANT", "ENGAGE", "AMBASSADEUR", "EVANGELISTE",
] as const;
export type DevotionLevel = (typeof DEVOTION_LEVELS)[number];

// ============================================================================
// T.08 — CHANNELS / DRIVERS (20 canaux standardisés)
// ============================================================================

export const CHANNELS = [
  "INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "YOUTUBE", "TWITTER",
  "WEBSITE", "APP", "EMAIL", "SMS",
  "PACKAGING", "PLV", "OOH", "PRINT",
  "EVENT", "POPUP",
  "PR", "TV", "RADIO", "VIDEO",
] as const;
export type Channel = (typeof CHANNELS)[number];

// ============================================================================
// T.09 — TOUCHPOINT TYPES
// ============================================================================

export const TOUCHPOINT_TYPES = ["PHYSIQUE", "DIGITAL", "HUMAIN"] as const;
export type TouchpointType = (typeof TOUCHPOINT_TYPES)[number];

// ============================================================================
// T.10 — RITUAL TYPES
// ============================================================================

export const RITUAL_TYPES = ["ALWAYS_ON", "CYCLIQUE"] as const;
export type RitualType = (typeof RITUAL_TYPES)[number];

// ============================================================================
// T.11 — MASLOW LEVELS
// ============================================================================

export const MASLOW_LEVELS = [
  "PHYSIOLOGICAL", "SAFETY", "BELONGING", "ESTEEM", "SELF_ACTUALIZATION",
] as const;
export type MaslowLevel = (typeof MASLOW_LEVELS)[number];

// ============================================================================
// T.12 — PRODUCT CATEGORIES
// ============================================================================

export const PRODUCT_CATEGORIES = [
  "PRODUIT_PHYSIQUE", "SERVICE", "ABONNEMENT", "LICENCE", "FORMATION",
  "EXPERIENCE", "CONTENU", "PLATEFORME", "CONSEIL", "CUSTOM",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

// ============================================================================
// T.13 — RISK PROBABILITY / IMPACT
// ============================================================================

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];
