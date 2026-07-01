import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const publicationRouter = createTRPCRouter({
  /** List GLORY outputs (publications) for a strategy */
  list: protectedProcedure
    .input(z.object({ strategyId: z.string(), toolSlug: z.string().optional(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.gloryOutput.findMany({
        where: { strategyId: input.strategyId, ...(input.toolSlug ? { toolSlug: input.toolSlug } : {}) },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  /** Get a single publication */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => ctx.db.gloryOutput.findUniqueOrThrow({ where: { id: input.id } })),

  /** Delete a publication */
  delete: governedProcedure({

    kind: "LEGACY_PUBLICATION_DELETE",

    inputSchema: z.object({ id: z.string() }),

    caller: "publication:delete",

  })
    .mutation(async ({ ctx, input }) => ctx.db.gloryOutput.delete({ where: { id: input.id } })),
});
