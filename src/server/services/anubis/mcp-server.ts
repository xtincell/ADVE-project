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
import { db } from "@/lib/db";

/**
 * Portée d'un tool vis-à-vis des marques.
 *
 * - `BRAND` (défaut implicite) — le tool lit ou écrit de la donnée DE MARQUE.
 *   Son schéma DOIT porter `strategyId`, sinon il est inatteignable avec une
 *   clé limitée à une marque (et, avec une clé système, il rend la donnée de
 *   TOUTES les marques — c'est exactement la fuite `content_calendar_get`).
 * - `GLOBAL` — le tool ne rend aucune donnée propre à une marque (référentiel
 *   marché, codes secteur, annuaire de la Guilde). Il reste joignable par une
 *   clé de marque : il n'y a rien à scoper.
 * - `SELF_SCOPED` — le tool rend de la donnée de marque mais **n'a pas** de
 *   `strategyId` en entrée parce qu'il énumère (« quelles marques puis-je
 *   voir ? »). Il lit `__auth` LUI-MÊME et restreint sa propre requête. À
 *   n'employer que là où l'énumération est le sujet ; un test de gouvernance
 *   vérifie que ces tools référencent bien `__auth`.
 *
 * Le marqueur est EXPLICITE de sorte qu'un tool de marque qui oublie
 * `strategyId` reste refusé par défaut — fail-closed conservé.
 */
export type McpToolScope = "BRAND" | "GLOBAL" | "SELF_SCOPED";

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
  /** Voir `McpToolScope`. Absent = BRAND (le défaut sûr). */
  scope?: McpToolScope;
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
  "advertis",
  "advertis-inbound",
  "artemis",
  "council",
  "creative",
  "guild",
  "intelligence",
  "operations",
  "oracle",
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

/** Vrai si le schéma d'entrée du tool déclare un champ `strategyId` (ZodObject). */
function schemaAcceptsStrategyId(schema: z.ZodType): boolean {
  const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
  return !!shape && typeof shape === "object" && "strategyId" in shape;
}

/**
 * ADR-0145 — enforcement FAIL-CLOSED de la portée BRAND au niveau du dispatch
 * (audit 2026-07-16 `mcp-brand-scope-unenforced` : seul amendPillar lisait
 * `__auth` — une clé « limitée à la marque » opérait en réalité n'importe
 * quelle marque, la portée affichée en console était décorative).
 *
 * Règles : clé BRAND sans strategyId de portée → refus ; tool de marque sans
 * champ `strategyId` dans son schéma → refus (pas de scoping possible = pas
 * d'accès) ; `strategyId` client divergent → refus ; absent → injecté depuis la
 * portée. Un tool explicitement `scope: "GLOBAL"` (référentiel marché, annuaire)
 * passe : il ne rend aucune donnée de marque, il n'y a rien à scoper.
 */
function enforceBrandScope(
  tool: McpToolDefinition,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const auth = params.__auth as { scopeKind?: string | null; scopeStrategyId?: string | null } | undefined;
  if (auth?.scopeKind !== "BRAND") return params;
  // GLOBAL = rien à scoper. SELF_SCOPED = le handler scope lui-même sur `__auth`
  // (qui reste dans les params — il est injecté par `scopeMcpParams`).
  if (tool.scope === "GLOBAL" || tool.scope === "SELF_SCOPED") return params;
  const scopeId = auth.scopeStrategyId;
  if (!scopeId) throw new Error("Clé scopée marque sans marque de portée — accès refusé.");
  if (!schemaAcceptsStrategyId(tool.inputSchema)) {
    throw new Error(
      `Le tool ${tool.name} n'est pas scopable par marque — inaccessible avec une clé limitée à une marque.`,
    );
  }
  const requested = params.strategyId;
  if (requested != null && requested !== scopeId) {
    throw new Error("strategyId hors de la portée de la clé — accès refusé.");
  }
  return { ...params, strategyId: scopeId };
}

/**
 * Résout un `strategyId` fourni par l'appelant qui serait en réalité un
 * `publicSlug` (« spawt », « motion19 »).
 *
 * Un agent externe découvre les marques par leur nom, pas par leur identifiant
 * technique : exiger l'id exact obligeait à passer par une recherche sémantique
 * pour déduire un identifiant enfoui dans un digest (audit MCP P1). La résolution
 * se fait AVANT le contrôle de portée — sinon une clé de marque légitime qui
 * passe son propre slug serait refusée pour divergence.
 *
 * Ne fabrique rien : un identifiant inconnu est laissé tel quel, et le tool
 * répondra son `NOT_FOUND` habituel.
 */
async function resolveStrategyRef(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const ref = params.strategyId;
  if (typeof ref !== "string" || ref.length === 0) return params;
  const found = await db.strategy.findFirst({
    where: { OR: [{ id: ref }, { publicSlug: ref }] },
    select: { id: true },
  });
  return found ? { ...params, strategyId: found.id } : params;
}

/** Code d'erreur métier stable, sans détail d'implémentation. */
export class McpToolError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "McpToolError";
  }
}

/**
 * Normalise une exception de handler en erreur d'API.
 *
 * Les exceptions Prisma sont **rendues muettes** : `PrismaClientValidationError`
 * énumère l'intégralité des champs et relations du modèle fautif, et cette
 * énumération partait telle quelle à l'appelant (audit MCP P0 — `getBrandCard`
 * a divulgué les 60+ champs de `Strategy`, dont `llmBudget`, `superfanProfiles`,
 * `strictModeGates`). Le détail reste dans les logs serveur.
 */
function normalizeToolError(err: unknown, serverName: string, toolName: string): McpToolError {
  if (err instanceof McpToolError) return err;
  const raw = err instanceof Error ? err.message : String(err);
  console.error(`[mcp] ${serverName}.${toolName} a échoué :`, err);
  const isOrm =
    /PrismaClient|Unknown field|Unknown arg|Available options|Argument `\w+`|invalid `prisma\./i.test(raw);
  if (isOrm) {
    return new McpToolError(
      "SCHEMA_ERROR",
      `L'outil ${serverName}.${toolName} est en dérive de schéma côté serveur. Le détail est journalisé ; réessayer ne le corrigera pas.`,
    );
  }
  // Les refus de portée sont des messages métier volontaires — on les préserve.
  if (/portée|accès refusé|SCOPE_DENIED/i.test(raw)) return new McpToolError("SCOPE_DENIED", raw);
  return new McpToolError("TOOL_ERROR", raw);
}

export async function dispatchTool(
  serverName: string,
  toolName: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const servers = await loadAllServers();
  const server = servers.find((s) => s.serverName === serverName);
  if (!server) throw new McpToolError("UNKNOWN_SERVER", `Serveur MCP inconnu : ${serverName}`);
  const tool = server.tools.find((t) => t.name === toolName);
  if (!tool) {
    throw new McpToolError(
      "UNKNOWN_TOOL",
      `Outil ${toolName} inconnu sur ${serverName}. Disponibles : ${server.tools.map((t) => t.name).join(", ")}`,
    );
  }
  try {
    const resolved = await resolveStrategyRef(params);
    return await tool.handler(enforceBrandScope(tool, resolved));
  } catch (err) {
    throw normalizeToolError(err, serverName, toolName);
  }
}

export function clearCache(): void {
  cached = null;
}
