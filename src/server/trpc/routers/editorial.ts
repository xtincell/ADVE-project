/**
 * Editorial Router — Articles, publishing, comments
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { auditedProcedure } from "@/server/governance/governed-procedure";
const auditedProtected = auditedProcedure(protectedProcedure, "editorial");
const auditedAdmin = auditedProcedure(adminProcedure, "editorial");
/* lafusee:strangler-active */

export const editorialRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      isPublished: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.editorialArticle.findMany({
        where: {
          ...(input.category ? { category: input.category } : {}),
          ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const article = await ctx.db.editorialArticle.findUniqueOrThrow({
        where: { slug: input.slug },
      });
      const comments = await ctx.db.editorialComment.findMany({
        where: { articleId: article.id },
        orderBy: { createdAt: "asc" },
      });
      return { ...article, comments };
    }),

  create: auditedAdmin
    .input(z.object({
      title: z.string().min(1),
      slug: z.string().min(1),
      content: z.string(),
      excerpt: z.string().optional(),
      coverUrl: z.string().optional(),
      author: z.string(),
      category: z.string(),
      pillarTags: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { pillarTags, ...rest } = input;
      return ctx.db.editorialArticle.create({
        data: {
          ...rest,
          pillarTags: pillarTags as Prisma.InputJsonValue,
        },
      });
    }),

  publish: auditedAdmin
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.editorialArticle.update({
        where: { id: input.id },
        data: { isPublished: true, publishedAt: new Date() },
      });
    }),

  addComment: auditedProtected
    .input(z.object({
      articleId: z.string(),
      content: z.string().min(1),
      parentId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const authorId = ctx.session.user.id;
      return ctx.db.editorialComment.create({
        data: {
          articleId: input.articleId,
          authorId,
          content: input.content,
          parentId: input.parentId,
        },
      });
    }),
});
