export const dynamic = "force-dynamic";

/**
 * RFC 9728 — métadonnée de ressource protégée (ADR-0183). Pointe le client MCP
 * (claude.ai) vers le serveur d'autorisation. PUBLIC (aucune auth).
 */

import { NextResponse } from "next/server";
import { buildProtectedResourceMetadata, resolveOrigin } from "@/server/services/anubis/mcp-oauth";

export async function GET(request: Request) {
  const origin = resolveOrigin(request);
  return NextResponse.json(buildProtectedResourceMetadata(origin), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
