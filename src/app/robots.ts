import type { MetadataRoute } from "next";

/**
 * /robots.txt — route metadata Next (remplace l'ancien public/robots.txt).
 * Le public est indexable ; les espaces privés (/app, /admin) et l'ancien
 * namespace /portails (legacy — jamais réintroduit en v7) sont bloqués.
 */

const FALLBACK_APP_URL = "https://lafusee-v7.76-13-128-23.sslip.io";

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_APP_URL).replace(/\/+$/, "");
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
