import { NextResponse, type NextRequest } from "next/server";
import {
  getAuthSecretKey,
  isAdminSession,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/session-token";
import { classifyHost, normalizeHost, resolveHostRoute, rootDomain } from "@/lib/hosts";

/**
 * Deux responsabilités, strictement séparées :
 *
 * 1. Garde d'accès des espaces privés — décision sur le SEUL JWT (zéro DB,
 *    compatible edge), identique sur TOUS les hôtes :
 *      /app/*   → session valide requise
 *      /admin/* → session valide + rôle OPERATOR, ou OWNER d'un workspace
 *                 AGENCY (le kind voyage dans le JWT précisément pour ça)
 *    Sinon : redirect /connexion?next=… (ou /app si connecté mais non-admin).
 *
 * 2. Routage host-based des univers publics (WP-025) — un seul déploiement,
 *    table PURE dans `src/lib/hosts.ts` (testée) :
 *      racine upgraders.*   → site agence ; /lafusee* et /tarifs → 308 produit
 *      lafusee.<racine>     → rewrites `/`→/lafusee, `/tarifs`→/lafusee/tarifs
 *      laguilde.<racine>    → rewrite `/`→/la-guilde
 *      argos.<racine>       → rewrite `/`→/argos
 *    Hôte inconnu (localhost, previews) : passthrough intégral.
 *
 * Le matcher ne couvre QUE /app, /admin et les chemins de la table hosts —
 * assets, API et le reste des pages publiques ne passent jamais ici.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Espaces privés : gardes auth inchangées (tous hôtes) ──────────
  if (pathname.startsWith("/app") || pathname.startsWith("/admin")) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token, getAuthSecretKey()) : null;

    if (!session) {
      const loginUrl = new URL("/connexion", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/admin") && !isAdminSession(session)) {
      return NextResponse.redirect(new URL("/app", request.url));
    }

    return NextResponse.next();
  }

  // ── 2. Routage host-based des univers publics ────────────────────────
  const root = rootDomain();
  const kind = classifyHost(normalizeHost(request.headers.get("host")), root);
  const decision = resolveHostRoute(kind, pathname, root);

  if (decision.action === "redirect") {
    const url = request.nextUrl.clone();
    url.hostname = decision.host;
    url.port = ""; // les sous-domaines servent sur le port implicite (https)
    url.pathname = decision.pathname;
    return NextResponse.redirect(url, 308);
  }

  if (decision.action === "rewrite") {
    const url = request.nextUrl.clone();
    url.pathname = decision.pathname;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/admin/:path*",
    "/",
    "/tarifs",
    "/lafusee/:path*",
  ],
};
