import type { NextConfig } from "next";

// Security headers (site-prober finding). Enforced now: HSTS, nosniff,
// frame protection, referrer + permissions policy, no x-powered-by. CSP is
// shipped Report-Only first (it can break inline scripts/styles) — observe
// reports, then promote to an enforcing `Content-Security-Policy`.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework (site-prober finding: x-powered-by leak).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
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
   *
   * `mjml` retiré 2026-06 : remplacé par un renderer déterministe in-repo
   * (anubis/mjml-render.ts) — 0 dépendance, 0 vulnérabilité transitive.
   */
  serverExternalPackages: ["web-push", "puppeteer"],
  // Standalone output — produces `.next/standalone/server.js`, a minimal
  // self-contained Node server (deps traced via nft). This is what the
  // Cloudflare Container image runs (`node server.js`). Ignored by Vercel.
  output: "standalone",
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
