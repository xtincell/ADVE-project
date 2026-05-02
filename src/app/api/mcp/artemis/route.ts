import { NextResponse } from "next/server";
import { mcpGate } from "@/lib/auth/mcp-gate";
import { tools as artemisTools } from "@/server/mcp/artemis";

const toolMap = Object.fromEntries(artemisTools.map((t) => [t.name, t.handler]));

export async function POST(request: Request) {
  const gate = await mcpGate();
  if (!gate.ok) return gate.response!;

  try {
    const { tool, params } = await request.json();
    const handler = toolMap[tool];
    if (!handler) {
      return NextResponse.json(
        { error: `Unknown tool: ${tool}`, availableTools: Object.keys(toolMap) },
        { status: 400 },
      );
    }
    const result = await handler(params ?? {});
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mcp/artemis] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    server: "artemis",
    tools: artemisTools.map((t) => ({ name: t.name, description: t.description })),
  });
}
