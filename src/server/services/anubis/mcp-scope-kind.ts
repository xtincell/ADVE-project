/**
 * Normalisation FAIL-CLOSED de la portée d'une clé MCP.
 */
/**
 * Normalise le `scopeKind` d'une clé/jeton en FAIL-CLOSED.
 *
 * `scopeKind` est une colonne `String` libre (pas un enum Prisma) avec
 * `@default("SYSTEM")`. La normalisation historique était
 * `x === "BRAND" ? "BRAND" : "SYSTEM"` : **toute** valeur inattendue —
 * `"brand"`, `" BRAND"`, `""`, une valeur nulle laissée par un import ou une
 * migration — devenait SYSTEM, c'est-à-dire **portée globale sur toutes les
 * marques**. Le défaut sûr est l'inverse : ce qu'on ne reconnaît pas est traité
 * comme scopé, et sans marque de portée `enforceBrandScope` refuse.
 *
 * Seul `"SYSTEM"` exact donne la portée globale (relecture adversariale
 * 2026-07-27).
 */
export function normalizeScopeKind(raw: unknown): "BRAND" | "SYSTEM" {
  return raw === "SYSTEM" ? "SYSTEM" : "BRAND";
}

/** ADMIN/OAuth have no server restriction; API keys retain their stored server. */
export function isMcpServerAllowed(scopeServer: string | undefined, server: string): boolean {
  return scopeServer === undefined || scopeServer === "*" || scopeServer === server;
}

/**
 * Serveurs MCP agrégés par `loadAllServers` (tools/list, catalogue, dispatch). Liste
 * unique : elle était dupliquée en dur dans la console des clés, sans `council` ni
 * `oracle` — une clé limitée à l'un de ces serveurs ne pouvait pas y être émise.
 *
 * Notoria expose des `resources` (read-only), pas des `tools` callable — elle est
 * exclue de l'agrégateur tools.
 */
export const MCP_SERVER_NAMES = [
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

/**
 * Portées serveur qu'une clé peut porter et que l'authentification honore :
 * « * » (tous les serveurs), un serveur MCP agrégé, ou `ingest` (ingestion de
 * métriques externes, ADR-0146 — route `/api/ingest/metrics`).
 */
export const MCP_KEY_SERVER_SCOPES = ["*", ...MCP_SERVER_NAMES, "ingest"] as const;
