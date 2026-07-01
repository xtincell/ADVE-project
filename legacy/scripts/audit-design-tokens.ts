/**
 * audit-design-tokens.ts — rapport de la dette zinc/violet/hex résiduelle.
 *
 * Cf. DESIGN-SYSTEM.md §13.
 * Mode warning (PR-3+) puis blocking (PR-9).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const TARGET_DIR = join(ROOT, "src/components");
const PRIMITIVES_DIR = join(ROOT, "src/components/primitives");
const STYLES_DIR = join(ROOT, "src/styles");

const PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "text-zinc-*", re: /\btext-zinc-\d+\b/g },
  { name: "bg-zinc-*", re: /\bbg-zinc-\d+\b/g },
  { name: "border-zinc-*", re: /\bborder-zinc-\d+\b/g },
  { name: "text-violet-*", re: /\btext-violet-\d+\b/g },
  { name: "bg-violet-*", re: /\bbg-violet-\d+\b/g },
  { name: "border-violet-*", re: /\bborder-violet-\d+\b/g },
  { name: "text-emerald-*", re: /\btext-emerald-\d+\b/g },
  { name: "bg-emerald-*", re: /\bbg-emerald-\d+\b/g },
  { name: "text-amber-*", re: /\btext-amber-\d+\b/g },
  { name: "bg-amber-*", re: /\bbg-amber-\d+\b/g },
  { name: "text-red-*", re: /\btext-red-\d+\b/g },
  { name: "bg-red-*", re: /\bbg-red-\d+\b/g },
  { name: "text-blue-*", re: /\btext-blue-\d+\b/g },
  { name: "text-gray-*", re: /\btext-(gray|slate|stone|neutral)-\d+\b/g },
  { name: "bg-gray-*", re: /\bbg-(gray|slate|stone|neutral)-\d+\b/g },
  { name: "text-[Npx] arbitraire", re: /\btext-\[\d+px\]/g },
  { name: "hex hardcoded #xxx", re: /#[0-9a-fA-F]{3,8}\b/g },
];

const WHITELIST_FILES = [
  // Logo SVG officiels = exception pour hex
  /landing\/marketing-nav\.tsx$/,
  /\bicon\.tsx$/,
];

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts|css)$/.test(entry) && !entry.endsWith(".test.tsx") && !entry.endsWith(".stories.tsx") && !entry.endsWith(".manifest.ts")) acc.push(p);
  }
  return acc;
}

function existsSync(p: string): boolean {
  try { statSync(p); return true; } catch { return false; }
}

interface Violation { file: string; pattern: string; count: number; }

function isPrimitive(file: string) { return file.startsWith(PRIMITIVES_DIR + "/"); }
function isStyles(file: string) { return file.startsWith(STYLES_DIR + "/"); }
function isWhitelisted(file: string): boolean {
  const rel = relative(ROOT, file);
  return WHITELIST_FILES.some((re) => re.test(rel));
}

function main() {
  const files = walk(TARGET_DIR);
  const violations: Violation[] = [];
  const summary = new Map<string, number>();

  for (const file of files) {
    if (isPrimitive(file) || isStyles(file)) continue;  // primitives + styles autorisés
    const src = readFileSync(file, "utf-8");
    for (const { name, re } of PATTERNS) {
      const matches = src.match(re);
      if (matches && matches.length > 0) {
        if (name === "hex hardcoded #xxx" && isWhitelisted(file)) continue;
        violations.push({ file: relative(ROOT, file), pattern: name, count: matches.length });
        summary.set(name, (summary.get(name) ?? 0) + matches.length);
      }
    }
  }

  console.log(`\n[audit:design] Files scanned: ${files.length}`);
  console.log(`[audit:design] Violations: ${violations.length} (${[...summary.values()].reduce((a, b) => a + b, 0)} total occurrences)`);
  console.log(`\nBy pattern:`);
  for (const [pattern, count] of [...summary.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(5)} × ${pattern}`);
  }

  if (violations.length > 0) {
    console.log(`\nTop 20 files:`);
    const byFile = new Map<string, number>();
    for (const v of violations) byFile.set(v.file, (byFile.get(v.file) ?? 0) + v.count);
    const top = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    for (const [file, count] of top) console.log(`  ${count.toString().padStart(5)} × ${file}`);
  }

  // Exit code : warning mode (PR-3+) → toujours 0. Blocking mode (PR-9) → 1 si violations.
  const blocking = process.argv.includes("--strict");
  if (blocking && violations.length > 0) {
    console.error(`\n✗ audit:design --strict : ${violations.length} violations. Cf. DESIGN-SYSTEM.md §13.`);
    process.exit(1);
  }
  console.log(`\n${violations.length === 0 ? "✓" : "⚠"} audit:design ${blocking ? "(strict)" : "(warning)"} ${violations.length === 0 ? "passed" : "completed"}.`);
}

main();
