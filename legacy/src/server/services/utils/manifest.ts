/**
 * Manifest — utils (INFRASTRUCTURE).
 *
 * Bibliothèque utilitaire transverse (wrappers LLM Gateway, zod→json-schema,
 * migration strategy→pillars). Helpers purs : aucune mutation, aucun Intent
 * gouverné, aucune surface capability.
 */
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "utils",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [],
  capabilities: [],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Helpers transverses (LLM structured-output, zod→json-schema, migration) ; aucune mutation ni Intent gouverné — bibliothèque utilitaire.",
});
