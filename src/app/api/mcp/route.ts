export const dynamic = "force-dynamic";
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
import { authenticateMcpRequest, meterAndRun, scopeMcpParams } from "@/server/services/anubis/mcp-billing";
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
  let body: { server?: string; tool?: string; params?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.server || !body.tool) {
    return NextResponse.json(
      { error: "Missing 'server' or 'tool' in request body" },
      { status: 400 },
    );
  }

  // Auth dual (session ADMIN | x-api-key scoped au serveur ciblé) + metering
  // billable (Vague 5) — le dispatcher unifié facture comme les routes dédiées.
  const gate = await authenticateMcpRequest(request, body.server);
  if (!gate.ok) return gate.response!;

  const server = body.server;
  const tool = body.tool;
  // Enforce la portée du token (ADR-0145) + injecte `__auth` (les writes comme
  // amendPillar l'exigent ; fail-closed). Une clé BRAND ne peut toucher qu'à SA
  // marque — `strategyId` d'une autre marque = 403 (anti-IDOR round-6).
  const scoped = scopeMcpParams(gate, server, tool, body.params ?? {});
  if (scoped.denied) return scoped.denied;
  return meterAndRun(gate, server, tool, () => dispatchTool(server, tool, scoped.params));
}
