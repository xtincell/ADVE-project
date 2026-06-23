import type { MetadataRoute } from "next";

// site-prober finding: no sitemap.xml. Native Next sitemap route.
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://lafusee-app.vercel.app";

// Public, indexable content routes. Hardcoded on purpose: the sitemap runs in
// the serverless runtime where the src/app tree isn't readable. Keep in sync
// with the marketing/public surface.
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

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_PATHS.map((p) => ({
    url: `${BASE}${p || "/"}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));
}
