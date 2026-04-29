/**
 * GET /api/integrations/oauth/:provider/start
 *
 * Initiates an OAuth Authorization-Code flow for the given provider.
 * Requires admin or operator-bound session. Stores a signed state token
 * for CSRF + return-url tracking.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  buildAuthorizeUrl,
  getProviderConfig,
  packState,
} from "@/server/services/oauth-integrations";

function signingKey(): string {
  return process.env.NEXTAUTH_SECRET ?? "lafusee-dev-fallback-32-chars-minimum";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { provider } = await context.params;
  const config = getProviderConfig(provider);
  if (!config) {
    return NextResponse.json(
      {
        error: "provider_not_configured",
        provider,
        hint: `Set ${provider.toUpperCase()}_OAUTH_CLIENT_ID and ${provider.toUpperCase()}_OAUTH_CLIENT_SECRET in env.`,
      },
      { status: 400 },
    );
  }

  // Resolve operatorId
  let operatorId: string;
  if (session.user.role === "ADMIN") {
    operatorId = "ADMIN";
  } else {
    const u = await db.user.findUnique({
      where: { id: session.user.id },
      select: { operatorId: true },
    });
    if (!u?.operatorId) {
      return NextResponse.json(
        { error: "Operator binding required to connect integrations" },
        { status: 403 },
      );
    }
    operatorId = u.operatorId;
  }

  const url = new URL(request.url);
  const returnUrl = url.searchParams.get("returnUrl") ?? "/console/config/integrations";
  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/integrations/oauth/${provider}/callback`;

  const state = packState(
    {
      operatorId,
      provider: config.id,
      returnUrl,
      nonce: crypto.randomUUID(),
      ts: Date.now(),
    },
    signingKey(),
  );

  const authorizeUrl = buildAuthorizeUrl({ config, redirectUri, state });
  return NextResponse.redirect(authorizeUrl);
}
