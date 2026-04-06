import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const translationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      sourceLocale: z.string(),
      targetLocale: z.string(),
      sourceText: z.string().min(1),
      context: z.string().optional(),
    }))
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
