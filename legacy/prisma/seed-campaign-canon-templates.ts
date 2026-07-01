/**
 * seed-campaign-canon-templates.ts — amorçage des 3 campagnes canon (ADR-0119).
 *
 * La source de vérité (lignes + upsert idempotent) vit côté service
 * (`src/server/services/campaign-canon/reference.ts`) pour que le générateur
 * puisse auto-amorcer en runtime. Ce fichier n'est qu'un point d'entrée seed.
 */

import type { PrismaClient } from "@prisma/client";
import { ensureCanonTemplates, buildCanonTemplateRows } from "../src/server/services/campaign-canon/reference";

export { buildCanonTemplateRows };

export async function seedCampaignCanonTemplates(prisma: PrismaClient): Promise<number> {
  return ensureCanonTemplates(prisma);
}
