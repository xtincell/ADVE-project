/**
 * AD/OPS Sequences — Art Direction Operations chains (ADR-0036).
 *
 * 1 séquence orchestrée qui compose les 6 outils AD/OPS en un flow Art
 * Direction senior complet : Expand → Launch (recherche) → Cross (hybridation)
 * → Decode (analyse de la référence retenue) → Defend (speech) → Vault
 * (capture des références qui ont nourri le travail).
 *
 * Tier 1 (Identity) — sert directement la Distinction (D) en amont d'une
 * production T2 (KV, packaging, OOH, etc.).
 */

import type { GlorySequenceDef } from "./sequences";

export const ADOPS_SEQUENCES: GlorySequenceDef[] = [
  {
    key: "ADOPS-AD-DIRECTION",
    family: "STRATEGIC",
    name: "AD/OPS — Direction Artistique senior",
    description:
      "Poste de pilotage Art Direction : expansion sémantique → recherche multi-plateformes → hybridation → décodage référence → speech défensif → capture vault. Sert l'amont des productions T2.",
    pillar: "D",
    steps: [
      {
        type: "GLORY",
        ref: "adops-expand-semantic-field",
        name: "AD/OPS Expand — Champ sémantique 5D",
        outputKeys: ["movements", "artists", "materials", "eras", "adjacent"],
        status: "ACTIVE",
      },
      {
        type: "GLORY",
        ref: "adops-launch-research-vector",
        name: "AD/OPS Launch — Vecteur de recherche multi-plateformes",
        outputKeys: ["categories"],
        status: "ACTIVE",
      },
      {
        type: "GLORY",
        ref: "adops-cross-pollinate-concepts",
        name: "AD/OPS Cross — Hybridation A × B",
        outputKeys: ["brief", "ratio", "tensions", "activation_query"],
        status: "ACTIVE",
      },
      {
        type: "GLORY",
        ref: "adops-decode-reference-grid",
        name: "AD/OPS Decode — Grille d'analyse formelle 8 axes",
        outputKeys: ["axes"],
        status: "ACTIVE",
      },
      {
        type: "GLORY",
        ref: "adops-defend-creative-direction",
        name: "AD/OPS Defend — Speech défensif 6 sections",
        outputKeys: ["sections"],
        status: "ACTIVE",
      },
      {
        type: "GLORY",
        ref: "adops-vault-capture",
        name: "AD/OPS Vault — Capture documentaire structurée",
        outputKeys: ["title", "source", "tags", "why", "suggestedBrandAssetKind"],
        status: "ACTIVE",
      },
    ],
    aiPowered: true,
    lifecycle: "DRAFT",
    tier: 1,
    requires: [{ type: "PILLAR", key: "d", maturity: "ENRICHED" }],
  },
];
