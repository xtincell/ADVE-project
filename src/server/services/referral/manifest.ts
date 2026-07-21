/**
 * Manifest — referral (THOT).
 *
 * Parrainage manual-first (ADR-0157, première brique du passeport fan
 * ETAT-FINAL B2) : codes stables par compte, récompenses arbitrées appliquées
 * À LA MAIN par l'opérateur (filleul −20 % premier cycle · parrain 1 mois
 * offert à la conversion payée) puis marquées REWARDED. Aucun octroi
 * automatique d'argent, aucun Intent gouverné — même posture que la file
 * manual-subscriptions. Zéro LLM, déterministe.
 */
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "referral",
  governor: "THOT",
  version: "1.0.0",
  acceptsIntents: [],
  capabilities: [],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Acquisition de La Fusée elle-même (parrainage d'abonnements, récompenses appliquées manuellement par l'opérateur) — pas une mécanique superfan de marque cliente.",
});
