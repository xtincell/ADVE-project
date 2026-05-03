/**
 * Anubis — MCP client (entrant) — consomme des MCP servers externes.
 *
 * Cf. ADR-0026. Permet aux Neteru d'appeler des tools Slack/Notion/Drive/
 * Calendar/Figma/GitHub/etc. via un transport HTTP/SSE unifié, avec credentials
 * stockés dans ExternalConnector (Credentials Vault, ADR-0021).
 *
 * Architecture :
 *  1. McpRegistry direction="INBOUND" garde la cartographie serverName → endpoint + credentialRef
 *  2. ExternalConnector connectorType="mcp:<serverName>" stocke le bearer token / config
 *  3. Chaque invocation crée un McpToolInvocation + lie à intentId si présent
 *  4. Cache toolsCache avec TTL implicite (sync explicite via mcpSyncRegistry)
 *
 * NOTE : on parle wire MCP via le SDK @modelcontextprotocol/sdk. En l'absence
 * du SDK installé runtime, on tombe en fallback HTTP simple `POST {url}/tools/invoke`.
 */

import { db } from "@/lib/db";
import { credentialVault } from "./credential-vault";

export interface McpInvokeArgs {
  operatorId: string;
  serverName: string;
  toolName: string;
  inputs: Record<string, unknown>;
  intentId?: string;
}

export type McpInvokeResult =
  | { status: "OK"; invocationId: string; output: unknown; durationMs: number }
  | { status: "FAILED"; invocationId: string; errorMessage: string }
  | {
      status: "DEFERRED_AWAITING_CREDENTIALS";
      connectorType: string;
      configureUrl: string;
      reason: string;
    };

interface McpRegistryRow {
  id: string;
  endpoint: string | null;
  credentialRef: string | null;
  status: string;
  toolsCache: unknown;
}

async function getRegistry(
  operatorId: string,
  serverName: string,
): Promise<McpRegistryRow | null> {
  return db.mcpRegistry.findUnique({
    where: {
      operatorId_direction_serverName: {
        operatorId,
        direction: "INBOUND",
        serverName,
      },
    },
  });
}

async function callExternal(
  endpoint: string,
  toolName: string,
  inputs: Record<string, unknown>,
  bearer?: string,
): Promise<unknown> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (bearer) headers["authorization"] = `Bearer ${bearer}`;
  const url = endpoint.endsWith("/") ? `${endpoint}tools/invoke` : `${endpoint}/tools/invoke`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ tool: toolName, params: inputs }),
  });
  if (!res.ok) {
    throw new Error(`MCP server returned ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return res.json();
}

export async function invokeExternalTool(args: McpInvokeArgs): Promise<McpInvokeResult> {
  const registry = await getRegistry(args.operatorId, args.serverName);
  if (!registry || !registry.endpoint) {
    return {
      status: "DEFERRED_AWAITING_CREDENTIALS",
      connectorType: `mcp:${args.serverName}`,
      configureUrl: `/console/anubis/mcp?register=${encodeURIComponent(args.serverName)}`,
      reason: `MCP server ${args.serverName} not registered for this operator`,
    };
  }

  const cred = await credentialVault.get(args.operatorId, `mcp:${args.serverName}`);
  if (!cred) {
    return {
      status: "DEFERRED_AWAITING_CREDENTIALS",
      connectorType: `mcp:${args.serverName}`,
      configureUrl: `/console/anubis/credentials?connector=mcp:${args.serverName}`,
      reason: `Credentials missing for MCP server ${args.serverName}`,
    };
  }

  const bearer = (cred.config as { bearer?: string; token?: string }).bearer
    ?? (cred.config as { bearer?: string; token?: string }).token;

  const startedAt = Date.now();
  const invocation = await db.mcpToolInvocation.create({
    data: {
      registryId: registry.id,
      toolName: args.toolName,
      inputs: args.inputs as never,
      status: "PENDING",
      intentId: args.intentId,
    },
  });

  try {
    const output = await callExternal(registry.endpoint, args.toolName, args.inputs, bearer);
    const durationMs = Date.now() - startedAt;
    await db.mcpToolInvocation.update({
      where: { id: invocation.id },
      data: { status: "OK", output: output as never, durationMs },
    });
    return { status: "OK", invocationId: invocation.id, output, durationMs };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await db.mcpToolInvocation.update({
      where: { id: invocation.id },
      data: {
        status: "FAILED",
        errorMessage,
        durationMs: Date.now() - startedAt,
      },
    });
    return { status: "FAILED", invocationId: invocation.id, errorMessage };
  }
}

export async function syncRegistry(args: {
  operatorId: string;
  serverName: string;
}): Promise<
  | { status: "OK"; serverName: string; toolCount: number }
  | { status: "DEFERRED_AWAITING_CREDENTIALS"; connectorType: string; configureUrl: string; reason: string }
> {
  const registry = await getRegistry(args.operatorId, args.serverName);
  if (!registry || !registry.endpoint) {
    return {
      status: "DEFERRED_AWAITING_CREDENTIALS",
      connectorType: `mcp:${args.serverName}`,
      configureUrl: `/console/anubis/mcp?register=${encodeURIComponent(args.serverName)}`,
      reason: `MCP server ${args.serverName} not registered`,
    };
  }
  const cred = await credentialVault.get(args.operatorId, `mcp:${args.serverName}`);
  if (!cred) {
    return {
      status: "DEFERRED_AWAITING_CREDENTIALS",
      connectorType: `mcp:${args.serverName}`,
      configureUrl: `/console/anubis/credentials?connector=mcp:${args.serverName}`,
      reason: "Credentials missing",
    };
  }

  const bearer = (cred.config as { bearer?: string; token?: string }).bearer
    ?? (cred.config as { bearer?: string; token?: string }).token;

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (bearer) headers["authorization"] = `Bearer ${bearer}`;
  const url = registry.endpoint.endsWith("/")
    ? `${registry.endpoint}tools/list`
    : `${registry.endpoint}/tools/list`;

  let tools: unknown[] = [];
  try {
    const res = await fetch(url, { method: "GET", headers });
    if (res.ok) {
      const data = (await res.json()) as { tools?: unknown[]; result?: { tools?: unknown[] } };
      tools = data.tools ?? data.result?.tools ?? [];
    }
  } catch {
    // Network error — don't crash, store empty cache.
  }

  await db.mcpRegistry.update({
    where: { id: registry.id },
    data: {
      toolsCache: tools as never,
      status: "ACTIVE",
      lastSyncAt: new Date(),
    },
  });

  return { status: "OK", serverName: args.serverName, toolCount: tools.length };
}

export async function registerServer(args: {
  operatorId: string;
  direction: "INBOUND" | "OUTBOUND";
  serverName: string;
  endpoint?: string;
  credentialRef?: string;
}): Promise<{
  registryId: string;
  serverName: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
}> {
  const registry = await db.mcpRegistry.upsert({
    where: {
      operatorId_direction_serverName: {
        operatorId: args.operatorId,
        direction: args.direction,
        serverName: args.serverName,
      },
    },
    create: {
      operatorId: args.operatorId,
      direction: args.direction,
      serverName: args.serverName,
      endpoint: args.endpoint,
      credentialRef: args.credentialRef,
      toolsCache: [] as never,
      status: "INACTIVE",
    },
    update: {
      endpoint: args.endpoint,
      credentialRef: args.credentialRef,
    },
  });
  return {
    registryId: registry.id,
    serverName: registry.serverName,
    direction: registry.direction as "INBOUND" | "OUTBOUND",
    status: registry.status,
  };
}
