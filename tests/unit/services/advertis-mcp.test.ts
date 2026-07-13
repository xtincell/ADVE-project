import { describe, it, expect } from "vitest";
import { z } from "zod";
import { serverName, serverDescription, tools } from "@/server/mcp/advertis";

describe("ADR-0142 — MCP Advertis (outbound) : expose une marque à un agent", () => {
  it("s'identifie comme le serveur 'advertis'", () => {
    expect(serverName).toBe("advertis");
    expect(serverDescription).toMatch(/AARRR/);
  });

  it("expose la carte marque, les comportements AARRR et l'échelle d'engagement", () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain("getBrandCard");
    expect(names).toContain("getAarrrBehaviors");
    expect(names).toContain("getEngagementLadder");
  });

  it("chaque tool est scopé à strategyId (lecture par marque)", () => {
    for (const t of tools) {
      expect(t.inputSchema).toBeInstanceOf(z.ZodType);
      const parsed = (t.inputSchema as z.ZodType).safeParse({ strategyId: "s1" });
      expect(parsed.success).toBe(true);
      const missing = (t.inputSchema as z.ZodType).safeParse({});
      expect(missing.success).toBe(false);
    }
  });

  it("est enregistré dans l'agrégateur MCP (découvrable + billable)", async () => {
    const mod = await import("@/server/services/anubis/mcp-server");
    const src = (await import("node:fs")).readFileSync(
      "src/server/services/anubis/mcp-server.ts",
      "utf8",
    );
    expect(src).toContain('"advertis"');
    expect(typeof mod.buildAggregatedManifest).toBe("function");
  });
});
