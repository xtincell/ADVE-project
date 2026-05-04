import { describe, it, expect } from "vitest";
import {
  EXTENDED_GLORY_TOOLS,
  ALL_GLORY_TOOLS,
  getGloryTool,
} from "@/server/services/artemis/tools/registry";
import {
  HIGGSFIELD_TOOLS,
  HIGGSFIELD_DOP_TOOL,
  HIGGSFIELD_SOUL_TOOL,
  HIGGSFIELD_STEAL_TOOL,
} from "@/server/services/artemis/tools/higgsfield-tools";

describe("Higgsfield Glory tools (Phase 16-B, ADR-0028)", () => {
  it("expose 3 tools : DoP, Soul, Steal", () => {
    expect(HIGGSFIELD_TOOLS).toHaveLength(3);
    const slugs = HIGGSFIELD_TOOLS.map((t) => t.slug).sort();
    expect(slugs).toEqual([
      "higgsfield-dop-camera-motion",
      "higgsfield-soul-portrait",
      "higgsfield-steal-style-transfer",
    ]);
  });

  it("tous les Higgsfield tools sont MCP-backed", () => {
    for (const t of HIGGSFIELD_TOOLS) {
      expect(t.executionType).toBe("MCP");
      expect(t.mcpDescriptor).toBeDefined();
      expect(t.mcpDescriptor?.serverName).toBe("higgsfield");
      expect(t.mcpDescriptor?.toolName).toMatch(/_generate$/);
    }
  });

  it("tous les Higgsfield tools sont gated paid tier", () => {
    for (const t of HIGGSFIELD_TOOLS) {
      expect(t.requiresPaidTier).toBe(true);
    }
  });

  it("Higgsfield tools sont dans EXTENDED_GLORY_TOOLS (pas CORE — préserve cardinalité 56)", () => {
    expect(ALL_GLORY_TOOLS).toHaveLength(56); // CORE inchangé (test legacy)
    for (const t of HIGGSFIELD_TOOLS) {
      expect(EXTENDED_GLORY_TOOLS).toContainEqual(t);
      expect(ALL_GLORY_TOOLS).not.toContainEqual(t);
    }
  });

  it("getGloryTool resolve les Higgsfield slugs (lookup runtime via EXTENDED)", () => {
    expect(getGloryTool("higgsfield-dop-camera-motion")).toBe(HIGGSFIELD_DOP_TOOL);
    expect(getGloryTool("higgsfield-soul-portrait")).toBe(HIGGSFIELD_SOUL_TOOL);
    expect(getGloryTool("higgsfield-steal-style-transfer")).toBe(HIGGSFIELD_STEAL_TOOL);
  });

  it("DoP tool a paramMap qui mappe duration_seconds → duration", () => {
    expect(HIGGSFIELD_DOP_TOOL.mcpDescriptor?.paramMap).toBeDefined();
    expect(HIGGSFIELD_DOP_TOOL.mcpDescriptor?.paramMap?.duration_seconds).toBe("duration");
    expect(HIGGSFIELD_DOP_TOOL.mcpDescriptor?.paramMap?.camera_motion).toBe("motion_preset");
  });

  it("Soul tool est layer BRAND, pillarKeys A/D", () => {
    expect(HIGGSFIELD_SOUL_TOOL.layer).toBe("BRAND");
    expect(HIGGSFIELD_SOUL_TOOL.pillarKeys).toEqual(expect.arrayContaining(["A", "D"]));
  });
});
