export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { authenticateMcpRequest, meterAndRun, scopeMcpParams } from "@/server/services/anubis/mcp-billing";
import { tools as artemisTools } from "@/server/mcp/artemis";

const toolMap = Object.fromEntries(artemisTools.map((t) => [t.name, t.handler]));

export async function POST(request: Request) {
  const gate = await authenticateMcpRequest(request, "artemis");
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
  const __scoped = scopeMcpParams(gate, "artemis", tool, body.params ?? {});
  if (__scoped.denied) return __scoped.denied;
  return meterAndRun(gate, "artemis", tool, () => handler(__scoped.params));
}

export async function GET(request: Request) {
  // Catalogue gated (site-prober: tool list exposed to anonymous GET).
  const __mcpGate = await authenticateMcpRequest(request, "artemis");
  if (!__mcpGate.ok) return NextResponse.json({ server: "artemis", status: "ok" });
  return NextResponse.json({
    server: "artemis",
    tools: artemisTools.map((t) => ({ name: t.name, description: t.description })),
  });
}
