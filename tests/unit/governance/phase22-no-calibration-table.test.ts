/**
 * Phase 23 Pattern P22-6 — Calibration snapshots are IntentEmission payloads,
 * NOT a new Prisma table.
 *
 * Activated **HARD** in Epic 6 Story 6.7. Scaffolded here at baseline per
 * Epic 1 Story 1.7.
 *
 * When activated, this test asserts :
 *   1. `prisma/schema.prisma` does NOT contain a model named
 *      `CalibrationSnapshot` / `CalibrationRun` / `ModelSnapshot` /
 *      `AttributionSnapshot` (regex check).
 *   2. The migration directory `prisma/migrations/` does not contain
 *      `CREATE TABLE "calibration*"` / `"ModelSnapshot"` / `"AttributionSnapshot"`
 *      patterns.
 *   3. Mode HARD.
 *
 * Rationale : calibration snapshots live as `RUN_ATTRIBUTION_CALIBRATION`
 * `IntentEmission` payloads (hash-chained, ADR-0004) — reproducibility via the
 * hash chain, zero schema growth. Pattern P22-6 + ADR-0080.
 *
 * Cf. ADR-0080 §"Snapshot = IntentEmission payload", ADR-0081 §3, architecture D8.
 */

import { describe, it } from "vitest";

describe("Phase 23 P22-6 — No new calibration table", () => {
  it.todo("activated Epic 6 Story 6.7 — schema.prisma has no Calibration*/ModelSnapshot/AttributionSnapshot model");
  it.todo("activated Epic 6 Story 6.7 — migration SQL files contain no CREATE TABLE for calibration*");
});
