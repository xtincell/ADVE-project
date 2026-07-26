/**
 * ADR-0182 — transport MCP réel + tools contenu complet : verrous.
 *
 * 1. Le registre curé est bien formé (noms MCP valides, chaque {server,tool}
 *    existe réellement dans les modules chargés).
 * 2. Le transport préserve scoping + metering (dispatchTool + meterMcp).
 * 3. getPillarContent renvoie le contenu COMPLET (fin de la troncature 280c).
 * 4. knowledge_graph_query utilise enfin input.query (fin de la confusion
 *    sector/strategyId).
 * 5. Les 2 nouveaux serveurs (oracle, council) sont enregistrés.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CURATED_MCP_TOOLS, mcpToolName } from "@/server/services/anubis/mcp-curated";
import { loadAllServers } from "@/server/services/anubis/mcp-server";

const ROOT = process.cwd();
const src = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,128}$/;

describe("ADR-0182 — registre curé bien formé", () => {
  it("chaque nom MCP plat respecte la regex MCP (pas de points)", () => {
    for (const { server, tool } of CURATED_MCP_TOOLS) {
      expect(mcpToolName(server, tool)).toMatch(TOOL_NAME_RE);
    }
  });

  it("chaque {server, tool} curé existe réellement dans les modules chargés", async () => {
    const servers = await loadAllServers();
    const byName = new Map(servers.map((s) => [s.serverName, new Set(s.tools.map((t) => t.name))]));
    for (const { server, tool } of CURATED_MCP_TOOLS) {
      expect(byName.has(server), `serveur ${server} chargé`).toBe(true);
      expect(byName.get(server)!.has(tool), `${server}.${tool} existe`).toBe(true);
    }
  });
});

describe("ADR-0182 — scoping + metering préservés par le transport", () => {
  it("handleMcpRequest passe par dispatchTool ET meterMcp (jamais un handler nu)", () => {
    const s = src("src/server/services/anubis/mcp-transport.ts");
    expect(s).toContain("dispatchTool(");
    expect(s).toContain("meterMcp(");
    // Le scoping de portée est appliqué (fail-closed BRAND).
    expect(s).toContain("scopeParamsForTool(");
    expect(s).toMatch(/SCOPE_DENIED/);
  });

  it("mode stateless (pas de session serveur en mémoire — sûr multi-process)", () => {
    const s = src("src/server/services/anubis/mcp-transport.ts");
    expect(s).toMatch(/sessionIdGenerator:\s*undefined/);
    expect(s).toMatch(/enableJsonResponse:\s*true/);
  });
});

describe("ADR-0182 — les 2 nouveaux serveurs sont enregistrés", () => {
  it("MCP_SERVER_NAMES contient oracle + council", async () => {
    const servers = await loadAllServers();
    const names = servers.map((s) => s.serverName);
    expect(names).toContain("oracle");
    expect(names).toContain("council");
  });

  it("les modules oracle + council exportent des tools", async () => {
    const servers = await loadAllServers();
    const oracle = servers.find((s) => s.serverName === "oracle");
    const council = servers.find((s) => s.serverName === "council");
    expect(oracle?.tools.map((t) => t.name)).toEqual(
      expect.arrayContaining(["list_sections", "get_section", "snapshot"]),
    );
    expect(council?.tools.map((t) => t.name)).toEqual(expect.arrayContaining(["ask", "deliberate"]));
  });
});

describe("ADR-0182 — contenu complet + fix knowledge_graph_query", () => {
  it("advertis.getPillarContent renvoie content intégral (pas pillarHeadline)", () => {
    const s = src("src/server/mcp/advertis/index.ts");
    // Le nouveau tool existe et renvoie `content` brut, pas un headline tronqué.
    expect(s).toMatch(/name:\s*"getPillarContent"/);
    const block = s.slice(s.indexOf('name: "getPillarContent"'));
    expect(block).toMatch(/content, \/\/ ← intégral/);
  });

  it("knowledge_graph_query référence input.query (fin de la confusion sector/strategyId)", () => {
    const s = src("src/server/mcp/intelligence/index.ts");
    const block = s.slice(s.indexOf('name: "knowledge_graph_query"'), s.indexOf('name: "rag_search"'));
    // La query est réellement consommée (ranking mots-clés)…
    expect(block).toMatch(/input\.query/);
    // …et le filtre strategyId ne passe PLUS par `sector: input.strategyId`.
    expect(block).not.toMatch(/sector:\s*input\.strategyId/);
  });

  it("intelligence.rag_search dégrade honnêtement (usedVectorSearch)", () => {
    const s = src("src/server/mcp/intelligence/index.ts");
    expect(s).toMatch(/name:\s*"rag_search"/);
    expect(s).toContain("usedVectorSearch");
    expect(s).toContain("topKWithinStrategy");
  });
});
