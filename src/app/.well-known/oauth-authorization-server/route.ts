export const dynamic = "force-dynamic";

/**
 * RFC 8414 — métadonnée du serveur d'autorisation OAuth 2.1 (ADR-0183).
 * PUBLIC (aucune auth). Client public + PKCE S256 obligatoire.
 */

import { NextResponse } from "next/server";
import { buildAuthServerMetadata, resolveOrigin } from "@/server/services/anubis/mcp-oauth";

export async function GET(request: Request) {
  const origin = resolveOrigin(request);
  return NextResponse.json(buildAuthServerMetadata(origin), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
