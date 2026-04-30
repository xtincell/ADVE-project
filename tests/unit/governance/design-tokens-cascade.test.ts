/**
 * Anti-drift CI test — design tokens cascade
 *
 * Vérifie qu'aucun composant `src/components/**` ne consomme directement
 * un Reference token (`var(--ref-*)`). La cascade impose Tier 1+ uniquement.
 *
 * Cf. DESIGN-SYSTEM.md §4 (token discipline) + §13 (CI gates).
 * Bloquant dès PR-1.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "../../..");
const COMPONENTS_DIR = join(ROOT, "src/components");

const REFERENCE_TOKEN_RE = /var\(\s*(--ref-[a-z0-9-]+)/g;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      walk(p, acc);
    } else if (/\.(ts|tsx|css)$/.test(entry)) {
      acc.push(p);
    }
  }
  return acc;
}

describe("design-tokens-cascade — no Reference consumed in components (Phase 11)", () => {
  it("aucun composant ne consomme var(--ref-*) directement", () => {
    const files = walk(COMPONENTS_DIR);
    const violations: { file: string; tokens: string[] }[] = [];

    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      const found = new Set<string>();
      let m: RegExpExecArray | null;
      REFERENCE_TOKEN_RE.lastIndex = 0;
      while ((m = REFERENCE_TOKEN_RE.exec(src)) !== null) {
        if (m[1]) found.add(m[1]);
      }
      if (found.size > 0) {
        violations.push({ file: relative(ROOT, file), tokens: [...found] });
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map((v) => `  ${v.file}: ${v.tokens.join(", ")}`)
        .join("\n");
      throw new Error(
        `${violations.length} composant(s) consomme(nt) un Reference token directement (cascade DS violée).\n` +
          `Cf. DESIGN-SYSTEM.md §4 et §5. Utiliser un Tier 1 (--color-*) ou Tier 3 (--pillar-*, --division-*, --tier-*, --classification-*) à la place.\n\n${msg}`,
      );
    }

    expect(violations).toEqual([]);
  });
});
