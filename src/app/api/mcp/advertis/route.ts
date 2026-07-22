export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { authenticateMcpRequest, meterAndRun, scopeMcpParams } from "@/server/services/anubis/mcp-billing";
import { tools as advertisTools } from "@/server/mcp/advertis";

// ADVERTIS (outbound) — expose une marque à un agent (ADR-0142). Lecture seule.

const toolMap = Object.fromEntries(advertisTools.map((t) => [t.name, t.handler]));

export async function POST(request: Request) {
  const gate = await authenticateMcpRequest(request, "advertis");
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
  // Enforce la portée du token (ADR-0145) + injecte `__auth`. Une clé BRAND ne
  // peut lire/écrire QUE sa marque — même les reads (getBrandCard/getAdveRtis)
  // sont désormais scopés au bord (anti-IDOR round-6), plus seulement amendPillar.
  const scoped = scopeMcpParams(gate, "advertis", tool, body.params ?? {});
  if (scoped.denied) return scoped.denied;
  return meterAndRun(gate, "advertis", tool, () => handler(scoped.params));
}

export async function GET(request: Request) {
  const gate = await authenticateMcpRequest(request, "advertis");
  if (!gate.ok) return NextResponse.json({ server: "advertis", status: "ok" });
  return NextResponse.json({
    server: "advertis",
    tools: advertisTools.map((t) => t.name),
  });
}
