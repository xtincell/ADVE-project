import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const translationRouter = createTRPCRouter({
  create: governedProcedure({

    kind: "LEGACY_TRANSLATION_CREATE",

    inputSchema: z.object({
      sourceLocale: z.string(),
      targetLocale: z.string(),
      sourceText: z.string().min(1),
      context: z.string().optional(),
    }),

    caller: "translation:create",

  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.translationDocument.create({ data: input });
    }),

  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.translationDocument.findMany({
        where: input.status ? { status: input.status } : undefined,
        take: input.limit,
        orderBy: { createdAt: "desc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.translationDocument.findUniqueOrThrow({ where: { id: input.id } });
    }),
});
