export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { authenticateMcpRequest, meterAndRun, scopeMcpParams } from "@/server/services/anubis/mcp-billing";
import { dispatchTool } from "@/server/services/anubis/mcp-server";
import { tools as creativeTools } from "@/server/mcp/creative";

const toolMap = Object.fromEntries(creativeTools.map((t) => [t.name, t.handler]));

export async function POST(request: Request) {
  const gate = await authenticateMcpRequest(request, "creative");
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
  const __scoped = scopeMcpParams(gate, "creative", tool, body.params ?? {});
  if (__scoped.denied) return __scoped.denied;
  return meterAndRun(gate, "creative", tool, () => dispatchTool("creative", tool, __scoped.params));
}

export async function GET(request: Request) {
  // Catalogue gated (site-prober: tool list exposed to anonymous GET).
  const __mcpGate = await authenticateMcpRequest(request, "creative");
  if (!__mcpGate.ok) return NextResponse.json({ server: "creative", status: "ok" });
  return NextResponse.json({
    server: "creative",
    tools: creativeTools.map((t) => ({ name: t.name, description: t.description })),
  });
}
