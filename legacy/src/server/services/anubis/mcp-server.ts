/**
 * Anubis — MCP server (sortant) — agrège les 10 MCP servers Neteru existants
 * en un manifest unifié et un dispatcher mutualisé.
 *
 * Cf. ADR-0026. Permet à un client externe (Claude Desktop, Claude Code, etc.)
 * de découvrir l'ensemble des outils La Fusée via un seul endpoint /api/mcp,
 * tout en exposant chaque server individuellement sur /api/mcp/{server}.
 *
 * NOTE : on ne ré-implémente pas le protocol MCP wire ici (le SDK
 * @modelcontextprotocol/sdk le fait). Cette couche prépare le manifest agrégé
 * + le bridge HTTP unique. Le SDK peut être branché en aval pour stdio/SSE.
 */

import type { z } from "zod";

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

export interface McpServerModule {
  serverName: string;
  serverDescription?: string;
  tools: McpToolDefinition[];
}

export interface McpAggregatedTool {
  server: string;
  name: string;
  qualifiedName: string;
  description: string;
}

export interface McpAggregatedManifest {
  protocol: string;
  version: string;
  servers: Array<{
    name: string;
    description?: string;
    tools: Array<{ name: string; description: string }>;
  }>;
  tools: McpAggregatedTool[];
}

const PROTOCOL = "mcp/1.0";
const VERSION = "1.0.0";

async function loadServer(name: string): Promise<McpServerModule | null> {
  try {
    const mod = (await import(`@/server/mcp/${name}/index`)) as Partial<McpServerModule>;
    if (!mod.tools || !Array.isArray(mod.tools)) return null;
    return {
      serverName: mod.serverName ?? name,
      serverDescription: mod.serverDescription,
      tools: mod.tools,
    };
  } catch {
    return null;
  }
}

// Notoria expose des `resources` (read-only), pas des `tools` callable —
// elle est exclue de l'agrégateur tools. Pour exposer ses resources via le
// manifest MCP, étendre `loadServer` avec un branch resource-aware.
const MCP_SERVER_NAMES = [
  "advertis-inbound",
  "artemis",
  "creative",
  "guild",
  "intelligence",
  "operations",
  "ptah",
  "pulse",
  "seshat",
] as const;

export type McpServerName = (typeof MCP_SERVER_NAMES)[number];

let cached: McpServerModule[] | null = null;

export async function loadAllServers(): Promise<McpServerModule[]> {
  if (cached) return cached;
  const loaded = await Promise.all(MCP_SERVER_NAMES.map((n) => loadServer(n)));
  cached = loaded.filter((s): s is McpServerModule => s !== null);
  return cached;
}

export async function buildAggregatedManifest(): Promise<McpAggregatedManifest> {
  const servers = await loadAllServers();
  return {
    protocol: PROTOCOL,
    version: VERSION,
    servers: servers.map((s) => ({
      name: s.serverName,
      description: s.serverDescription,
      tools: s.tools.map((t) => ({ name: t.name, description: t.description })),
    })),
    tools: servers.flatMap((s) =>
      s.tools.map((t) => ({
        server: s.serverName,
        name: t.name,
        qualifiedName: `${s.serverName}.${t.name}`,
        description: t.description,
      })),
    ),
  };
}

export async function dispatchTool(
  serverName: string,
  toolName: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const servers = await loadAllServers();
  const server = servers.find((s) => s.serverName === serverName);
  if (!server) throw new Error(`Unknown MCP server: ${serverName}`);
  const tool = server.tools.find((t) => t.name === toolName);
  if (!tool) {
    throw new Error(
      `Unknown tool ${toolName} on ${serverName}. Available: ${server.tools
        .map((t) => t.name)
        .join(", ")}`,
    );
  }
  return tool.handler(params);
}

export function clearCache(): void {
  cached = null;
}
