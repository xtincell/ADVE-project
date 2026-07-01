/**
 * codemod-zinc-to-tokens.ts — Phase 11 PR-3+ migration helper.
 *
 * Mappe les classes Tailwind brutes (`text-zinc-*`, `bg-zinc-*`, `text-violet-*`,
 * etc.) vers les tokens sémantiques DS panda + rouge fusée.
 *
 * Usage :
 *   npm run codemod:zinc -- --dir src/components/shared/   (un sous-dossier)
 *   npm run codemod:zinc -- --dry-run                       (preview, pas de write)
 *   npm run codemod:zinc                                    (full run, prudent)
 *
 * Le diff produit doit être revu manuellement avant commit (NEFER §6).
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const DIR_ARG = args.find((a) => a.startsWith("--dir="))?.split("=")[1];
const TARGET_DIR = DIR_ARG ? join(ROOT, DIR_ARG) : join(ROOT, "src/components");

// Mapping zinc → tokens panda
const REPLACEMENTS: Array<[RegExp, string]> = [
  // text-zinc
  [/\btext-zinc-(50|100|200)\b/g, "text-foreground"],
  [/\btext-zinc-(300|400)\b/g, "text-foreground-secondary"],
  [/\btext-zinc-(500|600|700|800|900)\b/g, "text-foreground-muted"],
  // bg-zinc
  [/\bbg-zinc-(50|100|200)\b/g, "bg-foreground"],
  [/\bbg-zinc-(800|900|950)\b/g, "bg-background"],
  [/\bbg-zinc-(700)\b/g, "bg-surface-raised"],
  [/\bbg-zinc-(600)\b/g, "bg-surface-elevated"],
  // border-zinc
  [/\bborder-zinc-(700|800|900)\b/g, "border-border"],
  [/\bborder-zinc-(950)\b/g, "border-border-subtle"],
  [/\bborder-zinc-(500|600)\b/g, "border-border-strong"],
  // violet (legacy primary V5.0) → accent rouge fusée
  [/\btext-violet-(\d+)\b/g, "text-accent"],
  [/\bbg-violet-(\d+)\b/g, "bg-accent"],
  [/\bborder-violet-(\d+)\b/g, "border-accent"],
  // emerald (legacy Artemis) → division-artemis ou success selon contexte (manuel)
  // amber (legacy warning ou Thot) → warning ou division-thot (manuel)
  // red (legacy destructive) → error (= accent panda)
  [/\btext-red-(\d+)\b/g, "text-error"],
  [/\bbg-red-(\d+)\b/g, "bg-error"],
];

interface FileChange {
  file: string;
  before: number;
  after: number;
  matches: Map<string, number>;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory() && entry !== "primitives") walk(p, acc);
    else if (/\.(tsx|ts)$/.test(entry) && !entry.endsWith(".test.tsx") && !entry.endsWith(".stories.tsx")) acc.push(p);
  }
  return acc;
}

function processFile(file: string): FileChange | null {
  const src = readFileSync(file, "utf-8");
  const matches = new Map<string, number>();
  let changed = src;
  for (const [re, to] of REPLACEMENTS) {
    changed = changed.replace(re, (m) => {
      matches.set(m, (matches.get(m) ?? 0) + 1);
      return to;
    });
  }
  if (changed === src) return null;
  if (!DRY_RUN) writeFileSync(file, changed);
  return { file: relative(ROOT, file), before: src.length, after: changed.length, matches };
}

function main() {
  console.log(`[codemod] target=${relative(ROOT, TARGET_DIR)} dryRun=${DRY_RUN}`);
  const files = walk(TARGET_DIR);
  console.log(`[codemod] scanning ${files.length} files`);

  const changes: FileChange[] = [];
  for (const f of files) {
    const c = processFile(f);
    if (c) changes.push(c);
  }

  console.log(`\n[codemod] ${changes.length} files modified${DRY_RUN ? " (dry-run, not written)" : ""}`);
  const totalReplacements = changes.reduce((sum, c) => sum + [...c.matches.values()].reduce((a, b) => a + b, 0), 0);
  console.log(`[codemod] ${totalReplacements} total replacements\n`);

  // Top-10 most replaced patterns
  const allMatches = new Map<string, number>();
  for (const c of changes) {
    for (const [k, v] of c.matches) allMatches.set(k, (allMatches.get(k) ?? 0) + v);
  }
  const top = [...allMatches.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log("Top patterns replaced:");
  for (const [pattern, count] of top) console.log(`  ${count.toString().padStart(5)} × ${pattern}`);

  if (DRY_RUN) {
    console.log("\nRun without --dry-run to apply changes.");
  } else {
    console.log("\n✓ Codemod complete. Review the diff manually before committing (NEFER §6).");
  }
}

main();
