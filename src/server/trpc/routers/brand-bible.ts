/**
 * Livre de marque — lecture seule (ADR-0185).
 *
 * Composition déterministe, zéro LLM : le livre n'est pas généré, il est
 * ASSEMBLÉ depuis ce qui est déjà déclaré (piliers) et documenté (sources).
 * Aucune écriture, donc aucun Intent — c'est une vue, pas une mutation.
 */

import { z } from "zod";
import { createTRPCRouter } from "../init";
import { strategyScopedProcedure } from "../middleware/strategy-scope";
import { composeBrandBible } from "@/server/services/brand-bible/compose";

export const brandBibleRouter = createTRPCRouter({
  get: strategyScopedProcedure
    .input(
      z.object({
        strategyId: z.string().min(1),
        /** Inclure les piliers dérivés (diagnostic) en plus du socle fondateur. */
        includeDerived: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ input }) =>
      composeBrandBible(input.strategyId, { includeDerived: input.includeDerived }),
    ),
});
