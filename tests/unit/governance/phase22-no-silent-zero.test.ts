/**
 * Phase 23 Pattern P22-2 — INSUFFICIENT_DATA first-class branch, no silent zero.
 *
 * **Activated HARD in Epic 3 Story 3.8** (Overton paths) — **extended HARD in
 * Epic 4 Story 4.8** to the Superfan paths (`superfan-attribution.ts` +
 * `superfan-economy.ts`).
 *
 * What this test asserts (HARD mode, baseline = 0) :
 *   - Overton scope : `services/campaign-tracker/signals-culture.ts` +
 *     `services/sector-intelligence/*.ts` ; pattern
 *     `<identifier>(Score|Shift|Readiness|Delta) (?? | ||) 0` ; 0 hits.
 *   - Superfan scope : `services/campaign-tracker/superfan-attribution.ts` +
 *     `superfan-economy.ts` ; pattern banning `?? 0` / `|| 0` on
 *     score / count / retention / evangelistCount identifiers ; 0 hits.
 *   - Discriminated-union shape : both superfan measurement files declare at
 *     least one `state: "INSUFFICIENT_DATA"` arm (the P22-2 union, not a
 *     nullable score).
 *
 * Rationale : the Phase 19 baseline folded `(sentimentDelta ?? 0)` and similar
 * silent-zero patterns on the score path. Phase 23 Stories 3.2 + 3.3 (Overton)
 * and Stories 4.1 + 4.3 (Superfan) removed those folds and made the
 * discriminated INSUFFICIENT_DATA branch explicit (P22-2). This HARD test
 * prevents the regression of silent-zero on any score-producing identifier in
 * the pivot-measurement scope.
 *
 * # Legitimate decoy (deliberately NOT matched — Story 4.8)
 *
 * `superfan-attribution.ts` `scoreFromActions` contains
 * `opts.coefficients![k] ?? 0` (L~623) : a missing regression coefficient
 * defaults to **zero weight**, which is semantically correct (the feature
 * contributes nothing), NOT a fabricated score. The superfan regex anchors on
 * identifiers *ending in* `Score | Count | Retention` and on lowercase
 * property access `.score / .count / .retention` — a bracket-access dictionary
 * lookup (`coefficients![k]`) on an identifier ending in "coefficients" is
 * structurally excluded. (Same family as the Story 3.8 tag-keyed-accumulator
 * decoy.) Likewise `budget ?? 0`, `bigIdeaCoherenceScore ?? 0.5`,
 * `learningRate ?? 0.1` are not matched — non-score identifiers and/or
 * non-zero defaults (the `(?![.\w])` lookahead rejects `0.5` / `0.1`).
 *
 * What it does NOT assert :
 *   - Tag-keyed dictionary accumulators (`a[tag] ?? 0`, `acc[k] ?? 0`) — NOT
 *     score fields.
 *   - The Overton `OvertonShiftResult` / `OvertonReadinessResult` use
 *     `number | null` (documented nullable variant) rather than the
 *     discriminated union ; the discriminated-union assertion is scoped to the
 *     superfan files that adopted P22-2 (`AttributionResult` Story 4.1,
 *     `CohortRetentionMeasurement` Story 4.3).
 *
 * Cf. ADR-0046 (no-magic-fallback), ADR-0078 §"Décision", ADR-0081 (superfan
 * calibration), architecture P22-2.
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

// Story 4.8 — superfan score-producing scope.
const SUPERFAN_SCAN_PATHS = [
  "src/server/services/campaign-tracker/superfan-attribution.ts",
  "src/server/services/campaign-tracker/superfan-economy.ts",
];

/**
 * Two alternatives :
 *   (1) `\b\w*(Score|Count|Retention)\b [.prop|[key]]? (??|||) 0` — camelCase
 *       suffixed identifiers (`evangelistCount`, `retentionRate`, `xScore`).
 *       Capital-anchored so `coefficients` / `account` (lowercase "count")
 *       are NOT matched, and `bigIdeaCoherenceScore ?? 0.5` is rejected by the
 *       trailing `(?![.\w])` (0.5 ≠ 0).
 *   (2) `\.(score|count|retention)\b (??|||) 0` — lowercase property access of
 *       the exact result fields (`result.score ?? 0`). Excludes the
 *       bracket-dict `coefficients![k] ?? 0` zero-weight default.
 */
const SUPERFAN_SILENT_ZERO_RE =
  /\b\w*(?:Score|Count|Retention)\b(?:\s*\??\.\s*\w+|\s*\[[^\]]+\])?\s*(?:\?\?|\|\|)\s*0(?![.\w])|\.(?:score|count|retention)\b\s*(?:\?\?|\|\|)\s*0(?![.\w])/g;

/** Files that must declare the discriminated `INSUFFICIENT_DATA` arm (P22-2). */
const SUPERFAN_DISCRIMINATED_PATHS = [
  "src/server/services/campaign-tracker/superfan-attribution.ts",
  "src/server/services/campaign-tracker/superfan-economy.ts",
];

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

  it("Superfan scope (superfan-attribution + superfan-economy) — 0 silent-zero on score/count/retention identifiers", () => {
    const offenders: Array<{ file: string; line: number; text: string }> = [];

    for (const rel of SUPERFAN_SCAN_PATHS) {
      const abs = path.join(PROJECT_ROOT, rel);
      if (!fs.existsSync(abs)) continue;
      const content = fs.readFileSync(abs, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        const trimmed = line.trimStart();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
          return;
        }
        SUPERFAN_SILENT_ZERO_RE.lastIndex = 0;
        if (SUPERFAN_SILENT_ZERO_RE.test(line)) {
          offenders.push({ file: rel, line: idx + 1, text: line.trim() });
        }
      });
    }

    expect(
      offenders,
      `Silent-zero hits on superfan score-producing identifiers :\n${offenders.map((o) => `  ${o.file}:${o.line} — ${o.text}`).join("\n")}`,
    ).toEqual([]);
  });

  it("Superfan measurement files declare the discriminated INSUFFICIENT_DATA arm (P22-2, not a nullable score)", () => {
    const missing: string[] = [];
    for (const rel of SUPERFAN_DISCRIMINATED_PATHS) {
      const abs = path.join(PROJECT_ROOT, rel);
      if (!fs.existsSync(abs)) {
        missing.push(`${rel} (file not found)`);
        continue;
      }
      const content = fs.readFileSync(abs, "utf-8");
      if (!/state:\s*"INSUFFICIENT_DATA"/.test(content)) {
        missing.push(`${rel} (no \`state: "INSUFFICIENT_DATA"\` discriminant)`);
      }
    }
    expect(missing, `Missing discriminated INSUFFICIENT_DATA arm in :\n${missing.join("\n")}`).toEqual([]);
  });
});
