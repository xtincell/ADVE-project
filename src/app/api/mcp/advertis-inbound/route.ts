export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { authenticateMcpRequest, meterAndRun, scopeMcpParams } from "@/server/services/anubis/mcp-billing";
import { dispatchTool } from "@/server/services/anubis/mcp-server";
import { tools as inboundTools } from "@/server/mcp/advertis-inbound";

// ---------------------------------------------------------------------------
// Build handler map
// ---------------------------------------------------------------------------

const toolMap = Object.fromEntries(
  inboundTools.map((t) => [t.name, t.handler])
);


// ---------------------------------------------------------------------------
// POST — Execute an Advertis Inbound MCP tool
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const gate = await authenticateMcpRequest(request, "advertis-inbound");
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
      { status: 400 }
    );
  }
  // Metering billable (Vague 5) — succès comme échec ; x-api-key = facturé.
  const __scoped = scopeMcpParams(gate, "advertis-inbound", tool, body.params ?? {});
  if (__scoped.denied) return __scoped.denied;
  return meterAndRun(gate, "advertis-inbound", tool, () => dispatchTool("advertis-inbound", tool, __scoped.params));
}

// ---------------------------------------------------------------------------
// GET — Tool manifest / health check
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  // Catalogue gated (site-prober: tool list exposed to anonymous GET).
  const __mcpGate = await authenticateMcpRequest(request, "advertis-inbound");
  if (!__mcpGate.ok) return NextResponse.json({ server: "advertis-inbound", status: "ok" });
  return NextResponse.json({
    server: "advertis-inbound",
    description: "Ingestion de signaux SaaS externes vers les piliers ADVE",
    tools: inboundTools.map((t) => ({ name: t.name, description: t.description })),
  });
}
