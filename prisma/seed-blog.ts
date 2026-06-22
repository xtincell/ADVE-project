/**
 * Seed blog — backfill des « notes de cabinet » fournies (bundle
 * `src/components/upgraders/posts.ts`) dans le CMS natif `Post`, en PUBLISHED.
 *
 * CREATE-ONLY (idempotent, sûr en déploiement répété) : n'insère que les slugs
 * absents et ne TOUCHE JAMAIS un article existant — les éditions opérateur faites
 * dans /console/anubis/blog sont préservées. Câblé au build Vercel (non-bloquant)
 * après `prisma migrate deploy` ; relançable à la main via `npm run db:seed:blog`.
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
  let created = 0;
  let skipped = 0;
  for (const p of POSTS) {
    const existing = await db.post.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (existing) {
      skipped++;
      continue;
    }
    await db.post.create({
      data: {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        contentHtml: p.contentHtml,
        coverUrl: p.cover?.src ?? null,
        coverAlt: p.cover?.alt ?? null,
        category: p.categories[0]?.name ?? null,
        tags: p.tags.map((t) => t.name),
        authorName: p.author?.name ?? "Alexandre « Xtincell » Djengue",
        readingMinutes: p.readingMinutes,
        status: "PUBLISHED",
        publishedAt: new Date(p.publishedAt),
      },
    });
    created++;
  }
  console.log(`[seed-blog] ${created} posts created, ${skipped} already present (preserved).`);
}

main()
  .catch((e) => {
    console.error("[seed-blog] failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
