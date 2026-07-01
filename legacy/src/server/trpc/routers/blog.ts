/**
 * Blog Router — CMS natif « Notes de cabinet » du site public UPgraders.
 *
 * Public : lecture des articles PUBLISHED. Opérateur : CRUD éditorial
 * (création, édition, publication, suppression) consommé par la Console
 * `/console/anubis/blog`. Direct-`db` comme le router CRM (contenu éditorial,
 * pas une mutation métier gouvernée — pas de passage par Mestor).
 */
import { z } from "zod";
import { createTRPCRouter, publicProcedure, operatorProcedure } from "../init";
import { db } from "@/lib/db";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function readingMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

const upsertInput = z.object({
  id: z.string().optional(),
  slug: z.string().max(80).optional(),
  title: z.string().min(2).max(180),
  excerpt: z.string().max(400).default(""),
  contentHtml: z.string().max(40000).default(""),
  coverUrl: z.string().max(600).optional(),
  coverAlt: z.string().max(200).optional(),
  category: z.string().max(60).optional(),
  tags: z.array(z.string().max(40)).max(12).default([]),
  authorName: z.string().max(120).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

export const blogRouter = createTRPCRouter({
  // ── Public ──────────────────────────────────────────────────────────
  listPublished: publicProcedure.query(() =>
    db.post.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } }),
  ),

  getBySlug: publicProcedure.input(z.object({ slug: z.string().max(80) })).query(({ input }) =>
    db.post.findFirst({ where: { slug: input.slug, status: "PUBLISHED" } }),
  ),

  // ── Opérateur (Console) ─────────────────────────────────────────────
  listAll: operatorProcedure.query(() => db.post.findMany({ orderBy: { updatedAt: "desc" } })),

  get: operatorProcedure.input(z.object({ id: z.string() })).query(({ input }) =>
    db.post.findUnique({ where: { id: input.id } }),
  ),

  upsert: operatorProcedure.input(upsertInput).mutation(async ({ input }) => {
    const slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
    const shared = {
      slug,
      title: input.title.trim(),
      excerpt: input.excerpt.trim(),
      contentHtml: input.contentHtml,
      coverUrl: input.coverUrl?.trim() || null,
      coverAlt: input.coverAlt?.trim() || null,
      category: input.category?.trim() || null,
      tags: input.tags.map((t) => t.trim()).filter(Boolean),
      readingMinutes: readingMinutes(input.contentHtml),
      status: input.status,
      ...(input.authorName?.trim() ? { authorName: input.authorName.trim() } : {}),
    };

    if (input.id) {
      const existing = await db.post.findUnique({ where: { id: input.id } });
      const publishedAt =
        input.status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : null;
      return db.post.update({ where: { id: input.id }, data: { ...shared, publishedAt } });
    }

    const publishedAt = input.status === "PUBLISHED" ? new Date() : null;
    return db.post.create({ data: { ...shared, publishedAt } });
  }),

  setStatus: operatorProcedure
    .input(z.object({ id: z.string(), status: z.enum(["DRAFT", "PUBLISHED"]) }))
    .mutation(async ({ input }) => {
      const existing = await db.post.findUnique({ where: { id: input.id } });
      const publishedAt =
        input.status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : null;
      return db.post.update({ where: { id: input.id }, data: { status: input.status, publishedAt } });
    }),

  remove: operatorProcedure.input(z.object({ id: z.string() })).mutation(({ input }) =>
    db.post.delete({ where: { id: input.id } }),
  ),
});
