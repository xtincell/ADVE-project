/**
 * Tier definitions — base amounts in "standard pricing units" (SPU).
 *
 * 1 SPU = the local-currency price in the standard pricing market.
 * Conversion to other markets happens via market-factor + FX in
 * `compute-price.ts`. Customer-facing UI never references the standard
 * market directly.
 *
 * Tiers map 1:1 to APOGEE phases of the founder funnel:
 *   - INTAKE_FREE     → free showcase (no SPU, no paywall)
 *   - INTAKE_PDF      → ADVE+RTIS shareable PDF
 *   - ORACLE_FULL     → 21-section dynamic Oracle deliverable
 *   - COCKPIT_MONTHLY → portail brand editable + recompute
 *   - RETAINER_BASE   → continuous reco + monthly value report
 *   - RETAINER_PRO    → + Mestor consultative + media planning
 *   - RETAINER_ENTERPRISE → + dedicated Artemis tools + multi-brand orchestration
 */

import { ADVE_KEYS, PILLAR_KEYS, type PillarKey } from "@/domain";

export type PricingTierKey =
  | "INTAKE_FREE"
  | "INTAKE_PDF"
  | "ORACLE_FULL"
  | "COCKPIT_MONTHLY"
  | "RETAINER_BASE"
  | "RETAINER_PRO"
  | "RETAINER_ENTERPRISE";

export interface PricingTierDefinition {
  readonly key: PricingTierKey;
  /** Amount in standard pricing units. */
  readonly amountSpu: number;
  readonly billing: "ONE_TIME" | "MONTHLY";
  /** Product label, market-localized at render. */
  readonly label: string;
  /** Short description shown in CTA card. */
  readonly summary: string;
  /** Inclusions for the tier card. */
  readonly inclusions: readonly string[];
  /** Strict superset relationship to lower tiers (gate logic). */
  readonly includes?: PricingTierKey;
  /** APOGEE missionStep this tier unlocks for the brand. */
  readonly unlocksMissionStep: 1 | 2 | 3 | 4 | 5;
  /** Pillars unlocked at this tier (visible to user). */
  readonly pillarsUnlocked: readonly PillarKey[];
}

export const PRICING_TIERS: Readonly<Record<PricingTierKey, PricingTierDefinition>> = Object.freeze({
  INTAKE_FREE: {
    key: "INTAKE_FREE",
    amountSpu: 0,
    billing: "ONE_TIME",
    label: "Audit gratuit",
    summary: "ADVE déduit de votre offre + 3 recommandations preview.",
    inclusions: [
      "ADVE complet (4 piliers déduits par IA)",
      "Score composite + palier",
      "3 recommandations preview (RTIS)",
      "Trajectoire vers ICONE",
    ],
    unlocksMissionStep: 1,
    pillarsUnlocked: [...ADVE_KEYS],
  },
  INTAKE_PDF: {
    key: "INTAKE_PDF",
    amountSpu: 49,
    billing: "ONE_TIME",
    label: "Rapport ADVE+RTIS",
    summary: "PDF brandé, partageable, ADVE+RTIS complet.",
    inclusions: [
      "Tout l'audit gratuit",
      "RTIS complet (R, T, I, S — risques, marché, innovations, stratégie)",
      "Score détaillé par pilier",
      "Plan d'action 90 jours",
      "PDF haute qualité, partageable",
    ],
    includes: "INTAKE_FREE",
    unlocksMissionStep: 2,
    pillarsUnlocked: PILLAR_KEYS,
  },
  ORACLE_FULL: {
    key: "ORACLE_FULL",
    amountSpu: 199,
    billing: "ONE_TIME",
    label: "Oracle complet",
    summary: "Le livrable conseil dynamique. 21 sections, niveau top mondial.",
    inclusions: [
      "Tout le rapport ADVE+RTIS",
      "21 sections de stratégie de marque",
      "Synthèse exécutive + plateforme stratégique",
      "Catalogue d'actions priorisé",
      "Fenêtre d'Overton sectorielle",
      "Budget + timeline + équipe",
      "Mises à jour pendant 30 jours",
    ],
    includes: "INTAKE_PDF",
    unlocksMissionStep: 3,
    pillarsUnlocked: PILLAR_KEYS,
  },
  COCKPIT_MONTHLY: {
    key: "COCKPIT_MONTHLY",
    amountSpu: 39,
    billing: "MONTHLY",
    label: "Cockpit",
    summary: "Pilote ta marque toi-même. Édite les piliers, recalcule, suis ta progression.",
    inclusions: [
      "Tout l'Oracle",
      "Portail brand editable (8 piliers)",
      "Recalcul automatique du score à chaque édition",
      "Re-génération Oracle illimitée",
      "Time travel — diff entre versions",
      "Devotion ladder + cult index live",
      "Overton Radar sectoriel",
    ],
    includes: "ORACLE_FULL",
    unlocksMissionStep: 4,
    pillarsUnlocked: PILLAR_KEYS,
  },
  RETAINER_BASE: {
    key: "RETAINER_BASE",
    amountSpu: 299,
    billing: "MONTHLY",
    label: "Retainer Base",
    summary: "Suivi reco continues + rapport mensuel de valeur.",
    inclusions: [
      "Tout le Cockpit",
      "Notoria reco continues (4 cycles/mois)",
      "Mestor chat consultatif",
      "Rapport mensuel de valeur livré (PDF)",
      "Tarsis weak-signals secteur",
      "Support email 48h",
    ],
    includes: "COCKPIT_MONTHLY",
    unlocksMissionStep: 4,
    pillarsUnlocked: PILLAR_KEYS,
  },
  RETAINER_PRO: {
    key: "RETAINER_PRO",
    amountSpu: 999,
    billing: "MONTHLY",
    label: "Retainer Pro",
    summary: "Mestor consultatif + media planning + Glory tools premium.",
    inclusions: [
      "Tout le Retainer Base",
      "Glory tools tier S/PREMIUM (concept-generator, kv-prompts, brand-bible)",
      "Plan media + budget allocator",
      "Sentinel Intents (MAINTAIN_APOGEE, DEFEND_OVERTON)",
      "Sessions Mestor en direct (2/mois)",
      "Support priorité 24h",
    ],
    includes: "RETAINER_BASE",
    unlocksMissionStep: 5,
    pillarsUnlocked: PILLAR_KEYS,
  },
  RETAINER_ENTERPRISE: {
    key: "RETAINER_ENTERPRISE",
    amountSpu: 2999,
    billing: "MONTHLY",
    label: "Retainer Enterprise",
    summary: "Multi-brand, dedicated Artemis sequences, cross-sector playbook.",
    inclusions: [
      "Tout le Retainer Pro",
      "Multi-brand orchestration (jusqu'à 5 marques)",
      "Glory sequences custom dédiées",
      "Playbook capitalization cross-sector",
      "Equipe creator/agence dédiée",
      "Support 24/7 + SLA contractuel",
      "Account manager UPgraders",
    ],
    includes: "RETAINER_PRO",
    unlocksMissionStep: 5,
    pillarsUnlocked: PILLAR_KEYS,
  },
});

export const TIER_ORDER: readonly PricingTierKey[] = [
  "INTAKE_FREE",
  "INTAKE_PDF",
  "ORACLE_FULL",
  "COCKPIT_MONTHLY",
  "RETAINER_BASE",
  "RETAINER_PRO",
  "RETAINER_ENTERPRISE",
];

export function getTier(key: PricingTierKey): PricingTierDefinition {
  return PRICING_TIERS[key];
}
