import type { MetadataRoute } from "next";
import { getAllPosts } from "@/components/marketing/blog-posts";
import { productSiteUrl, rootSiteUrl } from "@/lib/hosts";

/**
 * /sitemap.xml — pages publiques RÉELLES de la v7 uniquement (pas de route
 * posée d'avance ; les résultats de diagnostic sont des URLs personnelles).
 * Architecture sous-domaines (WP-025) : le site agence vit sur la racine
 * (`ROOT_DOMAIN`, override complet possible via NEXT_PUBLIC_APP_URL) et
 * l'univers produit sur lafusee.<racine> — ses URLs canoniques sont donc
 * absolues sur le sous-domaine (la racine /lafusee* répond 308).
 */

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? rootSiteUrl()).replace(/\/+$/, "");
}

type RouteMeta = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

/** Univers agence + funnel + légal — servis sur la racine. */
const PUBLIC_ROUTES: RouteMeta[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/intake", changeFrequency: "monthly", priority: 0.9 },
  { path: "/landingintake", changeFrequency: "monthly", priority: 0.8 },
  { path: "/intake/score", changeFrequency: "monthly", priority: 0.6 },
  { path: "/methode", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services", changeFrequency: "monthly", priority: 0.8 },
  { path: "/realisations", changeFrequency: "monthly", priority: 0.7 },
  { path: "/agence", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/la-guilde", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
  { path: "/argos", changeFrequency: "monthly", priority: 0.6 },
  { path: "/changelog", changeFrequency: "monthly", priority: 0.5 },
  { path: "/status", changeFrequency: "daily", priority: 0.3 },
  { path: "/connexion", changeFrequency: "yearly", priority: 0.3 },
  { path: "/inscription", changeFrequency: "yearly", priority: 0.3 },
  { path: "/mentions-legales", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cgu", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cgv", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/dpa", changeFrequency: "yearly", priority: 0.3 },
  { path: "/sla", changeFrequency: "yearly", priority: 0.3 },
  { path: "/trust-center", changeFrequency: "yearly", priority: 0.4 },
];

/** Univers PRODUIT — URLs canoniques sur le sous-domaine lafusee.<racine>. */
const PRODUCT_ROUTES: RouteMeta[] = [
  { path: "/", changeFrequency: "monthly", priority: 0.9 },
  { path: "/tarifs", changeFrequency: "monthly", priority: 0.9 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const lastModified = new Date();
  const pages: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((r) => ({
    url: `${base}${r.path === "/" ? "" : r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
  const productPages: MetadataRoute.Sitemap = PRODUCT_ROUTES.map((r) => ({
    url: productSiteUrl(r.path),
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
  // Articles réels du blog (contenu statique src/components/marketing/blog-posts.ts).
  const posts: MetadataRoute.Sitemap = getAllPosts().map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(`${p.date}T12:00:00Z`),
    changeFrequency: "yearly",
    priority: 0.5,
  }));
  return [...pages, ...productPages, ...posts];
}
