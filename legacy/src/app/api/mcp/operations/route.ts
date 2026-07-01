export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { authenticateMcpRequest, meterAndRun } from "@/server/services/anubis/mcp-billing";
import { tools as operationsTools } from "@/server/mcp/operations";

const toolMap = Object.fromEntries(operationsTools.map((t) => [t.name, t.handler]));

export async function POST(request: Request) {
  const gate = await authenticateMcpRequest(request, "operations");
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
  return meterAndRun(gate, "operations", tool, () => handler(body.params ?? {}));
}

export async function GET(request: Request) {
  // Catalogue gated (site-prober: tool list exposed to anonymous GET).
  const __mcpGate = await authenticateMcpRequest(request, "operations");
  if (!__mcpGate.ok) return NextResponse.json({ server: "operations", status: "ok" });
  return NextResponse.json({
    server: "operations",
    tools: operationsTools.map((t) => ({ name: t.name, description: t.description })),
  });
}
