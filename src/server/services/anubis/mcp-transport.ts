/**
 * ANUBIS — Transport MCP Streamable HTTP RÉEL (ADR-0182).
 *
 * Comble le trou structurel de l'accès externe : `/api/mcp/*` parlait un
 * dialecte REST maison `{server,tool,params}` — PAS le protocole MCP JSON-RPC.
 * Aucun client Claude (Claude Code, Desktop, claude.ai) ne pouvait s'y
 * connecter. Cette couche monte un VRAI serveur MCP via
 * `@modelcontextprotocol/sdk` sur un transport Web-standard (Request/Response),
 * exactement ce qu'un route handler Next.js sait fournir.
 *
 * Décisions :
 *   - STATELESS (`sessionIdGenerator: undefined`, `enableJsonResponse: true`) :
 *     serveur créé PAR REQUÊTE, aucune session serveur. Seul mode sûr sur
 *     pm2/Coolify multi-process (une session en mémoire ne survivrait pas au
 *     routage entre workers). Claude Code fonctionne en réponse JSON.
 *   - CURATION : ~100 tools bruts noieraient `tools/list`. On expose un
 *     sous-ensemble curé haute-valeur + 2 génériques (`lafusee_catalog` /
 *     `lafusee_invoke`) pour la longue traîne — même scoping/metering.
 *   - SCOPING/METERING PRÉSERVÉS : chaque tool passe par `scopeParamsForTool`
 *     (fail-closed BRAND) → `dispatchTool` (enforceBrandScope) enveloppé dans
 *     `meterMcp` (1 row McpApiCall). Le transport n'est qu'un nouveau front.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  buildAggregatedManifest,
  dispatchTool,
  loadAllServers,
} from "@/server/services/anubis/mcp-server";
import {
  meterMcp,
  mcpResultFailed,
  scopeMcpParams,
  type McpAuthResult,
} from "@/server/services/anubis/mcp-billing";
import { CURATED_MCP_TOOLS, MCP_TOOL_NAME_RE, mcpToolName } from "@/server/services/anubis/mcp-curated";
import { NextResponse } from "next/server";
import { isMcpServerAllowed } from "@/server/services/anubis/mcp-scope-kind";

export { CURATED_MCP_TOOLS, mcpToolName } from "@/server/services/anubis/mcp-curated";

const TOOL_NAME_RE = MCP_TOOL_NAME_RE;

/**
 * Réutilise la frontière REST pour le scoping, l'injection d'auth et le journal
 * DENIED. Convertit le refus HTTP en erreur SDK sans dispatch ni second journal.
 */
function scopeParamsForTool(
  gate: McpAuthResult,
  server: string,
  tool: string,
  rawParams: Record<string, unknown>,
): Record<string, unknown> {
  const scoped = scopeMcpParams(gate, server, tool, rawParams);
  if (scoped.denied) throw new Error("SCOPE_DENIED — ce token ne permet pas cet outil ou cette marque.");
  return scoped.params;
}

/** Résultat MCP texte-JSON standard. */
function jsonResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    ...(mcpResultFailed(value) ? { isError: true } : {}),
  };
}

/**
 * Construit un serveur MCP neuf, tools curés enregistrés + 2 génériques.
 * Un serveur PAR REQUÊTE (stateless) — le coût de registration est négligeable.
 */
export async function buildMcpServer(gate: McpAuthResult): Promise<McpServer> {
  const server = new McpServer(
    { name: "lafusee", version: "1.0.0" },
    {
      instructions:
        "La Fusée — Industry OS marketing. Outils de lecture/raisonnement sur la stratégie ADVE-RTIS d'une marque (piliers, Oracle, conseil de marque, recherche). Chaque outil est scopé à un strategyId ; une clé limitée à une marque ne peut opérer qu'elle.",
    },
  );

  const servers = (await loadAllServers()).filter(mod => isMcpServerAllowed(gate.scopeServer, mod.serverName));
  const byName = new Map(servers.map((s) => [s.serverName, s]));

  for (const { server: serverName, tool: toolName } of CURATED_MCP_TOOLS) {
    const mod = byName.get(serverName);
    const def = mod?.tools.find((t) => t.name === toolName);
    if (!def) continue; // tool absent (renommé/retiré) → on saute silencieusement
    const flatName = mcpToolName(serverName, toolName);
    if (!TOOL_NAME_RE.test(flatName)) continue;
    const shape = (def.inputSchema as z.ZodObject<z.ZodRawShape>).shape ?? {};
    server.registerTool(
      flatName,
      { description: def.description, inputSchema: shape },
      async (args: Record<string, unknown>) => {
        try {
          const scoped = scopeParamsForTool(gate, serverName, toolName, args ?? {});
          const result = await meterMcp(gate, serverName, toolName, () =>
            dispatchTool(serverName, toolName, scoped),
          );
          return jsonResult(result);
        } catch (err) {
          return {
            content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
            isError: true,
          };
        }
      },
    );
  }

  // ── Génériques (longue traîne + découverte) ──────────────────────────
  server.registerTool(
    "lafusee_catalog",
    {
      description:
        "Catalogue des serveurs et outils MCP de La Fusée accessibles avec ce token (au-delà des outils curés exposés directement). Utilise-le pour découvrir un outil, puis appelle-le via lafusee_invoke.",
      inputSchema: {},
    },
    async () => jsonResult(await buildAggregatedManifest(gate.scopeServer)),
  );

  server.registerTool(
    "lafusee_invoke",
    {
      description:
        "Appelle n'importe quel outil La Fusée par {server, tool, params} (longue traîne non exposée directement). Même scoping et facturation que les outils curés. Découvre les outils via lafusee_catalog.",
      inputSchema: {
        server: z.string().describe("Nom du serveur MCP (ex. operations, guild)"),
        tool: z.string().describe("Nom de l'outil"),
        params: z.record(z.string(), z.unknown()).optional().describe("Paramètres de l'outil"),
      },
    },
    async (args: { server?: string; tool?: string; params?: Record<string, unknown> }) => {
      try {
        const targetServer = String(args.server ?? "");
        const targetTool = String(args.tool ?? "");
        if (!targetServer || !targetTool) throw new Error("server et tool requis");
        const scoped = scopeParamsForTool(gate, targetServer, targetTool, args.params ?? {});
        const result = await meterMcp(gate, targetServer, targetTool, () =>
          dispatchTool(targetServer, targetTool, scoped),
        );
        return jsonResult(result);
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
          isError: true,
        };
      }
    },
  );

  return server;
}

/**
 * Traite une requête MCP JSON-RPC (POST) en mode stateless et retourne une
 * `Response` Web-standard. Un serveur + transport neufs par requête, fermés
 * après réponse. L'auth (x-api-key ou session ADMIN) est déjà validée par la
 * route avant appel.
 */
export async function handleMcpRequest(request: Request, gate: McpAuthResult): Promise<Response> {
  const server = await buildMcpServer(gate);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    // Best-effort — libère le serveur/transport de cette requête.
    void server.close().catch(() => {});
  }
}

/** 405 JSON pour les méthodes non supportées (pas de flux server-initiated v1). */
export function methodNotAllowed(): NextResponse {
  return NextResponse.json(
    { error: "Method Not Allowed — POST JSON-RPC uniquement (transport stateless, v1)." },
    { status: 405 },
  );
}
