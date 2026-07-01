/**
 * Manifest — canon (INFRASTRUCTURE).
 *
 * Namespace de données canon (ADVE UPgraders 100 %) consommé par le seed et
 * le scoring de référence. Bibliothèque de données pures : aucune mutation,
 * aucun Intent gouverné, aucune surface capability.
 */
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "canon",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [],
  capabilities: [],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Données canon de référence (ADVE UPgraders) consommées par seed + scoring ; aucune mutation ni Intent — namespace de données pures.",
});
