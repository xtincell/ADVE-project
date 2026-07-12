import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";
/* lafusee:governed-active */

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
      const row = await ctx.db.gloryOutput.findUniqueOrThrow({ where: { id: input.id } });
      if (row.strategyId) await assertPublicationAccess(ctx.session.user.id, row.strategyId);
      return row;
    }),

  /** Delete a publication */
  delete: governedProcedure({

    kind: "LEGACY_PUBLICATION_DELETE",

    inputSchema: z.object({ id: z.string() }),

    caller: "publication:delete",

  })
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.gloryOutput.findUniqueOrThrow({ where: { id: input.id }, select: { id: true, strategyId: true } });
      if (row.strategyId) await assertPublicationAccess(ctx.session.user.id, row.strategyId);
      return ctx.db.gloryOutput.delete({ where: { id: row.id } });
    }),
});
