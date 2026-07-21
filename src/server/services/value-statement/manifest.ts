/**
 * Manifest — value-statement (SESHAT).
 *
 * Relevé de valeur mensuel (Phase A état-final, boucle B4 REVENU) :
 * composition 100 % déterministe depuis les séries réellement persistées —
 * ce qui a été mesuré, ce qui a bougé, ce que ça a coûté. Honnêteté
 * ADR-0046 : « non mesuré » quand la série est absente, jamais un zéro
 * fabriqué ni un delta inventé sur un seul point. Zéro LLM, lecture seule.
 */
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "value-statement",
  governor: "SESHAT",
  version: "1.0.0",
  acceptsIntents: [],
  capabilities: [],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Preuve de valeur par client (restitution de séries mesurées, lecture seule) — soutient la rétention/facturation ; ne produit ni ne mesure directement superfans ou Overton.",
});
