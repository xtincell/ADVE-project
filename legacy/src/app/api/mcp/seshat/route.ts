export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { authenticateMcpRequest, meterAndRun } from "@/server/services/anubis/mcp-billing";
import { tools as seshatTools } from "@/server/mcp/seshat";

// ---------------------------------------------------------------------------
// Build handler map from the tools array exported by the MCP module
// ---------------------------------------------------------------------------

const toolMap = Object.fromEntries(
  seshatTools.map((t) => [t.name, t.handler])
);

// ---------------------------------------------------------------------------
// POST — Execute a SESHAT MCP tool
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const gate = await authenticateMcpRequest(request, "seshat");
  if (!gate.ok) return gate.response!;

  let body: { tool?: string; params?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const tool = body.tool ?? "";
  const handler = toolMap[tool];
  if (!handler) {
    return NextResponse.json(
      { error: `Unknown tool: ${tool}`, availableTools: Object.keys(toolMap) },
      { status: 400 },
    );
  }
  // Metering billable (Vague 5) — succès comme échec ; x-api-key = facturé.
  return meterAndRun(gate, "seshat", tool, () => handler(body.params ?? {}));
}

// ---------------------------------------------------------------------------
// GET — Tool manifest / health check
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  // Catalogue gated (site-prober: tool list exposed to anonymous GET).
  const __mcpGate = await authenticateMcpRequest(request, "seshat");
  if (!__mcpGate.ok) return NextResponse.json({ server: "seshat", status: "ok" });
  return NextResponse.json({
    server: "seshat",
    tools: seshatTools.map((t) => t.name),
  });
}
