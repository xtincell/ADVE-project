import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getBlogIndex } from "@/components/upgraders/blog-data";

// site-prober finding: no sitemap.xml. Native Next sitemap route.
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://lafusee-app.vercel.app";

// Public, indexable STATIC routes. Hardcoded : la marketing/public surface.
// Le contenu DYNAMIQUE (articles blog, missions Guilde publiées, dossiers Argos
// PASS) est ajouté plus bas via la DB — chaque source en try/catch pour que le
// sitemap reste valide même si la DB tombe.
const PUBLIC_PATHS = [
  "",
  "/lafusee",
  "/agence",
  "/methode",
  "/services",
  "/realisations",
  "/pricing",
  "/tarifs",
  "/contact",
  "/blog",
  "/la-guilde",
  "/LaGuilde",
  "/argos",
  "/changelog",
  "/status",
  "/cgu",
  "/cgv",
  "/dpa",
  "/mentions-legales",
  "/privacy",
  "/sla",
  "/trust-center",
  "/intake",
  "/score",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = PUBLIC_PATHS.map((p) => ({
    url: `${BASE}${p || "/"}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));

  // ── Articles de blog publiés (réutilise l'accessor résilient DB-first) ──
  try {
    const posts = await getBlogIndex();
    for (const post of posts) {
      entries.push({
        url: `${BASE}/blog/${post.slug}`,
        lastModified: post.publishedAt ? new Date(post.publishedAt) : now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    /* blog indisponible — on garde le reste */
  }

  // ── Missions Guilde publiées (face publique du marketplace crew) ──
  try {
    const missions = await db.mission.findMany({
      where: { guildPublished: true, publicSlug: { not: null } },
      select: { publicSlug: true, updatedAt: true },
    });
    for (const m of missions) {
      if (!m.publicSlug) continue;
      entries.push({
        url: `${BASE}/LaGuilde/m/${m.publicSlug}`,
        lastModified: m.updatedAt,
        changeFrequency: "daily",
        priority: 0.5,
      });
    }
  } catch {
    /* missions indisponibles — skip */
  }

  // ── Dossiers Argos publics (safety verdict PASS uniquement) ──
  try {
    const dossiers = await db.campaignReferenceDossier.findMany({
      where: { published: true, safetyVerdict: "PASS" },
      select: { ref: true, updatedAt: true },
    });
    for (const d of dossiers) {
      entries.push({
        url: `${BASE}/argos/${encodeURIComponent(d.ref)}`,
        lastModified: d.updatedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    /* argos indisponible — skip */
  }

  return entries;
}
