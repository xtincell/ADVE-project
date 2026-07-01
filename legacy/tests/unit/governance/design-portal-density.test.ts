/**
 * Anti-drift CI test — chaque layout portail doit déclarer data-density.
 *
 * Cf. DESIGN-SYSTEM.md §8 + ADR-0013.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");
const APP_DIR = join(ROOT, "src/app");

const ROUTE_GROUPS = [
  { dir: "(cockpit)/cockpit", expectedDensity: "comfortable" },
  { dir: "(console)/console", expectedDensity: "compact" },
  { dir: "(creator)/creator", expectedDensity: "comfortable" },
  { dir: "(agency)/agency", expectedDensity: "comfortable" },
  { dir: "(intake)", expectedDensity: "airy" },
  { dir: "(auth)", expectedDensity: "airy" },
  { dir: "(public)", expectedDensity: "airy" },
  { dir: "(shared)/shared", expectedDensity: "airy" },
];

describe("design-portal-density — Phase 11 PR-6", () => {
  it("each portal layout declares data-density and data-portal", () => {
    const violations: string[] = [];
    for (const { dir, expectedDensity } of ROUTE_GROUPS) {
      const layoutPath = join(APP_DIR, dir, "layout.tsx");
      if (!existsSync(layoutPath)) {
        violations.push(`${dir}: layout.tsx absent`);
        continue;
      }
      const src = readFileSync(layoutPath, "utf-8");
      const densityMatch = /data-density=["']([^"']+)["']/.exec(src);
      if (!densityMatch) {
        violations.push(`${dir}: data-density absent`);
      } else if (densityMatch[1] !== expectedDensity) {
        violations.push(`${dir}: data-density="${densityMatch[1]}" attendu "${expectedDensity}"`);
      }
      if (!/data-portal=/.test(src)) {
        violations.push(`${dir}: data-portal absent`);
      }
    }
    expect(violations).toEqual([]);
  });
});
