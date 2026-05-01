/**
 * Phase 13 — Oracle Glory tools completeness (B2, ADR-0014).
 *
 * Verrouille :
 * 1. Les 7 tools Phase 13 sont déclarés et atteignables via getGloryTool()
 * 2. Le mapping forgeOutput est cohérent (3 tools forgeOutput pour boutons B8 :
 *    bcg-portfolio-plotter (design Figma), mckinsey-3-horizons-mapper (design Figma),
 *    creative-evaluation-matrix étendu (image Banana))
 * 3. manipulationProfile déclaré pour les 3 forgeOutput (gate MANIPULATION_COHERENCE
 *    enforced par ptah/governance.ts)
 * 4. Les 3 tools Big4 distincts (cult-index-scorer, tarsis-signal-detector) NE
 *    déclarent PAS forgeOutput (analyse pure, pas matérialisation)
 *
 * Si ce test échoue → drift Phase 13 tools. STOP, retour Phase 2 NEFER.
 */

import { describe, expect, it } from "vitest";
import {
  getGloryTool,
  CORE_GLORY_TOOLS,
  type GloryToolDef,
} from "@/server/services/artemis/tools/registry";
import { PHASE13_ORACLE_TOOLS } from "@/server/services/artemis/tools/phase13-oracle-tools";

describe("Phase 13 Oracle Glory tools completeness (B2)", () => {
  const PHASE13_SLUGS = [
    "mckinsey-7s-analyzer",
    "bcg-portfolio-plotter",
    "mckinsey-3-horizons-mapper",
    "overton-window-mapper",
    "cult-index-scorer",
    "bain-nps-calculator",
    "tarsis-signal-detector",
  ] as const;

  it("declares 7 Phase 13 tools", () => {
    expect(PHASE13_ORACLE_TOOLS).toHaveLength(7);
    const slugs = PHASE13_ORACLE_TOOLS.map((t) => t.slug);
    for (const expected of PHASE13_SLUGS) {
      expect(slugs).toContain(expected);
    }
  });

  it("integrates Phase 13 tools into CORE_GLORY_TOOLS", () => {
    for (const slug of PHASE13_SLUGS) {
      expect(CORE_GLORY_TOOLS.find((t) => t.slug === slug), `${slug} missing from CORE_GLORY_TOOLS`).toBeDefined();
    }
  });

  it("makes Phase 13 tools resolvable via getGloryTool()", () => {
    for (const slug of PHASE13_SLUGS) {
      expect(getGloryTool(slug), `getGloryTool('${slug}') should resolve`).toBeDefined();
    }
  });

  describe("forgeOutput declarations (Phase 13 forge buttons B8)", () => {
    it("bcg-portfolio-plotter declares design/Figma forgeOutput", () => {
      const tool = getGloryTool("bcg-portfolio-plotter") as GloryToolDef;
      expect(tool.forgeOutput).toBeDefined();
      expect(tool.forgeOutput?.forgeKind).toBe("design");
      expect(tool.forgeOutput?.providerHint).toBe("figma");
      expect(tool.forgeOutput?.manipulationProfile).toBeDefined();
      expect(tool.forgeOutput?.manipulationProfile?.length).toBeGreaterThan(0);
    });

    it("mckinsey-3-horizons-mapper declares design/Figma forgeOutput", () => {
      const tool = getGloryTool("mckinsey-3-horizons-mapper") as GloryToolDef;
      expect(tool.forgeOutput).toBeDefined();
      expect(tool.forgeOutput?.forgeKind).toBe("design");
      expect(tool.forgeOutput?.providerHint).toBe("figma");
      expect(tool.forgeOutput?.manipulationProfile).toBeDefined();
    });

    it("creative-evaluation-matrix (extended B2) declares image/Banana forgeOutput for Manipulation Matrix viz", () => {
      const tool = getGloryTool("creative-evaluation-matrix") as GloryToolDef;
      expect(tool.forgeOutput).toBeDefined();
      expect(tool.forgeOutput?.forgeKind).toBe("image");
      expect(tool.forgeOutput?.providerHint).toBe("magnific");
      expect(tool.forgeOutput?.modelHint).toBe("nano-banana-pro");
      expect(tool.forgeOutput?.manipulationProfile).toEqual(
        expect.arrayContaining(["peddler", "dealer", "facilitator", "entertainer"]),
      );
    });

    it("analytical-only tools do NOT declare forgeOutput (no premature materialization)", () => {
      const noForgeTools = ["mckinsey-7s-analyzer", "overton-window-mapper", "cult-index-scorer", "bain-nps-calculator", "tarsis-signal-detector"];
      for (const slug of noForgeTools) {
        const tool = getGloryTool(slug) as GloryToolDef;
        expect(tool.forgeOutput, `${slug} should NOT have forgeOutput`).toBeUndefined();
      }
    });
  });

  describe("Anti-doublon NEFER §3 — réutilisation services existants", () => {
    it("cult-index-scorer description references cult-index-engine SESHAT", () => {
      const tool = getGloryTool("cult-index-scorer") as GloryToolDef;
      expect(tool.description.toLowerCase()).toMatch(/cult-?index/);
      expect(tool.promptTemplate.toLowerCase()).toMatch(/cult-?index|seshat/);
    });

    it("tarsis-signal-detector description references seshat/tarsis", () => {
      const tool = getGloryTool("tarsis-signal-detector") as GloryToolDef;
      expect(tool.description.toLowerCase()).toMatch(/tarsis/);
      expect(tool.promptTemplate.toLowerCase()).toMatch(/tarsis|seshat/);
    });
  });

  describe("Layer & execution type cohérence", () => {
    it("7 DC layer tools (Direction de Création — analyses stratégiques, pas visual identity)", () => {
      const dcTools = PHASE13_ORACLE_TOOLS.filter((t) => t.layer === "DC");
      expect(dcTools).toHaveLength(7);
    });

    it("0 BRAND layer tools (réservé au visual identity pipeline legacy 10 tools terminant par brand-guidelines-generator)", () => {
      const brandTools = PHASE13_ORACLE_TOOLS.filter((t) => t.layer === "BRAND");
      expect(brandTools).toHaveLength(0);
    });

    it("all 7 tools have unique slugs and orders", () => {
      const slugs = PHASE13_ORACLE_TOOLS.map((t) => t.slug);
      const orders = PHASE13_ORACLE_TOOLS.map((t) => t.order);
      expect(new Set(slugs).size).toBe(7);
      expect(new Set(orders).size).toBe(7);
    });

    it("all 7 tools have ACTIVE status (not PLANNED)", () => {
      for (const tool of PHASE13_ORACLE_TOOLS) {
        expect(tool.status, `${tool.slug} should be ACTIVE`).toBe("ACTIVE");
      }
    });
  });
});
