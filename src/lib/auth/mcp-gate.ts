/**
 * MCP authentication gate (ADR-0023).
 *
 * Mutualise le check session+ADMIN pour tous les endpoints /api/mcp/*.
 * Returns NextResponse error directement si refusé, ou null si OK.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

export interface McpGateResult {
  ok: boolean;
  response?: NextResponse;
  userId?: string;
  role?: string;
}

export async function mcpGate(): Promise<McpGateResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (session.user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, userId: session.user.id, role: session.user.role };
}
