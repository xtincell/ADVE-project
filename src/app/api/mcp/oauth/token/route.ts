export const dynamic = "force-dynamic";

/**
 * Token endpoint OAuth 2.1 (ADR-0183) — grant_type authorization_code | refresh_token.
 * Client public PKCE (pas d'auth client). Accepte form-urlencoded (spec) ET JSON.
 * PUBLIC (la sécurité vient du code usage-unique + PKCE + refresh hashé).
 */

import { NextResponse } from "next/server";
import { exchangeCode, refreshTokens, type IssuedTokens } from "@/server/services/anubis/mcp-oauth";

function oauthError(error: string, description?: string, status = 400): NextResponse {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function parseParams(request: Request): Promise<Record<string, string>> {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const j = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v ?? "")]));
  }
  const form = await request.formData().catch(() => null);
  if (!form) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) out[k] = String(v);
  return out;
}

function tokenResponse(t: IssuedTokens): NextResponse {
  return NextResponse.json(
    {
      access_token: t.accessToken,
      token_type: "Bearer",
      expires_in: t.expiresIn,
      refresh_token: t.refreshToken,
      scope: "mcp",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const p = await parseParams(request);
  const grantType = p.grant_type;
  const clientId = p.client_id;
  if (!clientId) return oauthError("invalid_request", "client_id requis");

  try {
    if (grantType === "authorization_code") {
      if (!p.code || !p.redirect_uri || !p.code_verifier) {
        return oauthError("invalid_request", "code, redirect_uri, code_verifier requis");
      }
      const t = await exchangeCode({
        code: p.code,
        clientId,
        redirectUri: p.redirect_uri,
        codeVerifier: p.code_verifier,
      });
      return tokenResponse(t);
    }
    if (grantType === "refresh_token") {
      if (!p.refresh_token) return oauthError("invalid_request", "refresh_token requis");
      const t = await refreshTokens({ refreshToken: p.refresh_token, clientId });
      return tokenResponse(t);
    }
    return oauthError("unsupported_grant_type", `grant_type ${grantType ?? "(absent)"} non supporté`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Les erreurs de grant portent le préfixe "invalid_grant:".
    if (msg.startsWith("invalid_grant")) return oauthError("invalid_grant", msg);
    return oauthError("invalid_request", msg);
  }
}
