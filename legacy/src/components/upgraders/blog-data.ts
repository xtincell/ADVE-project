/**
 * Blog data access — DB-first, bundle-fallback.
 *
 * The public blog reads PUBLISHED `Post` rows from the native CMS. If the DB is
 * unreachable or empty (e.g. migration not yet applied in a given environment),
 * it falls back to the bundled `posts.ts` so the site always ships content —
 * the same resilient pattern a headless CMS integration would use. Server-only
 * (imports the Prisma client); consumed by the /blog server components.
 */
import { db } from "@/lib/db";
import { getAllPosts as bundledAll, getPost as bundledOne, type BlogPost } from "./posts";

type DbPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverUrl: string | null;
  coverAlt: string | null;
  category: string | null;
  tags: string[];
  authorName: string;
  readingMinutes: number;
  publishedAt: Date | null;
  createdAt: Date;
};

function termSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toBlogPost(p: DbPost): BlogPost {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    contentHtml: p.contentHtml,
    publishedAt: (p.publishedAt ?? p.createdAt).toISOString(),
    readingMinutes: p.readingMinutes,
    cover: p.coverUrl ? { src: p.coverUrl, alt: p.coverAlt ?? p.title } : undefined,
    author: { name: p.authorName, slug: "xtincell", avatar: "/brand/logos/upgraders-icon.png" },
    categories: p.category ? [{ name: p.category, slug: termSlug(p.category) }] : [],
    tags: p.tags.map((t) => ({ name: t, slug: termSlug(t) })),
  };
}

export async function getBlogIndex(): Promise<BlogPost[]> {
  try {
    const rows = await db.post.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } });
    if (rows.length > 0) return rows.map(toBlogPost);
  } catch {
    // DB unreachable / table absent — fall back to bundled content
  }
  return bundledAll();
}

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  try {
    const row = await db.post.findFirst({ where: { slug, status: "PUBLISHED" } });
    if (row) return toBlogPost(row);
  } catch {
    // fall through to bundled
  }
  return bundledOne(slug);
}

export async function getBlogSlugs(): Promise<string[]> {
  return bundledAll().map((p) => p.slug);
}
