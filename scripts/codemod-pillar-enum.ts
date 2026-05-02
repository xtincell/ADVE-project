/**
 * scripts/codemod-pillar-enum.ts
 *
 * Replace hardcoded pillar enum literals (4-letter ADVE / 8-letter ADVERTIS,
 * uppercase or lowercase) with the canonical exports from `@/domain`.
 *
 *   ["A","D","V","E","R","T","I","S"]  →  PILLAR_KEYS
 *   ["A","D","V","E"]                  →  ADVE_KEYS
 *   ["a","d","v","e","r","t","i","s"]  →  PILLAR_STORAGE_KEYS
 *   ["a","d","v","e"]                  →  ADVE_STORAGE_KEYS
 *
 * Adds `import { ... } from "@/domain"` (if missing) or merges into an existing
 * one. Handles type-position arrays via a separate regex (uses `as const`
 * arrays unchanged but those are exempt-by-being-in-domain anyway). Skips
 * files under src/domain/ and eslint-plugin-lafusee/.
 */

import * as fs from "fs";
import { execSync } from "child_process";

/**
 * Replacement is a spread of the canonical const, producing a mutable array
 * literal so existing typed declarations (`const x: PillarKey[] = [...]`) work
 * without `readonly` adjustments. The single allocation per call site is
 * negligible — these arrays are tiny and constructed once at module load.
 */
const PATTERNS: Array<{ regex: RegExp; constName: string }> = [
  // 8-letter uppercase
  {
    regex: /\[\s*"A"\s*,\s*"D"\s*,\s*"V"\s*,\s*"E"\s*,\s*"R"\s*,\s*"T"\s*,\s*"I"\s*,\s*"S"\s*\](?:\s*as\s+const)?/g,
    constName: "PILLAR_KEYS",
  },
  {
    regex: /\[\s*'A'\s*,\s*'D'\s*,\s*'V'\s*,\s*'E'\s*,\s*'R'\s*,\s*'T'\s*,\s*'I'\s*,\s*'S'\s*\](?:\s*as\s+const)?/g,
    constName: "PILLAR_KEYS",
  },
  // 4-letter uppercase ADVE
  {
    regex: /\[\s*"A"\s*,\s*"D"\s*,\s*"V"\s*,\s*"E"\s*\](?:\s*as\s+const)?/g,
    constName: "ADVE_KEYS",
  },
  {
    regex: /\[\s*'A'\s*,\s*'D'\s*,\s*'V'\s*,\s*'E'\s*\](?:\s*as\s+const)?/g,
    constName: "ADVE_KEYS",
  },
  // 8-letter lowercase
  {
    regex: /\[\s*"a"\s*,\s*"d"\s*,\s*"v"\s*,\s*"e"\s*,\s*"r"\s*,\s*"t"\s*,\s*"i"\s*,\s*"s"\s*\](?:\s*as\s+const)?/g,
    constName: "PILLAR_STORAGE_KEYS",
  },
  {
    regex: /\[\s*'a'\s*,\s*'d'\s*,\s*'v'\s*,\s*'e'\s*,\s*'r'\s*,\s*'t'\s*,\s*'i'\s*,\s*'s'\s*\](?:\s*as\s+const)?/g,
    constName: "PILLAR_STORAGE_KEYS",
  },
  // 4-letter lowercase
  {
    regex: /\[\s*"a"\s*,\s*"d"\s*,\s*"v"\s*,\s*"e"\s*\](?:\s*as\s+const)?/g,
    constName: "ADVE_STORAGE_KEYS",
  },
  {
    regex: /\[\s*'a'\s*,\s*'d'\s*,\s*'v'\s*,\s*'e'\s*\](?:\s*as\s+const)?/g,
    constName: "ADVE_STORAGE_KEYS",
  },
];

function ensureImport(content: string, names: Set<string>): string {
  if (names.size === 0) return content;
  // Existing `import { ... } from "@/domain"` (single-line OR multi-line)
  const existingRe =
    /import\s*\{([^}]*)\}\s*from\s*["']@\/domain(?:\/pillars)?["']\s*;?/m;
  const m = existingRe.exec(content);
  if (m) {
    const existingNames = new Set(
      m[1].split(",").map((s) => s.trim()).filter(Boolean),
    );
    for (const n of names) existingNames.add(n);
    const sorted = [...existingNames].sort().join(", ");
    return content.replace(
      existingRe,
      `import { ${sorted} } from "@/domain";`,
    );
  }
  // Find the END of the LAST full top-level import statement (handles
  // multi-line imports). Scan line-by-line tracking import-block boundaries.
  const lines = content.split("\n");
  let lastImportEndLine = -1;
  let inImportBlock = false;
  let openBraces = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inImportBlock) {
      // Match a top-level `import …` start (not inside another statement).
      // Heuristic: line starts with `import ` (with optional leading whitespace
      // is unusual for top-level — keep strict to avoid catching JSX text).
      if (/^\s*import\s/.test(line)) {
        inImportBlock = true;
        openBraces = 0;
      }
    }
    if (inImportBlock) {
      // Count braces to know if multi-line import is closed
      for (const ch of line) {
        if (ch === "{") openBraces++;
        else if (ch === "}") openBraces--;
      }
      // End of import statement when we reach a `;` at brace-depth 0 OR
      // a line ending with `";`/`'` and no open braces.
      if (openBraces === 0 && /["'];?\s*$/.test(line)) {
        lastImportEndLine = i;
        inImportBlock = false;
      }
    }
  }
  const importLine = `import { ${[...names].sort().join(", ")} } from "@/domain";`;
  if (lastImportEndLine === -1) {
    // No import found — prepend (skip "use client" if present)
    if (lines[0] && /^["']use client["'];?\s*$/.test(lines[0])) {
      lines.splice(1, 0, "", importLine);
    } else {
      lines.unshift(importLine);
    }
  } else {
    lines.splice(lastImportEndLine + 1, 0, importLine);
  }
  return lines.join("\n");
}

const files = execSync(
  `git ls-files 'src/**/*.ts' 'src/**/*.tsx'`,
  { encoding: "utf-8" },
)
  .trim()
  .split("\n")
  .filter(Boolean)
  .filter((f) => !f.startsWith("src/domain/"));

let totalReplacements = 0;
let totalFiles = 0;

for (const file of files) {
  const original = fs.readFileSync(file, "utf-8");
  let next = original;
  const used = new Set<string>();
  for (const { regex, constName } of PATTERNS) {
    next = next.replace(regex, () => {
      used.add(constName);
      totalReplacements++;
      return `[...${constName}]`;
    });
  }
  if (next !== original) {
    next = ensureImport(next, used);
    fs.writeFileSync(file, next);
    totalFiles++;
  }
}

console.log(`Replaced ${totalReplacements} pillar enum literals across ${totalFiles} files.`);
