/**
 * MCP root endpoint — manifest agrégé + dispatcher unifié.
 *
 * Cf. ADR-0026.
 *
 * GET  /api/mcp          → manifest agrégé (servers + tools list)
 * POST /api/mcp          → dispatcher unifié { server, tool, params }
 *
 * Auth ADMIN-only sur le POST. GET reste accessible authentifié pour permettre
 * à un client externe de découvrir les tools sans privilège exécution.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { mcpGate } from "@/lib/auth/mcp-gate";
import { buildAggregatedManifest, dispatchTool } from "@/server/services/anubis/mcp-server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const manifest = await buildAggregatedManifest();
  return NextResponse.json(manifest);
}

export async function POST(request: Request) {
  const gate = await mcpGate();
  if (!gate.ok) return gate.response!;

  try {
    const body = (await request.json()) as {
      server?: string;
      tool?: string;
      params?: Record<string, unknown>;
    };
    if (!body.server || !body.tool) {
      return NextResponse.json(
        { error: "Missing 'server' or 'tool' in request body" },
        { status: 400 },
      );
    }
    const result = await dispatchTool(body.server, body.tool, body.params ?? {});
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mcp] dispatch error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
