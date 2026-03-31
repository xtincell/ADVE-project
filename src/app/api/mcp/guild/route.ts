import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { tools as guildTools } from "@/server/mcp/guild";

// ---------------------------------------------------------------------------
// Build handler map from the tools array exported by the MCP module
// ---------------------------------------------------------------------------

const toolMap = Object.fromEntries(
  guildTools.map((t) => [t.name, t.handler])
);

// ---------------------------------------------------------------------------
// POST — Execute a Guild MCP tool
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // Verify authentication — only ADMIN users can call MCP gateway
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // MCP gateway is restricted to ADMIN role
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { tool, params } = await request.json();

    const handler = toolMap[tool];
    if (!handler) {
      return NextResponse.json(
        { error: `Unknown tool: ${tool}`, availableTools: Object.keys(toolMap) },
        { status: 400 }
      );
    }

    const result = await handler(params ?? {});
    return NextResponse.json({ result });
  } catch (error) {
    console.error("[mcp/guild] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET — Tool manifest / health check
// ---------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json({
    server: "guild",
    tools: guildTools.map((t) => t.name),
  });
}
