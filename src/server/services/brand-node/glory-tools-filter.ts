/**
 * Phase 18-N6 (ADR-0054) — Filtrage Glory tools par BrandNature.
 *
 * Le sequence-executor + UI cockpit utilisent ces helpers pour ne proposer que
 * les tools pertinents pour la nature du BrandNode cible. Évite les briefs
 * absurdes (writers-room sur PRODUCT, packaging sur FESTIVAL_IP).
 */

import type { GloryToolDef } from "@/server/services/artemis/tools/registry";
import type { BrandNature } from "@prisma/client";

/**
 * Retourne true si le tool est applicable pour la nature donnée.
 *
 * Règles :
 *   - Si `tool.applicableNatures` est `undefined` → universel (tous archétypes OK)
 *   - Sinon : applicable seulement si la nature est dans la liste
 */
export function isToolApplicableForNature(tool: GloryToolDef, nature: BrandNature): boolean {
  if (!tool.applicableNatures || tool.applicableNatures.length === 0) {
    return true; // universel par défaut
  }
  return (tool.applicableNatures as readonly BrandNature[]).includes(nature);
}

/**
 * Filtre une liste de tools selon la nature. Préserve l'ordre.
 */
export function filterToolsByNature<T extends GloryToolDef>(tools: T[], nature: BrandNature): T[] {
  return tools.filter((t) => isToolApplicableForNature(t, nature));
}

/**
 * Retourne le diff entre tools demandés et tools applicables (pour UI warning).
 */
export function getInapplicableTools<T extends GloryToolDef>(
  tools: T[],
  nature: BrandNature,
): { applicable: T[]; inapplicable: T[] } {
  const applicable: T[] = [];
  const inapplicable: T[] = [];
  for (const t of tools) {
    if (isToolApplicableForNature(t, nature)) applicable.push(t);
    else inapplicable.push(t);
  }
  return { applicable, inapplicable };
}
