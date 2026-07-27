/**
 * ANUBIS — registre CURÉ des tools MCP exposés directement dans `tools/list`
 * du transport JSON-RPC (ADR-0182). Module FEUILLE volontaire (zéro import
 * lourd — ni `next/server`, ni le SDK MCP) : consommable par le transport ET
 * par les tests gouvernance (scan de source) sans tirer toute la chaîne HTTP.
 *
 * ~100 tools bruts noieraient un client — on expose un sous-ensemble
 * haute-valeur ; la longue traîne reste joignable via `lafusee_invoke`.
 */

export const CURATED_MCP_TOOLS: Array<{ server: string; tool: string }> = [
  // Découverte — À APPELER EN PREMIER. Tous les autres outils exigent un
  // strategyId ; jusqu'au 2026-07-27 aucun outil ne permettait de l'obtenir,
  // et il fallait le déduire d'un digest via la recherche sémantique.
  { server: "advertis", tool: "listStrategies" },
  // La stratégie ADVE-RTIS
  { server: "advertis", tool: "getBrandCard" },
  { server: "advertis", tool: "getAdveRtis" },
  { server: "advertis", tool: "getPillarContent" },
  { server: "advertis", tool: "amendPillar" },
  // Le livrable Oracle
  { server: "oracle", tool: "list_sections" },
  { server: "oracle", tool: "get_section" },
  { server: "oracle", tool: "snapshot" },
  // Le conseil de marque
  { server: "council", tool: "ask" },
  { server: "council", tool: "deliberate" },
  // Renseignement + recherche
  { server: "intelligence", tool: "rag_search" },
  { server: "intelligence", tool: "knowledge_graph_query" },
  // Mécaniques pivot (superfans / communauté)
  { server: "pulse", tool: "cult_index_calculate" },
  { server: "pulse", tool: "devotion_ladder_snapshot" },
  { server: "pulse", tool: "community_health" },
  // Marché
  { server: "seshat", tool: "market_context_get" },
  { server: "seshat", tool: "benchmark_search" },
  // L'activité réelle — campagnes en cours et calendrier digital
  { server: "operations", tool: "campaign_list" },
  { server: "operations", tool: "campaign_state_get" },
  { server: "operations", tool: "campaign_budget_overview" },
  { server: "operations", tool: "mission_list" },
  { server: "operations", tool: "milestone_track" },
  { server: "creative", tool: "content_calendar_get" },
];

/** Regex de nom MCP (pas de points — `${server}_${tool}`). */
export const MCP_TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,128}$/;

/** Nom MCP plat pour un couple {server, tool}. */
export function mcpToolName(server: string, tool: string): string {
  return `${server}_${tool}`;
}
