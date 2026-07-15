export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { authenticateMcpRequest, meterAndRun } from "@/server/services/anubis/mcp-billing";
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
  // Injecte la portée du token (ADR-0145) pour les outils d'écriture (amendPillar).
  // Écrit APRÈS le spread → un client ne peut pas usurper __auth.
  return meterAndRun(gate, "advertis", tool, () =>
    handler({
      ...(body.params ?? {}),
      __auth: {
        scopeKind: gate.scopeKind ?? null,
        scopeStrategyId: gate.scopeStrategyId ?? null,
        userId: gate.userId ?? null,
        apiKeyId: gate.apiKeyId ?? null,
      },
    }),
  );
}

export async function GET(request: Request) {
  const gate = await authenticateMcpRequest(request, "advertis");
  if (!gate.ok) return NextResponse.json({ server: "advertis", status: "ok" });
  return NextResponse.json({
    server: "advertis",
    tools: advertisTools.map((t) => t.name),
  });
}
