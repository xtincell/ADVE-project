import { NextResponse, type NextRequest } from "next/server";
import {
  getAuthSecretKey,
  isAdminSession,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/session-token";

/**
 * Garde d'accès des deux espaces privés — décision sur le SEUL JWT (zéro DB,
 * compatible edge) :
 *   /app/*   → session valide requise
 *   /admin/* → session valide + rôle OPERATOR, ou OWNER d'un workspace AGENCY
 *              (le kind voyage dans le JWT précisément pour ça)
 * Sinon : redirect /connexion?next=… (ou /app si connecté mais non-admin).
 * Le matcher ne couvre QUE /app et /admin — assets, API et pages publiques
 * ne passent jamais ici.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};
