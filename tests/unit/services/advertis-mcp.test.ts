import { describe, it, expect } from "vitest";
import { z } from "zod";
import { serverName, serverDescription, tools } from "@/server/mcp/advertis";

describe("ADR-0142 — MCP Advertis (outbound) : expose une marque à un agent", () => {
  it("s'identifie comme le serveur 'advertis'", () => {
    expect(serverName).toBe("advertis");
    expect(serverDescription).toMatch(/ADVE-RTIS/);
  });

  it("expose la stratégie ADVE-RTIS (carte + 8 piliers), PAS le domaine superfan", () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain("getBrandCard");
    expect(names).toContain("getAdveRtis");
    // Frontière de domaine : le suivi superfan (AARRR) et Overton NE sont PAS ici.
    expect(names).not.toContain("getAarrrBehaviors");
    expect(names).not.toContain("getEngagementLadder");
  });

  it("chaque tool est scopé à strategyId (strategyId requis)", () => {
    // Entrée valide complète : les tools de LECTURE n'ont besoin que de
    // strategyId (les clés en trop sont strippées par Zod) ; le tool d'ÉCRITURE
    // amendPillar exige aussi pillarKey/field/proposedValue/reason.
    const full = { strategyId: "s1", pillarKey: "A", field: "nomMarque", proposedValue: "x", reason: "raison suffisante pour le test" };
    const noStrategy = { pillarKey: "A", field: "nomMarque", proposedValue: "x", reason: "raison suffisante pour le test" };
    for (const t of tools) {
      expect(t.inputSchema).toBeInstanceOf(z.ZodType);
      // Une entrée valide complète passe pour tout tool.
      expect((t.inputSchema as z.ZodType).safeParse(full).success).toBe(true);
      // strategyId est REQUIS partout (scopage par marque).
      expect((t.inputSchema as z.ZodType).safeParse(noStrategy).success).toBe(false);
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
