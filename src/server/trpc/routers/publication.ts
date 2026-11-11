import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";
import { accessible } from "../entity-access";
/* lafusee:governed-active */

/** IN1 : une publication inconnue et celle d'une autre marque reçoivent le même 404. */
const PUBLICATION_NOT_FOUND = "Publication introuvable.";

/**
 * ADR-0129 — garde par-marque des publications (GloryOutput). Ces procédures
 * étaient sans contrôle d'ownership (trou pré-existant) ; chaque accès vérifie
 * désormais la Strategy via le point de passage canonique (owner / opérateur /
 * ADMIN / collaborateur délégué ACTIVE).
 */
async function assertPublicationAccess(userId: string, strategyId: string): Promise<void> {
  const opCtx = await getOperatorContext(userId);
  if (!(await canAccessStrategy(strategyId, opCtx))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
  }
}

export const publicationRouter = createTRPCRouter({
  /** List GLORY outputs (publications) for a strategy */
  list: protectedProcedure
    .input(z.object({ strategyId: z.string(), toolSlug: z.string().optional(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      await assertPublicationAccess(ctx.session.user.id, input.strategyId);
      return ctx.db.gloryOutput.findMany({
        where: { strategyId: input.strategyId, ...(input.toolSlug ? { toolSlug: input.toolSlug } : {}) },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  /** Get a single publication */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return accessible(ctx.db.gloryOutput.findUnique({ where: { id: input.id } }), PUBLICATION_NOT_FOUND,
        (row) => assertPublicationAccess(ctx.session.user.id, row.strategyId));
    }),

  /** Delete a publication */
  delete: governedProcedure({

    kind: "LEGACY_PUBLICATION_DELETE",

    inputSchema: z.object({ id: z.string() }),

    caller: "publication:delete",

  })
    .mutation(async ({ ctx, input }) => {
      const row = await accessible(ctx.db.gloryOutput.findUnique({ where: { id: input.id }, select: { id: true, strategyId: true } }),
        PUBLICATION_NOT_FOUND, (r) => assertPublicationAccess(ctx.session.user.id, r.strategyId));
      return ctx.db.gloryOutput.delete({ where: { id: row.id } });
    }),
});
