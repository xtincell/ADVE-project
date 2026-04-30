/**
 * Anti-drift CI test — design primitives CVA
 *
 * Vérifie que chaque primitive `src/components/primitives/*.tsx` qui expose
 * un composant à variants utilise `cva()` de class-variance-authority.
 * Et qu'un manifest co-localisé existe.
 *
 * Cf. DESIGN-SYSTEM.md §7 (Variant grammar) + ADR-0013.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");
const PRIMITIVES_DIR = join(ROOT, "src/components/primitives");

function listPrimitives(): string[] {
  if (!existsSync(PRIMITIVES_DIR)) return [];
  return readdirSync(PRIMITIVES_DIR).filter(
    (f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx") && !f.endsWith(".stories.tsx"),
  );
}

describe("design-primitives-cva — Phase 11", () => {
  it("primitives directory exists and contains at least 1 primitive", () => {
    expect(existsSync(PRIMITIVES_DIR)).toBe(true);
    expect(listPrimitives().length).toBeGreaterThan(0);
  });

  it("each primitive uses cva() if it exposes variant/size/tone props", () => {
    const violations: string[] = [];
    for (const file of listPrimitives()) {
      const src = readFileSync(join(PRIMITIVES_DIR, file), "utf-8");
      const hasVariantProp = /VariantProps</.test(src) || /\bvariant\??:/.test(src) || /\bsize\??:/.test(src);
      const usesCva = /\bcva\s*\(/.test(src);
      if (hasVariantProp && !usesCva) {
        violations.push(`${file}: declares variant/size/tone but does NOT use cva()`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("each primitive has a co-located *.manifest.ts", () => {
    const missing: string[] = [];
    for (const file of listPrimitives()) {
      const base = file.replace(/\.tsx$/, "");
      const manifestPath = join(PRIMITIVES_DIR, `${base}.manifest.ts`);
      if (base === "index") continue;
      if (!existsSync(manifestPath)) missing.push(file);
    }
    expect(missing).toEqual([]);
  });
});
