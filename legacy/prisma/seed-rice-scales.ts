/**
 * seed-rice-scales.ts — Barème RICE canon (Intercom).
 *
 * La source de vérité unique du barème est désormais en couche service
 * (`src/server/services/consulting/rice-canon.ts`, ADR-0109 + pattern auto-amorçage
 * ADR-0119), pour être réutilisée par le self-seed runtime de `loadScales`. Ce
 * module reste le point d'entrée du seed (`prisma/seed.ts`) et de
 * `consulting-rice.test.ts` via re-export (rétro-compat).
 */

import type { PrismaClient } from "@prisma/client";
import {
  buildRiceScaleRows,
  ensureRiceScales,
  type RiceScaleSeedRow,
} from "../src/server/services/consulting/rice-canon";

export { buildRiceScaleRows };
export type { RiceScaleSeedRow };

export async function seedRiceScales(prisma: PrismaClient): Promise<number> {
  return ensureRiceScales(prisma);
}
