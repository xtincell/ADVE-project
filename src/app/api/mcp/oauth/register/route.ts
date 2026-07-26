export const dynamic = "force-dynamic";

/**
 * RFC 7591 — enregistrement dynamique de client OAuth (DCR, ADR-0183).
 * Le connecteur claude.ai s'auto-enregistre ici et reçoit un `client_id`
 * public (pas de secret — client public PKCE). PUBLIC par spec.
 */

import { NextResponse } from "next/server";
import { registerClient } from "@/server/services/anubis/mcp-oauth";

export async function POST(request: Request) {
  let body: { client_name?: string; redirect_uris?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 });
  }
  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string")
    : [];
  try {
    const client = await registerClient({ clientName: body.client_name, redirectUris });
    // Réponse RFC 7591 : client public (token_endpoint_auth_method=none).
    return NextResponse.json(
      {
        client_id: client.clientId,
        client_name: client.clientName ?? undefined,
        redirect_uris: client.redirectUris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
