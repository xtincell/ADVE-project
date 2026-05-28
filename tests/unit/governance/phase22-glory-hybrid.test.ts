/**
 * Phase 23 Pattern P22-3 — Glory tool HYBRID executionType + manualFormSchema.
 *
 * Activated **HARD** in Epic 5 Story 5.6 against the 5 migrated phase19-tools.
 * Scaffolded at baseline per Epic 1 Story 1.7.
 *
 * Asserts :
 *   1. The 5 measurement Glory tools (`big-idea-coherence-checker`,
 *      `myth-arc-cohesion-evaluator`, `crew-performance-evaluator`,
 *      `negative-space-auditor`, `mcp-content-pii-classifier`) have
 *      `executionType: "HYBRID"`.
 *   2. Each carries a `manualFormSchema` whose Zod shape structurally equals
 *      its `outputSchema` (the `outputFormat` string label is a human tag — the
 *      machine contract is `outputSchema`). `defineHybridTool` guarantees this by
 *      reusing the same Zod reference ; the test verifies both reference identity
 *      and JSON-Schema structural equality so a future author who sets them apart
 *      is caught.
 *   3. Each has a non-empty `applicableNatures: BrandNature[]` array (N6-bis closure).
 *   4. Forbidden-otherwise : no non-HYBRID tool carries a `manualFormSchema`.
 *   5. Mode HARD — no baseline, any violation fails CI.
 *
 * Cf. ADR-0077 §"7 patterns" P22-3, architecture D7, Epic 5 Stories 5.1-5.4.
 */

import { describe, it, expect } from "vitest";
import { EXTENDED_GLORY_TOOLS, getGloryTool } from "@/server/services/artemis/tools/registry";
import { deriveJsonSchemaFromZod } from "@/server/services/utils/zod-to-json-schema";

const MIGRATED_SLUGS = [
  "big-idea-coherence-checker",
  "myth-arc-cohesion-evaluator",
  "crew-performance-evaluator",
  "negative-space-auditor",
  "mcp-content-pii-classifier",
] as const;

describe("Phase 23 P22-3 — Glory tool HYBRID + manualFormSchema parity (HARD)", () => {
  it.each(MIGRATED_SLUGS)("%s is executionType: HYBRID", (slug) => {
    const tool = getGloryTool(slug);
    expect(tool, `tool ${slug} introuvable`).toBeDefined();
    expect(tool!.executionType).toBe("HYBRID");
  });

  it.each(MIGRATED_SLUGS)("%s manualFormSchema structurally equals outputSchema", (slug) => {
    const tool = getGloryTool(slug)!;
    expect(tool.outputSchema, `${slug} sans outputSchema`).toBeDefined();
    expect(tool.manualFormSchema, `${slug} sans manualFormSchema`).toBeDefined();
    // defineHybridTool reuses the same reference — strongest parity guarantee.
    expect(tool.manualFormSchema).toBe(tool.outputSchema);
    // Structural check (JSON-Schema deep equality) — independent of reference.
    const manualJson = deriveJsonSchemaFromZod(tool.manualFormSchema!);
    const outputJson = deriveJsonSchemaFromZod(tool.outputSchema!);
    expect(manualJson).toEqual(outputJson);
  });

  it.each(MIGRATED_SLUGS)("%s has non-empty applicableNatures (N6-bis closure)", (slug) => {
    const tool = getGloryTool(slug)!;
    expect(Array.isArray(tool.applicableNatures)).toBe(true);
    expect(tool.applicableNatures!.length).toBeGreaterThan(0);
  });

  it("manualFormSchema is forbidden on every non-HYBRID tool", () => {
    const offenders = EXTENDED_GLORY_TOOLS.filter(
      (t) => t.executionType !== "HYBRID" && t.manualFormSchema !== undefined,
    ).map((t) => t.slug);
    expect(offenders, `non-HYBRID tools carrying manualFormSchema: ${offenders.join(", ")}`).toEqual([]);
  });

  it("every HYBRID tool has manualFormSchema + outputSchema + non-empty applicableNatures", () => {
    const hybrids = EXTENDED_GLORY_TOOLS.filter((t) => t.executionType === "HYBRID");
    expect(hybrids.length).toBeGreaterThanOrEqual(MIGRATED_SLUGS.length);
    for (const t of hybrids) {
      expect(t.manualFormSchema, `${t.slug} HYBRID sans manualFormSchema`).toBeDefined();
      expect(t.outputSchema, `${t.slug} HYBRID sans outputSchema`).toBeDefined();
      expect(
        Array.isArray(t.applicableNatures) && t.applicableNatures.length > 0,
        `${t.slug} HYBRID sans applicableNatures`,
      ).toBe(true);
    }
  });
});
