import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { tools as inboundTools } from "@/server/mcp/advertis-inbound";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Build handler map
// ---------------------------------------------------------------------------

const toolMap = Object.fromEntries(
  inboundTools.map((t) => [t.name, t.handler])
);

// ---------------------------------------------------------------------------
// Auth — dual mode: session (ADMIN) or x-api-key (McpApiKey)
// ---------------------------------------------------------------------------

async function authenticate(request: Request): Promise<{ ok: boolean; error?: string }> {
  // 1) Try session auth first (for Console/fixer users)
  const session = await auth();
  if (session?.user?.role === "ADMIN") {
    return { ok: true };
  }

  // 2) Fall back to API key auth (for external webhooks / connectors)
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    const keyHash = createHash("sha256").update(apiKey).digest("hex");
    const record = await db.mcpApiKey.findUnique({ where: { keyHash } });
    if (
      record &&
      record.isActive &&
      (record.server === "advertis-inbound" || record.server === "*") &&
      (!record.expiresAt || record.expiresAt > new Date())
    ) {
      // Update last used
      await db.mcpApiKey.update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});
      return { ok: true };
    }
  }

  return { ok: false, error: "Unauthorized — requires ADMIN session or valid x-api-key" };
}

// ---------------------------------------------------------------------------
// POST — Execute an Advertis Inbound MCP tool
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const authResult = await authenticate(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
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
    console.error("[mcp/advertis-inbound] Error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET — Tool manifest / health check
// ---------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json({
    server: "advertis-inbound",
    description: "Ingestion de signaux SaaS externes vers les piliers ADVE",
    tools: inboundTools.map((t) => ({ name: t.name, description: t.description })),
  });
}
