import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { tools as ptahTools } from "@/server/mcp/ptah";

const toolMap = Object.fromEntries(ptahTools.map((t) => [t.name, t.handler]));

/**
 * POST — Execute a PTAH MCP tool.
 *
 * Auth : ADMIN only (les agents externes utilisant la forge doivent être
 * authentifiés admin pour éviter qu'un endpoint public émet des intents
 * cost-bearing).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    console.error("[mcp/ptah] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    server: "ptah",
    tools: ptahTools.map((t) => ({ name: t.name, description: t.description })),
  });
}
