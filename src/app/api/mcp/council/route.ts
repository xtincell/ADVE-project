export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { authenticateMcpRequest, meterAndRun, scopeMcpParams } from "@/server/services/anubis/mcp-billing";
import { dispatchTool } from "@/server/services/anubis/mcp-server";
import { tools as councilTools } from "@/server/mcp/council";

// Council (outbound) — expose le conseil de marque (ADR-0180/0182). Lecture
// seule advisory. maxDuration 300 : `deliberate` peut chaîner jusqu'à 6 appels LLM.

const toolMap = Object.fromEntries(councilTools.map((t) => [t.name, t.handler]));

export async function POST(request: Request) {
  const gate = await authenticateMcpRequest(request, "council");
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
  const scoped = scopeMcpParams(gate, "council", tool, body.params ?? {});
  if (scoped.denied) return scoped.denied;
  return meterAndRun(gate, "council", tool, () => dispatchTool("council", tool, scoped.params));
}

export async function GET(request: Request) {
  const gate = await authenticateMcpRequest(request, "council");
  if (!gate.ok) return NextResponse.json({ server: "council", status: "ok" });
  return NextResponse.json({ server: "council", tools: councilTools.map((t) => t.name) });
}
