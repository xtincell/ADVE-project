import type { MetadataRoute } from "next";
import { rootSiteUrl } from "@/lib/hosts";

/**
 * /robots.txt — route metadata Next (remplace l'ancien public/robots.txt).
 * Le public est indexable ; les espaces privés (/app, /admin) et l'ancien
 * namespace /portails (legacy — jamais réintroduit en v7) sont bloqués.
 * Base : NEXT_PUBLIC_APP_URL, fallback la racine sous-domaines (lib/hosts).
 */

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? rootSiteUrl()).replace(/\/+$/, "");
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app", "/admin", "/portails"],
      },
    ],
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
