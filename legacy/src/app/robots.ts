import type { MetadataRoute } from "next";

// site-prober finding: no robots.txt. Native Next robots route.
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://lafusee-app.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private surfaces out of the index. `/intake/` blocks the
        // token pages while `/intake` (the public funnel) stays allowed.
        disallow: ["/console", "/cockpit", "/agency", "/creator", "/launchpad", "/api/", "/intake/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
