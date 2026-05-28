/**
 * Phase 23 Pattern P22-2 — INSUFFICIENT_DATA first-class branch, no silent zero.
 *
 * **Activated HARD in Epic 3 Story 3.8** (Overton paths) — Story 4.8 will
 * extend to Superfan paths (`superfan-attribution.ts` + `superfan-economy.ts`).
 *
 * What this test asserts (HARD mode, baseline = 0) :
 *   - Scope : `services/campaign-tracker/signals-culture.ts` +
 *             `services/sector-intelligence/*.ts`.
 *   - Pattern : `<identifier>(Score|Shift|Readiness|Delta) (?? | ||) 0`.
 *   - Hits : 0.
 *
 * Rationale : the Phase 19 baseline folded `(sentimentDelta ?? 0)` and similar
 * silent-zero patterns on the score path. Phase 23 Stories 3.2 + 3.3 removed
 * those folds and made the discriminated INSUFFICIENT_DATA branch explicit
 * (P22-2). This HARD test prevents the regression of silent-zero on any
 * score-named identifier in the Overton measurement scope.
 *
 * What it does NOT assert (yet) :
 *   - Tag-keyed dictionary accumulators (`a[tag] ?? 0`, `acc[k] ?? 0`) — these
 *     are NOT score fields ; the pattern is regex-scoped to identifiers
 *     ending in `Score | Shift | Readiness | Delta`.
 *   - Type-level discriminated unions (architecture P22-2 ideal : `{ state:
 *     "OK", score } | { state: "INSUFFICIENT_DATA", ... }`) — the existing
 *     `OvertonShiftResult` / `OvertonReadinessResult` use `number | null` as
 *     the runtime-nullable variant. AttributionResult discriminated-union
 *     pattern lands in Epic 4 Story 4.1 ; this test will tighten to assert
 *     the union shape when the Phase 23 measurement types migrate.
 *
 * Cf. ADR-0046 (no-magic-fallback), ADR-0078 §"Décision", architecture P22-2.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "../../..");

const OVERTON_SCAN_PATHS = [
  "src/server/services/campaign-tracker/signals-culture.ts",
  "src/server/services/sector-intelligence/index.ts",
  "src/server/services/sector-intelligence/manifest.ts",
];

/**
 * Match `<identifier>(Score|Shift|Readiness|Delta) (??|||) 0` patterns. Allows
 * an optional dot or bracket access between the identifier and the `?? 0` /
 * `|| 0` (covers `result.overtonShiftScore ?? 0`, `obj.shift || 0`, etc.).
 *
 * Word-boundary anchor on the suffix prevents matching `ScoreFn` /
 * `DeltaState` style identifiers.
 */
const SILENT_ZERO_RE =
  /\b\w*(Score|Shift|Readiness|Delta)\b(?:\s*\??\.\s*\w+|\s*\[\s*[^\]]+\s*\])?\s*(\?\?|\|\|)\s*0(?![.\w])/g;

describe("Phase 23 P22-2 — INSUFFICIENT_DATA first-class, no silent zero", () => {
  it("Overton scope (signals-culture + sector-intelligence) — 0 silent-zero patterns on score-named identifiers", () => {
    const offenders: Array<{ file: string; line: number; text: string }> = [];

    for (const rel of OVERTON_SCAN_PATHS) {
      const abs = path.join(PROJECT_ROOT, rel);
      if (!fs.existsSync(abs)) continue;
      const content = fs.readFileSync(abs, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        // Ignore comment-only lines — these may discuss the pattern in prose
        // without actually executing it. Inline comments after code are still
        // matched because the regex catches the code portion before the `//`.
        const trimmed = line.trimStart();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
          return;
        }
        SILENT_ZERO_RE.lastIndex = 0;
        if (SILENT_ZERO_RE.test(line)) {
          offenders.push({ file: rel, line: idx + 1, text: line.trim() });
        }
      });
    }

    expect(offenders, `Silent-zero hits on score-named identifiers :\n${offenders.map((o) => `  ${o.file}:${o.line} — ${o.text}`).join("\n")}`).toEqual([]);
  });

  it.todo("activated Epic 4 Story 4.8 — extended to Superfan score fields");
  it.todo("activated Epic 3 + 4 — every measurement handler returns INSUFFICIENT_DATA branch (type-level)");
});
