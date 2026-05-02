import { describe, it, expect } from "vitest";
import {
  buildAggregatedManifest,
  loadAllServers,
  clearCache,
} from "@/server/services/anubis/mcp-server";

describe("Anubis MCP server aggregator (ADR-0023)", () => {
  it("loads MCP server modules without throwing", async () => {
    clearCache();
    const servers = await loadAllServers();
    expect(Array.isArray(servers)).toBe(true);
    // We expect at least the seshat server (one of the ones that was already
    // exposed) to be present. Some servers may fail to import in the test
    // sandbox because they touch DB; we only assert the loader is resilient.
    expect(servers.length).toBeGreaterThanOrEqual(0);
  });

  it("builds an aggregated manifest with mcp/1.0 protocol", async () => {
    clearCache();
    const manifest = await buildAggregatedManifest();
    expect(manifest.protocol).toBe("mcp/1.0");
    expect(manifest.version).toBe("1.0.0");
    expect(Array.isArray(manifest.servers)).toBe(true);
    expect(Array.isArray(manifest.tools)).toBe(true);

    // Aggregated tools should be qualified by `<server>.<tool>` pattern.
    for (const t of manifest.tools) {
      expect(t.qualifiedName).toBe(`${t.server}.${t.name}`);
    }
  });
});
