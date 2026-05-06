/**
 * Anti-drift CI test — auto-promotion module (ADR-0054).
 *
 * Verrouille les invariants du module auto-promotion :
 *   1. Conditions ADR-0040+0041+0042 strictement encodées (temps + cycle + qualité)
 *   2. Default mode quality-gate = SOFT
 *   3. Anchor dates correspondent aux ADRs (mégasprint Phase 17a 2026-05-04)
 *   4. Thresholds canoniques (50 exec, 1.0 pass rate, 1% fp rate)
 *
 * NEFER §3 interdit n°2 — pas de bypass governance. Le module ne doit
 * JAMAIS forcer une promotion en dehors des fenêtres calendaires.
 */

import { describe, it, expect } from "vitest";
import {
  ANCHOR_DATES,
  ELIGIBILITY_WINDOWS,
  CYCLE_THRESHOLDS,
} from "@/server/services/auto-promotion/types";

describe("auto-promotion — anti-drift conditions strictes", () => {
  // ── §1 — Anchor dates correspondent aux ADRs ───────────────────────

  it("ANCHOR_DATES.PHASE_17A_MEGASPRINT_MERGE = 2026-05-04 (ADR-0040)", () => {
    expect(ANCHOR_DATES.PHASE_17A_MEGASPRINT_MERGE).toBe("2026-05-04T00:00:00Z");
  });

  // ── §2 — Eligibility windows correspondent aux ADRs ─────────────────

  it("SEQUENCE_DRAFT_TO_STABLE_DAYS = 30 (ADR-0040 §Conséquences)", () => {
    expect(ELIGIBILITY_WINDOWS.SEQUENCE_DRAFT_TO_STABLE_DAYS).toBe(30);
  });

  it("WRAPPER_DRAFT_TO_STABLE_DAYS = 30 (ADR-0039 §3)", () => {
    expect(ELIGIBILITY_WINDOWS.WRAPPER_DRAFT_TO_STABLE_DAYS).toBe(30);
  });

  it("QUALITY_GATE_SOFT_TO_HARD_DAYS = 7 (ADR-0041 §4)", () => {
    expect(ELIGIBILITY_WINDOWS.QUALITY_GATE_SOFT_TO_HARD_DAYS).toBe(7);
  });

  // ── §3 — Cycle thresholds ──────────────────────────────────────────

  it("SEQUENCE_MIN_EXECUTIONS = 50 (ADR-0040 §Conséquences)", () => {
    expect(CYCLE_THRESHOLDS.SEQUENCE_MIN_EXECUTIONS).toBe(50);
  });

  it("SEQUENCE_MIN_QUALITY_PASS_RATE = 1.0 (100%, strict)", () => {
    expect(CYCLE_THRESHOLDS.SEQUENCE_MIN_QUALITY_PASS_RATE).toBe(1.0);
  });

  it("QUALITY_GATE_MAX_FALSE_POSITIVE_RATE = 0.01 (1%, ADR-0041 §4)", () => {
    expect(CYCLE_THRESHOLDS.QUALITY_GATE_MAX_FALSE_POSITIVE_RATE).toBe(0.01);
  });

  it("SEQUENCE_QUALITY_WINDOW_DAYS = 7 (cohérent avec soft-mode 1 semaine)", () => {
    expect(CYCLE_THRESHOLDS.SEQUENCE_QUALITY_WINDOW_DAYS).toBe(7);
  });

  // ── §4 — Eligibility logic refuse les promotions trop tôt ──────────

  it("evaluateSequencePromotion refuse si lifecycle !== DRAFT", async () => {
    const { evaluateSequencePromotion } = await import("@/server/services/auto-promotion/eligibility");
    // Test sequence inexistante (lifecycle === "UNKNOWN")
    const result = await evaluateSequencePromotion("__TEST_NONEXISTENT__");
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes("UNKNOWN") || r.includes("STABLE"))).toBe(true);
  });
});
