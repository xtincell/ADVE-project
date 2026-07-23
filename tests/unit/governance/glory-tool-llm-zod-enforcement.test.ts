/**
 * Phase 21 (ADR-0067) — Glory tool LLM Zod enforcement
 *
 * Invariants verrouillés :
 *
 * 1. Tout `GloryToolDef` avec `executionType: "LLM"` doit déclarer SOIT
 *    `outputSchema` (Zod schema strict) SOIT `_noSchemaJustification` (raison
 *    documentée ≥ 30 char).
 * 2. `_noSchemaJustification` ne peut pas être utilisé pour un tool qui a
 *    déjà `outputSchema` (mutually exclusive).
 * 3. Mode `soft` actuel — le test produit un INVENTAIRE des tools sans
 *    schéma, mais ne fail PAS. À chaque migration tool→outputSchema, on baisse
 *    le baseline ; promotion en mode hard quand baseline=0 (audit complet).
 *
 * Si baseline augmente → drift, fail.
 */

import { describe, expect, it } from "vitest";

const BASELINE_TOOLS_WITHOUT_SCHEMA = 0; // HARD (audit 2026-07-22 : dette réelle = 0, plus de baseline vacant)

describe("ADR-0067 — Glory tool LLM Zod enforcement", () => {
  it("every Glory tool with executionType=LLM declares either outputSchema OR _noSchemaJustification", async () => {
    const { EXTENDED_GLORY_TOOLS } = await import("@/server/services/artemis/tools/registry");
    const llmTools = EXTENDED_GLORY_TOOLS.filter((t) => t.executionType === "LLM");
    const missing = llmTools.filter((t) => !t.outputSchema && !t._noSchemaJustification);
    expect(missing.length).toBeLessThanOrEqual(BASELINE_TOOLS_WITHOUT_SCHEMA);
    if (missing.length > 0 && process.env.DEBUG_ZOD_ENFORCEMENT) {
      console.warn(
        `[ADR-0067] ${missing.length} LLM Glory tools manquent outputSchema:\n` +
          missing.map((t) => `  - ${t.slug}`).join("\n"),
      );
    }
  });

  it("_noSchemaJustification (when present) is a non-empty string ≥ 30 chars", async () => {
    const { EXTENDED_GLORY_TOOLS } = await import("@/server/services/artemis/tools/registry");
    const optouts = EXTENDED_GLORY_TOOLS.filter((t) => t._noSchemaJustification);
    for (const t of optouts) {
      expect(t._noSchemaJustification!.length).toBeGreaterThanOrEqual(30);
    }
  });

  it("outputSchema and _noSchemaJustification are mutually exclusive", async () => {
    const { EXTENDED_GLORY_TOOLS } = await import("@/server/services/artemis/tools/registry");
    const conflict = EXTENDED_GLORY_TOOLS.filter((t) => t.outputSchema && t._noSchemaJustification);
    expect(conflict).toEqual([]);
  });

  it("non-LLM tools (COMPOSE/CALC/MCP/DELEGATE) do NOT use _noSchemaJustification", async () => {
    const { EXTENDED_GLORY_TOOLS } = await import("@/server/services/artemis/tools/registry");
    const misuse = EXTENDED_GLORY_TOOLS.filter(
      (t) => t.executionType !== "LLM" && t._noSchemaJustification,
    );
    expect(misuse).toEqual([]);
  });
});
