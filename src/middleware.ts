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
  "/impulsion": "/console/oracle/clients",
  "/impulsion/clients": "/console/oracle/clients",
  "/impulsion/diagnostics": "/console/oracle/diagnostics",
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
// ---------------------------------------------------------------------------
const PROTECTED_ROUTES: Array<{
  prefix: string;
  roles: string[];
}> = [
  { prefix: "/cockpit", roles: ["ADMIN", "CLIENT_RETAINER", "CLIENT_STATIC"] },
  { prefix: "/creator", roles: ["ADMIN", "FREELANCE"] },
  { prefix: "/console", roles: ["ADMIN"] },
];

export async function middleware(request: NextRequest) {
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

  // Retrieve the JWT token from the request (next-auth v5 beta requires explicit secret)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
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
  ],
};
