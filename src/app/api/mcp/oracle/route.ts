export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { authenticateMcpRequest, meterAndRun, scopeMcpParams } from "@/server/services/anubis/mcp-billing";
import { dispatchTool } from "@/server/services/anubis/mcp-server";
import { tools as oracleTools } from "@/server/mcp/oracle";

// Oracle (outbound) — expose le livrable Oracle d'une marque (ADR-0182). Lecture seule.

const toolMap = Object.fromEntries(oracleTools.map((t) => [t.name, t.handler]));

export async function POST(request: Request) {
  const gate = await authenticateMcpRequest(request, "oracle");
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
  const scoped = scopeMcpParams(gate, "oracle", tool, body.params ?? {});
  if (scoped.denied) return scoped.denied;
  return meterAndRun(gate, "oracle", tool, () => dispatchTool("oracle", tool, scoped.params));
}

export async function GET(request: Request) {
  const gate = await authenticateMcpRequest(request, "oracle");
  if (!gate.ok) return NextResponse.json({ server: "oracle", status: "ok" });
  return NextResponse.json({ server: "oracle", tools: oracleTools.map((t) => t.name) });
}
