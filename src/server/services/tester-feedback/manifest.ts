/**
 * Manifest — tester-feedback (INFRASTRUCTURE).
 *
 * Canal feedback / bug des testeurs (ADR-0155) : single-writer du modèle
 * `Feedback`. Un testeur connecté remonte un bug/idée/retour ; l'opérateur
 * trie dans l'inbox console. Zéro LLM, aucun Intent gouverné. Distinct de
 * `feedback-loop`/`feedback-processor` (boucle stratégie — aucun rapport).
 */
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "tester-feedback",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [],
  capabilities: [],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Canal support/QA interne (remontées testeurs vers l'inbox opérateur) — maintient l'OS corrigeable ; aucune mutation métier gouvernée.",
});
