/**
 * Phase 23 Pattern P22-7 — Dangling ADR references retired (HARD).
 *
 * Activated **HARD** in Epic 7 Story 7.9 — the final closure gate for Phase 23.
 * Scaffolded at baseline in Epic 1 Story 1.7.
 *
 * Asserts : a repo-wide scan of `src/`, `docs/`, and `tests/` for the 5 phantom
 * ADR kebab slugs (planned in ADR-0052 §"child ADRs", never materialized) returns
 * **0 hits**. Each was retired in-place as its file was touched (P22-7 distributed
 * retirement) and replaced by its ADR-0077+ counterpart (or a bare `ADR-00NN`
 * number where no successor exists).
 *
 * The 5 slugs are assembled from fragments at runtime so this very test file
 * carries **no literal occurrence** of any banned slug (and its own path is
 * excluded from the walk as defence-in-depth). Mode HARD — no baseline allowed.
 *
 * Cf. ADR-0077 §8 "Superseded references" (the canonical retirement record uses
 * bare numbers — `ADR-0053` etc. — never the glued kebab slug).
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "../../..");
const SCAN_DIRS = ["src", "docs", "tests"].map((d) => join(ROOT, d));
const SCAN_EXT = /\.(ts|tsx|md|prisma)$/;

// Assembled from fragments → no literal banned slug appears in this file.
const BANNED_SLUGS = [
  ["0053", "coherence-llm-evaluator"],
  ["0054", "superfan-attribution-model"],
  ["0055", "overton-algo"],
  ["0056", "postmortem-12q"],
  ["0057", "crew-scoring"],
].map(([num, name]) => `${num}-${name}`);

// Defence-in-depth : never let this file (which builds the slugs) self-match.
const SELF = join(__dirname, "phase22-no-dangling-adr-refs.test.ts");

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "dist") continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (SCAN_EXT.test(entry) && p !== SELF) acc.push(p);
  }
  return acc;
}

describe("Phase 23 P22-7 — No dangling ADR references (HARD)", () => {
  it("the 5 phantom ADR slugs (0053-0057) return 0 hits across src/ + docs/ + tests/", () => {
    const files = SCAN_DIRS.flatMap((d) => walk(d));
    const violations: { file: string; slug: string; line: number }[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      if (!BANNED_SLUGS.some((slug) => src.includes(slug))) continue;
      const lines = src.split("\n");
      lines.forEach((text, i) => {
        for (const slug of BANNED_SLUGS) {
          if (text.includes(slug)) violations.push({ file: relative(ROOT, file), slug, line: i + 1 });
        }
      });
    }
    expect(violations).toEqual([]);
  });
});
