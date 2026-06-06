import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next 16 : reactCompiler stabilized — moved out of `experimental`.
  reactCompiler: true,
  /**
   * Phase 16 (ADR-0025) — Anubis providers optionnels.
   *
   * Modules importés en `await import("...")` dans des try/catch défensifs
   * (cf. anubis/providers/web-push.ts:68-72). Sans `serverExternalPackages`,
   * Turbopack résout l'import statiquement et émet `Module not found` dans
   * les logs même si le runtime gère proprement l'absence du module.
   *
   * Listés ici = signal explicite "ce module est optionnel, ne pas
   * paniquer s'il manque". Le pattern try/catch côté code fait foi à
   * runtime ; ce flag éteint juste le bruit Turbopack au build.
   */
  serverExternalPackages: ["web-push", "mjml"],
  images: {
    // Ptah forge providers + mock fallback domains. Required for next/image
    // to load remote URLs without runtime warnings.
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "cdn.freepik.com" },
      { protocol: "https", hostname: "api.freepik.com" },
      { protocol: "https", hostname: "api.magnific.com" },
      { protocol: "https", hostname: "cdn.magnific.com" },
      { protocol: "https", hostname: "commondatastorage.googleapis.com" },
    ],
  },
};

export default nextConfig;
