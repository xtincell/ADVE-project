export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Endpoint MCP JSON-RPC RÉEL (ADR-0182) — Streamable HTTP stateless.
 *
 * C'est LE endpoint que Claude Code (web/CLI) et Claude Desktop consomment :
 *
 *   { "mcpServers": { "lafusee": {
 *       "type": "http",
 *       "url": "https://powerupgraders.com/api/mcp/rpc",
 *       "headers": { "x-api-key": "lfk_…" } } } }
 *
 * Auth : `x-api-key` (clé `lfk_`, SYSTEM ou BRAND) OU session ADMIN — même gate
 * que le reste de /api/mcp/*. Pas d'OAuth en v1 (cible = clients à header).
 * Le scoping BRAND fail-closed + le metering (McpApiCall) sont préservés par
 * `handleMcpRequest` → chaque tool passe par dispatchTool + meterMcp.
 */

import { authenticateMcpRequest } from "@/server/services/anubis/mcp-billing";
import { handleMcpRequest, methodNotAllowed } from "@/server/services/anubis/mcp-transport";

export async function POST(request: Request): Promise<Response> {
  // Wildcard : le scope PAR TOOL est enforcé en aval (par serveur cible) dans
  // handleMcpRequest. Une clé scopée à un serveur précis reste honorée : un
  // tool hors de sa portée déclenchera un refus au dispatch.
  const gate = await authenticateMcpRequest(request, "*");
  if (!gate.ok) return gate.response!;
  return handleMcpRequest(request, gate);
}

// Pas de flux server-initiated en v1 (mode stateless JSON) → GET/DELETE = 405.
export async function GET(): Promise<Response> {
  return methodNotAllowed();
}
export async function DELETE(): Promise<Response> {
  return methodNotAllowed();
}
