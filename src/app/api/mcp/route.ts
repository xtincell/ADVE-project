export const dynamic = "force-dynamic";
/**
 * MCP root endpoint — manifest agrégé + dispatcher unifié.
 *
 * Cf. ADR-0026.
 *
 * GET  /api/mcp          → manifest agrégé (servers + tools list)
 * POST /api/mcp          → dispatcher unifié { server, tool, params }
 *
 * NB : ce endpoint sert le dialecte REST maison `{server,tool,params}`. Le VRAI
 * protocole MCP JSON-RPC (pour Claude Code/Desktop) vit sur /api/mcp/rpc
 * (ADR-0182). Ce endpoint reste pour les agents non-MCP (ex. galahad, ADR-0182).
 *
 * GET : accessible par session OU x-api-key (fix ADR-0182 — l'ancienne garde
 * `session?.user` 401ait tout porteur de clé, contredisant MCP-AGENT-ACCESS §2).
 */

import { NextResponse } from "next/server";
import { authenticateMcpRequest, meterAndRun, scopeMcpParams } from "@/server/services/anubis/mcp-billing";
import { buildAggregatedManifest, dispatchTool } from "@/server/services/anubis/mcp-server";

export async function GET(request: Request) {
  // Manifest = découverte, lecture seule → session ADMIN OU x-api-key valide.
  const gate = await authenticateMcpRequest(request, "*");
  if (!gate.ok) return gate.response!;
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
