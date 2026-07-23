/**
 * Phase 21 (ADR-0067) — Framework output schema enforcement
 *
 * Invariants verrouillés sur les 24 frameworks Artemis :
 *
 * 1. Chaque framework doit déclarer SOIT `outputSchema` SOIT
 *    `_noSchemaJustification` (≥ 30 char).
 * 2. Mode `soft` actuel — produit un inventaire, ne fail pas. Baseline
 *    régressé à chaque framework migré ; promotion hard quand 0.
 *
 * Si baseline augmente → drift narratif, fail.
 */

import { describe, expect, it } from "vitest";

const BASELINE_FRAMEWORKS_WITHOUT_SCHEMA = 0; // HARD (audit 2026-07-22 : dette réelle = 0)

describe("ADR-0067 — Framework output schema enforcement", () => {
  it("every framework declares either outputSchema OR _noSchemaJustification", async () => {
    const { FRAMEWORKS } = await import("@/server/services/artemis/frameworks");
    const missing = FRAMEWORKS.filter((fw) => !fw.outputSchema && !fw._noSchemaJustification);
    expect(missing.length).toBeLessThanOrEqual(BASELINE_FRAMEWORKS_WITHOUT_SCHEMA);
    if (missing.length > 0 && process.env.DEBUG_ZOD_ENFORCEMENT) {
      console.warn(
        `[ADR-0067] ${missing.length} frameworks manquent outputSchema:\n` +
          missing.map((f) => `  - ${f.slug} (${f.layer})`).join("\n"),
      );
    }
  });

  it("_noSchemaJustification (when present) is ≥ 30 chars", async () => {
    const { FRAMEWORKS } = await import("@/server/services/artemis/frameworks");
    const optouts = FRAMEWORKS.filter((f) => f._noSchemaJustification);
    for (const fw of optouts) {
      expect(fw._noSchemaJustification!.length).toBeGreaterThanOrEqual(30);
    }
  });

  it("outputSchema and _noSchemaJustification are mutually exclusive", async () => {
    const { FRAMEWORKS } = await import("@/server/services/artemis/frameworks");
    const conflict = FRAMEWORKS.filter((f) => f.outputSchema && f._noSchemaJustification);
    expect(conflict).toEqual([]);
  });
});
