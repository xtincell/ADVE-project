/**
 * Phase 23 Pattern P22-2 — INSUFFICIENT_DATA first-class branch, no silent zero.
 *
 * Activated **HARD** in Epic 3 Story 3.8 (Overton paths) and extended in Epic 4
 * Story 4.8 (Superfan paths). Scaffolded here at baseline per Epic 1 Story 1.7.
 *
 * When activated, this test asserts :
 *   1. No `?? 0` / `|| 0` AST patterns on score / shift / readiness / delta
 *      identifiers in Phase 23 measurement modules.
 *   2. Every measurement handler returns a discriminated union with both an
 *      `OK` and an `INSUFFICIENT_DATA` branch — no boolean / nullable score
 *      return type.
 *   3. Mode HARD.
 *
 * Scope when activated :
 *   - `services/campaign-tracker/signals-culture.ts`
 *   - `services/sector-intelligence/`
 *   - `services/campaign-tracker/culture/*`
 *   - `services/campaign-tracker/superfan-attribution.ts`
 *   - `services/campaign-tracker/superfan-economy.ts`
 *
 * Cf. ADR-0081 §2 (AttributionResult), ADR-0046 (no-magic-fallback), architecture P22-2.
 */

import { describe, it } from "vitest";

describe("Phase 23 P22-2 — INSUFFICIENT_DATA first-class, no silent zero", () => {
  it.todo("activated Epic 3 Story 3.8 — no ?? 0 / || 0 on Overton score fields");
  it.todo("activated Epic 4 Story 4.8 — extended to Superfan score fields");
  it.todo("activated Epic 3 + 4 — every measurement handler returns INSUFFICIENT_DATA branch");
});
