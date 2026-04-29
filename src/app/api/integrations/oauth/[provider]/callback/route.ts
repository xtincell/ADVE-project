/**
 * GET /api/integrations/oauth/:provider/callback
 *
 * Final hop of the OAuth Authorization-Code flow. Validates the signed
 * state, exchanges the code for tokens, encrypts the token payload,
 * upserts an `IntegrationConnection` row, and redirects back to the
 * UI with a success/error flag.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  encryptTokenPayload,
  exchangeCode,
  fetchUserInfo,
  getProviderConfig,
  unpackState,
} from "@/server/services/oauth-integrations";

function signingKey(): string {
  return process.env.NEXTAUTH_SECRET ?? "lafusee-dev-fallback-32-chars-minimum";
}

function redirectWithFlag(returnUrl: string, flag: string, providerSlug: string): NextResponse {
  const u = new URL(returnUrl, "http://placeholder.local");
  u.searchParams.set("integration", providerSlug);
  u.searchParams.set("status", flag);
  // Strip the placeholder host — we want a relative redirect.
  return NextResponse.redirect(`${u.pathname}${u.search}`);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return redirectWithFlag(
      "/console/config/integrations",
      `error_${errorParam}`,
      provider,
    );
  }
  if (!code || !stateParam) {
    return NextResponse.json({ error: "missing_code_or_state" }, { status: 400 });
  }

  const state = unpackState(stateParam, signingKey());
  if (!state || state.provider !== provider) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  const config = getProviderConfig(provider);
  if (!config) {
    return NextResponse.json({ error: "provider_not_configured" }, { status: 400 });
  }

  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/integrations/oauth/${provider}/callback`;

  let tokens;
  try {
    tokens = await exchangeCode({ config, code, redirectUri });
  } catch (err) {
    console.error("[oauth-callback]", provider, err);
    return redirectWithFlag(state.returnUrl, "error_token_exchange", provider);
  }

  const userInfo = await fetchUserInfo(config, tokens.access_token).catch(() => null);
  const externalUserId = userInfo?.id ?? null;

  const encryptedTokens = encryptTokenPayload({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    scope: tokens.scope ?? null,
    token_type: tokens.token_type ?? null,
    obtainedAt: Date.now(),
  });
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  await db.integrationConnection.upsert({
    where: {
      operatorId_provider_externalUserId: {
        operatorId: state.operatorId,
        provider: config.id,
        externalUserId: externalUserId ?? "",
      },
    },
    update: {
      encryptedTokens,
      scopes: tokens.scope ? tokens.scope.split(/\s+/) : Array.from(config.defaultScopes),
      expiresAt,
    },
    create: {
      operatorId: state.operatorId,
      provider: config.id,
      externalUserId,
      encryptedTokens,
      scopes: tokens.scope ? tokens.scope.split(/\s+/) : Array.from(config.defaultScopes),
      expiresAt,
    },
  });

  return redirectWithFlag(state.returnUrl, "connected", provider);
}
