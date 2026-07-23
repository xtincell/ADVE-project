export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { authenticateMcpRequest, meterAndRun, scopeMcpParams } from "@/server/services/anubis/mcp-billing";
import { dispatchTool } from "@/server/services/anubis/mcp-server";
import { tools as ptahTools } from "@/server/mcp/ptah";

const toolMap = Object.fromEntries(ptahTools.map((t) => [t.name, t.handler]));

/**
 * POST — Execute a PTAH MCP tool.
 *
 * Auth : ADMIN only (les agents externes utilisant la forge doivent être
 * authentifiés admin pour éviter qu'un endpoint public émet des intents
 * cost-bearing).
 */
export async function POST(request: Request) {
  const gate = await authenticateMcpRequest(request, "ptah");
  if (!gate.ok) return gate.response!;

  let body: { tool?: string; params?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const tool = body.tool ?? "";
  if (!toolMap[tool]) {
    return NextResponse.json(
      { error: `Unknown tool: ${tool}`, availableTools: Object.keys(toolMap) },
      { status: 400 },
    );
  }
  // Metering billable (Vague 5) — succès comme échec ; x-api-key = facturé.
  const __scoped = scopeMcpParams(gate, "ptah", tool, body.params ?? {});
  if (__scoped.denied) return __scoped.denied;
  return meterAndRun(gate, "ptah", tool, () => dispatchTool("ptah", tool, __scoped.params));
}

export async function GET(request: Request) {
  // Catalogue gated (site-prober: tool list exposed to anonymous GET).
  const __mcpGate = await authenticateMcpRequest(request, "ptah");
  if (!__mcpGate.ok) return NextResponse.json({ server: "ptah", status: "ok" });
  return NextResponse.json({
    server: "ptah",
    tools: ptahTools.map((t) => ({ name: t.name, description: t.description })),
  });
}
