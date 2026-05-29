/**
 * Phase 23 Pattern P22-6 — Calibration snapshots are IntentEmission payloads,
 * NOT a new Prisma table.
 *
 * Activated **HARD** in Epic 6 Story 6.7.
 *
 * Asserts :
 *   1. `prisma/schema.prisma` declares no model named `CalibrationSnapshot` /
 *      `CalibrationRun` / `ModelSnapshot` / `AttributionSnapshot`.
 *   2. No migration `migration.sql` contains `CREATE TABLE` for those tables
 *      (nor any `"calibration*"` table).
 *   3. Mode HARD.
 *
 * Rationale : calibration snapshots live as `RUN_ATTRIBUTION_CALIBRATION`
 * `IntentEmission` payloads (hash-chained) — reproducibility via the hash chain,
 * zero schema growth. Pattern P22-6 + ADR-0080 §"Snapshot = IntentEmission payload".
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const SCHEMA = path.resolve(__dirname, "../../../prisma/schema.prisma");
const MIGRATIONS_DIR = path.resolve(__dirname, "../../../prisma/migrations");
const FORBIDDEN_MODELS = ["CalibrationSnapshot", "CalibrationRun", "ModelSnapshot", "AttributionSnapshot"] as const;

describe("Phase 23 P22-6 — No new calibration table (HARD)", () => {
  it("schema.prisma has no Calibration*/ModelSnapshot/AttributionSnapshot model", () => {
    const src = fs.readFileSync(SCHEMA, "utf8");
    const offenders = FORBIDDEN_MODELS.filter((m) => new RegExp(`model\\s+${m}\\b`).test(src));
    expect(offenders, `forbidden model(s) declared: ${offenders.join(", ")}`).toEqual([]);
  });

  it("migration SQL files contain no CREATE TABLE for calibration snapshots", () => {
    const offenders: string[] = [];
    if (fs.existsSync(MIGRATIONS_DIR)) {
      for (const entry of fs.readdirSync(MIGRATIONS_DIR)) {
        const sqlPath = path.join(MIGRATIONS_DIR, entry, "migration.sql");
        if (!fs.existsSync(sqlPath)) continue;
        const content = fs.readFileSync(sqlPath, "utf8");
        for (const m of [...FORBIDDEN_MODELS, "calibration"]) {
          if (new RegExp(`CREATE TABLE\\s+"${m}`, "i").test(content)) {
            offenders.push(`${entry} → ${m}`);
          }
        }
      }
    }
    expect(offenders, `calibration CREATE TABLE found: ${offenders.join(", ")}`).toEqual([]);
  });
});
