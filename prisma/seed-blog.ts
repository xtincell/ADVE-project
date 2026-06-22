/**
 * Seed blog — importe les 6 « notes de cabinet » fournies (bundle
 * `src/components/upgraders/posts.ts`) dans le CMS natif `Post`, en PUBLISHED.
 *
 * Idempotent : upsert par `slug`. Après ce seed, le site lit le blog depuis la
 * base (DB-first) et l'opérateur les édite via /console/anubis/blog. Le bundle
 * reste le fallback si la base est indisponible.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { POSTS } from "../src/components/upgraders/posts";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const db = makeClient();

async function main() {
  let n = 0;
  for (const p of POSTS) {
    const data = {
      title: p.title,
      excerpt: p.excerpt,
      contentHtml: p.contentHtml,
      coverUrl: p.cover?.src ?? null,
      coverAlt: p.cover?.alt ?? null,
      category: p.categories[0]?.name ?? null,
      tags: p.tags.map((t) => t.name),
      authorName: p.author?.name ?? "Alexandre « Xtincell » Djengue",
      readingMinutes: p.readingMinutes,
      status: "PUBLISHED" as const,
      publishedAt: new Date(p.publishedAt),
    };
    await db.post.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...data },
      update: data,
    });
    n++;
  }
  console.log(`[seed-blog] ${n} posts seeded (PUBLISHED).`);
}

main()
  .catch((e) => {
    console.error("[seed-blog] failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
