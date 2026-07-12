import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ---------------------------------------------------------------------------
// Legacy redirects (kept from previous migration)
// ---------------------------------------------------------------------------
const LEGACY_REDIRECTS: Record<string, string> = {
  // Old OS portal → Cockpit
  "/os": "/cockpit",
  "/os/dashboard": "/cockpit",
  "/os/missions": "/cockpit/operate/missions",
  "/os/campaigns": "/cockpit/operate/campaigns",
  "/os/brand": "/cockpit/brand/identity",
  "/os/brand/guidelines": "/cockpit/brand/guidelines",
  "/os/brand/assets": "/cockpit/brand/assets",
  "/os/insights": "/cockpit/insights/reports",
  "/os/analytics": "/cockpit/insights/diagnostics",
  "/os/messages": "/cockpit/messages",
  "/os/mestor": "/cockpit/mestor",
  // Old Impulsion → Console
  "/impulsion": "/console/strategy-portfolio/clients",
  "/impulsion/clients": "/console/strategy-portfolio/clients",
  "/impulsion/diagnostics": "/console/strategy-portfolio/diagnostics",
  "/impulsion/missions": "/console/fusee/missions",
  "/impulsion/campaigns": "/console/fusee/campaigns",
  "/impulsion/talent": "/console/arene/matching",
  "/impulsion/revenue": "/console/socle/revenue",
  "/impulsion/knowledge": "/console/signal/knowledge",
  "/impulsion/settings": "/console/config",
  // Old Pilotis → Creator
  "/pilotis": "/creator",
  "/pilotis/missions": "/creator/missions/available",
  "/pilotis/profile": "/creator/profile/skills",
  "/pilotis/portfolio": "/creator/profile/portfolio",
  "/pilotis/earnings": "/creator/earnings/missions",
  "/pilotis/learning": "/creator/learn/adve",
  "/pilotis/community": "/creator/community/guild",
  // Generic old routes
  "/dashboard": "/cockpit",
  "/admin": "/console",
  "/talent": "/creator",
  "/diagnostic": "/intake",
  "/quick-diagnostic": "/intake",
  "/onboarding": "/intake",
  "/strategy": "/cockpit",
  "/campaigns": "/cockpit/operate/campaigns",
  "/missions": "/cockpit/operate/missions",
  "/guild": "/creator/community/guild",
  "/messages": "/cockpit/messages",
};

// ---------------------------------------------------------------------------
// Role-based route protection
//
// Cockpit + Creator are *open by default* to any authenticated user — un
// nouveau compte (role USER) doit pouvoir entrer dans les deux portails grand
// public sans configuration admin. Console (UPgraders interne, jamais vendue)
// et Agency (réseau partenaires) restent restreints.
// ---------------------------------------------------------------------------
const COCKPIT_ROLES = [
  "ADMIN",
  "OPERATOR",
  "USER",
  "FOUNDER",
  "BRAND",
  "CLIENT_RETAINER",
  "CLIENT_STATIC",
  // ADR-0129 — un talent délégué sur une marque (StrategyCollaborator, ex.
  // directeur du digital) entre au cockpit ; ses DONNÉES restent scoppées par
  // canAccessStrategy/scopeStrategies (sans grant ACTIVE : portefeuille vide).
  "CREATOR",
  "FREELANCE",
];
const CREATOR_ROLES = [
  "ADMIN",
  "OPERATOR",
  "USER",
  "CREATOR",
  "FREELANCE",
  "PARTNER",
];

const PROTECTED_ROUTES: Array<{
  prefix: string;
  roles: string[];
}> = [
  { prefix: "/cockpit", roles: COCKPIT_ROLES },
  { prefix: "/creator", roles: CREATOR_ROLES },
  { prefix: "/console", roles: ["ADMIN", "OPERATOR"] },
  { prefix: "/agency", roles: ["ADMIN", "OPERATOR", "AGENCY", "PARTNER", "CLIENT_RETAINER", "CLIENT_STATIC"] },
  { prefix: "/portals", roles: [...new Set([...COCKPIT_ROLES, ...CREATOR_ROLES])] },
  // Operator-only bootstrap wizards (call operator.getOwn) — were publicly
  // reachable in the (intake) group and 401'd for anonymous users
  // (site-prober finding). Restrict to operators.
  { prefix: "/launchpad", roles: ["ADMIN", "OPERATOR"] },
];

// ---------------------------------------------------------------------------
// Canonical domain redirect
//
// L'app Coolify répond sur 3 domaines (apex + www + lafuseev6.powerupgraders.com)
// sans redirection entre eux. Conséquence concrète : tout ce qui est scopé par
// origine (localStorage — cookie-consent.tsx, mais aussi tout futur usage de
// cookies non-partagés entre sous-domaines) réapparaît à chaque atterrissage
// sur une variante différente. Un seul domaine canonique = un seul localStorage.
// ---------------------------------------------------------------------------
const CANONICAL_HOST = process.env.CANONICAL_HOST || "powerupgraders.com";

export async function proxy(request: NextRequest) {
  // Ne s'applique qu'en prod (déployé derrière Coolify) — évite de rediriger
  // localhost:3000 en dev où il n'y a qu'un seul host de toute façon.
  if (process.env.NODE_ENV === "production") {
    const host = request.headers.get("host");
    // Doctrine domaines (correction opérateur 2026-07-12) : les byproducts de
    // La Fusée vivent en SOUS-PAGES du domaine canonique (/b/<slug>), JAMAIS
    // en sous-domaines — les sous-domaines existants (ex. la page personnelle
    // xtincell.powerupgraders.com) sont des sites indépendants qu'on ne
    // détourne pas ; ils servent de SOURCES à l'ADVE.
    if (host && host !== CANONICAL_HOST) {
      const url = request.nextUrl.clone();
      url.protocol = "https:";
      url.host = CANONICAL_HOST;
      url.port = "";
      return NextResponse.redirect(url, 308);
    }
  }

  const path = request.nextUrl.pathname;

  // ----- Legacy redirects (exact match) -----
  if (LEGACY_REDIRECTS[path]) {
    return NextResponse.redirect(new URL(LEGACY_REDIRECTS[path]!, request.url));
  }

  // ----- Legacy redirects (prefix match) for /os/*, /impulsion/*, /pilotis/* -----
  for (const [prefix, target] of Object.entries(LEGACY_REDIRECTS)) {
    if (path.startsWith(prefix + "/")) {
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  // ----- Route protection -----
  const matched = PROTECTED_ROUTES.find((route) => path.startsWith(route.prefix));
  if (!matched) {
    // Not a protected route (/intake/*, /, /api/trpc/*, static assets, etc.)
    return NextResponse.next();
  }

  // Retrieve the JWT token from the request (next-auth v5 beta requires explicit secret).
  //
  // `secureCookie` decides BOTH the cookie name AND the decrypt salt inside
  // `getToken()` (they default to the same value — Auth.js derives the salt
  // from the cookie name). Passing an explicit `salt` without also pinning
  // `cookieName` — as this used to do — desyncs the two: the lookup still
  // read the `secureCookie`-derived cookie, but decrypted it with a
  // mismatched salt, so the second (legacy `next-auth.*`) attempt always
  // failed silently. Letting `getToken` derive both from `secureCookie`
  // fixes that and is the documented-correct call shape.
  //
  // Behind a TLS-terminating reverse proxy (Coolify/Traefik), the backend
  // connection is plain HTTP — `request.nextUrl.protocol` isn't guaranteed
  // to reflect the client-facing scheme, so we also honor `x-forwarded-proto`.
  const secureCookie =
    process.env.NODE_ENV === "production" ||
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie,
  });

  if (!token) {
    // Not authenticated — redirect to login with callback URL
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = (token.role as string) ?? "USER";

  if (!matched.roles.includes(userRole)) {
    // Authenticated but wrong role — 403 or redirect to a safe page
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Canonical-domain redirect must run on every navigable path, not just
    // the legacy/protected ones below — otherwise `/`, `/intake`, etc. never
    // get canonicalized. Static assets + _next internals excluded.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
    // Legacy redirect paths
    "/os/:path*",
    "/impulsion/:path*",
    "/pilotis/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/talent/:path*",
    "/diagnostic",
    "/quick-diagnostic",
    "/onboarding",
    "/strategy",
    "/campaigns",
    "/missions",
    "/guild",
    "/messages",
    // Protected portals
    "/cockpit/:path*",
    "/creator/:path*",
    "/console/:path*",
    "/agency/:path*",
    "/launchpad/:path*",
  ],
};
