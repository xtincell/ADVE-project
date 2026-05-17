/**
 * Phase 23 Epic 1 Story 1.8 — anti-drift scaffold test for
 * `BRIEF_VS_ADVE_COHERENCE` Mestor gate.
 *
 * Mode: SOFT (pending Phase 24 closure-target #14 — flip to HARD when
 * enforcement ships).
 *
 * # What this test enforces
 *
 *   1. The gate file exists at the canonical path and exports the
 *      `briefVsAdveCoherenceGate` function.
 *   2. The canonical `mestorGates` registry (introduced by Story 1.8)
 *      maps `BRIEF_VS_ADVE_COHERENCE` to the SAME function reference
 *      (identity check — prevents two-copies drift across renames).
 *   3. The registry entry's `governor` field is the literal `"MESTOR"`
 *      string (Layer 5 boundary per ADR-0084).
 *   4. Calling the gate with a minimal stub input rejects with an
 *      error whose `message` contains BOTH the literal substrings
 *      `NOT_YET_IMPLEMENTED` and `closure-target #14` — guaranteeing
 *      the scaffold-deferral signal cannot silently drift.
 *
 * # Rationale
 *
 * Story 1.8 ships the typed contract, not the behavior. Phase 24
 * (closure-target #14) ships the LLM-assisted coherence check + the
 * manual-first override surface. Until then, any production code that
 * imports the gate MUST fail fast and loud — this test is the canary.
 *
 * # References
 *
 *   - Phase 23 Story 1.8 spec (epics.md L564-583)
 *   - closure-roadmap target #14 (Phase 24 enforcement scope)
 *   - ADR-0049 (Brief Mandatory Gate — sibling presence layer)
 *   - ADR-0084 (Layer 5 boundary for Services système)
 *   - tests/unit/governance/phase22-connector-result.test.ts — file-shape
 *     assertion pattern reference
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  MESTOR_GATE_KEYS,
  mestorGates,
} from "@/server/services/mestor/gates";
import { briefVsAdveCoherenceGate } from "@/server/services/mestor/gates/brief-vs-adve-coherence";

const REPO_ROOT = path.resolve(__dirname, "../../..");

const GATE_FILE = path.join(
  REPO_ROOT,
  "src/server/services/mestor/gates/brief-vs-adve-coherence.ts",
);
const INDEX_FILE = path.join(
  REPO_ROOT,
  "src/server/services/mestor/gates/index.ts",
);

describe("Phase 23 Story 1.8 — BRIEF_VS_ADVE_COHERENCE scaffold (SOFT)", () => {
  it("gate file exists at the canonical path", () => {
    expect(fs.existsSync(GATE_FILE)).toBe(true);
    expect(fs.existsSync(INDEX_FILE)).toBe(true);
  });

  it("exports briefVsAdveCoherenceGate from the gate file", () => {
    // Runtime import already happened at the top of this file. If the
    // symbol did not exist or had been renamed, the import statement
    // itself would have failed before any test ran.
    expect(typeof briefVsAdveCoherenceGate).toBe("function");
  });

  it("registers the gate in mestorGates under the canonical key", () => {
    expect(MESTOR_GATE_KEYS).toContain("BRIEF_VS_ADVE_COHERENCE");
    expect(mestorGates).toHaveProperty("BRIEF_VS_ADVE_COHERENCE");
  });

  it("registry handler is the SAME reference as the exported gate (identity)", () => {
    // Identity check — guarantees the registry is not silently holding
    // a copy / wrapper / re-bound reference that could drift on rename.
    expect(mestorGates.BRIEF_VS_ADVE_COHERENCE.handler).toBe(
      briefVsAdveCoherenceGate,
    );
  });

  it("registry entry declares governor === \"MESTOR\" (ADR-0084 Layer 5)", () => {
    expect(mestorGates.BRIEF_VS_ADVE_COHERENCE.governor).toBe("MESTOR");
  });

  it("calling the gate rejects with NOT_YET_IMPLEMENTED + closure-target #14", async () => {
    await expect(
      briefVsAdveCoherenceGate(
        { strategyId: "test-strategy", brief: { content: "" } },
        {},
      ),
    ).rejects.toThrow(/NOT_YET_IMPLEMENTED/);

    await expect(
      briefVsAdveCoherenceGate(
        { strategyId: "test-strategy", brief: { content: "" } },
        {},
      ),
    ).rejects.toThrow(/closure-target #14/);
  });
});
