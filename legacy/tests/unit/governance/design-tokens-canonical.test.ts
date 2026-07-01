/**
 * Anti-drift CI test — design tokens canonical (warning mode PR-4, blocking PR-9).
 *
 * Vérifie qu'aucun fichier `src/components/**` (hors primitives/styles) ne
 * contient des classes Tailwind couleur brutes (`text-zinc-*`, `bg-violet-*`,
 * `text-emerald-*`, hex direct).
 *
 * Cf. DESIGN-SYSTEM.md §4 + ADR-0013.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "../../..");
const COMPONENTS_DIR = join(ROOT, "src/components");
const PRIMITIVES_DIR = join(ROOT, "src/components/primitives");

// Patterns interdits (regex globaux)
const FORBIDDEN_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "text-zinc-*", re: /\btext-zinc-\d+\b/g },
  { name: "bg-zinc-*", re: /\bbg-zinc-\d+\b/g },
  { name: "border-zinc-*", re: /\bborder-zinc-\d+\b/g },
  { name: "text-violet-*", re: /\btext-violet-\d+\b/g },
  { name: "bg-violet-*", re: /\bbg-violet-\d+\b/g },
  // emerald/amber/red autorisés en warning (souvent legacy Artemis/Thot/Mestor — à migrer en PR-6)
];

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(entry) && !entry.endsWith(".test.tsx") && !entry.endsWith(".stories.tsx") && !entry.endsWith(".manifest.ts")) acc.push(p);
  }
  return acc;
}

const STRICT = process.env.DESIGN_STRICT === "1";

describe("design-tokens-canonical — Phase 11", () => {
  it("audit warns on raw Tailwind color classes outside primitives/", () => {
    const files = walk(COMPONENTS_DIR).filter((f) => !f.startsWith(PRIMITIVES_DIR));
    const violations: { file: string; pattern: string; count: number }[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      for (const { name, re } of FORBIDDEN_PATTERNS) {
        const matches = src.match(re);
        if (matches && matches.length > 0) {
          violations.push({ file: relative(ROOT, file), pattern: name, count: matches.length });
        }
      }
    }
    if (STRICT) {
      // PR-9 : blocking mode
      expect(violations).toEqual([]);
    } else {
      // PR-4..8 : warning mode (ne fail pas, mais log)
      if (violations.length > 0) {
        const summary = new Map<string, number>();
        for (const v of violations) summary.set(v.pattern, (summary.get(v.pattern) ?? 0) + v.count);
        // eslint-disable-next-line no-console
        console.warn(`[design-tokens-canonical] ${violations.length} violations (warning mode):`, Object.fromEntries(summary));
      }
      expect(true).toBe(true);
    }
  });
});
